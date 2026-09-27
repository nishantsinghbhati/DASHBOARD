import React from 'react';
import Link from 'next/link';
import {
  Package,
  Layers,
  ShoppingBag,
  Gift,
  Trash2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency } from '@/lib/calculations/inventory';
import { FinishedGoodsClientView } from '@/components/inventory/FinishedGoodsClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FinishedGoodsPage() {
  const [lots, products, cafes] = await Promise.all([
    prisma.finishedGoodsLot.findMany({
      include: {
        product: true,
        productionBatch: true,
      },
      orderBy: { productionDate: 'desc' },
    }),
    prisma.product.findMany({
      include: { finishedGoodsLots: true, saleItems: true },
    }),
    prisma.cafe.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  // Aggregate Metrics
  const totalUnitsAvailable = lots.reduce((acc, l) => acc + l.quantityAvailable, 0);
  const totalFinishedGoodsValue = lots.reduce((acc, l) => acc + l.quantityAvailable * l.unitCost, 0);
  const totalProduced = lots.reduce((acc, l) => acc + l.quantityProduced, 0);
  const totalSold = lots.reduce((acc, l) => acc + l.quantitySold, 0);
  const totalSampled = lots.reduce((acc, l) => acc + l.quantitySampled, 0);
  const totalWasted = lots.reduce((acc, l) => acc + l.quantityWasted, 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Finished Goods Inventory & Batch Lots
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Every bottle produced is tracked by Lot (e.g. FG-2026-001) with expiry dates and actual unit costs.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
          <Link
            href="/inventory"
            className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/inventory/coffee-beans"
            className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Coffee Beans
          </Link>
          <Link
            href="/inventory/raw-materials"
            className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Packaging &amp; Materials
          </Link>
          <Link
            href="/inventory/finished-goods"
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow"
          >
            Finished Goods
          </Link>
        </div>
      </div>

      {/* TOP KPI CARDS (Specification 12) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Total Units Available</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {totalUnitsAvailable}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Ready for delivery</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Finished Goods Value</span>
          <div className="text-2xl font-black text-zinc-100 mt-1">
            {formatCurrency(totalFinishedGoodsValue)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Valued at batch production cost
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Total Units Sold</span>
          <div className="text-2xl font-black text-sky-400 mt-1">{totalSold}</div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">B2B commercial sales</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Samples & Waste</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold text-pink-400">
              {totalSampled} Samples
            </span>
            <span className="text-lg font-bold text-rose-400">
              {totalWasted} Wasted
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Non-revenue stock out</span>
        </div>
      </div>

      {/* PRODUCT LEVEL SUMMARY CARDS (Specification 12) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Product Performance Cards
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((p) => {
            const avail = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
            const produced = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantityProduced, 0);
            const sold = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantitySold, 0);
            const sampled = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantitySampled, 0);
            const wasted = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantityWasted, 0);

            const revenue = p.saleItems.reduce((acc, item) => acc + item.total, 0);
            const totalProdCost = p.finishedGoodsLots.reduce(
              (acc, l) => acc + l.totalProductionCost,
              0
            );

            return (
              <div
                key={p.id}
                className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{p.name}</h3>
                    <span className="text-xs text-amber-400 font-mono">
                      Selling Price: ₹{p.sellingPrice}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      avail <= p.minStock
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {avail <= p.minStock ? 'Low Stock' : 'Healthy'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400">Produced</span>
                    <div className="font-bold text-zinc-200 mt-0.5">{produced}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400">Sold</span>
                    <div className="font-bold text-sky-400 mt-0.5">{sold}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80">
                    <span className="text-[10px] text-zinc-400">Available</span>
                    <div className="font-bold text-emerald-400 mt-0.5">{avail}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    Samples: <strong className="text-pink-400">{sampled}</strong> • Waste:{' '}
                    <strong className="text-rose-400">{wasted}</strong>
                  </span>
                  <span className="font-bold text-emerald-400">
                    Rev: {formatCurrency(revenue)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Finished Goods Interactive Table with Modals */}
      <FinishedGoodsClientView lots={lots} cafes={cafes} />
    </div>
  );
}
