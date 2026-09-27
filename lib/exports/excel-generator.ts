import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db/prisma';
import { calculatePartnerSpending } from '@/lib/calculations/partners';

export async function generateFullBusinessWorkbook(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'BREWW 1671 Operating System';
  workbook.lastModifiedBy = 'Nishant & Chinmay';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color constants
  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2D1E12' }, // Dark espresso
  };
  const HEADER_FONT: Partial<ExcelJS.Font> = {
    name: 'Arial',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const applySheetStyling = (ws: ExcelJS.Worksheet) => {
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF4A3525' } },
        bottom: { style: 'medium', color: { argb: 'FFD97706' } },
      };
    });
  };

  // Fetch all business data in parallel
  const [
    business,
    rawMaterials,
    rawTransactions,
    coffeeBeans,
    products,
    finishedGoodsLots,
    fgTransactions,
    batches,
    ingredients,
    outputs,
    wasteRecords,
    sales,
    expenses,
    settlements,
    cafes,
    followUps,
  ] = await Promise.all([
    prisma.business.findFirst(),
    prisma.inventoryItem.findMany({ include: { supplier: true } }),
    prisma.inventoryTransaction.findMany({ include: { inventoryItem: true }, orderBy: { date: 'desc' } }),
    prisma.coffeeBean.findMany({ include: { inventoryItem: true } }),
    prisma.product.findMany({ include: { finishedGoodsLots: true } }),
    prisma.finishedGoodsLot.findMany({ include: { product: true }, orderBy: { productionDate: 'desc' } }),
    prisma.finishedGoodsTransaction.findMany({ include: { lot: { include: { product: true } } }, orderBy: { date: 'desc' } }),
    prisma.productionBatch.findMany({ include: { product: true }, orderBy: { productionDate: 'desc' } }),
    prisma.productionIngredient.findMany({ include: { productionBatch: true, inventoryItem: true } }),
    prisma.productionOutput.findMany({ include: { productionBatch: true, product: true } }),
    prisma.wasteRecord.findMany({ include: { inventoryItem: true, finishedGoodsLot: { include: { product: true } } }, orderBy: { date: 'desc' } }),
    prisma.sale.findMany({ include: { cafe: true, items: { include: { product: true, finishedGoodsLot: true } } }, orderBy: { date: 'desc' } }),
    prisma.expense.findMany({ include: { category: true }, orderBy: { date: 'desc' } }),
    prisma.settlement.findMany({ orderBy: { date: 'desc' } }),
    prisma.cafe.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.followUp.findMany({ include: { cafe: true }, orderBy: { dueDate: 'asc' } }),
  ]);

  // -------------------------------------------------------------
  // Sheet 1: Business Summary
  // -------------------------------------------------------------
  const ws1 = workbook.addWorksheet('1. Business Summary');
  ws1.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 25 },
    { header: 'Unit / Context', key: 'context', width: 30 },
  ];
  applySheetStyling(ws1);

  const totalRevenue = sales.reduce((a, b) => a + b.total, 0);
  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
  const rawStockVal = rawMaterials.reduce((a, b) => a + b.currentStockValue, 0);
  const fgStockVal = finishedGoodsLots.reduce((a, b) => a + b.quantityAvailable * b.unitCost, 0);
  const partnerSpend = calculatePartnerSpending(expenses);

  ws1.addRows([
    { metric: 'Company Name', value: business?.name || 'BREWW 1671', context: 'Cold Brew Coffee Co.' },
    { metric: 'Partners & Ownership', value: 'Nishant (50%) & Chinmay (50%)', context: 'Fixed 50/50 Equity' },
    { metric: 'Total Gross Revenue', value: totalRevenue, context: 'INR (₹)' },
    { metric: 'Total Business Expenses', value: totalExpenses, context: 'INR (₹)' },
    { metric: 'Raw Material Inventory Value', value: rawStockVal, context: 'INR (₹) at average cost' },
    { metric: 'Finished Goods Inventory Value', value: Math.round(fgStockVal), context: 'INR (₹) at actual production cost' },
    { metric: 'Total Batches Produced', value: batches.length, context: 'Batches' },
    { metric: 'Active B2B Cafés / Leads', value: cafes.length, context: 'Cafés in CRM pipeline' },
    { metric: 'Nishant Total Spending', value: partnerSpend.nishantPaid, context: 'INR (₹)' },
    { metric: 'Chinmay Total Spending', value: partnerSpend.chinmayPaid, context: 'INR (₹)' },
    { metric: 'Current 50/50 Settlement Status', value: partnerSpend.isBalanced ? 'Balanced' : `${partnerSpend.payerName} owes ₹${partnerSpend.settlementAmount}`, context: 'Pending reimbursement' },
  ]);

  // -------------------------------------------------------------
  // Sheet 2: Raw Materials
  // -------------------------------------------------------------
  const ws2 = workbook.addWorksheet('2. Raw Materials');
  ws2.columns = [
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Material Name', key: 'name', width: 26 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Current Quantity', key: 'currentQuantity', width: 16 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Avg Cost (₹)', key: 'averageCost', width: 14 },
    { header: 'Stock Value (₹)', key: 'currentStockValue', width: 16 },
    { header: 'Min Stock', key: 'minStock', width: 12 },
    { header: 'Supplier', key: 'supplier', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  applySheetStyling(ws2);

  rawMaterials.forEach((rm) => {
    let status = 'Healthy';
    if (rm.currentQuantity <= 0) status = 'Out of Stock';
    else if (rm.currentQuantity <= rm.minStock) status = 'Low Stock';

    ws2.addRow({
      sku: rm.sku,
      name: rm.name,
      category: rm.category,
      currentQuantity: rm.currentQuantity,
      unit: rm.unit,
      averageCost: rm.averageCost,
      currentStockValue: rm.currentStockValue,
      minStock: rm.minStock,
      supplier: rm.supplier?.name || 'Local',
      status,
    });
  });

  // -------------------------------------------------------------
  // Sheet 3: Raw Material Transactions
  // -------------------------------------------------------------
  const ws3 = workbook.addWorksheet('3. Raw Material Transactions');
  ws3.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Material', key: 'material', width: 24 },
    { header: 'Transaction Type', key: 'type', width: 22 },
    { header: 'Quantity Change', key: 'quantity', width: 16 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Unit Cost (₹)', key: 'unitCost', width: 14 },
    { header: 'Total (₹)', key: 'totalCost', width: 14 },
    { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];
  applySheetStyling(ws3);

  rawTransactions.forEach((tx) => {
    ws3.addRow({
      date: tx.date.toISOString().split('T')[0],
      material: tx.inventoryItem.name,
      type: tx.type,
      quantity: tx.quantity,
      unit: tx.unit,
      unitCost: tx.unitCost,
      totalCost: tx.totalCost,
      reference: tx.reference || '-',
      notes: tx.notes || '',
    });
  });

  // -------------------------------------------------------------
  // Sheet 4: Coffee Beans
  // -------------------------------------------------------------
  const ws4 = workbook.addWorksheet('4. Coffee Beans');
  ws4.columns = [
    { header: 'Bean Name', key: 'beanName', width: 22 },
    { header: 'Origin', key: 'origin', width: 16 },
    { header: 'Supplier', key: 'supplier', width: 20 },
    { header: 'Roast Level', key: 'roast', width: 14 },
    { header: 'Bean Type', key: 'beanType', width: 14 },
    { header: 'Purchased (kg)', key: 'purchased', width: 16 },
    { header: 'Remaining (kg)', key: 'remaining', width: 16 },
    { header: 'Cost / kg (₹)', key: 'costPerKg', width: 14 },
    { header: 'Total Cost (₹)', key: 'totalCost', width: 16 },
  ];
  applySheetStyling(ws4);

  coffeeBeans.forEach((cb) => {
    ws4.addRow({
      beanName: cb.beanName,
      origin: cb.origin,
      supplier: cb.supplier,
      roast: cb.roast,
      beanType: cb.beanType,
      purchased: cb.quantityPurchased,
      remaining: cb.quantityRemaining,
      costPerKg: cb.costPerKg,
      totalCost: cb.purchaseCost,
    });
  });

  // -------------------------------------------------------------
  // Sheet 5: Finished Goods
  // -------------------------------------------------------------
  const ws5 = workbook.addWorksheet('5. Finished Goods');
  ws5.columns = [
    { header: 'SKU', key: 'sku', width: 14 },
    { header: 'Product Name', key: 'name', width: 26 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Size', key: 'size', width: 12 },
    { header: 'Selling Price (₹)', key: 'sellingPrice', width: 16 },
    { header: 'Standard Cost (₹)', key: 'standardCost', width: 16 },
    { header: 'Min Stock', key: 'minStock', width: 12 },
    { header: 'Available Units', key: 'available', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
  ];
  applySheetStyling(ws5);

  products.forEach((p) => {
    const totalAvail = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
    ws5.addRow({
      sku: p.sku,
      name: p.name,
      category: p.category,
      size: p.size,
      sellingPrice: p.sellingPrice,
      standardCost: p.standardCost,
      minStock: p.minStock,
      available: totalAvail,
      status: p.isActive ? 'Active' : 'Inactive',
    });
  });

  // -------------------------------------------------------------
  // Sheet 6: Finished Goods Lots
  // -------------------------------------------------------------
  const ws6 = workbook.addWorksheet('6. Finished Goods Lots');
  ws6.columns = [
    { header: 'Lot Number', key: 'lotNumber', width: 16 },
    { header: 'Product', key: 'product', width: 26 },
    { header: 'Production Date', key: 'productionDate', width: 16 },
    { header: 'Best Before', key: 'bestBeforeDate', width: 16 },
    { header: 'Produced', key: 'produced', width: 12 },
    { header: 'Available', key: 'available', width: 12 },
    { header: 'Sold', key: 'sold', width: 12 },
    { header: 'Sampled', key: 'sampled', width: 12 },
    { header: 'Wasted', key: 'wasted', width: 12 },
    { header: 'Unit Cost (₹)', key: 'unitCost', width: 14 },
    { header: 'Stock Value (₹)', key: 'stockVal', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  applySheetStyling(ws6);

  finishedGoodsLots.forEach((lot) => {
    ws6.addRow({
      lotNumber: lot.lotNumber,
      product: lot.product.name,
      productionDate: lot.productionDate.toISOString().split('T')[0],
      bestBeforeDate: lot.bestBeforeDate ? lot.bestBeforeDate.toISOString().split('T')[0] : '-',
      produced: lot.quantityProduced,
      available: lot.quantityAvailable,
      sold: lot.quantitySold,
      sampled: lot.quantitySampled,
      wasted: lot.quantityWasted,
      unitCost: lot.unitCost,
      stockVal: Math.round(lot.quantityAvailable * lot.unitCost),
      status: lot.status,
    });
  });

  // -------------------------------------------------------------
  // Sheet 7: Finished Goods Transactions
  // -------------------------------------------------------------
  const ws7 = workbook.addWorksheet('7. FG Transactions');
  ws7.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Lot Number', key: 'lot', width: 16 },
    { header: 'Product', key: 'product', width: 24 },
    { header: 'Type', key: 'type', width: 16 },
    { header: 'Quantity Change', key: 'quantity', width: 16 },
    { header: 'Unit Cost (₹)', key: 'unitCost', width: 14 },
    { header: 'Total Cost (₹)', key: 'totalCost', width: 14 },
    { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Notes', key: 'notes', width: 28 },
  ];
  applySheetStyling(ws7);

  fgTransactions.forEach((tx) => {
    ws7.addRow({
      date: tx.date.toISOString().split('T')[0],
      lot: tx.lot.lotNumber,
      product: tx.lot.product.name,
      type: tx.type,
      quantity: tx.quantity,
      unitCost: tx.unitCost,
      totalCost: tx.totalCost,
      reference: tx.reference || '-',
      notes: tx.notes || '',
    });
  });

  // -------------------------------------------------------------
  // Sheet 8: Production Batches
  // -------------------------------------------------------------
  const ws8 = workbook.addWorksheet('8. Production Batches');
  ws8.columns = [
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Product', key: 'product', width: 26 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Expected Output', key: 'expected', width: 16 },
    { header: 'Actual Output', key: 'actual', width: 14 },
    { header: 'Yield %', key: 'yield', width: 12 },
    { header: 'Raw Material Cost (₹)', key: 'rmCost', width: 20 },
    { header: 'Packaging Cost (₹)', key: 'pkgCost', width: 18 },
    { header: 'Total Cost (₹)', key: 'totalCost', width: 16 },
    { header: 'Cost / Unit (₹)', key: 'unitCost', width: 16 },
    { header: 'Cost / Liter (₹)', key: 'literCost', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
  ];
  applySheetStyling(ws8);

  batches.forEach((b) => {
    ws8.addRow({
      batchNumber: b.batchNumber,
      date: b.productionDate.toISOString().split('T')[0],
      product: b.product.name,
      type: b.batchType,
      expected: b.expectedOutput,
      actual: b.actualOutput,
      yield: `${b.yieldPercent}%`,
      rmCost: b.rawMaterialCost,
      pkgCost: b.packagingCost,
      totalCost: b.totalProductionCost,
      unitCost: b.costPerUnit,
      literCost: b.costPerLiter,
      status: b.status,
    });
  });

  // -------------------------------------------------------------
  // Sheet 9: Production Ingredients
  // -------------------------------------------------------------
  const ws9 = workbook.addWorksheet('9. Production Ingredients');
  ws9.columns = [
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Raw Material', key: 'material', width: 24 },
    { header: 'Quantity Consumed', key: 'quantity', width: 18 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Unit Cost (₹)', key: 'unitCost', width: 14 },
    { header: 'Total Cost (₹)', key: 'totalCost', width: 16 },
  ];
  applySheetStyling(ws9);

  ingredients.forEach((ing) => {
    ws9.addRow({
      batchNumber: ing.productionBatch.batchNumber,
      material: ing.inventoryItem.name,
      quantity: ing.quantity,
      unit: ing.unit,
      unitCost: ing.unitCost,
      totalCost: ing.totalCost,
    });
  });

  // -------------------------------------------------------------
  // Sheet 10: Production Output
  // -------------------------------------------------------------
  const ws10 = workbook.addWorksheet('10. Production Output');
  ws10.columns = [
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Product', key: 'product', width: 26 },
    { header: 'Expected Output', key: 'expected', width: 16 },
    { header: 'Actual Output', key: 'actual', width: 14 },
    { header: 'Commercial Units', key: 'commercial', width: 16 },
    { header: 'Testing Units', key: 'testing', width: 14 },
    { header: 'Waste Bottles', key: 'waste', width: 14 },
    { header: 'Unit Cost (₹)', key: 'unitCost', width: 14 },
    { header: 'Total Output Cost (₹)', key: 'totalCost', width: 20 },
  ];
  applySheetStyling(ws10);

  outputs.forEach((out) => {
    ws10.addRow({
      batchNumber: out.productionBatch.batchNumber,
      product: out.product.name,
      expected: out.expectedQuantity,
      actual: out.actualQuantity,
      commercial: out.commercialQuantity,
      testing: out.testingQuantity,
      waste: out.wasteQuantity,
      unitCost: out.unitCost,
      totalCost: out.totalCost,
    });
  });

  // -------------------------------------------------------------
  // Sheet 11: Testing & R&D
  // -------------------------------------------------------------
  const ws11 = workbook.addWorksheet('11. Testing & RD');
  ws11.columns = [
    { header: 'Batch Number', key: 'batchNumber', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Recipe / Notes', key: 'recipe', width: 30 },
    { header: 'Testing Output', key: 'output', width: 16 },
    { header: 'Cost (₹)', key: 'cost', width: 14 },
  ];
  applySheetStyling(ws11);

  batches.filter(b => b.batchType !== 'COMMERCIAL').forEach((b) => {
    ws11.addRow({
      batchNumber: b.batchNumber,
      date: b.productionDate.toISOString().split('T')[0],
      recipe: b.recipe || b.notes || 'Internal R&D test',
      output: `${b.actualOutput} units`,
      cost: b.totalProductionCost,
    });
  });

  // -------------------------------------------------------------
  // Sheet 12: Waste Records
  // -------------------------------------------------------------
  const ws12 = workbook.addWorksheet('12. Waste Records');
  ws12.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 18 },
    { header: 'Item / Product', key: 'item', width: 26 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Unit', key: 'unit', width: 10 },
    { header: 'Estimated Cost (₹)', key: 'cost', width: 18 },
    { header: 'Reason', key: 'reason', width: 22 },
    { header: 'Notes', key: 'notes', width: 26 },
  ];
  applySheetStyling(ws12);

  wasteRecords.forEach((w) => {
    const itemName = w.inventoryItem?.name || w.finishedGoodsLot?.product.name || 'Stock item';
    ws12.addRow({
      date: w.date.toISOString().split('T')[0],
      type: w.type,
      item: itemName,
      quantity: w.quantity,
      unit: w.unit,
      cost: w.estimatedCost,
      reason: w.reason,
      notes: w.notes || '',
    });
  });

  // -------------------------------------------------------------
  // Sheet 13: Sales
  // -------------------------------------------------------------
  const ws13 = workbook.addWorksheet('13. Sales');
  ws13.columns = [
    { header: 'Sale Number', key: 'saleNumber', width: 16 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Customer / Café', key: 'cafe', width: 24 },
    { header: 'Subtotal (₹)', key: 'subtotal', width: 14 },
    { header: 'Discount (₹)', key: 'discount', width: 14 },
    { header: 'Total (₹)', key: 'total', width: 14 },
    { header: 'Payment Status', key: 'status', width: 16 },
    { header: 'Payment Method', key: 'method', width: 16 },
    { header: 'Units Sold', key: 'units', width: 12 },
  ];
  applySheetStyling(ws13);

  sales.forEach((s) => {
    const totalUnits = s.items.reduce((acc, i) => acc + i.quantity, 0);
    ws13.addRow({
      saleNumber: s.saleNumber,
      date: s.date.toISOString().split('T')[0],
      cafe: s.cafe?.name || 'Walk-in / Direct B2B',
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      status: s.paymentStatus,
      method: s.paymentMethod,
      units: totalUnits,
    });
  });

  // -------------------------------------------------------------
  // Sheet 14: Expenses
  // -------------------------------------------------------------
  const ws14 = workbook.addWorksheet('14. Expenses');
  ws14.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Expense Title', key: 'title', width: 26 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Amount (₹)', key: 'amount', width: 14 },
    { header: 'Paid By', key: 'paidBy', width: 18 },
    { header: 'Payment Method', key: 'method', width: 16 },
    { header: 'Vendor', key: 'vendor', width: 20 },
    { header: 'Settled?', key: 'settled', width: 12 },
  ];
  applySheetStyling(ws14);

  expenses.forEach((e) => {
    ws14.addRow({
      date: e.date.toISOString().split('T')[0],
      title: e.title,
      category: e.category.name,
      amount: e.amount,
      paidBy: e.paidBy,
      method: e.paymentMethod,
      vendor: e.vendor || '-',
      settled: e.isSettled ? 'Yes' : 'Pending',
    });
  });

  // -------------------------------------------------------------
  // Sheet 15: Partner Spending
  // -------------------------------------------------------------
  const ws15 = workbook.addWorksheet('15. Partner Spending');
  ws15.columns = [
    { header: 'Partner', key: 'partner', width: 18 },
    { header: 'Ownership %', key: 'equity', width: 14 },
    { header: 'Total Spent (₹)', key: 'spent', width: 18 },
    { header: 'Expected Share (₹)', key: 'expected', width: 18 },
    { header: 'Net Difference (₹)', key: 'diff', width: 18 },
    { header: 'Settlement Status', key: 'status', width: 26 },
  ];
  applySheetStyling(ws15);

  ws15.addRow({
    partner: 'Nishant',
    equity: '50%',
    spent: partnerSpend.nishantPaid,
    expected: partnerSpend.expectedNishantContribution,
    diff: partnerSpend.nishantDifference,
    status: partnerSpend.nishantDifference > 0 ? 'To receive settlement' : 'To pay settlement',
  });
  ws15.addRow({
    partner: 'Chinmay',
    equity: '50%',
    spent: partnerSpend.chinmayPaid,
    expected: partnerSpend.expectedChinmayContribution,
    diff: partnerSpend.chinmayDifference,
    status: partnerSpend.chinmayDifference > 0 ? 'To receive settlement' : 'To pay settlement',
  });

  // -------------------------------------------------------------
  // Sheet 16: Settlements
  // -------------------------------------------------------------
  const ws16 = workbook.addWorksheet('16. Settlements');
  ws16.columns = [
    { header: 'Settlement ID', key: 'id', width: 18 },
    { header: 'Date Settled', key: 'date', width: 16 },
    { header: 'Total Expenses (₹)', key: 'total', width: 18 },
    { header: 'Settlement Amount (₹)', key: 'amount', width: 22 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Notes', key: 'notes', width: 34 },
  ];
  applySheetStyling(ws16);

  settlements.forEach((st) => {
    ws16.addRow({
      id: st.settlementNumber,
      date: st.settledAt ? st.settledAt.toISOString().split('T')[0] : st.date.toISOString().split('T')[0],
      total: st.totalExpenses,
      amount: st.settlementAmount,
      status: st.status,
      notes: st.notes || '',
    });
  });

  // -------------------------------------------------------------
  // Sheet 17: Cafés (CRM)
  // -------------------------------------------------------------
  const ws17 = workbook.addWorksheet('17. Cafes (CRM)');
  ws17.columns = [
    { header: 'Café Name', key: 'name', width: 24 },
    { header: 'Contact Person', key: 'contact', width: 18 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Area / City', key: 'area', width: 20 },
    { header: 'Pipeline Status', key: 'status', width: 18 },
    { header: 'Monthly Est. (units)', key: 'est', width: 20 },
    { header: 'Product Interest', key: 'interest', width: 24 },
  ];
  applySheetStyling(ws17);

  cafes.forEach((c) => {
    ws17.addRow({
      name: c.name,
      contact: c.contactPerson || '-',
      phone: c.phone || '-',
      area: `${c.area || ''} (${c.city})`,
      status: c.status,
      est: c.estMonthlyRequirement || '-',
      interest: c.productInterest || '-',
    });
  });

  // -------------------------------------------------------------
  // Sheet 18: Follow-ups
  // -------------------------------------------------------------
  const ws18 = workbook.addWorksheet('18. Follow-ups');
  ws18.columns = [
    { header: 'Café', key: 'cafe', width: 24 },
    { header: 'Task / Reminder', key: 'title', width: 28 },
    { header: 'Due Date', key: 'dueDate', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Notes', key: 'notes', width: 28 },
  ];
  applySheetStyling(ws18);

  followUps.forEach((f) => {
    ws18.addRow({
      cafe: f.cafe.name,
      title: f.title,
      dueDate: f.dueDate.toISOString().split('T')[0],
      status: f.status,
      notes: f.notes || '',
    });
  });

  // -------------------------------------------------------------
  // Sheet 19: Reports
  // -------------------------------------------------------------
  const ws19 = workbook.addWorksheet('19. Reports');
  ws19.columns = [
    { header: 'Report Section', key: 'section', width: 26 },
    { header: 'Summary Key', key: 'key', width: 26 },
    { header: 'Value', key: 'value', width: 22 },
  ];
  applySheetStyling(ws19);

  ws19.addRows([
    { section: 'Production Performance', key: 'Total Actual Production', value: `${batches.reduce((a, b) => a + b.actualOutput, 0)} bottles` },
    { section: 'Production Performance', key: 'Average Yield Rate', value: `${batches.length > 0 ? (batches.reduce((a, b) => a + b.yieldPercent, 0) / batches.length).toFixed(1) : 100}%` },
    { section: 'Sales & Distribution', key: 'Total Bottles Sold', value: `${finishedGoodsLots.reduce((a, b) => a + b.quantitySold, 0)} bottles` },
    { section: 'Sales & Distribution', key: 'Complimentary Samples Issued', value: `${finishedGoodsLots.reduce((a, b) => a + b.quantitySampled, 0)} bottles` },
    { section: 'Sales & Distribution', key: 'Production & Storage Waste', value: `${finishedGoodsLots.reduce((a, b) => a + b.quantityWasted, 0)} bottles` },
    { section: 'Profitability Snapshot', key: 'Total Gross Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
    { section: 'Profitability Snapshot', key: 'Total Operating Expenses', value: `₹${totalExpenses.toLocaleString('en-IN')}` },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
