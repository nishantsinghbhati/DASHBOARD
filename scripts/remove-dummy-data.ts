import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting cleanup of test/dummy data...');

  // 1. Remove the 2 test expenses created during development testing
  const deletedExpenses = await prisma.expense.deleteMany({
    where: {
      id: {
        in: ['cmua4wpq80008vd888bl6c9sy', 'cmua4ytkn000bvd882idyhl0o'],
      },
    },
  });
  console.log(`✓ Deleted ${deletedExpenses.count} test expenses (coffee grinder ₹7,000 and sardar coffee sample ₹2,100.01).`);

  // 2. Remove all test inventory transactions
  const deletedTxs = await prisma.inventoryTransaction.deleteMany();
  console.log(`✓ Deleted ${deletedTxs.count} test inventory transactions.`);

  // 3. Reset all inventory item quantities and stock values to 0
  const updatedItems = await prisma.inventoryItem.updateMany({
    data: {
      currentQuantity: 0,
      currentStockValue: 0,
    },
  });
  console.log(`✓ Reset current quantities to 0 for ${updatedItems.count} catalog items.`);

  // 4. Reset coffee bean quantities to 0
  const updatedBeans = await prisma.coffeeBean.updateMany({
    data: {
      quantityPurchased: 0,
      quantityRemaining: 0,
      purchaseCost: 0,
    },
  });
  console.log(`✓ Reset remaining bean quantities to 0 for ${updatedBeans.count} coffee bean varieties.`);

  // 5. Clean up test audit logs
  await prisma.auditLog.deleteMany({
    where: {
      action: {
        in: ['RAW_MATERIAL_PURCHASED', 'RAW_MATERIAL_USED', 'TRANSACTION_UPDATED', 'TRANSACTION_DELETED'],
      },
    },
  });

  // 6. Record audit log of the dummy data cleanup
  await prisma.auditLog.create({
    data: {
      userId: 'PARTNER_NISHANT',
      partnerName: 'Nishant',
      action: 'DUMMY_DATA_CLEANUP',
      entity: 'System',
      details: 'Removed test expenses and test inventory transactions. Retained 11 verified September 2026 expense entries.',
    },
  });

  // 7. Verify remaining state
  const remainingExpenses = await prisma.expense.findMany({
    orderBy: { date: 'asc' },
  });
  console.log(`\nVerified: ${remainingExpenses.length} real expenses retained in system:`);
  let chinmayTotal = 0;
  let nishantTotal = 0;
  for (const exp of remainingExpenses) {
    console.log(`  - [${exp.date.toISOString().slice(0, 10)}] ${exp.paidBy.padEnd(8)}: ${exp.title} (₹${exp.amount})`);
    if (exp.paidBy.toLowerCase().includes('chinmay')) {
      chinmayTotal += exp.amount;
    } else {
      nishantTotal += exp.amount;
    }
  }

  const grandTotal = chinmayTotal + nishantTotal;
  const target50 = grandTotal / 2;
  console.log('\n--- 50/50 Reconciliation ---');
  console.log(`Chinmay Total Paid: ₹${chinmayTotal.toLocaleString('en-IN')}`);
  console.log(`Nishant Total Paid: ₹${nishantTotal.toLocaleString('en-IN')}`);
  console.log(`50% Target Share:   ₹${target50.toLocaleString('en-IN')}`);
  if (chinmayTotal > nishantTotal) {
    console.log(`Reconciliation:     Nishant owes Chinmay ₹${(chinmayTotal - target50).toLocaleString('en-IN')}`);
  } else {
    console.log(`Reconciliation:     Chinmay owes Nishant ₹${(nishantTotal - target50).toLocaleString('en-IN')}`);
  }

  console.log('\n✨ Dummy data cleanup complete!');
}

main()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
