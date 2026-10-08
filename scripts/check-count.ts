import { prisma } from '../lib/db/prisma';

async function main() {
  const counts = {
    business: await prisma.business.count(),
    users: await prisma.user.count(),
    suppliers: await prisma.supplier.count(),
    inventoryItems: await prisma.inventoryItem.count(),
    coffeeBeans: await prisma.coffeeBean.count(),
    inventoryTransactions: await prisma.inventoryTransaction.count(),
    products: await prisma.product.count(),
    finishedGoodsLots: await prisma.finishedGoodsLot.count(),
    productionBatches: await prisma.productionBatch.count(),
    cafes: await prisma.cafe.count(),
    sales: await prisma.sale.count(),
    expenses: await prisma.expense.count(),
    settlements: await prisma.settlement.count(),
  };
  console.log('Current DB Counts:', JSON.stringify(counts, null, 2));
}

main().finally(() => prisma.$disconnect());
