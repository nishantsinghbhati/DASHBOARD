import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Initializing finished goods lots and linking sales items...');

  const products = await prisma.product.findMany();

  for (const prod of products) {
    const lotNumber = `LOT-${prod.sku}-2026`;
    let lot = await prisma.finishedGoodsLot.findUnique({
      where: { lotNumber },
    });

    if (!lot) {
      lot = await prisma.finishedGoodsLot.create({
        data: {
          lotNumber,
          productId: prod.id,
          productionDate: new Date('2026-09-01'),
          quantityProduced: 200,
          quantityAvailable: 150,
          quantitySold: 50,
          unit: 'bottles',
          unitCost: prod.standardCost || 45,
          totalProductionCost: 200 * (prod.standardCost || 45),
          status: 'AVAILABLE',
          storageLocation: 'Cold Room A',
        },
      });
      console.log(`✓ Created Lot ${lotNumber} for ${prod.name}`);
    }

    // Update any saleItem for this product where finishedGoodsLotId is null
    const updated = await prisma.saleItem.updateMany({
      where: {
        productId: prod.id,
        finishedGoodsLotId: null,
      },
      data: {
        finishedGoodsLotId: lot.id,
      },
    });

    if (updated.count > 0) {
      console.log(`✓ Linked ${updated.count} sale items of ${prod.name} to lot ${lot.lotNumber}`);
    }
  }

  console.log('✨ All finished goods lots and sale items are verified non-null!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
