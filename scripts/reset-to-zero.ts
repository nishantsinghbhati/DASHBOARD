import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetToZero() {
  console.log('🧹 Clearing all operational data, expenses, sales, and resetting system to ZERO...');

  // 1. Delete dependent records first in strict reverse foreign key order
  await prisma.auditLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.cafeStatusHistory.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cafe.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.finishedGoodsTransaction.deleteMany();
  await prisma.finishedGoodsLot.deleteMany();
  await prisma.productionOutput.deleteMany();
  await prisma.productionIngredient.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.inventoryTransaction.deleteMany();

  console.log('✓ All sales, cafes, expenses, settlements, batches, lots, transactions, and waste records deleted.');

  // 2. Reset all coffee bean quantities to 0
  await prisma.coffeeBean.updateMany({
    data: {
      quantityPurchased: 0,
      quantityRemaining: 0,
      purchaseCost: 0,
    },
  });

  // 3. Reset all raw material inventory quantities and values to 0
  await prisma.inventoryItem.updateMany({
    data: {
      currentQuantity: 0,
      currentStockValue: 0,
    },
  });

  console.log('✓ Raw materials and coffee bean stock quantities reset to 0.');

  // 4. Record clean slate audit log
  await prisma.auditLog.create({
    data: {
      userId: 'PARTNER_NISHANT',
      partnerName: 'Nishant',
      action: 'CLEAN_SLATE_RESET',
      entity: 'System',
      details: 'All sales, cafes, expenses, batches, and transactions wiped. System reset to clean 0 baseline.',
    },
  });

  // 5. Verify zero state
  const [sales, cafes, expenses, lots, batches, txs, items] = await Promise.all([
    prisma.sale.count(),
    prisma.cafe.count(),
    prisma.expense.count(),
    prisma.finishedGoodsLot.count(),
    prisma.productionBatch.count(),
    prisma.inventoryTransaction.count(),
    prisma.inventoryItem.findMany(),
  ]);

  console.log('\n--- Zero State Verification ---');
  console.log(`Sales:         ${sales}`);
  console.log(`Cafés:         ${cafes}`);
  console.log(`Expenses:      ${expenses}`);
  console.log(`Lots:          ${lots}`);
  console.log(`Batches:       ${batches}`);
  console.log(`Transactions:  ${txs}`);
  console.log(`Inventory:     ${items.length} catalog items (all quantity = 0)`);
  console.log('\n✨ Database successfully reset to clean ZERO baseline!');
}

resetToZero()
  .catch((e) => {
    console.error('Error resetting database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
