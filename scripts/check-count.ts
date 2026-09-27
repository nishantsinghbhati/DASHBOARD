import { prisma } from '../lib/db/prisma';

async function main() {
  const items = await prisma.inventoryItem.findMany();
  console.log('TOTAL_ITEMS_COUNT:', items.length);
  for (const i of items) {
    console.log(`- ${i.name} (${i.sku}) | Unit: ${i.unit} | Cost: ₹${i.averageCost}`);
  }
}

main().finally(() => prisma.$disconnect());
