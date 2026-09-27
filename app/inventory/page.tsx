import React from 'react';
import Link from 'next/link';
import {
  Boxes,
  Coffee,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  AlertTriangle,
  History,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MasterInventoryPage() {
  const [
    rawMaterials,
    products,
    finishedGoodsLots,
    rawTransactions,
    fgTransactions,
  ] = await Promise.all([
    prisma.inventoryItem.findMany({ include: { supplier: true } }),
    prisma.product.findMany({ include: { finishedGoodsLots: true } }),
    prisma.finishedGoodsLot.findMany({ include: { product: true } }),
    prisma.inventoryTransaction.findMany({
      include: { inventoryItem: true },
      take: 8,
      orderBy: { date: 'desc' },
    }),
    prisma.finishedGoodsTransaction.findMany({
      include: { lot: { include: { product: true } } },
      take: 8,
      orderBy: { date: 'desc' },
    }),
  ]);

  // Section 1: Raw Materials Overview
  const rawStockValue = rawMaterials.reduce((acc, m) => acc + m.currentStockValue, 0);
  const lowStockRaw = rawMaterials.filter((m) => m.currentQuantity <= m.minStock && m.currentQuantity > 0);
  const outOfStockRaw = rawMaterials.filter((m) => m.currentQuantity <= 0);

  // Calculate monthly consumption of raw materials
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const rawMonthlyConsumptionTx = await prisma.inventoryTransaction.findMany({
    where: {
      type: 'PRODUCTION_CONSUMPTION',
      date: { gte: firstOfMonth },
    },
  });
  const monthlyRawConsumptionCost = rawMonthlyConsumptionTx.reduce((acc, t) => acc + Math.abs(t.totalCost), 0);

  // Section 2: Finished Goods Overview
  const totalFgUnits = finishedGoodsLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
  const totalFgValue = finishedGoodsLots.reduce((acc, l) => acc + l.quantityAvailable * l.unitCost, 0);
  const totalFgProduced = finishedGoodsLots.reduce((acc, l) => acc + l.quantityProduced, 0);
  const totalFgSold = finishedGoodsLots.reduce((acc, l) => acc + l.quantitySold, 0);
  const lowStockFg = products.filter((p) => {
    const avail = p.finishedGoodsLots.reduce((acc, l) => acc + l.quantityAvailable, 0);
    return avail <= p.minStock;
  });

  // Section 3: Inventory Movement Aggregates
  const totalRawIn = await prisma.inventoryTransaction.aggregate({
    where: { quantity: { gt: 0 } },
    _sum: { totalCost: true, quantity: true },
  });
  const totalRawOut = await prisma.inventoryTransaction.aggregate({
    where: { quantity: { lt: 0 } },
    _sum: { totalCost: true, quantity: true },
  });
  const totalFgIn = await prisma.finishedGoodsTransaction.aggregate({
    where: { quantity: { gt: 0 } },
    _sum: { totalCost: true, quantity: true },
  });
  const totalFgOut = await prisma.finishedGoodsTransaction.aggregate({
    where: { quantity: { lt: 0 } },
    _sum: { totalCost: true, quantity: true },
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Master Inventory Dashboard
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Separated dual-inventory: Raw Materials (Beans, Bottles) & Finished Goods (Traceable Lots)
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
          <Link
            href="/inventory"
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow"
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
            className="px-3 py-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Finished Goods
          </Link>
        </div>
      </div>

      {/* SECTION 1: RAW MATERIALS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Raw Materials (Beans, Bottles, Caps, Labels)
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/inventory/coffee-beans"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Coffee Beans →
            </Link>
            <Link
              href="/inventory/raw-materials"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              Packaging &amp; Materials →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Current Stock Value</span>
            <div className="text-xl font-bold text-zinc-100 mt-1">
              {formatCurrency(rawStockValue)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {rawMaterials.length} unique raw items
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Low Stock Alert</span>
            <div className="text-xl font-bold text-orange-400 mt-1">
              {lowStockRaw.length} items
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Below re-order threshold</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Out of Stock</span>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {outOfStockRaw.length} items
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Requires immediate PO</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Monthly Consumption</span>
            <div className="text-xl font-bold text-amber-400 mt-1">
              {formatCurrency(monthlyRawConsumptionCost)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Consumed in production</span>
          </div>
        </div>
      </section>

      {/* SECTION 2: FINISHED GOODS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Finished Goods (Original, Barrel Aged, Concentrates)
            </h2>
          </div>
          <Link
            href="/inventory/finished-goods"
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
          >
            Manage Lots & Stock <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Current Units Available</span>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {totalFgUnits} units
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Across all valid lots</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Current Value (Cost Basis)</span>
            <div className="text-xl font-bold text-zinc-100 mt-1">
              {formatCurrency(totalFgValue)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">At actual production cost</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Units Produced</span>
            <div className="text-xl font-bold text-zinc-200 mt-1">
              {totalFgProduced} units
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Cumulative output</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
            <span className="text-xs text-zinc-400">Units Sold</span>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {totalFgSold} units
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">B2B delivered</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 col-span-2 lg:col-span-1">
            <span className="text-xs text-zinc-400">Low Stock Variants</span>
            <div className="text-xl font-bold text-orange-400 mt-1">
              {lowStockFg.length} products
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Need new brew batch</span>
          </div>
        </div>
      </section>

      {/* SECTION 3: INVENTORY MOVEMENT (Raw In/Out vs Finished In/Out) */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <History className="w-4 h-4 text-purple-400" />
          Inventory Movement Waterfall
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ArrowDownLeft className="w-4 h-4" />
              Raw Material In
            </div>
            <div className="text-lg font-bold text-zinc-100 mt-2">
              {formatCurrency(totalRawIn._sum.totalCost || 0)}
            </div>
            <span className="text-[10px] text-zinc-500">Purchases & Opening Stock</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              Raw Material Out
            </div>
            <div className="text-lg font-bold text-zinc-100 mt-2">
              {formatCurrency(Math.abs(totalRawOut._sum.totalCost || 0))}
            </div>
            <span className="text-[10px] text-zinc-500">Batch Consumption & Waste</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <ArrowDownLeft className="w-4 h-4" />
              Finished Goods In
            </div>
            <div className="text-lg font-bold text-zinc-100 mt-2">
              {formatQuantity(totalFgIn._sum.quantity || 0, 'bottles')}
            </div>
            <span className="text-[10px] text-zinc-500">Production outputs</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80">
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
              <ArrowUpRight className="w-4 h-4" />
              Finished Goods Out
            </div>
            <div className="text-lg font-bold text-zinc-100 mt-2">
              {formatQuantity(Math.abs(totalFgOut._sum.quantity || 0), 'bottles')}
            </div>
            <span className="text-[10px] text-zinc-500">Sales, Samples & Waste</span>
          </div>
        </div>
      </section>

      {/* DUAL LEDGER RECENT MOVEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Material Ledger Entries */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Recent Raw Material Ledger
            </h3>
            <Link
              href="/inventory/raw-materials"
              className="text-[11px] font-semibold text-amber-400 hover:underline"
            >
              Full Ledger →
            </Link>
          </div>

          <div className="space-y-2">
            {rawTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      {tx.inventoryItem.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {tx.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {formatDate(tx.date)} • Ref: {tx.reference || '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      tx.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.unit}
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    {formatCurrency(tx.totalCost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Finished Goods Ledger Entries */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Recent Finished Goods Ledger
            </h3>
            <Link
              href="/inventory/finished-goods"
              className="text-[11px] font-semibold text-emerald-400 hover:underline"
            >
              Full Lots →
            </Link>
          </div>

          <div className="space-y-2">
            {fgTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      {tx.lot.product.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                      {tx.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {formatDate(tx.date)} • Lot {tx.lot.lotNumber}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold ${
                      tx.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} bottles
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    @ ₹{tx.unitCost}/ea
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
