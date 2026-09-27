import { prisma } from '../lib/db/prisma';

async function seedMaterials() {
  console.log('Seeding raw material catalog at 0 stock...');

  const supplierRoasters = await prisma.supplier.findFirst({
    where: { name: { contains: 'Origin' } },
  });
  const supplierGlass = await prisma.supplier.findFirst({
    where: { name: { contains: 'Apex' } },
  });

  const catalog = [
    {
      name: 'Brazil Arabica Specialty Beans',
      sku: 'RM-COF-BRZ-01',
      category: 'Coffee Beans',
      unit: 'kg',
      currentQuantity: 0,
      minStock: 4.0,
      averageCost: 1200.0,
      currentStockValue: 0,
      supplierId: supplierRoasters?.id,
      storageLocation: 'Aroma-sealed Bin 01',
      isCoffeeBean: true,
      origin: 'Cerrado Mineiro, Brazil',
      roast: 'Medium-Dark',
      beanType: 'Arabica',
    },
    {
      name: 'Floral Coffee Beans',
      sku: 'RM-COF-FLR-01',
      category: 'Coffee Beans',
      unit: 'kg',
      currentQuantity: 0,
      minStock: 3.0,
      averageCost: 1000.0,
      currentStockValue: 0,
      supplierId: supplierRoasters?.id,
      storageLocation: 'Aroma-sealed Bin 02',
      isCoffeeBean: true,
      origin: 'Chikmagalur / Yirgacheffe Profile',
      roast: 'Medium',
      beanType: 'Arabica',
    },
    {
      name: '180ml Amber Glass Bottles',
      sku: 'RM-PKG-BTL-180',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 100.0,
      averageCost: 8.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Pallet R-01',
      isCoffeeBean: false,
    },
    {
      name: '1L Glass Bottles (Milk Style)',
      sku: 'RM-PKG-BTL-1L',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 20.0,
      averageCost: 30.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Pallet R-02',
      isCoffeeBean: false,
    },
    {
      name: 'Pavva Glass Bottles',
      sku: 'RM-PKG-BTL-PV',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 20.0,
      averageCost: 15.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Pallet R-03',
      isCoffeeBean: false,
    },
    {
      name: 'Small Glass Bottles',
      sku: 'RM-PKG-BTL-SM',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 20.0,
      averageCost: 20.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Pallet R-04',
      isCoffeeBean: false,
    },
    {
      name: 'Crown Bottle Caps (Black Matte)',
      sku: 'RM-PKG-CAP-BLK',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 100.0,
      averageCost: 2.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Bin C-03',
      isCoffeeBean: false,
    },
    {
      name: 'Waterproof Vinyl Labels 180ml',
      sku: 'RM-PKG-LBL-180',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 0,
      minStock: 100.0,
      averageCost: 3.0,
      currentStockValue: 0,
      supplierId: supplierGlass?.id,
      storageLocation: 'Shelf L-02',
      isCoffeeBean: false,
    },
    {
      name: 'Commercial Brew Filters (50L)',
      sku: 'RM-FLT-50L',
      category: 'Consumables',
      unit: 'units',
      currentQuantity: 0,
      minStock: 25.0,
      averageCost: 15.0,
      currentStockValue: 0,
      storageLocation: 'Dry Storage Shelf F-1',
      isCoffeeBean: false,
    },
    {
      name: 'Mineral-Enriched Brewing Water',
      sku: 'RM-ING-WTR-RO',
      category: 'Water',
      unit: 'L',
      currentQuantity: 0,
      minStock: 50.0,
      averageCost: 1.5,
      currentStockValue: 0,
      storageLocation: 'Tank A',
      isCoffeeBean: false,
    },
  ];

  for (const item of catalog) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { sku: item.sku },
    });

    if (!existing) {
      const created = await prisma.inventoryItem.create({
        data: {
          name: item.name,
          sku: item.sku,
          category: item.category,
          unit: item.unit,
          currentQuantity: 0,
          minStock: item.minStock,
          averageCost: item.averageCost,
          currentStockValue: 0,
          supplierId: item.supplierId || null,
          storageLocation: item.storageLocation,
          isCoffeeBean: item.isCoffeeBean,
        },
      });

      if (item.isCoffeeBean) {
        await prisma.coffeeBean.create({
          data: {
            inventoryItemId: created.id,
            beanName: item.name,
            origin: item.origin || 'Estate Origin',
            supplier: supplierRoasters?.name || 'Roasters',
            roast: item.roast || 'Medium-Dark',
            beanType: item.beanType || 'Arabica',
            quantityPurchased: 0,
            quantityRemaining: 0,
            purchaseCost: 0,
            costPerKg: item.averageCost,
          },
        });
      }
      console.log(`+ Created item: ${item.name} (${item.sku}) at 0 stock`);
    } else {
      console.log(`✓ Existing item: ${item.name}`);
    }
  }

  console.log('✓ All raw materials catalog items populated at 0 stock.');
}

seedMaterials()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
