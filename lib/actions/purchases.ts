'use server';

import { prisma } from '@/lib/db/prisma';
import { safeRevalidatePath } from '@/lib/utils';
import { getServerPartner } from '@/lib/auth/server';

export interface RecordPurchaseParams {
  itemName: string;
  category: 'Coffee Beans' | 'Bottles' | 'Caps' | 'Labels' | 'Water' | 'Equipment' | 'Supplies';
  bottleSize?: '180ml' | '1L' | null;
  quantity: number;
  unit: string;
  unitCost: number;
  supplierName: string;
  supplierContact?: string;
  date?: string | Date;
  partnerId?: string;
  notes?: string;
}

export async function recordPurchase(params: RecordPurchaseParams) {
  try {
    const {
      itemName,
      category,
      bottleSize,
      quantity,
      unit,
      unitCost,
      supplierName,
      supplierContact,
      date,
      notes,
    } = params;

    if (!itemName?.trim()) {
      return { success: false, error: 'Item name is required.' };
    }
    if (!supplierName?.trim()) {
      return { success: false, error: 'Supplier name is required.' };
    }
    if (quantity <= 0 || unitCost < 0) {
      return { success: false, error: 'Quantity and price must be valid positive numbers.' };
    }

    const currentPartner = await getServerPartner();
    const partnerId = params.partnerId || currentPartner.id;
    const partnerName = partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';
    const txDate = date ? new Date(date) : new Date();
    const totalCost = Math.round(quantity * unitCost * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Supplier
      let supplier = await tx.supplier.findFirst({
        where: { name: { equals: supplierName.trim() } },
      });

      if (!supplier) {
        supplier = await tx.supplier.create({
          data: {
            name: supplierName.trim(),
            contactPerson: supplierContact || null,
            notes: `Added during purchase on ${txDate.toLocaleDateString('en-IN')}`,
          },
        });
      }

      // 2. Format normalized item name (e.g. if bottle/caps/labels include size)
      let resolvedItemName = itemName.trim();
      if (bottleSize && (category === 'Bottles' || category === 'Caps' || category === 'Labels')) {
        if (!resolvedItemName.includes(bottleSize)) {
          resolvedItemName = `${resolvedItemName} (${bottleSize})`;
        }
      }

      // 3. Find or create InventoryItem
      let inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          name: { equals: resolvedItemName },
          category: { equals: category },
        },
        include: { coffeeBeanDetails: true },
      });

      if (!inventoryItem) {
        // Generate SKU
        const prefix = category.substring(0, 3).toUpperCase();
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const sku = `${prefix}-${randomCode}`;

        inventoryItem = await tx.inventoryItem.create({
          data: {
            name: resolvedItemName,
            sku,
            category,
            unit: unit || 'units',
            currentQuantity: 0,
            averageCost: unitCost,
            currentStockValue: 0,
            supplierId: supplier.id,
            isCoffeeBean: category === 'Coffee Beans',
            notes: notes || null,
          },
          include: { coffeeBeanDetails: true },
        });

        if (category === 'Coffee Beans') {
          await tx.coffeeBean.create({
            data: {
              inventoryItemId: inventoryItem.id,
              beanName: resolvedItemName,
              origin: 'South India',
              supplier: supplier.name,
              roast: 'Medium-Dark',
              beanType: 'Arabica',
              purchaseDate: txDate,
              quantityPurchased: 0,
              quantityRemaining: 0,
              purchaseCost: 0,
              costPerKg: unitCost,
            },
          });
        }
      }

      // 4. Update InventoryItem stock
      const prevQty = inventoryItem.currentQuantity;
      const prevVal = inventoryItem.currentStockValue;
      const newQty = prevQty + quantity;
      const newVal = prevVal + totalCost;
      const newAvgCost = newQty > 0 ? newVal / newQty : unitCost;

      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          currentQuantity: Math.round(newQty * 100) / 100,
          averageCost: Math.round(newAvgCost * 100) / 100,
          currentStockValue: Math.round(newVal * 100) / 100,
          supplierId: supplier.id,
        },
      });

      if (inventoryItem.isCoffeeBean && inventoryItem.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: inventoryItem.coffeeBeanDetails.id },
          data: {
            quantityRemaining: inventoryItem.coffeeBeanDetails.quantityRemaining + quantity,
            quantityPurchased: inventoryItem.coffeeBeanDetails.quantityPurchased + quantity,
            purchaseCost: inventoryItem.coffeeBeanDetails.purchaseCost + totalCost,
            costPerKg: Math.round(newAvgCost * 100) / 100,
          },
        });
      }

      // 5. Create InventoryTransaction
      const poRef = `PUR-${Date.now().toString().slice(-6)}`;
      const inventoryTx = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryItem.id,
          type: 'PURCHASE',
          quantity,
          unit: unit || inventoryItem.unit,
          unitCost,
          totalCost,
          reference: poRef,
          partnerId,
          notes: notes || `Purchased from ${supplier.name}`,
          date: txDate,
        },
      });

      // 6. Connect to Module 6: Create Expense for 50-50 Partner Reconciliation
      let expenseCategory = await tx.expenseCategory.findFirst({
        where: {
          name: category === 'Equipment' ? 'Equipment' : 'Raw Materials & Supplies',
        },
      });

      if (!expenseCategory) {
        expenseCategory = await tx.expenseCategory.create({
          data: {
            name: category === 'Equipment' ? 'Equipment' : 'Raw Materials & Supplies',
            color: category === 'Equipment' ? '#3b82f6' : '#f59e0b',
            isProductionRelated: true,
          },
        });
      }

      const expense = await tx.expense.create({
        data: {
          title: `Purchase: ${resolvedItemName} (${quantity} ${unit})`,
          categoryId: expenseCategory.id,
          amount: totalCost,
          paidBy: partnerName,
          partnerId,
          paymentMethod: 'UPI',
          vendor: supplier.name,
          date: txDate,
          notes: notes || `Direct purchase tagged to ${supplier.name} and stock updated.`,
        },
      });

      // 7. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName,
          action: 'PURCHASE_RECORDED',
          entity: 'InventoryTransaction',
          entityId: inventoryTx.id,
          oldValue: `${prevQty} ${inventoryItem.unit}`,
          newValue: `${newQty} ${inventoryItem.unit}`,
          details: `Logged purchase: ${resolvedItemName} (${quantity} ${unit} at ₹${unitCost}/${unit} = ₹${totalCost}) from ${supplier.name}. Tagged to ${partnerName}.`,
        },
      });

      return {
        inventoryTx,
        inventoryItem,
        expense,
        supplier,
      };
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error in recordPurchase:', error);
    return { success: false, error: error.message || 'Failed to record purchase.' };
  }
}

export interface UpdatePurchaseParams {
  transactionId: string;
  quantity: number;
  unitCost: number;
  unit?: string;
  supplierName?: string;
  date?: string | Date;
  notes?: string;
  partnerId?: string;
}

export async function updatePurchase(params: UpdatePurchaseParams) {
  try {
    const {
      transactionId,
      quantity,
      unitCost,
      unit,
      supplierName,
      date,
      notes,
    } = params;

    if (!transactionId) {
      return { success: false, error: 'Transaction ID is required.' };
    }
    if (quantity <= 0 || unitCost < 0) {
      return { success: false, error: 'Quantity and unit price must be valid positive numbers.' };
    }

    const currentPartner = await getServerPartner();
    const partnerId = params.partnerId || currentPartner.id;
    const partnerName = partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';
    const txDate = date ? new Date(date) : undefined;
    const newTotalCost = Math.round(quantity * unitCost * 100) / 100;

    const result = await prisma.$transaction(async (tx) => {
      const invTx = await tx.inventoryTransaction.findUnique({
        where: { id: transactionId },
        include: { inventoryItem: { include: { coffeeBeanDetails: true } } },
      });

      if (!invTx) throw new Error('Purchase record not found.');

      const item = invTx.inventoryItem;
      const oldQty = invTx.quantity;
      const oldTotalCost = invTx.totalCost;

      // Adjust item balance: subtract old impact, add new impact
      const adjustedQty = Math.max(0, item.currentQuantity - oldQty + quantity);
      const adjustedVal = Math.max(0, item.currentStockValue - oldTotalCost + newTotalCost);
      const newAvgCost = adjustedQty > 0 ? adjustedVal / adjustedQty : unitCost;

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: Math.round(adjustedQty * 100) / 100,
          averageCost: Math.round(newAvgCost * 100) / 100,
          currentStockValue: Math.round(adjustedVal * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        const beanRemaining = Math.max(0, item.coffeeBeanDetails.quantityRemaining - oldQty + quantity);
        const beanPurchased = Math.max(0, item.coffeeBeanDetails.quantityPurchased - oldQty + quantity);
        const beanCost = Math.max(0, item.coffeeBeanDetails.purchaseCost - oldTotalCost + newTotalCost);

        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: beanRemaining,
            quantityPurchased: beanPurchased,
            purchaseCost: beanCost,
            costPerKg: beanPurchased > 0 ? beanCost / beanPurchased : unitCost,
          },
        });
      }

      // If supplierName provided and changed, find/create or link
      let reference = invTx.reference;
      if (supplierName?.trim()) {
        reference = `PO-${supplierName.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 10)}`;
      }

      // Update matching expense if exists
      const dateStart = new Date(invTx.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(invTx.date);
      dateEnd.setHours(23, 59, 59, 999);

      const matchingExpense = await tx.expense.findFirst({
        where: {
          amount: oldTotalCost,
          date: { gte: dateStart, lte: dateEnd },
        },
      });

      if (matchingExpense) {
        await tx.expense.update({
          where: { id: matchingExpense.id },
          data: {
            amount: newTotalCost,
            ...(txDate ? { date: txDate } : {}),
            notes: notes || matchingExpense.notes,
          },
        });
      }

      // Update the transaction
      const updatedTx = await tx.inventoryTransaction.update({
        where: { id: transactionId },
        data: {
          quantity,
          unitCost,
          totalCost: newTotalCost,
          ...(unit ? { unit } : {}),
          ...(txDate ? { date: txDate } : {}),
          ...(reference ? { reference } : {}),
          notes: notes !== undefined ? notes : invTx.notes,
          partnerId,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName,
          action: 'PURCHASE_UPDATED',
          entity: 'InventoryTransaction',
          entityId: transactionId,
          oldValue: `${oldQty} ${invTx.unit} @ ₹${invTx.unitCost} (₹${oldTotalCost})`,
          newValue: `${quantity} ${unit || invTx.unit} @ ₹${unitCost} (₹${newTotalCost})`,
          details: `Updated purchase of ${item.name}: ${quantity} ${unit || invTx.unit} @ ₹${unitCost}`,
        },
      });

      return updatedTx;
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating purchase:', error);
    return { success: false, error: error.message || 'Failed to update purchase.' };
  }
}

export async function deletePurchase(transactionId: string) {
  try {
    const currentPartner = await getServerPartner();

    await prisma.$transaction(async (tx) => {
      const invTx = await tx.inventoryTransaction.findUnique({
        where: { id: transactionId },
        include: { inventoryItem: { include: { coffeeBeanDetails: true } } },
      });

      if (!invTx) throw new Error('Purchase record not found.');

      // Reverse item balance
      const item = invTx.inventoryItem;
      const newQty = Math.max(0, item.currentQuantity - invTx.quantity);
      const newVal = Math.max(0, item.currentStockValue - invTx.totalCost);
      const newAvgCost = newQty > 0 ? newVal / newQty : item.averageCost;

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: Math.round(newQty * 100) / 100,
          averageCost: Math.round(newAvgCost * 100) / 100,
          currentStockValue: Math.round(newVal * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: Math.max(0, item.coffeeBeanDetails.quantityRemaining - invTx.quantity),
            quantityPurchased: Math.max(0, item.coffeeBeanDetails.quantityPurchased - invTx.quantity),
            purchaseCost: Math.max(0, item.coffeeBeanDetails.purchaseCost - invTx.totalCost),
          },
        });
      }

      // Delete corresponding expense if exists
      const dateStart = new Date(invTx.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(invTx.date);
      dateEnd.setHours(23, 59, 59, 999);

      const matchingExpense = await tx.expense.findFirst({
        where: {
          amount: invTx.totalCost,
          date: { gte: dateStart, lte: dateEnd },
        },
      });

      if (matchingExpense) {
        await tx.expense.delete({ where: { id: matchingExpense.id } });
      }

      await tx.inventoryTransaction.delete({ where: { id: transactionId } });

      await tx.auditLog.create({
        data: {
          userId: currentPartner.id,
          partnerName: currentPartner.name,
          action: 'PURCHASE_DELETED',
          entity: 'InventoryTransaction',
          entityId: transactionId,
          details: `Deleted purchase of ${invTx.quantity} ${invTx.unit} ${item.name}`,
        },
      });
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete purchase' };
  }
}
