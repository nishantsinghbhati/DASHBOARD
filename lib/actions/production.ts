'use server';

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

export interface ProductionInputItem {
  inventoryItemId: string;
  quantity: number;
}

export interface CreateProductionBatchParams {
  batchNumber: string;
  productionDate: string;
  productId: string;
  batchType: 'COMMERCIAL' | 'TESTING' | 'RD' | 'SAMPLE' | 'INTERNAL';
  recipe?: string;
  notes?: string;
  expectedOutput: number;
  actualOutput: number;
  commercialBottles: number;
  testingBottles: number;
  wasteBottles: number;
  bestBeforeDays?: number;
  expiryDays?: number;
  ingredients: ProductionInputItem[];
  partnerId?: string;
}

export async function createProductionBatch(data: CreateProductionBatchParams) {
  try {
    const {
      batchNumber,
      productionDate,
      productId,
      batchType,
      recipe,
      notes,
      expectedOutput,
      actualOutput,
      commercialBottles,
      testingBottles,
      wasteBottles,
      bestBeforeDays = 30,
      expiryDays = 60,
      ingredients,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!batchNumber || !productId || actualOutput <= 0) {
      return { success: false, error: 'Please provide batch number, product, and valid actual output.' };
    }

    if (!ingredients || ingredients.length === 0) {
      return { success: false, error: 'At least one ingredient or packaging item must be added.' };
    }

    const prodDate = new Date(productionDate || new Date());
    const bestBeforeDate = new Date(prodDate);
    bestBeforeDate.setDate(bestBeforeDate.getDate() + bestBeforeDays);
    const expiryDate = new Date(prodDate);
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check duplicate batch number
      const existingBatch = await tx.productionBatch.findUnique({
        where: { batchNumber },
      });
      if (existingBatch) {
        throw new Error(`Production Batch Number "${batchNumber}" already exists.`);
      }

      // 2. Fetch product details
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      if (!product) throw new Error('Product not found.');

      // 3. Validate raw materials stock & calculate costs
      let rawMaterialCost = 0;
      let packagingCost = 0;
      const verifiedIngredients: Array<{
        item: any;
        requiredQty: number;
        unitCost: number;
        totalCost: number;
      }> = [];

      for (const input of ingredients) {
        if (input.quantity <= 0) continue;

        const item = await tx.inventoryItem.findUnique({
          where: { id: input.inventoryItemId },
          include: { coffeeBeanDetails: true },
        });

        if (!item) {
          throw new Error(`Raw material not found (ID: ${input.inventoryItemId}).`);
        }

        if (item.currentQuantity < input.quantity) {
          throw new Error(
            `Insufficient stock for "${item.name}". Available: ${item.currentQuantity} ${item.unit}, Required: ${input.quantity} ${item.unit}.`
          );
        }

        const cost = input.quantity * item.averageCost;
        const cat = (item.category || '').toLowerCase();
        if (
          cat.includes('packaging') ||
          cat.includes('bottle') ||
          cat.includes('cap') ||
          cat.includes('label')
        ) {
          packagingCost += cost;
        } else {
          rawMaterialCost += cost;
        }

        verifiedIngredients.push({
          item,
          requiredQty: input.quantity,
          unitCost: item.averageCost,
          totalCost: cost,
        });
      }

      const totalProductionCost = rawMaterialCost + packagingCost;
      const unitCost = actualOutput > 0 ? totalProductionCost / actualOutput : 0;
      const yieldPercent = expectedOutput > 0 ? (actualOutput / expectedOutput) * 100 : 100;

      // Extract bottle volume from product size if available (default 180ml)
      let volumeLiters = (actualOutput * 0.18);
      if (product.size?.toLowerCase().includes('1l')) {
        volumeLiters = actualOutput * 1.0;
      }
      const costPerLiter = volumeLiters > 0 ? totalProductionCost / volumeLiters : 0;

      // 4. Create ProductionBatch
      const batch = await tx.productionBatch.create({
        data: {
          batchNumber,
          productionDate: prodDate,
          productId,
          batchType,
          recipe,
          notes,
          status: 'CONFIRMED',
          expectedOutput,
          actualOutput,
          commercialBottles,
          testingBottles,
          wasteBottles,
          yieldPercent: Math.round(yieldPercent * 10) / 10,
          rawMaterialCost: Math.round(rawMaterialCost * 100) / 100,
          packagingCost: Math.round(packagingCost * 100) / 100,
          totalProductionCost: Math.round(totalProductionCost * 100) / 100,
          costPerUnit: Math.round(unitCost * 100) / 100,
          costPerLiter: Math.round(costPerLiter * 100) / 100,
          partnerId,
        },
      });

      // 5. Consume Raw Materials & record transactions
      for (const vi of verifiedIngredients) {
        // Record ingredient relation
        await tx.productionIngredient.create({
          data: {
            productionBatchId: batch.id,
            inventoryItemId: vi.item.id,
            quantity: vi.requiredQty,
            unit: vi.item.unit,
            unitCost: vi.unitCost,
            totalCost: vi.totalCost,
          },
        });

        // Deduct inventory
        const newQty = vi.item.currentQuantity - vi.requiredQty;
        const newVal = newQty * vi.item.averageCost;
        await tx.inventoryItem.update({
          where: { id: vi.item.id },
          data: {
            currentQuantity: newQty,
            currentStockValue: Math.round(newVal * 100) / 100,
          },
        });

        // Create transaction
        await tx.inventoryTransaction.create({
          data: {
            inventoryItemId: vi.item.id,
            type: 'PRODUCTION_CONSUMPTION',
            quantity: -vi.requiredQty,
            unit: vi.item.unit,
            unitCost: vi.unitCost,
            totalCost: vi.totalCost,
            reference: batchNumber,
            productionBatchId: batch.id,
            partnerId,
            notes: `Consumed for Batch ${batchNumber} (${product.name})`,
            date: prodDate,
          },
        });

        // If coffee bean, decrement remaining bean quantity
        if (vi.item.isCoffeeBean && vi.item.coffeeBeanDetails) {
          await tx.coffeeBean.update({
            where: { id: vi.item.coffeeBeanDetails.id },
            data: {
              quantityRemaining: Math.max(0, vi.item.coffeeBeanDetails.quantityRemaining - vi.requiredQty),
            },
          });
        }
      }

      // 6. Generate Finished Goods Lot
      const lotNumber = `FG-${batchNumber.replace(/^CB-/, '')}`;
      const netAvailableUnits = Math.max(0, actualOutput - wasteBottles);

      const lot = await tx.finishedGoodsLot.create({
        data: {
          lotNumber,
          productId,
          productionBatchId: batch.id,
          productionDate: prodDate,
          bestBeforeDate,
          expiryDate,
          quantityProduced: actualOutput,
          quantityAvailable: netAvailableUnits,
          quantitySold: 0,
          quantitySampled: 0,
          quantityWasted: wasteBottles,
          unit: product.unit || 'bottles',
          unitCost: Math.round(unitCost * 100) / 100,
          totalProductionCost: Math.round(totalProductionCost * 100) / 100,
          status: netAvailableUnits > 0 ? 'AVAILABLE' : 'SOLD_OUT',
          notes: batchType === 'TESTING' ? 'Testing / Internal Lot' : notes,
        },
      });

      // 7. Create Finished Goods Production Transaction
      await tx.finishedGoodsTransaction.create({
        data: {
          lotId: lot.id,
          type: 'PRODUCTION',
          quantity: actualOutput,
          unitCost: Math.round(unitCost * 100) / 100,
          totalCost: Math.round(totalProductionCost * 100) / 100,
          reference: batchNumber,
          partnerId,
          notes: `Produced from Batch ${batchNumber}`,
          date: prodDate,
        },
      });

      // 8. If waste bottles occurred during production, log waste record
      if (wasteBottles > 0) {
        const wasteCost = wasteBottles * unitCost;
        const wasteRecord = await tx.wasteRecord.create({
          data: {
            type: 'FINISHED_GOODS',
            finishedGoodsLotId: lot.id,
            productionBatchId: batch.id,
            quantity: wasteBottles,
            unit: product.unit || 'bottles',
            estimatedCost: Math.round(wasteCost * 100) / 100,
            reason: 'Production Spoilage / Filling Defect',
            notes: `Immediate production waste from ${batchNumber}`,
            partnerId,
            date: prodDate,
          },
        });

        await tx.finishedGoodsTransaction.create({
          data: {
            lotId: lot.id,
            type: 'WASTE',
            quantity: -wasteBottles,
            unitCost: Math.round(unitCost * 100) / 100,
            totalCost: Math.round(wasteCost * 100) / 100,
            reference: batchNumber,
            wasteRecordId: wasteRecord.id,
            partnerId,
            notes: `Production waste deduction for batch ${batchNumber}`,
            date: prodDate,
          },
        });
      }

      // 9. Create ProductionOutput record
      await tx.productionOutput.create({
        data: {
          productionBatchId: batch.id,
          productId,
          expectedQuantity: expectedOutput,
          actualQuantity: actualOutput,
          commercialQuantity: commercialBottles,
          testingQuantity: testingBottles,
          wasteQuantity: wasteBottles,
          finishedGoodsLotId: lot.id,
          unitCost: Math.round(unitCost * 100) / 100,
          totalCost: Math.round(totalProductionCost * 100) / 100,
        },
      });

      // 10. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCTION_CONFIRMED',
          entity: 'ProductionBatch',
          entityId: batch.id,
          oldValue: null,
          newValue: `${actualOutput} ${product.unit}`,
          details: `Confirmed Batch ${batchNumber} (${product.name}). Created Lot ${lotNumber}. Total Cost: ₹${totalProductionCost}. Yield: ${yieldPercent.toFixed(1)}%`,
        },
      });

      return { batch, lot };
    });

    safeRevalidatePath('/production');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/inventory/coffee-beans');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error confirming production batch:', error);
    return { success: false, error: error.message || 'Unable to confirm production batch.' };
  }
}

export async function createProduct(data: {
  name: string;
  sku?: string;
  category?: string;
  variant?: string;
  size?: string;
  unit?: string;
  sellingPrice: number;
  standardCost?: number;
  minStock?: number;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      name,
      sku,
      category = 'Cold Brew',
      variant = 'Original',
      size = '180ml',
      unit = 'bottles',
      sellingPrice,
      standardCost = 0,
      minStock = 20,
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!name.trim() || sellingPrice <= 0) {
      return { success: false, error: 'Product name and valid selling price are required.' };
    }

    const generatedSku = sku?.trim() || `FG-CB-${name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()}-${size.toUpperCase()}`;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: name.trim(),
          sku: generatedSku,
          category,
          variant,
          size,
          unit,
          sellingPrice,
          standardCost,
          minStock,
          notes,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCT_CREATED',
          entity: 'Product',
          entityId: product.id,
          newValue: `${product.name} (Selling ₹${sellingPrice})`,
          details: `Added new finished good product "${product.name}" to catalog`,
        },
      });

      return product;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/production');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error creating product:', error);
    return { success: false, error: error.message || 'Unable to create product.' };
  }
}

export async function updateProduct(data: {
  id: string;
  name: string;
  category: string;
  variant?: string;
  size: string;
  unit: string;
  sellingPrice: number;
  standardCost?: number;
  minStock?: number;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      id,
      name,
      category,
      variant,
      size,
      unit,
      sellingPrice,
      standardCost,
      minStock = 0,
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!id || !name.trim() || sellingPrice <= 0) {
      return { success: false, error: 'Product ID, name, and positive selling price are required.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
      });

      if (!existing) throw new Error('Product not found.');

      const updated = await tx.product.update({
        where: { id },
        data: {
          name: name.trim(),
          category,
          variant,
          size,
          unit,
          sellingPrice,
          standardCost,
          minStock,
          notes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCT_UPDATED',
          entity: 'Product',
          entityId: updated.id,
          oldValue: `${existing.name} (₹${existing.sellingPrice})`,
          newValue: `${updated.name} (₹${sellingPrice})`,
          details: `Updated product "${updated.name}" catalog definition`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/production');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message || 'Unable to update product.' };
  }
}

export async function deleteProduct(id: string, partnerId?: string) {
  try {
    if (!id) return { success: false, error: 'Product ID is required.' };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({
        where: { id },
        include: {
          finishedGoodsLots: true,
          saleItems: true,
          productionOutputs: true,
        },
      });

      if (!existing) throw new Error('Product not found.');

      if (
        existing.finishedGoodsLots.length > 0 ||
        existing.saleItems.length > 0 ||
        existing.productionOutputs.length > 0
      ) {
        throw new Error('Cannot delete this product because it has active inventory lots, sales, or production batch history.');
      }

      await tx.product.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId || 'PARTNER_NISHANT',
          partnerName: partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCT_DELETED',
          entity: 'Product',
          entityId: id,
          oldValue: `${existing.name}`,
          newValue: null,
          details: `Deleted product "${existing.name}" from catalog`,
        },
      });

      return existing;
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/production');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message || 'Unable to delete product.' };
  }
}

export interface UpdateProductionBatchParams {
  id: string;
  batchType?: string;
  recipe?: string;
  notes?: string;
  status?: string;
  actualOutput?: number;
  wasteBottles?: number;
  partnerId?: string;
}

export async function updateProductionBatch(data: UpdateProductionBatchParams) {
  try {
    const { id, batchType, recipe, notes, status, actualOutput, wasteBottles, partnerId = 'PARTNER_NISHANT' } = data;

    if (!id) return { success: false, error: 'Batch ID is required.' };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionBatch.findUnique({
        where: { id },
        include: { finishedGoodsLots: true },
      });

      if (!existing) throw new Error('Production batch not found.');

      const newActualOutput = actualOutput !== undefined ? actualOutput : existing.actualOutput;
      const newWasteBottles = wasteBottles !== undefined ? wasteBottles : existing.wasteBottles;

      const totalProduced = newActualOutput + newWasteBottles;
      const yieldPercent =
        existing.expectedOutput > 0
          ? Math.round((newActualOutput / existing.expectedOutput) * 100 * 10) / 10
          : 100;

      const costPerUnit =
        newActualOutput > 0
          ? Math.round((existing.totalProductionCost / newActualOutput) * 100) / 100
          : existing.costPerUnit;

      const updated = await tx.productionBatch.update({
        where: { id },
        data: {
          ...(batchType ? { batchType } : {}),
          ...(recipe !== undefined ? { recipe } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(status ? { status } : {}),
          actualOutput: newActualOutput,
          wasteBottles: newWasteBottles,
          commercialBottles: newActualOutput,
          yieldPercent,
          costPerUnit,
        },
      });

      // Update associated finished goods lot if actualOutput changed
      for (const lot of existing.finishedGoodsLots) {
        const sold = lot.quantitySold;
        const sampled = lot.quantitySampled;
        const wasted = lot.quantityWasted;
        const newAvailable = Math.max(0, newActualOutput - sold - sampled - wasted);

        await tx.finishedGoodsLot.update({
          where: { id: lot.id },
          data: {
            quantityProduced: newActualOutput,
            quantityAvailable: newAvailable,
            unitCost: costPerUnit,
            status: newAvailable === 0 && sold > 0 ? 'SOLD_OUT' : 'AVAILABLE',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCTION_BATCH_UPDATED',
          entity: 'ProductionBatch',
          entityId: id,
          oldValue: `${existing.batchNumber} (${existing.actualOutput} btls, ${existing.status})`,
          newValue: `${updated.batchNumber} (${newActualOutput} btls, ${status || existing.status})`,
          details: `Updated batch ${existing.batchNumber} details and output yield metrics.`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/production');
    safeRevalidatePath(`/production/${result.batchNumber}`);
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating production batch:', error);
    return { success: false, error: error.message || 'Unable to update batch.' };
  }
}

export async function deleteProductionBatch(id: string, partnerId = 'PARTNER_NISHANT') {
  try {
    if (!id) return { success: false, error: 'Batch ID is required.' };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.productionBatch.findUnique({
        where: { id },
        include: {
          ingredients: { include: { inventoryItem: true } },
          finishedGoodsLots: { include: { saleItems: true } },
          outputs: true,
          wasteRecords: true,
        },
      });

      if (!existing) throw new Error('Production batch not found.');

      // Prevent deletion if bottles from this batch have already been sold in sales
      const totalSoldFromLots = existing.finishedGoodsLots.reduce((acc, lot) => acc + lot.quantitySold, 0);
      if (totalSoldFromLots > 0) {
        throw new Error(
          `Cannot delete batch ${existing.batchNumber} because ${totalSoldFromLots} bottles have already been sold to cafés. Delete or adjust the sales first.`
        );
      }

      // 1. Revert raw material consumptions: add quantity back to inventory items
      for (const ing of existing.ingredients) {
        const item = ing.inventoryItem;
        const restoredQty = item.currentQuantity + ing.quantity;
        const restoredVal = item.currentStockValue + ing.totalCost;
        const newAvgCost = restoredQty > 0 ? restoredVal / restoredQty : item.averageCost;

        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            currentQuantity: Math.round(restoredQty * 100) / 100,
            currentStockValue: Math.round(restoredVal * 100) / 100,
            averageCost: Math.round(newAvgCost * 100) / 100,
          },
        });
      }

      // 2. Delete inventory transactions for this batch
      await tx.inventoryTransaction.deleteMany({
        where: { productionBatchId: id },
      });

      // 3. Delete finished goods transactions and lots
      for (const lot of existing.finishedGoodsLots) {
        await tx.finishedGoodsTransaction.deleteMany({
          where: { lotId: lot.id },
        });
        await tx.finishedGoodsLot.delete({
          where: { id: lot.id },
        });
      }

      // 4. Delete outputs, ingredients, and waste records
      await tx.productionOutput.deleteMany({ where: { productionBatchId: id } });
      await tx.productionIngredient.deleteMany({ where: { productionBatchId: id } });
      await tx.wasteRecord.deleteMany({ where: { productionBatchId: id } });

      // 5. Delete batch
      await tx.productionBatch.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'PRODUCTION_BATCH_DELETED',
          entity: 'ProductionBatch',
          entityId: id,
          oldValue: `${existing.batchNumber} (${existing.actualOutput} btls)`,
          newValue: null,
          details: `Deleted batch ${existing.batchNumber} and restored raw materials back into inventory.`,
        },
      });

      return existing;
    });

    safeRevalidatePath('/production');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/inventory/raw-materials');
    safeRevalidatePath('/');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error deleting production batch:', error);
    return { success: false, error: error.message || 'Unable to delete batch.' };
  }
}

