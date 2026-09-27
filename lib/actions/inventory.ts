'use server';

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

export async function purchaseRawMaterial(formData: {
  inventoryItemId: string;
  quantity: number;
  unitCost: number;
  supplierId?: string;
  reference?: string;
  partnerId?: string;
  notes?: string;
  date?: string;
}) {
  try {
    const { inventoryItemId, quantity, unitCost, supplierId, reference, partnerId, notes, date } = formData;

    if (quantity <= 0 || unitCost < 0) {
      return { success: false, error: 'Quantity and unit cost must be greater than zero.' };
    }

    const txDate = date ? new Date(date) : new Date();
    const totalCost = quantity * unitCost;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: { coffeeBeanDetails: true },
      });

      if (!item) {
        throw new Error('Raw material item not found.');
      }

      const prevQty = item.currentQuantity;
      const prevVal = item.currentStockValue;
      const newQty = prevQty + quantity;
      const newVal = prevVal + totalCost;
      const newAvgCost = newQty > 0 ? newVal / newQty : unitCost;

      // 1. Create ledger transaction
      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId,
          type: 'PURCHASE',
          quantity,
          unit: item.unit,
          unitCost,
          totalCost,
          reference: reference || `PO-${Date.now().toString().slice(-6)}`,
          partnerId: partnerId || 'PARTNER_NISHANT',
          notes: notes || 'Raw material purchase',
          date: txDate,
        },
      });

      // 2. Update cached inventory balances
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentQuantity: newQty,
          averageCost: Math.round(newAvgCost * 100) / 100,
          currentStockValue: Math.round(newVal * 100) / 100,
          supplierId: supplierId || item.supplierId,
        },
      });

      // 3. If coffee bean, update remaining bean quantity
      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: item.coffeeBeanDetails.quantityRemaining + quantity,
          },
        });
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          userId: partnerId || 'PARTNER_NISHANT',
          partnerName: partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_PURCHASED',
          entity: 'InventoryItem',
          entityId: item.id,
          oldValue: `${prevQty} ${item.unit}`,
          newValue: `${newQty} ${item.unit}`,
          details: `Purchased ${quantity} ${item.unit} at ₹${unitCost}/${item.unit}. Total: ₹${totalCost}`,
        },
      });

      return transaction;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error purchasing raw material:', error);
    return { success: false, error: error.message || 'Unable to record purchase.' };
  }
}

export async function recordRawMaterialWaste(formData: {
  inventoryItemId: string;
  quantity: number;
  reason: string;
  partnerId?: string;
  notes?: string;
}) {
  try {
    const { inventoryItemId, quantity, reason, partnerId, notes } = formData;

    if (quantity <= 0) {
      return { success: false, error: 'Waste quantity must be greater than zero.' };
    }

    await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: { coffeeBeanDetails: true },
      });

      if (!item) throw new Error('Item not found');
      if (item.currentQuantity < quantity) {
        throw new Error(`Insufficient stock. Current: ${item.currentQuantity} ${item.unit}, requested waste: ${quantity} ${item.unit}`);
      }

      const estCost = quantity * item.averageCost;

      // 1. Waste record
      const wasteRecord = await tx.wasteRecord.create({
        data: {
          type: 'RAW_MATERIAL',
          inventoryItemId,
          quantity,
          unit: item.unit,
          estimatedCost: estCost,
          reason,
          notes,
          partnerId: partnerId || 'PARTNER_NISHANT',
        },
      });

      // 2. Inventory transaction
      await tx.inventoryTransaction.create({
        data: {
          inventoryItemId,
          type: 'WASTE',
          quantity: -quantity,
          unit: item.unit,
          unitCost: item.averageCost,
          totalCost: estCost,
          reference: `WASTE-RM-${Date.now().toString().slice(-4)}`,
          wasteRecordId: wasteRecord.id,
          partnerId: partnerId || 'PARTNER_NISHANT',
          notes: `Waste: ${reason}. ${notes || ''}`,
        },
      });

      // 3. Update stock balance
      const newQty = item.currentQuantity - quantity;
      const newVal = newQty * item.averageCost;
      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentQuantity: newQty,
          currentStockValue: Math.round(newVal * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: Math.max(0, item.coffeeBeanDetails.quantityRemaining - quantity),
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId || 'PARTNER_NISHANT',
          partnerName: partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_WASTE_RECORDED',
          entity: 'InventoryItem',
          entityId: item.id,
          oldValue: `${item.currentQuantity} ${item.unit}`,
          newValue: `${newQty} ${item.unit}`,
          details: `Logged ${quantity} ${item.unit} waste for ${item.name}. Reason: ${reason}`,
        },
      });
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error recording raw material waste:', error);
    return { success: false, error: error.message || 'Unable to record waste.' };
  }
}

export async function createInventoryItem(data: {
  name: string;
  sku?: string;
  category: string;
  unit: string;
  minStock?: number;
  averageCost?: number;
  supplierId?: string;
  storageLocation?: string;
  isCoffeeBean?: boolean;
  origin?: string;
  roast?: string;
  beanType?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      name,
      sku,
      category,
      unit,
      minStock = 0,
      averageCost = 0,
      supplierId,
      storageLocation,
      isCoffeeBean = false,
      origin = 'Origin Estate',
      roast = 'Medium-Dark',
      beanType = 'Arabica',
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!name.trim()) {
      return { success: false, error: 'Material name is required.' };
    }

    const generatedSku = sku?.trim() || `RM-${category.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.create({
        data: {
          name: name.trim(),
          sku: generatedSku,
          category,
          unit,
          currentQuantity: 0,
          minStock,
          averageCost,
          currentStockValue: 0,
          supplierId: supplierId || null,
          storageLocation: storageLocation || 'Warehouse 4B',
          isCoffeeBean,
          notes,
        },
      });

      if (isCoffeeBean) {
        await tx.coffeeBean.create({
          data: {
            inventoryItemId: item.id,
            beanName: name.trim(),
            origin,
            supplier: 'Primary Supplier',
            roast,
            beanType,
            quantityPurchased: 0,
            quantityRemaining: 0,
            purchaseCost: 0,
            costPerKg: averageCost,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_CREATED',
          entity: 'InventoryItem',
          entityId: item.id,
          newValue: `${item.name} (${item.sku})`,
          details: `Created new raw material "${item.name}" in category ${category}`,
        },
      });

      return item;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return { success: false, error: error.message || 'Unable to create material.' };
  }
}

export async function updateInventoryItem(data: {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock?: number;
  averageCost?: number;
  supplierId?: string;
  storageLocation?: string;
  notes?: string;
  origin?: string;
  roast?: string;
  beanType?: string;
  partnerId?: string;
}) {
  try {
    const {
      id,
      name,
      category,
      unit,
      minStock = 0,
      averageCost = 0,
      supplierId,
      storageLocation,
      notes,
      origin,
      roast,
      beanType,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!id || !name.trim()) {
      return { success: false, error: 'Item ID and name are required.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: { id },
        include: { coffeeBeanDetails: true },
      });

      if (!existing) {
        throw new Error('Raw material item not found.');
      }

      const updated = await tx.inventoryItem.update({
        where: { id },
        data: {
          name: name.trim(),
          category,
          unit,
          minStock,
          averageCost,
          currentStockValue: existing.currentQuantity * averageCost,
          supplierId: supplierId || null,
          storageLocation: storageLocation || existing.storageLocation,
          notes,
        },
      });

      if (existing.isCoffeeBean && existing.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: existing.coffeeBeanDetails.id },
          data: {
            beanName: name.trim(),
            origin: origin || existing.coffeeBeanDetails.origin,
            roast: roast || existing.coffeeBeanDetails.roast,
            beanType: beanType || existing.coffeeBeanDetails.beanType,
            costPerKg: averageCost,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_UPDATED',
          entity: 'InventoryItem',
          entityId: updated.id,
          oldValue: `${existing.name}`,
          newValue: `${updated.name}`,
          details: `Updated raw material "${updated.name}" (${updated.category})`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating inventory item:', error);
    return { success: false, error: error.message || 'Unable to update material.' };
  }
}

export async function deleteInventoryItem(id: string, partnerId?: string) {
  try {
    if (!id) return { success: false, error: 'Item ID is required.' };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryItem.findUnique({
        where: { id },
        include: {
          coffeeBeanDetails: true,
          transactions: true,
          productionIngredients: true,
        },
      });

      if (!existing) throw new Error('Item not found.');

      if (existing.productionIngredients.length > 0) {
        throw new Error('Cannot delete this material because it is linked to production batch history.');
      }

      if (existing.coffeeBeanDetails) {
        await tx.coffeeBean.delete({
          where: { id: existing.coffeeBeanDetails.id },
        });
      }

      await tx.inventoryTransaction.deleteMany({
        where: { inventoryItemId: id },
      });

      await tx.inventoryItem.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId || 'PARTNER_NISHANT',
          partnerName: partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_DELETED',
          entity: 'InventoryItem',
          entityId: id,
          oldValue: `${existing.name}`,
          newValue: null,
          details: `Deleted raw material "${existing.name}"`,
        },
      });

      return existing;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error deleting inventory item:', error);
    return { success: false, error: error.message || 'Unable to delete material.' };
  }
}

export async function recordRawMaterialUsage(formData: {
  inventoryItemId: string;
  quantity: number;
  date?: string;
  reference?: string;
  partnerId?: string;
  notes?: string;
  type?: string;
}) {
  try {
    const {
      inventoryItemId,
      quantity,
      date,
      reference,
      partnerId = 'PARTNER_NISHANT',
      notes,
      type = 'PRODUCTION_CONSUMPTION',
    } = formData;

    if (quantity <= 0) {
      return { success: false, error: 'Usage quantity must be greater than zero.' };
    }

    const txDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({
        where: { id: inventoryItemId },
        include: { coffeeBeanDetails: true },
      });
      if (!item) throw new Error('Item not found.');

      if (quantity > item.currentQuantity) {
        throw new Error(
          `Cannot log usage of ${quantity} ${item.unit}. Available stock is only ${item.currentQuantity} ${item.unit}.`
        );
      }

      const totalCost = quantity * item.averageCost;

      const transaction = await tx.inventoryTransaction.create({
        data: {
          inventoryItemId,
          type,
          quantity: -quantity,
          unit: item.unit,
          unitCost: item.averageCost,
          totalCost,
          reference: reference || `USE-${Date.now().toString().slice(-4)}`,
          partnerId,
          notes: notes || 'Logged material usage',
          date: txDate,
        },
      });

      // Recalculate item stock from ledger
      const allTx = await tx.inventoryTransaction.findMany({
        where: { inventoryItemId },
      });
      const totalQty = allTx.reduce((sum, t) => sum + t.quantity, 0);
      const stockVal = Math.max(0, totalQty * item.averageCost);

      await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: {
          currentQuantity: Math.max(0, totalQty),
          currentStockValue: Math.round(stockVal * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: Math.max(0, totalQty),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'RAW_MATERIAL_USAGE_RECORDED',
          entity: 'InventoryTransaction',
          entityId: transaction.id,
          details: `Logged usage of ${quantity} ${item.unit} for ${item.name}`,
        },
      });

      return transaction;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error recording usage:', error);
    return { success: false, error: error.message || 'Failed to record usage.' };
  }
}

export async function updateInventoryTransaction(data: {
  id: string;
  date: string;
  type: string;
  quantity: number;
  unitCost: number;
  reference?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      id,
      date,
      type,
      quantity,
      unitCost,
      reference,
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!id) return { success: false, error: 'Transaction ID is required.' };
    if (unitCost < 0) return { success: false, error: 'Unit cost cannot be negative.' };

    const totalCost = Math.abs(quantity) * unitCost;
    const txDate = new Date(date);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryTransaction.findUnique({
        where: { id },
        include: { inventoryItem: { include: { coffeeBeanDetails: true } } },
      });
      if (!existing) throw new Error('Transaction record not found.');

      await tx.inventoryTransaction.update({
        where: { id },
        data: {
          date: txDate,
          type,
          quantity,
          unitCost,
          totalCost,
          reference: reference || existing.reference,
          notes: notes !== undefined ? notes : existing.notes,
          partnerId,
        },
      });

      // Recalculate balance for this inventory item
      const item = existing.inventoryItem;
      const allTx = await tx.inventoryTransaction.findMany({
        where: { inventoryItemId: item.id },
      });
      const totalQty = allTx.reduce((sum, t) => sum + t.quantity, 0);

      const purchases = allTx.filter((t) => t.type === 'PURCHASE' || t.quantity > 0);
      const totalPurchasedCost = purchases.reduce((sum, t) => sum + Math.abs(t.totalCost), 0);
      const totalPurchasedQty = purchases.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
      const avgCost = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : item.averageCost;
      const stockValue = Math.max(0, totalQty * avgCost);

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: Math.max(0, totalQty),
          averageCost: Math.round(avgCost * 100) / 100,
          currentStockValue: Math.round(stockValue * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: Math.max(0, totalQty),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'INVENTORY_TRANSACTION_UPDATED',
          entity: 'InventoryTransaction',
          entityId: id,
          oldValue: `${existing.quantity} ${existing.unit} @ ₹${existing.unitCost} (${existing.type})`,
          newValue: `${quantity} ${existing.unit} @ ₹${unitCost} (${type})`,
          details: `Edited transaction on ${date} for ${item.name}`,
        },
      });
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating inventory transaction:', error);
    return { success: false, error: error.message || 'Unable to update entry.' };
  }
}

export async function deleteInventoryTransaction(
  id: string,
  partnerId: string = 'PARTNER_NISHANT'
) {
  try {
    if (!id) return { success: false, error: 'Transaction ID is required.' };

    await prisma.$transaction(async (tx) => {
      const existing = await tx.inventoryTransaction.findUnique({
        where: { id },
        include: { inventoryItem: { include: { coffeeBeanDetails: true } } },
      });
      if (!existing) throw new Error('Transaction record not found.');

      await tx.inventoryTransaction.delete({
        where: { id },
      });

      // Recalculate balance for this inventory item
      const item = existing.inventoryItem;
      const allTx = await tx.inventoryTransaction.findMany({
        where: { inventoryItemId: item.id },
      });
      const totalQty = allTx.reduce((sum, t) => sum + t.quantity, 0);

      const purchases = allTx.filter((t) => t.type === 'PURCHASE' || t.quantity > 0);
      const totalPurchasedCost = purchases.reduce((sum, t) => sum + Math.abs(t.totalCost), 0);
      const totalPurchasedQty = purchases.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
      const avgCost = totalPurchasedQty > 0 ? totalPurchasedCost / totalPurchasedQty : item.averageCost;
      const stockValue = Math.max(0, totalQty * avgCost);

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentQuantity: Math.max(0, totalQty),
          averageCost: Math.round(avgCost * 100) / 100,
          currentStockValue: Math.round(stockValue * 100) / 100,
        },
      });

      if (item.isCoffeeBean && item.coffeeBeanDetails) {
        await tx.coffeeBean.update({
          where: { id: item.coffeeBeanDetails.id },
          data: {
            quantityRemaining: Math.max(0, totalQty),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'INVENTORY_TRANSACTION_DELETED',
          entity: 'InventoryTransaction',
          entityId: id,
          oldValue: `${existing.quantity} ${existing.unit} on ${existing.date}`,
          details: `Deleted transaction entry for ${item.name}`,
        },
      });
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting inventory transaction:', error);
    return { success: false, error: error.message || 'Unable to delete entry.' };
  }
}

