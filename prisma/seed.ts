import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed for BREWW 1671 Operating System (DEMO DATA)...');

  // Clean existing tables in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.cafeStatusHistory.deleteMany();
  await prisma.cafe.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.expenseCategory.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.wasteRecord.deleteMany();
  await prisma.finishedGoodsTransaction.deleteMany();
  await prisma.finishedGoodsLot.deleteMany();
  await prisma.productionOutput.deleteMany();
  await prisma.productionIngredient.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.coffeeBean.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.user.deleteMany();
  await prisma.business.deleteMany();
  await prisma.settings.deleteMany();

  // 1. Business Info & Settings
  const business = await prisma.business.create({
    data: {
      name: 'BREWW 1671',
      logoUrl: '/breww1671-logo.png',
      email: 'founders@breww1671.com',
      phone: '+91 98765 43210',
      address: 'Plot 42, Industrial Brewing Zone, Indiranagar, Bengaluru, KA 560038',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
    },
  });

  await prisma.settings.create({
    data: {
      businessName: 'BREWW 1671',
      logoUrl: '/breww1671-logo.png',
      email: 'founders@breww1671.com',
      phone: '+91 98765 43210',
      address: 'Bengaluru, Karnataka',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      alertThresholdDays: 15,
    },
  });

  // 2. Fixed Partners (Permanent 50/50)
  const nishant = await prisma.user.create({
    data: {
      id: 'PARTNER_NISHANT',
      name: 'Nishant',
      email: 'nishant@breww1671.com',
      role: 'ADMIN',
      ownershipPercentage: 50.0,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    },
  });

  const chinmay = await prisma.user.create({
    data: {
      id: 'PARTNER_CHINMAY',
      name: 'Chinmay',
      email: 'chinmay@breww1671.com',
      role: 'ADMIN',
      ownershipPercentage: 50.0,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    },
  });

  console.log('✓ Partners initialized: Nishant (50%) & Chinmay (50%)');

  // 3. Suppliers
  const supplierRoasters = await prisma.supplier.create({
    data: {
      name: 'Origin Estates & Roastery',
      contactPerson: 'Arun Kumar',
      email: 'orders@originestates.in',
      phone: '+91 98450 11223',
      address: 'Chikmagalur Plantation Highway, Karnataka',
      notes: 'Specialty grade single origin Arabica beans',
    },
  });

  const supplierGlass = await prisma.supplier.create({
    data: {
      name: 'Apex Glass Packaging Ltd',
      contactPerson: 'Suresh Patel',
      email: 'sales@apexglass.com',
      phone: '+91 98200 44556',
      address: 'Peenya Industrial Area, Bengaluru',
      notes: 'Food-grade amber glass bottles and tamper caps',
    },
  });

  // 4. Raw Materials Inventory
  const coffeeArabica = await prisma.inventoryItem.create({
    data: {
      name: 'Brazil Arabica Specialty Beans',
      sku: 'RM-COF-BRZ-01',
      category: 'Coffee Beans',
      unit: 'kg',
      currentQuantity: 10.0, // Per spec
      minStock: 4.0,
      maxStock: 50.0,
      averageCost: 1200.0, // ₹1,200/kg
      currentStockValue: 12000.0, // 10 * 1200
      supplierId: supplierRoasters.id,
      storageLocation: 'Aroma-sealed Bin 01',
      isCoffeeBean: true,
      notes: 'Notes of dark cocoa and hazelnut. Ideal for cold extraction.',
    },
  });

  await prisma.coffeeBean.create({
    data: {
      inventoryItemId: coffeeArabica.id,
      beanName: 'Brazil Cerrado Arabica',
      origin: 'Cerrado Mineiro, Brazil',
      supplier: 'Origin Estates & Roastery',
      roast: 'Medium-Dark',
      beanType: 'Arabica (Yellow Bourbon)',
      purchaseDate: new Date('2026-09-01'),
      lotNumber: 'LOT-BRZ-2026-09',
      quantityPurchased: 10.0,
      quantityRemaining: 10.0,
      purchaseCost: 12000.0,
      costPerKg: 1200.0,
    },
  });

  const bottles180 = await prisma.inventoryItem.create({
    data: {
      name: '180ml Amber Glass Bottles',
      sku: 'RM-PKG-BTL-180',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 500.0, // Per spec
      minStock: 100.0,
      maxStock: 2000.0,
      averageCost: 8.0, // ₹8/bottle
      currentStockValue: 4000.0,
      supplierId: supplierGlass.id,
      storageLocation: 'Pallet R-01',
      notes: 'UV-resistant amber glass for cold brew shelf life',
    },
  });

  const bottleCaps = await prisma.inventoryItem.create({
    data: {
      name: 'Crown Bottle Caps (Black Matte)',
      sku: 'RM-PKG-CAP-BLK',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 500.0, // Per spec
      minStock: 100.0,
      maxStock: 2500.0,
      averageCost: 2.0, // ₹2/cap
      currentStockValue: 1000.0,
      supplierId: supplierGlass.id,
      storageLocation: 'Bin C-03',
      notes: 'Oxygen barrier seal liner',
    },
  });

  const bottleLabels = await prisma.inventoryItem.create({
    data: {
      name: 'Waterproof Vinyl Labels 180ml',
      sku: 'RM-PKG-LBL-180',
      category: 'Packaging',
      unit: 'units',
      currentQuantity: 500.0, // Per spec
      minStock: 100.0,
      maxStock: 3000.0,
      averageCost: 3.0, // ₹3/label
      currentStockValue: 1500.0,
      supplierId: supplierGlass.id,
      storageLocation: 'Shelf L-02',
      notes: 'Cold storage resistant matte laminate',
    },
  });

  const filterPaper = await prisma.inventoryItem.create({
    data: {
      name: 'Commercial Brew Filters (50L)',
      sku: 'RM-FLT-50L',
      category: 'Filters',
      unit: 'units',
      currentQuantity: 200.0, // Per spec
      minStock: 25.0,
      maxStock: 500.0,
      averageCost: 15.0,
      currentStockValue: 3000.0,
      storageLocation: 'Dry Storage Shelf F-1',
    },
  });

  const brewingWater = await prisma.inventoryItem.create({
    data: {
      name: 'Mineral-Enriched Reverse Osmosis Water',
      sku: 'RM-ING-WTR-RO',
      category: 'Ingredients',
      unit: 'liters',
      currentQuantity: 250.0,
      minStock: 50.0,
      averageCost: 1.0,
      currentStockValue: 250.0,
      storageLocation: 'Tank A',
    },
  });

  // Log opening stock transactions
  const openingItems = [
    { item: coffeeArabica, qty: 10, cost: 1200 },
    { item: bottles180, qty: 500, cost: 8 },
    { item: bottleCaps, qty: 500, cost: 2 },
    { item: bottleLabels, qty: 500, cost: 3 },
    { item: filterPaper, qty: 200, cost: 15 },
    { item: brewingWater, qty: 250, cost: 1 },
  ];

  for (const oi of openingItems) {
    await prisma.inventoryTransaction.create({
      data: {
        inventoryItemId: oi.item.id,
        type: 'OPENING_STOCK',
        quantity: oi.qty,
        unit: oi.item.unit,
        unitCost: oi.cost,
        totalCost: oi.qty * oi.cost,
        reference: 'INIT-OPENING-2026',
        partnerId: 'PARTNER_NISHANT',
        notes: 'Initial inventory audit (DEMO DATA)',
        date: new Date('2026-09-01'),
      },
    });
  }

  console.log('✓ Raw materials & opening ledger seeded');

  // 5. Products (Finished Goods)
  const prodOriginal180 = await prisma.product.create({
    data: {
      sku: 'FG-CB-ORIG-180',
      name: 'Original Cold Brew 180ml',
      category: 'Cold Brew',
      variant: 'Original',
      size: '180ml',
      unit: 'bottles',
      sellingPrice: 120.0,
      standardCost: 49.0,
      minStock: 40.0,
      isActive: true,
      notes: 'Our flagship 20-hour immersion brew. Smooth, dark chocolate profile.',
    },
  });

  const prodOriginal1L = await prisma.product.create({
    data: {
      sku: 'FG-CB-ORIG-1L',
      name: 'Original Cold Brew 1L Concentrate',
      category: 'Cold Brew Concentrate',
      variant: 'Original Concentrate',
      size: '1L',
      unit: 'bottles',
      sellingPrice: 480.0,
      standardCost: 210.0,
      minStock: 15.0,
      isActive: true,
      notes: 'B2B café bulk concentrate for beverage crafting.',
    },
  });

  const prodBarrelAged = await prisma.product.create({
    data: {
      sku: 'FG-CB-BARREL-180',
      name: 'Barrel Aged Cold Brew 180ml',
      category: 'Specialty Cold Brew',
      variant: 'Oak Barrel Aged',
      size: '180ml',
      unit: 'bottles',
      sellingPrice: 160.0,
      standardCost: 65.0,
      minStock: 20.0,
      isActive: true,
      notes: 'Aged in toasted oak casks for 14 days before cold brewing.',
    },
  });

  console.log('✓ Products catalog created');

  // 6. Expense Categories
  const catCoffee = await prisma.expenseCategory.create({
    data: { name: 'Coffee Beans', color: '#8B4513', isProductionRelated: true },
  });
  const catPackaging = await prisma.expenseCategory.create({
    data: { name: 'Packaging & Bottles', color: '#D97706', isProductionRelated: true },
  });
  const catEquipment = await prisma.expenseCategory.create({
    data: { name: 'Equipment & Maintenance', color: '#475569', isProductionRelated: false },
  });
  const catDelivery = await prisma.expenseCategory.create({
    data: { name: 'Transport & Delivery', color: '#059669', isProductionRelated: false },
  });
  const catMarketing = await prisma.expenseCategory.create({
    data: { name: 'Café Samples & Marketing', color: '#7C3AED', isProductionRelated: false },
  });
  const catUtilities = await prisma.expenseCategory.create({
    data: { name: 'Utilities & Rent', color: '#2563EB', isProductionRelated: false },
  });

  // 7. Seed Sample Expenses showcasing 50/50 spending
  await prisma.expense.create({
    data: {
      title: 'Bulk Roasted Arabica Shipment',
      categoryId: catCoffee.id,
      amount: 12000.0,
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      paymentMethod: 'UPI',
      vendor: 'Origin Estates',
      date: new Date('2026-09-02'),
      notes: '10kg Brazil Yellow Bourbon Arabica',
    },
  });

  await prisma.expense.create({
    data: {
      title: 'Glass Bottles & Crown Caps Order',
      categoryId: catPackaging.id,
      amount: 6500.0,
      paidBy: 'Chinmay',
      partnerId: 'PARTNER_CHINMAY',
      paymentMethod: 'Credit Card',
      vendor: 'Apex Glass',
      date: new Date('2026-09-03'),
      notes: '500 amber bottles + 500 crown caps',
    },
  });

  await prisma.expense.create({
    data: {
      title: 'Cold Brew Commercial Filter Mesh Upgrade',
      categoryId: catEquipment.id,
      amount: 2500.0,
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      paymentMethod: 'UPI',
      vendor: 'BrewCraft India',
      date: new Date('2026-09-05'),
    },
  });

  // 8. B2B Cafes CRM
  const cafeSubko = await prisma.cafe.create({
    data: {
      name: 'Third Wave Roastery Cafe',
      contactPerson: 'Raghav Sharma',
      phone: '+91 99001 23456',
      email: 'raghav@thirdwaveroasters.in',
      instagram: '@thirdwavecafe',
      city: 'Bengaluru',
      area: 'Indiranagar 100ft Rd',
      leadSource: 'In-Person Visit',
      status: 'CUSTOMER',
      estMonthlyRequirement: 150,
      productInterest: 'Original 180ml & Barrel Aged',
      lastContacted: new Date('2026-09-15'),
      nextFollowUp: new Date('2026-09-25'),
      notes: 'Key flagship account. Re-orders bi-weekly.',
    },
  });

  const cafeRoastery = await prisma.cafe.create({
    data: {
      name: 'The Daily Bean Cafe',
      contactPerson: 'Meera Nair',
      phone: '+91 98800 55443',
      email: 'meera@dailybeancafe.com',
      instagram: '@dailybeancafe',
      city: 'Bengaluru',
      area: 'Koramangala 4th Block',
      leadSource: 'Instagram',
      status: 'SAMPLE_SENT',
      estMonthlyRequirement: 80,
      productInterest: 'Original Cold Brew 180ml',
      lastContacted: new Date('2026-09-16'),
      nextFollowUp: new Date('2026-09-22'),
      notes: 'Gave 5 complimentary tasting bottles. Loves low acidity.',
    },
  });

  const cafeArtisan = await prisma.cafe.create({
    data: {
      name: 'Artisan Corner Bistro',
      contactPerson: 'Dev Sen',
      phone: '+91 97711 22334',
      email: 'dev@artisancorner.in',
      city: 'Bengaluru',
      area: 'HSR Layout Sector 3',
      leadSource: 'Referral',
      status: 'INTERESTED',
      estMonthlyRequirement: 100,
      productInterest: '1L Bulk Concentrate',
      lastContacted: new Date('2026-09-18'),
      nextFollowUp: new Date('2026-09-23'),
      notes: 'Interested in iced latte cold brew base.',
    },
  });

  await prisma.followUp.create({
    data: {
      cafeId: cafeRoastery.id,
      title: 'Follow-up on 5-bottle sample feedback with Meera',
      dueDate: new Date('2026-09-22'),
      status: 'PENDING',
      notes: 'Call around 4 PM after lunch rush',
    },
  });

  console.log('✓ Expenses and CRM Cafes seeded');

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userId: 'PARTNER_NISHANT',
      partnerName: 'Nishant',
      action: 'SYSTEM_INITIALIZED',
      entity: 'Business',
      entityId: business.id,
      newValue: 'BREWW 1671 Operating System Seeded (DEMO DATA)',
      details: 'Initialized partners Nishant & Chinmay (50/50), inventory, and demo records.',
    },
  });

  console.log('🎉 Seed complete! BREWW 1671 Operating System is ready.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
