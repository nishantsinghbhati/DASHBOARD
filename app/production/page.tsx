import React from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  TrendingUp,
  AlertTriangle,
  Coffee,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  FileSpreadsheet,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductionBatchesPage() {
  const batches = await prisma.productionBatch.findMany({
    include: {
      product: true,
      ingredients: { include: { inventoryItem: true } },
      finishedGoodsLots: true,
    },
    orderBy: { productionDate: 'desc' },
  });

  // Metric aggregates (Specification 68)
  const totalBatches = batches.length;
  const commercialBatches = batches.filter((b) => b.batchType === 'COMMERCIAL').length;
  const testingBatches = batches.filter((b) => b.batchType !== 'COMMERCIAL').length;
  const totalOutput = batches.reduce((acc, b) => acc + b.actualOutput, 0);
  const avgYield =
    totalBatches > 0
      ? batches.reduce((acc, b) => acc + b.yieldPercent, 0) / totalBatches
      : 100;

  const totalWasteBottles = batches.reduce((acc, b) => acc + b.wasteBottles, 0);
  const totalProducedWithWaste = totalOutput + totalWasteBottles;
  const wasteRate =
    totalProducedWithWaste > 0 ? (totalWasteBottles / totalProducedWithWaste) * 100 : 0;

  const totalProductionCost = batches.reduce((acc, b) => acc + b.totalProductionCost, 0);

  // Coffee used calculation
  const coffeeUsedKg = batches.reduce((acc, b) => {
    const coffeeIngs = b.ingredients.filter((i) => i.inventoryItem.isCoffeeBean);
    return acc + coffeeIngs.reduce((cAcc, ci) => cAcc + ci.quantity, 0);
  }, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Cold Brew Production Batches
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Converts raw materials into finished goods lots with yield metrics, packaging costs, and batch traceability.
          </p>
        </div>

        <Link
          href="/production/new"
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-transform active:scale-95 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Create Production Batch
        </Link>
      </div>

      {/* TOP ANALYTICS METRICS (Specification 68) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Total Production Batches</span>
          <div className="text-2xl font-black text-zinc-100 mt-1">
            {totalBatches}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            {commercialBatches} Commercial • {testingBatches} R&D / Testing
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Total Output Produced</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {totalOutput} btls
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Cold brewed volume
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Average Yield %</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {avgYield.toFixed(1)}%
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Waste Rate: {wasteRate.toFixed(1)}% ({totalWasteBottles} btls)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Total Coffee Beans Used</span>
          <div className="text-2xl font-black text-orange-400 mt-1">
            {coffeeUsedKg.toFixed(1)} kg
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Total Cost: {formatCurrency(totalProductionCost)}
          </span>
        </div>
      </div>

      {/* Production Batches List Table */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            All Production Batches
          </h2>
          <span className="text-xs text-zinc-500">
            Click any batch for 100% end-to-end traceability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/60">
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Expected</th>
                <th className="py-3 px-4 text-right">Actual Output</th>
                <th className="py-3 px-4 text-center">Yield %</th>
                <th className="py-3 px-4 text-right">Total Cost</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Traceability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-zinc-500">
                    No production batches recorded yet. Click &ldquo;+ Create Production Batch&rdquo; to start.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      <Link
                        href={`/production/${batch.batchNumber}`}
                        className="hover:underline flex items-center gap-1.5"
                      >
                        {batch.batchNumber}
                      </Link>
                    </td>

                    <td className="py-3 px-4 text-zinc-400 font-mono">
                      {formatDate(batch.productionDate)}
                    </td>

                    <td className="py-3 px-4 font-semibold text-zinc-200">
                      {batch.product.name}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                          batch.batchType === 'COMMERCIAL'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}
                      >
                        {batch.batchType}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-zinc-400">
                      {batch.expectedOutput}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-100">
                      {batch.actualOutput} btls
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                          batch.yieldPercent >= 95
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}
                      >
                        {batch.yieldPercent}%
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-zinc-200">
                      {formatCurrency(batch.totalProductionCost)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(batch.costPerUnit)}/ea
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {batch.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/production/${batch.batchNumber}`}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 inline-flex items-center gap-1 group-hover:border-amber-500/50 group-hover:text-amber-400 transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
