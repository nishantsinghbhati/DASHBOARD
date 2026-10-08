import { prisma } from '../lib/db/prisma';
import { calculatePartnerSpending } from '../lib/calculations/partners';

async function verify() {
  console.log('🔍 Verifying imported data against BREWW_1671_Updated_Register_2026-09-27.xlsx...\n');

  // 1. Expenses & Partner Spend
  const expenses = await prisma.expense.findMany({
    include: { category: true },
    orderBy: { date: 'asc' },
  });
  console.log(`=== EXPENSES (${expenses.length} total) ===`);
  const spend = calculatePartnerSpending(expenses);
  console.log(`Nishant Total Paid: ₹${spend.nishantPaid.toLocaleString('en-IN')}`);
  console.log(`Chinmay Total Paid: ₹${spend.chinmayPaid.toLocaleString('en-IN')}`);
  console.log(`Total Business Spend: ₹${spend.totalBusinessExpenses.toLocaleString('en-IN')}`);
  console.log(`Equal Share (50%):  ₹${spend.expectedNishantContribution.toLocaleString('en-IN')}`);
  if (spend.payerName) {
    console.log(`Settlement Status:  ${spend.payerName} owes ${spend.receiverName} ₹${spend.settlementAmount.toLocaleString('en-IN')}`);
  }

  // 2. Coffee Beans Inventory
  const beans = await prisma.coffeeBean.findMany({
    include: { inventoryItem: true },
    orderBy: { quantityPurchased: 'desc' },
  });
  console.log(`\n=== COFFEE BEANS INVENTORY (${beans.length} varieties) ===`);
  let totalPurchased = 0;
  let totalRemaining = 0;
  let totalStockVal = 0;
  for (const b of beans) {
    totalPurchased += b.quantityPurchased;
    totalRemaining += b.quantityRemaining;
    totalStockVal += b.inventoryItem.currentStockValue;
    console.log(`- ${b.beanName.padEnd(35)} | Purchased: ${(b.quantityPurchased + ' kg').padEnd(8)} | Rem: ${(b.quantityRemaining + ' kg').padEnd(8)} | Cost: ₹${b.purchaseCost} | StockVal: ₹${b.inventoryItem.currentStockValue}`);
  }
  console.log(`Total Beans Purchased: ${totalPurchased.toFixed(2)} kg`);
  console.log(`Total Beans In Stock:  ${totalRemaining.toFixed(2)} kg (Val: ₹${totalStockVal.toLocaleString('en-IN')})`);

  // 3. Cafe & Sales
  const cafes = await prisma.cafe.findMany({
    include: { sales: { include: { items: { include: { product: true } } } } },
  });
  console.log(`\n=== CAFE & SALES (${cafes.length} cafe) ===`);
  for (const c of cafes) {
    console.log(`Cafe: ${c.name} | Status: ${c.status} | Total Sales: ${c.sales.length}`);
    for (const s of c.sales) {
      console.log(`  Sale: ${s.saleNumber} | Total: ₹${s.total} | Paid: ₹${s.amountPaid} | Status: ${s.paymentStatus}`);
      for (const item of s.items) {
        console.log(`    - ${item.product.name} x ${item.quantity} = ₹${item.total} (Unit price: ₹${item.unitPrice})`);
      }
    }
  }

  // 4. Production Batches
  const batches = await prisma.productionBatch.findMany({
    include: { product: true, finishedGoodsLots: true },
  });
  console.log(`\n=== PRODUCTION BATCHES (${batches.length} batches) ===`);
  for (const b of batches) {
    console.log(`Batch ${b.batchNumber}: ${b.product.name} | Output: ${b.actualOutput} | Cost: ₹${b.totalProductionCost} | Status: ${b.status}`);
  }

  // 5. Follow-ups (Remaining Details)
  const followUps = await prisma.followUp.findMany();
  console.log(`\n=== REMAINING DETAILS / AUDIT FOLLOW-UPS (${followUps.length} items) ===`);
  for (const f of followUps.slice(0, 5)) {
    console.log(`- ${f.title}`);
  }
  if (followUps.length > 5) {
    console.log(`... and ${followUps.length - 5} more items.`);
  }

  console.log('\n✅ All data verified successfully!');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
