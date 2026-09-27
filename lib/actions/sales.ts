'use server';

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

export interface SaleItemInput {
  productId?: string;
  lotId?: string; // optional: if omitted, FIFO will automatically choose
  quantity: number;
  unitPrice: number;
  discount?: number;
  bottleSize?: string; // '180ml' | '1L'
  flavor?: string; // e.g. "Classic Cold Brew (100% Arabica)", "Floral Cold Brew"
}

export interface RecordSaleParams {
  cafeId?: string;
  date?: string;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  amountPaid?: number;
  paymentMethod?: string;
  bottleSize?: string; // '180ml' | '1L' | 'Mixed'
  flavor?: string;
  notes?: string;
  partnerId?: string;
  items: SaleItemInput[];
}

export async function recordSale(params: RecordSaleParams) {
  try {
    const {
      cafeId,
      date,
      paymentStatus = 'PAID',
      amountPaid: inputAmountPaid,
      paymentMethod = 'UPI',
      bottleSize: mainBottleSize,
      flavor: mainFlavor,
      notes,
      partnerId = 'PARTNER_NISHANT',
      items,
    } = params;

    if (!items || items.length === 0) {
      return { success: false, error: 'At least one product line item must be included in the sale.' };
    }

    for (const item of items) {
      if (item.quantity <= 0 || item.unitPrice < 0) {
        return { success: false, error: 'Item quantities and prices must be positive numbers.' };
      }
    }

    const saleDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Generate unique sale number
      const saleCount = await tx.sale.count();
      const saleNumber = `SALE-${new Date().getFullYear()}-${String(saleCount + 1).padStart(3, '0')}`;

      // 2. Resolve products and plan allocations
      type PlannedAllocation = {
        productId: string;
        lotId: string | null;
        bottleSize: string;
        flavor: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        lineTotal: number;
        unitCost: number;
        grossMargin: number;
      };

      const plannedAllocations: PlannedAllocation[] = [];
      let saleSubtotal = 0;
      let totalDiscount = 0;

      for (const reqItem of items) {
        const itemBottleSize = reqItem.bottleSize || mainBottleSize || '180ml';
        const itemFlavor = reqItem.flavor || mainFlavor || 'Classic Cold Brew';

        let targetProductId = reqItem.productId;

        // If no product ID is explicitly supplied, find or auto-create appropriate Product
        if (!targetProductId) {
          // Search for existing product with matching size and flavor/variant
          let matchedProduct = await tx.product.findFirst({
            where: {
              isActive: true,
              OR: [
                {
                  size: itemBottleSize,
                  variant: { contains: itemFlavor },
                },
                {
                  size: itemBottleSize,
                  name: { contains: itemFlavor },
                },
              ],
            },
          });

          if (!matchedProduct) {
            // Check any active product matching bottle size
            matchedProduct = await tx.product.findFirst({
              where: { size: itemBottleSize, isActive: true },
            });
          }

          if (!matchedProduct) {
            // Auto-create product for catalog completeness
            const slug = (itemFlavor.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || 'CB').toUpperCase();
            const sku = `FG-CB-${slug}-${itemBottleSize.toUpperCase().replace(/\s+/g, '')}`;

            // Check if SKU exists to avoid collisions
            const existingSku = await tx.product.findUnique({ where: { sku } });
            const finalSku = existingSku ? `${sku}-${Date.now().toString().slice(-4)}` : sku;

            matchedProduct = await tx.product.create({
              data: {
                sku: finalSku,
                name: `${itemFlavor} ${itemBottleSize}`,
                category: 'Cold Brew',
                variant: itemFlavor,
                size: itemBottleSize,
                unit: 'bottles',
                sellingPrice: reqItem.unitPrice || (itemBottleSize === '1L' ? 480 : 120),
                standardCost: itemBottleSize === '1L' ? 210 : 45,
                minStock: 20,
                isActive: true,
                notes: `Cold brew crafted with ${itemFlavor}`,
              },
            });
          }

          targetProductId = matchedProduct.id;
        }

        const product = await tx.product.findUnique({
          where: { id: targetProductId },
          include: { finishedGoodsLots: true },
        });

        if (!product) {
          throw new Error('Product not found.');
        }

        let remainingToFulfill = reqItem.quantity;
        const lineDiscount = reqItem.discount || 0;

        // If specific lot was provided:
        if (reqItem.lotId) {
          const lot = await tx.finishedGoodsLot.findUnique({
            where: { id: reqItem.lotId },
          });

          if (lot && lot.quantityAvailable >= reqItem.quantity) {
            const lineTotal = reqItem.quantity * reqItem.unitPrice - lineDiscount;
            const totalUnitCost = reqItem.quantity * lot.unitCost;
            const grossMargin = lineTotal - totalUnitCost;

            plannedAllocations.push({
              productId: targetProductId,
              lotId: lot.id,
              bottleSize: itemBottleSize,
              flavor: itemFlavor,
              quantity: reqItem.quantity,
              unitPrice: reqItem.unitPrice,
              discount: lineDiscount,
              lineTotal,
              unitCost: lot.unitCost,
              grossMargin,
            });
          } else {
            // Find or create fallback lot so finishedGoodsLotId is always valid
            let fallbackLot = await tx.finishedGoodsLot.findFirst({
              where: { productId: targetProductId },
            });
            if (!fallbackLot) {
              fallbackLot = await tx.finishedGoodsLot.create({
                data: {
                  lotNumber: `LOT-${product.sku}-${Date.now().toString().slice(-4)}`,
                  productId: targetProductId,
                  quantityProduced: 100,
                  quantityAvailable: 100,
                  unitCost: product.standardCost || 45,
                  totalProductionCost: 100 * (product.standardCost || 45),
                  status: 'AVAILABLE',
                },
              });
            }

            const lineTotal = reqItem.quantity * reqItem.unitPrice - lineDiscount;
            const cost = fallbackLot.unitCost || product.standardCost || 45;
            plannedAllocations.push({
              productId: targetProductId,
              lotId: fallbackLot.id,
              bottleSize: itemBottleSize,
              flavor: itemFlavor,
              quantity: reqItem.quantity,
              unitPrice: reqItem.unitPrice,
              discount: lineDiscount,
              lineTotal,
              unitCost: cost,
              grossMargin: lineTotal - reqItem.quantity * cost,
            });
          }

          saleSubtotal += reqItem.quantity * reqItem.unitPrice;
          totalDiscount += lineDiscount;
        } else {
          // Automatic FIFO: Find available lots with quantityAvailable > 0
          const availableLots = await tx.finishedGoodsLot.findMany({
            where: {
              productId: targetProductId,
              quantityAvailable: { gt: 0 },
            },
            orderBy: { productionDate: 'asc' }, // FIFO
          });

          if (availableLots.length > 0) {
            for (const lot of availableLots) {
              if (remainingToFulfill <= 0) break;

              const takeQty = Math.min(remainingToFulfill, lot.quantityAvailable);
              const lineTotal = takeQty * reqItem.unitPrice;
              const totalUnitCost = takeQty * lot.unitCost;
              const grossMargin = lineTotal - totalUnitCost;

              plannedAllocations.push({
                productId: targetProductId,
                lotId: lot.id,
                bottleSize: itemBottleSize,
                flavor: itemFlavor,
                quantity: takeQty,
                unitPrice: reqItem.unitPrice,
                discount: 0,
                lineTotal,
                unitCost: lot.unitCost,
                grossMargin,
              });

              saleSubtotal += lineTotal;
              remainingToFulfill -= takeQty;
            }
          }

          // If remaining cannot be fulfilled from available lots, use fallback lot
          if (remainingToFulfill > 0) {
            let fallbackLot = await tx.finishedGoodsLot.findFirst({
              where: { productId: targetProductId },
            });
            if (!fallbackLot) {
              fallbackLot = await tx.finishedGoodsLot.create({
                data: {
                  lotNumber: `LOT-${product.sku}-${Date.now().toString().slice(-4)}`,
                  productId: targetProductId,
                  quantityProduced: 100,
                  quantityAvailable: 100,
                  unitCost: product.standardCost || 45,
                  totalProductionCost: 100 * (product.standardCost || 45),
                  status: 'AVAILABLE',
                },
              });
            }

            const lineTotal = remainingToFulfill * reqItem.unitPrice;
            const cost = fallbackLot.unitCost || product.standardCost || 45;
            const grossMargin = lineTotal - remainingToFulfill * cost;

            plannedAllocations.push({
              productId: targetProductId,
              lotId: fallbackLot.id,
              bottleSize: itemBottleSize,
              flavor: itemFlavor,
              quantity: remainingToFulfill,
              unitPrice: reqItem.unitPrice,
              discount: 0,
              lineTotal,
              unitCost: cost,
              grossMargin,
            });

            saleSubtotal += lineTotal;
          }

          totalDiscount += lineDiscount;
        }
      }

      const totalAmount = Math.max(0, saleSubtotal - totalDiscount);

      // Determine amount paid
      let resolvedAmountPaid = 0;
      if (paymentStatus === 'PAID') {
        resolvedAmountPaid = totalAmount;
      } else if (paymentStatus === 'PARTIAL') {
        resolvedAmountPaid = inputAmountPaid !== undefined ? Math.min(inputAmountPaid, totalAmount) : 0;
      } else {
        resolvedAmountPaid = 0;
      }

      const primaryBottleSize = mainBottleSize || (items.length === 1 ? items[0].bottleSize || '180ml' : 'Mixed');
      const primaryFlavor = mainFlavor || (items.length === 1 ? items[0].flavor || 'Classic' : 'Multiple Flavors');

      // 3. Create Sale record
      const sale = await tx.sale.create({
        data: {
          saleNumber,
          date: saleDate,
          cafeId: cafeId || null,
          subtotal: Math.round(saleSubtotal * 100) / 100,
          discount: Math.round(totalDiscount * 100) / 100,
          tax: 0,
          total: Math.round(totalAmount * 100) / 100,
          amountPaid: Math.round(resolvedAmountPaid * 100) / 100,
          paymentStatus,
          paymentMethod,
          bottleSize: primaryBottleSize,
          flavor: primaryFlavor,
          notes,
          partnerId,
        },
      });

      // 4. Process allocations: Update Lots and create SaleItems & Transactions
      for (const alloc of plannedAllocations) {
        const saleItem = await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: alloc.productId,
            finishedGoodsLotId: alloc.lotId,
            bottleSize: alloc.bottleSize,
            flavor: alloc.flavor,
            quantity: alloc.quantity,
            unitPrice: alloc.unitPrice,
            discount: alloc.discount,
            total: Math.round(alloc.lineTotal * 100) / 100,
            unitCost: alloc.unitCost,
            grossMargin: Math.round(alloc.grossMargin * 100) / 100,
          },
        });

        // If lot was linked, decrement Lot stock and create FIFO FinishedGoodsTransaction
        if (alloc.lotId) {
          const lot = await tx.finishedGoodsLot.findUnique({ where: { id: alloc.lotId } });
          if (lot) {
            const newAvailable = Math.max(0, lot.quantityAvailable - alloc.quantity);
            const newSold = lot.quantitySold + alloc.quantity;
            const newStatus = newAvailable <= 0 ? 'SOLD_OUT' : 'PARTIALLY_SOLD';

            await tx.finishedGoodsLot.update({
              where: { id: alloc.lotId },
              data: {
                quantityAvailable: newAvailable,
                quantitySold: newSold,
                status: newStatus,
              },
            });

            await tx.finishedGoodsTransaction.create({
              data: {
                lotId: alloc.lotId,
                type: 'SALE',
                quantity: -alloc.quantity,
                unitCost: alloc.unitCost,
                totalCost: Math.round(alloc.quantity * alloc.unitCost * 100) / 100,
                reference: saleNumber,
                saleItemId: saleItem.id,
                cafeId: cafeId || null,
                partnerId,
                notes: `B2B Sale to ${cafeId ? 'Café' : 'Direct Customer'}. Total: ₹${alloc.lineTotal}`,
                date: saleDate,
              },
            });
          }
        }
      }

      // 5. If Cafe is in lead stage, promote to ACCEPTED / CUSTOMER
      if (cafeId) {
        const cafe = await tx.cafe.findUnique({ where: { id: cafeId } });
        if (cafe && !['ACCEPTED', 'CUSTOMER'].includes(cafe.status)) {
          const prevStatus = cafe.status;
          await tx.cafe.update({
            where: { id: cafeId },
            data: { status: 'ACCEPTED', lastContacted: saleDate },
          });
          await tx.cafeStatusHistory.create({
            data: {
              cafeId,
              oldStatus: prevStatus,
              newStatus: 'ACCEPTED',
              changedBy: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
              notes: `Converted to active buying account via B2B order ${saleNumber}`,
            },
          });
        }
      }

      // 6. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'SALE_CREATED',
          entity: 'Sale',
          entityId: sale.id,
          oldValue: null,
          newValue: `₹${totalAmount}`,
          details: `Recorded B2B sale ${saleNumber} for ₹${totalAmount}. Bottle size: ${primaryBottleSize}, Flavor: ${primaryFlavor}. Units: ${plannedAllocations.reduce((a, b) => a + b.quantity, 0)} btls. Paid: ₹${resolvedAmountPaid}.`,
        },
      });

      return sale;
    });

    safeRevalidatePath('/sales');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/cafes');
    safeRevalidatePath('/cafes/pitching');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error recording sale:', error);
    return { success: false, error: error.message || 'Unable to record sale.' };
  }
}

export async function updateSalePayment(params: {
  saleId: string;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE';
  amountPaid?: number;
  paymentMethod?: string;
  partnerId?: string;
}) {
  try {
    const {
      saleId,
      paymentStatus,
      amountPaid: inputPaid,
      paymentMethod,
      partnerId = 'PARTNER_NISHANT',
    } = params;

    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) return { success: false, error: 'Sale record not found.' };

    let newAmountPaid = sale.amountPaid;
    if (paymentStatus === 'PAID') {
      newAmountPaid = sale.total;
    } else if (paymentStatus === 'PENDING') {
      newAmountPaid = 0;
    } else if (paymentStatus === 'PARTIAL' && inputPaid !== undefined) {
      newAmountPaid = Math.min(inputPaid, sale.total);
    }

    const updated = await prisma.sale.update({
      where: { id: saleId },
      data: {
        paymentStatus,
        amountPaid: newAmountPaid,
        ...(paymentMethod ? { paymentMethod } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: partnerId,
        partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
        action: 'SALE_PAYMENT_UPDATED',
        entity: 'Sale',
        entityId: sale.id,
        oldValue: `${sale.paymentStatus} (₹${sale.amountPaid})`,
        newValue: `${paymentStatus} (₹${newAmountPaid})`,
        details: `Updated payment status for ${sale.saleNumber} to ${paymentStatus}. Paid: ₹${newAmountPaid} of ₹${sale.total}.`,
      },
    });

    safeRevalidatePath('/sales');
    safeRevalidatePath('/cafes');
    safeRevalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating sale payment:', error);
    return { success: false, error: error.message || 'Failed to update payment status.' };
  }
}

export async function updateSale(params: {
  saleId: string;
  cafeId?: string | null;
  date?: string;
  bottleSize?: string;
  flavor?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  paymentStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  amountPaid?: number;
  paymentMethod?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      saleId,
      cafeId,
      date,
      bottleSize,
      flavor,
      quantity,
      unitPrice,
      discount = 0,
      paymentStatus = 'PAID',
      amountPaid: inputPaid,
      paymentMethod = 'UPI',
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = params;

    if (!saleId) return { success: false, error: 'Sale ID is required.' };
    if (quantity <= 0 || unitPrice < 0) {
      return { success: false, error: 'Quantity and unit price must be positive numbers.' };
    }

    const saleDate = date ? new Date(date) : undefined;
    const subtotal = Math.round(quantity * unitPrice * 100) / 100;
    const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    let finalAmountPaid = total;
    if (paymentStatus === 'PENDING') {
      finalAmountPaid = 0;
    } else if (paymentStatus === 'PARTIAL') {
      finalAmountPaid = inputPaid !== undefined ? Math.min(inputPaid, total) : Math.min(finalAmountPaid, total);
    } else if (paymentStatus === 'PAID') {
      finalAmountPaid = total;
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { id: saleId },
        include: { items: true },
      });

      if (!existing) throw new Error('Sale record not found.');

      // Check if primary item exists
      const primaryItem = existing.items[0];
      if (primaryItem) {
        const qtyDiff = quantity - primaryItem.quantity;
        // If attached to a finished goods lot, adjust availability
        if (primaryItem.finishedGoodsLotId && qtyDiff !== 0) {
          const lot = await tx.finishedGoodsLot.findUnique({
            where: { id: primaryItem.finishedGoodsLotId },
          });
          if (lot) {
            const newAvail = Math.max(0, lot.quantityAvailable - qtyDiff);
            const newSold = Math.max(0, lot.quantitySold + qtyDiff);
            await tx.finishedGoodsLot.update({
              where: { id: lot.id },
              data: {
                quantityAvailable: newAvail,
                quantitySold: newSold,
                status: newAvail === 0 ? 'SOLD_OUT' : 'AVAILABLE',
              },
            });
          }
        }

        // Update sale item
        await tx.saleItem.update({
          where: { id: primaryItem.id },
          data: {
            quantity,
            unitPrice,
            discount,
            total,
            bottleSize: bottleSize || primaryItem.bottleSize,
            flavor: flavor || primaryItem.flavor,
          },
        });
      }

      // Update sale header
      const updated = await tx.sale.update({
        where: { id: saleId },
        data: {
          cafeId: cafeId !== undefined ? cafeId : existing.cafeId,
          ...(saleDate ? { date: saleDate } : {}),
          subtotal,
          discount,
          total,
          amountPaid: finalAmountPaid,
          paymentStatus,
          paymentMethod,
          bottleSize: bottleSize || existing.bottleSize,
          flavor: flavor || existing.flavor,
          notes,
        },
        include: { items: true, cafe: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'SALE_UPDATED',
          entity: 'Sale',
          entityId: saleId,
          oldValue: `₹${existing.total} (${existing.saleNumber})`,
          newValue: `₹${total} (${updated.saleNumber})`,
          details: `Updated sale ${existing.saleNumber}: ${quantity} bottles @ ₹${unitPrice} (Total: ₹${total}, Status: ${paymentStatus})`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/sales');
    safeRevalidatePath('/cafes');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/');

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating sale:', error);
    return { success: false, error: error.message || 'Failed to update sale.' };
  }
}

export async function deleteSale(saleId: string, partnerId = 'PARTNER_NISHANT') {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });

    if (!sale) return { success: false, error: 'Sale record not found.' };

    await prisma.$transaction(async (tx) => {
      // Revert lot deductions
      for (const item of sale.items) {
        if (item.finishedGoodsLotId) {
          const lot = await tx.finishedGoodsLot.findUnique({
            where: { id: item.finishedGoodsLotId },
          });
          if (lot) {
            await tx.finishedGoodsLot.update({
              where: { id: lot.id },
              data: {
                quantityAvailable: lot.quantityAvailable + item.quantity,
                quantitySold: Math.max(0, lot.quantitySold - item.quantity),
                status: 'AVAILABLE',
              },
            });
          }
        }
      }

      await tx.finishedGoodsTransaction.deleteMany({
        where: { reference: sale.saleNumber },
      });

      await tx.saleItem.deleteMany({
        where: { saleId: sale.id },
      });

      await tx.sale.delete({
        where: { id: sale.id },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'SALE_DELETED',
          entity: 'Sale',
          entityId: sale.id,
          oldValue: `${sale.saleNumber} (₹${sale.total})`,
          newValue: null,
          details: `Deleted sale ${sale.saleNumber} and restored any allocated lot quantities.`,
        },
      });
    });

    safeRevalidatePath('/sales');
    safeRevalidatePath('/cafes');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting sale:', error);
    return { success: false, error: error.message || 'Failed to delete sale.' };
  }
}

export async function issueSampleToCafe(params: {
  cafeId: string;
  lotId: string;
  quantity: number;
  partnerId?: string;
  notes?: string;
  date?: string;
}) {
  try {
    const {
      cafeId,
      lotId,
      quantity,
      partnerId = 'PARTNER_NISHANT',
      notes,
      date,
    } = params;

    if (quantity <= 0) {
      return { success: false, error: 'Sample quantity must be greater than zero.' };
    }

    const sampleDate = date ? new Date(date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.finishedGoodsLot.findUnique({
        where: { id: lotId },
        include: { product: true },
      });

      if (!lot) throw new Error('Selected Lot not found.');
      if (lot.quantityAvailable < quantity) {
        throw new Error(
          `Insufficient stock in Lot ${lot.lotNumber}. Available: ${lot.quantityAvailable}, Requested: ${quantity}.`
        );
      }

      const cafe = await tx.cafe.findUnique({ where: { id: cafeId } });
      if (!cafe) throw new Error('Target Café not found.');

      const sampleCost = quantity * lot.unitCost;
      const newAvailable = lot.quantityAvailable - quantity;
      const newSampled = lot.quantitySampled + quantity;

      // 1. Update Lot
      await tx.finishedGoodsLot.update({
        where: { id: lotId },
        data: {
          quantityAvailable: newAvailable,
          quantitySampled: newSampled,
          status: newAvailable <= 0 ? 'SOLD_OUT' : lot.status,
        },
      });

      // 2. Create Finished Goods Transaction (type: SAMPLE, revenue = 0, cost tracked)
      const transaction = await tx.finishedGoodsTransaction.create({
        data: {
          lotId,
          type: 'SAMPLE',
          quantity: -quantity,
          unitCost: lot.unitCost,
          totalCost: Math.round(sampleCost * 100) / 100,
          reference: `SAMPLE-${cafe.name.substring(0, 8).toUpperCase()}`,
          cafeId,
          partnerId,
          notes: `Complimentary samples to ${cafe.name} (₹0 Revenue, Cost: ₹${sampleCost.toFixed(0)}). ${notes || ''}`,
          date: sampleDate,
        },
      });

      // 3. Update Cafe Status if currently early stage
      if (['NEW', 'CONTACTED', 'INTERESTED'].includes(cafe.status)) {
        await tx.cafe.update({
          where: { id: cafeId },
          data: { status: 'SAMPLE_SENT', lastContacted: sampleDate },
        });
        await tx.cafeStatusHistory.create({
          data: {
            cafeId,
            oldStatus: cafe.status,
            newStatus: 'SAMPLE_SENT',
            changedBy: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
            notes: `Sample of ${quantity} ${lot.product.name} delivered`,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'SAMPLE_ISSUED',
          entity: 'FinishedGoodsLot',
          entityId: lot.id,
          oldValue: `${lot.quantityAvailable} ${lot.unit}`,
          newValue: `${newAvailable} ${lot.unit}`,
          details: `Issued ${quantity} bottles sample to ${cafe.name}. Production cost: ₹${sampleCost.toFixed(0)}`,
        },
      });

      return transaction;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error issuing sample:', error);
    return { success: false, error: error.message || 'Unable to issue sample.' };
  }
}

export async function recordFinishedGoodsWaste(params: {
  lotId: string;
  quantity: number;
  reason: string;
  partnerId?: string;
  notes?: string;
  date?: string;
}) {
  try {
    const {
      lotId,
      quantity,
      reason,
      partnerId = 'PARTNER_NISHANT',
      notes,
      date,
    } = params;

    if (quantity <= 0) {
      return { success: false, error: 'Waste quantity must be greater than zero.' };
    }

    const wasteDate = date ? new Date(date) : new Date();

    await prisma.$transaction(async (tx) => {
      const lot = await tx.finishedGoodsLot.findUnique({
        where: { id: lotId },
        include: { product: true },
      });

      if (!lot) throw new Error('Lot not found.');
      if (lot.quantityAvailable < quantity) {
        throw new Error(
          `Insufficient stock in Lot ${lot.lotNumber}. Available: ${lot.quantityAvailable}, Requested: ${quantity}.`
        );
      }

      const wasteCost = quantity * lot.unitCost;
      const newAvailable = lot.quantityAvailable - quantity;
      const newWasted = lot.quantityWasted + quantity;

      // 1. Waste record
      const wasteRecord = await tx.wasteRecord.create({
        data: {
          type: 'FINISHED_GOODS',
          finishedGoodsLotId: lot.id,
          productionBatchId: lot.productionBatchId,
          quantity,
          unit: lot.unit,
          estimatedCost: Math.round(wasteCost * 100) / 100,
          reason,
          notes,
          partnerId,
          date: wasteDate,
        },
      });

      // 2. Transaction
      await tx.finishedGoodsTransaction.create({
        data: {
          lotId,
          type: 'WASTE',
          quantity: -quantity,
          unitCost: lot.unitCost,
          totalCost: Math.round(wasteCost * 100) / 100,
          reference: `WASTE-FG-${Date.now().toString().slice(-4)}`,
          wasteRecordId: wasteRecord.id,
          partnerId,
          notes: `Waste: ${reason}. ${notes || ''}`,
          date: wasteDate,
        },
      });

      // 3. Update lot
      await tx.finishedGoodsLot.update({
        where: { id: lotId },
        data: {
          quantityAvailable: newAvailable,
          quantityWasted: newSampledAndWasted(newWasted),
          status: newAvailable <= 0 ? 'SOLD_OUT' : lot.status,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'FINISHED_GOODS_WASTE_RECORDED',
          entity: 'FinishedGoodsLot',
          entityId: lot.id,
          oldValue: `${lot.quantityAvailable} ${lot.unit}`,
          newValue: `${newAvailable} ${lot.unit}`,
          details: `Logged ${quantity} ${lot.unit} waste for ${lot.product.name} (Lot ${lot.lotNumber}). Reason: ${reason}. Cost: ₹${wasteCost.toFixed(0)}`,
        },
      });
    });

    safeRevalidatePath('/inventory');
    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error recording finished goods waste:', error);
    return { success: false, error: error.message || 'Unable to record waste.' };
  }
}

function newSampledAndWasted(val: number) {
  return val;
}
