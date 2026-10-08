import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  FileSpreadsheet,
  DownloadCloud,
  Coffee,
  Package,
  Layers,
  ShoppingBag,
  Receipt,
  Store,
  Calendar,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import { calculatePartnerSpending } from '@/lib/calculations/partners';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ReportsPage() {
  const [
    rawMaterials,
    products,
    finishedGoodsLots,
    batches,
    sales,
    expenses,
    cafes,
    rawTx,
    fgTx,
  ] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { supplier: true } }),
    prisma.product.findMany({ include: { finishedGoodsLots: true, saleItems: true } }),
    prisma.finishedGoodsLot.findMany({ include: { product: true } }),
    prisma.productionBatch.findMany({ include: { product: true, ingredients: { include: { inventoryItem: true } } } }),
    prisma.sale.findMany({ include: { cafe: true, items: { include: { product: true } } } }),
    prisma.expense.findMany({ include: { category: true } }),
    prisma.cafe.findMany(),
    prisma.inventoryTransaction.findMany(),
    prisma.finishedGoodsTransaction.findMany(),
  ]);

  // Calculations for reports
  const totalRevenue = sales.reduce((a, b) => a + b.total, 0);
  const totalExpenses = expenses.reduce((a, b) => a + b.amount, 0);
  const partnerSpend = calculatePartnerSpending(expenses);

  const rawVal = rawMaterials.reduce((a, b) => a + b.currentStockValue, 0);
  const fgVal = finishedGoodsLots.reduce((a, b) => a + b.quantityAvailable * b.unitCost, 0);

  const totalBottlesProduced = batches.reduce((a, b) => a + b.actualOutput, 0);
  const avgYield =
    batches.length > 0
      ? batches.reduce((a, b) => a + b.yieldPercent, 0) / batches.length
      : 100;

  const totalCoffeeUsedKg = batches.reduce((acc, b) => {
    const coffeeIngs = b.ingredients.filter((i) => i.inventoryItem.isCoffeeBean);
    return acc + coffeeIngs.reduce((cAcc, ci) => cAcc + ci.quantity, 0);
  }, 0);

  // Category expense breakdown
  const categoryExpenses: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryExpenses[e.category.name] = (categoryExpenses[e.category.name] || 0) + e.amount;
  });

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Reports & Business Analytics
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Audited operational breakdowns across Raw Materials, Finished Goods, Production, Sales, Expenses, and CRM.
          </p>
        </div>

        <a
          href="/api/export/excel"
          download
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-transform active:scale-95 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Download 19-Sheet Excel Workbook (.xlsx)
        </a>
      </div>

      {/* 1. MASTER BUSINESS KPI SUMMARY */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
          Executive Performance Summary
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400">Total Gross Revenue</span>
            <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
              {formatCurrency(totalRevenue)}
            </div>
            <span className="text-[10px] text-zinc-500">{sales.length} fulfilled orders</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400">Total Operating Expenses</span>
            <div className="text-xl font-bold text-rose-400 mt-1 font-mono">
              {formatCurrency(totalExpenses)}
            </div>
            <span className="text-[10px] text-zinc-500">Business & partner spending</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400">Raw Material Stock Value</span>
            <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
              {formatCurrency(rawVal)}
            </div>
            <span className="text-[10px] text-zinc-500">{rawMaterials.length} inventory items</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <span className="text-zinc-400">Finished Goods Stock Value</span>
            <div className="text-xl font-bold text-zinc-100 mt-1 font-mono">
              {formatCurrency(fgVal)}
            </div>
            <span className="text-[10px] text-zinc-500">At batch production cost</span>
          </div>
        </div>
      </div>

      {/* 2. TABULAR REPORT BREAKDOWNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Performance Report */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Production & Yield Metrics
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Total Brew Batches:</span>
              <span className="font-bold text-zinc-100 font-mono">{batches.length} batches</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Total Actual Output:</span>
              <span className="font-bold text-emerald-400 font-mono">{totalBottlesProduced} bottles</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Average Yield Percentage:</span>
              <span className="font-bold text-amber-400 font-mono">{avgYield.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-800/60">
              <span className="text-zinc-400">Total Coffee Beans Consumed:</span>
              <span className="font-bold text-orange-400 font-mono">{totalCoffeeUsedKg.toFixed(1)} kg</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span className="text-zinc-400">Total Production Cost:</span>
              <span className="font-mono text-zinc-100">
                {formatCurrency(batches.reduce((a, b) => a + b.totalProductionCost, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Expense Category Breakdown Report */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
            <Receipt className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Expense Allocation by Category
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            {Object.entries(categoryExpenses).map(([cat, amt]) => {
              const pct = totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-300 font-semibold">{cat}</span>
                    <span className="font-mono text-zinc-100 font-bold">
                      {formatCurrency(amt)} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-950 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. PARTNER 50/50 RECONCILIATION SUMMARY */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            Fixed Partner 50/50 Equity Balance (Nishant & Chinmay)
          </h3>
          <Link href="/partners" className="text-xs font-semibold text-purple-400 hover:underline">
            Manage Settlement →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400">Nishant Total Paid (50% Target)</span>
            <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
              {formatCurrency(partnerSpend.nishantPaid)}
            </div>
            <span className="text-[10px] text-zinc-500">Target: {formatCurrency(partnerSpend.expectedNishantContribution)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400">Chinmay Total Paid (50% Target)</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
              {formatCurrency(partnerSpend.chinmayPaid)}
            </div>
            <span className="text-[10px] text-zinc-500">Target: {formatCurrency(partnerSpend.expectedChinmayContribution)}</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-400">Reimbursement Difference</span>
            <div className="text-lg font-bold text-zinc-100 mt-1 font-mono">
              {partnerSpend.isBalanced
                ? 'Balanced'
                : `${partnerSpend.payerName} owes ${formatCurrency(partnerSpend.settlementAmount)}`}
            </div>
            <span className="text-[10px] text-zinc-500">To maintain 50/50 balance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
