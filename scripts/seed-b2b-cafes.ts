import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding B2B sales, 100% Arabica beans, and 4-stage Pitching CRM...');

  // 1. Add 100% Arabica coffee bean if not existing
  const existing100Arabica = await prisma.inventoryItem.findFirst({
    where: { name: { contains: '100% Arabica' } },
  });

  let arabicaBeanItem = existing100Arabica;
  if (!arabicaBeanItem) {
    arabicaBeanItem = await prisma.inventoryItem.create({
      data: {
        name: '100% Arabica Specialty Beans (Coorg Estate)',
        sku: 'RM-COF-ARB-100',
        category: 'Coffee Beans',
        unit: 'kg',
        currentQuantity: 15.0,
        minStock: 5.0,
        maxStock: 50.0,
        averageCost: 1800.0,
        currentStockValue: 27000.0,
        isCoffeeBean: true,
        notes: '100% pure high-altitude Arabica. Base for Classic Cold Brew.',
      },
    });

    await prisma.coffeeBean.create({
      data: {
        inventoryItemId: arabicaBeanItem.id,
        beanName: '100% Arabica Estate Roast',
        origin: 'Coorg, Karnataka',
        supplier: 'Origin Estates & Roastery',
        roast: 'Medium-Dark',
        beanType: '100% Arabica',
        quantityPurchased: 15.0,
        quantityRemaining: 15.0,
        purchaseCost: 27000.0,
        costPerKg: 1800.0,
      },
    });
    console.log('✓ Added 100% Arabica Specialty Beans to catalog.');
  }

  // 2. Ensure standard Products exist (180ml and 1L)
  const prodClassic180 = await prisma.product.upsert({
    where: { sku: 'FG-CB-CLASSIC-180' },
    update: {},
    create: {
      sku: 'FG-CB-CLASSIC-180',
      name: 'Classic Cold Brew (100% Arabica) 180ml',
      category: 'Cold Brew',
      variant: 'Classic Cold Brew (100% Arabica)',
      size: '180ml',
      unit: 'bottles',
      sellingPrice: 120.0,
      standardCost: 45.0,
      minStock: 30.0,
      isActive: true,
      notes: 'Brewed with 100% Arabica beans. 20-hour cold extraction.',
    },
  });

  const prodClassic1L = await prisma.product.upsert({
    where: { sku: 'FG-CB-CLASSIC-1L' },
    update: {},
    create: {
      sku: 'FG-CB-CLASSIC-1L',
      name: 'Classic Cold Brew (100% Arabica) 1L',
      category: 'Cold Brew Concentrate',
      variant: 'Classic Cold Brew (100% Arabica)',
      size: '1L',
      unit: 'bottles',
      sellingPrice: 480.0,
      standardCost: 210.0,
      minStock: 10.0,
      isActive: true,
      notes: '1 Litre bulk concentrate for specialty café baristas.',
    },
  });

  const prodFloral180 = await prisma.product.upsert({
    where: { sku: 'FG-CB-FLORAL-180' },
    update: {},
    create: {
      sku: 'FG-CB-FLORAL-180',
      name: 'Floral Cold Brew (Chikmagalur) 180ml',
      category: 'Specialty Cold Brew',
      variant: 'Floral Cold Brew (Chikmagalur Arabica)',
      size: '180ml',
      unit: 'bottles',
      sellingPrice: 130.0,
      standardCost: 50.0,
      minStock: 20.0,
      isActive: true,
      notes: 'Jasmine notes, delicate citrus, clean aftertaste.',
    },
  });

  const prodFloral1L = await prisma.product.upsert({
    where: { sku: 'FG-CB-FLORAL-1L' },
    update: {},
    create: {
      sku: 'FG-CB-FLORAL-1L',
      name: 'Floral Cold Brew (Chikmagalur) 1L',
      category: 'Specialty Cold Brew',
      variant: 'Floral Cold Brew (Chikmagalur Arabica)',
      size: '1L',
      unit: 'bottles',
      sellingPrice: 500.0,
      standardCost: 220.0,
      minStock: 10.0,
      isActive: true,
      notes: '1 Litre single-origin Chikmagalur concentrate.',
    },
  });

  // 3. Seed Cafés across 4 Distinct Pitching Stages
  // STAGE 1: TO_PITCH ("To Pitch / Pitch Karna Hai")
  const cafeSubko = await prisma.cafe.create({
    data: {
      name: 'Subko Specialty Coffee & Craft Roasters',
      contactPerson: 'Aditya (Manager)',
      phone: '+91 99001 11223',
      email: 'bengaluru@subko.coffee',
      instagram: '@subkocoffee',
      city: 'Bengaluru',
      area: 'Church Street',
      status: 'TO_PITCH',
      productInterest: '180ml Grab & Go Bottles',
      pitchNotes: 'Scheduled to visit next Tuesday for cold brew menu expansion.',
    },
  });

  const cafeAraku = await prisma.cafe.create({
    data: {
      name: 'Araku Coffee Flagship',
      contactPerson: 'Sneha (Beverage Director)',
      phone: '+91 98800 22334',
      email: 'flagship@arakucoffee.in',
      instagram: '@arakucoffeein',
      city: 'Bengaluru',
      area: 'Indiranagar 12th Main',
      status: 'TO_PITCH',
      productInterest: '1L Concentrate & 180ml Bottles',
      pitchNotes: 'High volume luxury organic café. Interested in specialty profile samples.',
    },
  });

  // STAGE 2: PITCHED ("Pitched / Pitch Kar Chuke Hain")
  const cafeBlueTokai = await prisma.cafe.create({
    data: {
      name: 'Blue Tokai Coffee Roasters',
      contactPerson: 'Karan (Store Lead)',
      phone: '+91 97711 33445',
      email: 'koramangala@bluetokaicoffee.com',
      instagram: '@bluetokaicoffee',
      city: 'Bengaluru',
      area: 'Koramangala 80ft Rd',
      status: 'PITCHED',
      pitchDate: new Date('2026-09-20'),
      productInterest: '180ml RTD Bottles',
      pitchNotes: 'Delivered sample box of 180ml Classic & Floral bottles. Tasting session held Friday.',
    },
  });

  const cafePaperPie = await prisma.cafe.create({
    data: {
      name: 'Paper & Pie Artisan Cafe',
      contactPerson: 'Vani Rao',
      phone: '+91 98450 44556',
      email: 'orders@paperandpie.in',
      instagram: '@paperandpie',
      city: 'Bengaluru',
      area: 'Indiranagar 100ft Rd',
      status: 'PITCHED',
      pitchDate: new Date('2026-09-21'),
      productInterest: '1L Bulk Pitcher Concentrate',
      pitchNotes: 'Interested in replacing their in-house 12-hour immersion with our 20-hour concentrate.',
    },
  });

  // STAGE 3: ACCEPTED / WON ("Maan Chuke Hain")
  const cafeThirdWave = await prisma.cafe.create({
    data: {
      name: 'Third Wave Coffee',
      contactPerson: 'Raghav Sharma',
      phone: '+91 99112 55667',
      email: 'raghav@thirdwaveroasters.in',
      instagram: '@thirdwavecafe',
      city: 'Bengaluru',
      area: 'Indiranagar Flagship',
      status: 'ACCEPTED',
      pitchDate: new Date('2026-09-15'),
      productInterest: '180ml RTD & 1L Bulk Concentrate',
      pitchNotes: 'Maan chuke hain! Signed agreement for bi-weekly delivery of 180ml & 1L bottles.',
    },
  });

  const cafeDailyBean = await prisma.cafe.create({
    data: {
      name: 'The Daily Bean Specialty Cafe',
      contactPerson: 'Meera Nair',
      phone: '+91 98822 66778',
      email: 'meera@dailybeancafe.com',
      instagram: '@dailybeancafe',
      city: 'Bengaluru',
      area: 'Koramangala 4th Block',
      status: 'ACCEPTED',
      pitchDate: new Date('2026-09-16'),
      productInterest: 'Floral Cold Brew 180ml',
      pitchNotes: 'Converted to recurring weekly buyer. Loves low acidity floral notes.',
    },
  });

  const cafeArtisanCorner = await prisma.cafe.create({
    data: {
      name: 'Artisan Corner Bistro',
      contactPerson: 'Dev Sen',
      phone: '+91 97733 77889',
      email: 'dev@artisancorner.in',
      city: 'Bengaluru',
      area: 'HSR Layout Sector 3',
      status: 'ACCEPTED',
      pitchDate: new Date('2026-09-18'),
      productInterest: '1L Cold Brew Concentrate',
      pitchNotes: 'Uses 1L pitchers as base for signature cold brew mocktails.',
    },
  });

  // STAGE 4: REJECTED / DECLINED ("Nahi Maane")
  const cafeUrbanGrind = await prisma.cafe.create({
    data: {
      name: 'Urban Grind Roastery',
      contactPerson: 'Rohan Mehra',
      phone: '+91 96644 88990',
      email: 'rohan@urbangrind.in',
      city: 'Bengaluru',
      area: 'Lavelle Road',
      status: 'REJECTED',
      pitchDate: new Date('2026-09-17'),
      rejectionReason: 'Existing 1-year exclusive supply contract with an overseas roaster.',
      pitchNotes: 'Politely declined for now due to lock-in. Will re-approach in Q1 2027.',
    },
  });

  console.log('✓ Seeded 8 cafés across To Pitch, Pitched, Accepted, and Rejected stages.');

  // 4. Seed Date-wise B2B Sales Orders with 180ml & 1L Bottles
  // Sale 1: Third Wave Coffee (Paid via UPI) - 22 Sep 2026
  const sale1 = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-2026-001',
      date: new Date('2026-09-22T11:00:00Z'),
      cafeId: cafeThirdWave.id,
      subtotal: 6000.0,
      discount: 0,
      tax: 0,
      total: 6000.0,
      amountPaid: 6000.0,
      paymentStatus: 'PAID',
      paymentMethod: 'UPI',
      bottleSize: '180ml',
      flavor: 'Classic Cold Brew (100% Arabica)',
      notes: 'Delivered 50 bottles of 180ml Classic Cold Brew. UPI paid immediately.',
      partnerId: 'PARTNER_NISHANT',
      items: {
        create: [
          {
            productId: prodClassic180.id,
            bottleSize: '180ml',
            flavor: 'Classic Cold Brew (100% Arabica)',
            quantity: 50,
            unitPrice: 120.0,
            discount: 0,
            total: 6000.0,
            unitCost: 45.0,
            grossMargin: 3750.0,
          },
        ],
      },
    },
  });

  // Sale 2: The Daily Bean Specialty Cafe (Partial payment) - 24 Sep 2026
  const sale2 = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-2026-002',
      date: new Date('2026-09-24T14:30:00Z'),
      cafeId: cafeDailyBean.id,
      subtotal: 4800.0,
      discount: 0,
      tax: 0,
      total: 4800.0,
      amountPaid: 3000.0,
      paymentStatus: 'PARTIAL',
      paymentMethod: 'UPI',
      bottleSize: '180ml',
      flavor: 'Floral Cold Brew (Chikmagalur Arabica)',
      notes: 'Delivered 40 bottles of 180ml Floral. Paid ₹3,000 advance, ₹1,800 pending.',
      partnerId: 'PARTNER_CHINMAY',
      items: {
        create: [
          {
            productId: prodFloral180.id,
            bottleSize: '180ml',
            flavor: 'Floral Cold Brew (Chikmagalur Arabica)',
            quantity: 40,
            unitPrice: 120.0,
            discount: 0,
            total: 4800.0,
            unitCost: 50.0,
            grossMargin: 2800.0,
          },
        ],
      },
    },
  });

  // Sale 3: Artisan Corner Bistro (Pending Invoice) - 25 Sep 2026
  const sale3 = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-2026-003',
      date: new Date('2026-09-25T10:00:00Z'),
      cafeId: cafeArtisanCorner.id,
      subtotal: 7200.0,
      discount: 0,
      tax: 0,
      total: 7200.0,
      amountPaid: 0,
      paymentStatus: 'PENDING',
      paymentMethod: 'Bank Transfer',
      bottleSize: '1L',
      flavor: 'Classic Cold Brew (100% Arabica)',
      notes: 'Delivered 15 bottles of 1 Litre Classic Concentrate. Net-7 days invoice.',
      partnerId: 'PARTNER_NISHANT',
      items: {
        create: [
          {
            productId: prodClassic1L.id,
            bottleSize: '1L',
            flavor: 'Classic Cold Brew (100% Arabica)',
            quantity: 15,
            unitPrice: 480.0,
            discount: 0,
            total: 7200.0,
            unitCost: 210.0,
            grossMargin: 4050.0,
          },
        ],
      },
    },
  });

  // Sale 4: Third Wave Coffee (Paid via Bank Transfer) - 25 Sep 2026
  const sale4 = await prisma.sale.create({
    data: {
      saleNumber: 'SALE-2026-004',
      date: new Date('2026-09-25T16:00:00Z'),
      cafeId: cafeThirdWave.id,
      subtotal: 4800.0,
      discount: 0,
      tax: 0,
      total: 4800.0,
      amountPaid: 4800.0,
      paymentStatus: 'PAID',
      paymentMethod: 'Bank Transfer',
      bottleSize: '1L',
      flavor: 'Floral Cold Brew (Chikmagalur Arabica)',
      notes: 'Delivered 10 bottles of 1 Litre Floral Concentrate. IMPS settled.',
      partnerId: 'PARTNER_CHINMAY',
      items: {
        create: [
          {
            productId: prodFloral1L.id,
            bottleSize: '1L',
            flavor: 'Floral Cold Brew (Chikmagalur Arabica)',
            quantity: 10,
            unitPrice: 480.0,
            discount: 0,
            total: 4800.0,
            unitCost: 220.0,
            grossMargin: 2600.0,
          },
        ],
      },
    },
  });

  console.log('✓ Seeded 4 date-wise B2B sales (180ml & 1L, Classic & Floral, Paid/Partial/Pending).');
  console.log('✨ Seeding complete! All systems operational.');
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
