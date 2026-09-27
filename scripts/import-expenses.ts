import { prisma } from '../lib/db/prisma';

async function main() {
  console.log('Importing real business expenses from expense tracker...');

  // 1. Ensure categories exist
  const categoriesToEnsure = [
    { name: 'Brewing Equipment', color: '#0284c7', isProductionRelated: true },
    { name: 'Coffee Beans', color: '#8B4513', isProductionRelated: true },
    { name: 'Brewing Accessories', color: '#6366f1', isProductionRelated: true },
    { name: 'Water', color: '#06b6d4', isProductionRelated: true },
    { name: 'Bottles', color: '#d97706', isProductionRelated: true },
    { name: 'Storage', color: '#8b5cf6', isProductionRelated: false },
  ];

  const categoryMap = new Map<string, string>();

  for (const cat of categoriesToEnsure) {
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: cat.name },
    });
    if (existing) {
      categoryMap.set(cat.name, existing.id);
    } else {
      const created = await prisma.expenseCategory.create({
        data: cat,
      });
      categoryMap.set(cat.name, created.id);
    }
  }

  // 2. The 12 expenses from the report
  const rawExpenses = [
    {
      date: '2026-09-08T10:00:00.000Z',
      paidBy: 'Chinmay',
      partnerId: 'PARTNER_CHINMAY',
      category: 'Brewing Equipment',
      title: 'MSW3 Bomber Brewing Station',
      amount: 3800,
      notes: 'Paid by Chinmay',
    },
    {
      date: '2026-09-08T11:00:00.000Z',
      paidBy: 'Chinmay',
      partnerId: 'PARTNER_CHINMAY',
      category: 'Coffee Beans',
      title: 'Floral Coffee Beans',
      amount: 2000,
      notes: 'Paid by Chinmay',
    },
    {
      date: '2026-09-09T10:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Brewing Accessories',
      title: 'Strainer / Channi',
      amount: 60,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-09T11:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Brewing Equipment',
      title: 'Brewing Bottle',
      amount: 399,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-09T12:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Brewing Accessories',
      title: 'Muslin Cloth',
      amount: 60,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-09T13:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Water',
      title: '10 litres water',
      amount: 130,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-10T10:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Bottles',
      title: '2 Pavva bottles × ₹15',
      amount: 30,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-10T11:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Bottles',
      title: '4 × 1L glass milk bottles × ₹30',
      amount: 120,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-10T12:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Brewing Equipment',
      title: '2 Brewing bottles × ₹235',
      amount: 470,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-10T13:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Bottles',
      title: '2 Small bottles × ₹20',
      amount: 40,
      notes: 'Paid by Nishant',
    },
    {
      date: '2026-09-12T10:00:00.000Z',
      paidBy: 'Chinmay',
      partnerId: 'PARTNER_CHINMAY',
      category: 'Storage',
      title: '2 Jars × ₹150',
      amount: 300,
      notes: 'Paid by Chinmay',
    },
    {
      date: '2026-09-12T11:00:00.000Z',
      paidBy: 'Nishant',
      partnerId: 'PARTNER_NISHANT',
      category: 'Storage',
      title: 'Plastic Jar',
      amount: 1516,
      notes: 'Paid by Nishant',
    },
  ];

  let totalChinmay = 0;
  let totalNishant = 0;

  for (const item of rawExpenses) {
    const categoryId = categoryMap.get(item.category)!;

    const expense = await prisma.expense.create({
      data: {
        date: new Date(item.date),
        title: item.title,
        categoryId,
        amount: item.amount,
        paidBy: item.paidBy,
        partnerId: item.partnerId,
        paymentMethod: 'UPI',
        notes: item.notes,
        isSettled: false,
      },
      include: { category: true },
    });

    if (item.paidBy === 'Chinmay') {
      totalChinmay += item.amount;
    } else {
      totalNishant += item.amount;
    }

    await prisma.auditLog.create({
      data: {
        userId: item.partnerId,
        partnerName: item.paidBy,
        action: 'EXPENSE_CREATED',
        entity: 'Expense',
        entityId: expense.id,
        newValue: `₹${item.amount}`,
        details: `Logged expense "${item.title}" (${item.category}) of ₹${item.amount} paid by ${item.paidBy}`,
      },
    });

    console.log(`+ Added: ${item.title} | ₹${item.amount} (${item.paidBy})`);
  }

  const grandTotal = totalChinmay + totalNishant;
  console.log('\n--- Expense Import Summary ---');
  console.log(`Total Chinmay: ₹${totalChinmay}`);
  console.log(`Total Nishant: ₹${totalNishant}`);
  console.log(`Grand Total Expense: ₹${grandTotal}`);
  console.log(`Target 50/50 Share: ₹${grandTotal / 2}`);
  console.log(`Settlement: Nishant owes Chinmay ₹${(totalChinmay - totalNishant) / 2}`);
}

main()
  .catch((e) => {
    console.error('Error importing expenses:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
