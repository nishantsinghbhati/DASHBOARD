import React from 'react';
import Link from 'next/link';
import {
  Coffee,
  DollarSign,
  AlertTriangle,
  XCircle,
  TrendingDown,
  ShoppingBag,
  History,
  ArrowRight,
  Package,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';
import { CoffeeBeansClientView } from '@/components/inventory/CoffeeBeansClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CoffeeBeansPage() {
  const [beans, suppliers, recentTransactions] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isCoffeeBean: true },
      include: {
        supplier: true,
        coffeeBeanDetails: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.inventoryTransaction.findMany({
      where: {
        inventoryItem: {
          isCoffeeBean: true,
        },
      },
      include: { inventoryItem: true },
      take: 100,
      orderBy: { date: 'desc' },
    }),
  ]);

  // Analytics Metrics
  const totalStockValue = beans.reduce((acc, i) => acc + i.currentStockValue, 0);
  const totalCoffeeKg = beans.reduce((acc, i) => acc + i.currentQuantity, 0);
  const lowStockCount = beans.filter((i) => i.currentQuantity <= i.minStock && i.currentQuantity > 0).length;
  const outOfStockCount = beans.filter((i) => i.currentQuantity <= 0).length;
  const weightedAvgCost = totalCoffeeKg > 0 ? totalStockValue / totalCoffeeKg : (beans[0]?.averageCost || 0);

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const consumedThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'PRODUCTION_CONSUMPTION',
      inventoryItem: { isCoffeeBean: true },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true, quantity: true },
  });

  const purchasedThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'PURCHASE',
      inventoryItem: { isCoffeeBean: true },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true, quantity: true },
  });

  const wasteThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'WASTE',
      inventoryItem: { isCoffeeBean: true },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true, quantity: true },
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Coffee className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Coffee Beans Inventory &amp; Green / Roasted Stock
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Origin traceability, roast profiles, estate lots, and atomic cold brew batch consumption.
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
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow"
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

      {/* TOP COFFEE BEAN KPI METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Bean Varieties in Catalog</span>
          <div className="text-2xl font-black text-zinc-100 mt-1">{beans.length}</div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Origins &amp; Roasts</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Total Bean Stock Available</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {totalCoffeeKg.toFixed(2)} kg
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Ready for brewing batches</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Total Bean Inventory Value</span>
          <div className="text-2xl font-black text-orange-400 mt-1">
            {formatCurrency(totalStockValue)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Avg: {formatCurrency(weightedAvgCost)} / kg
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Stock Health Alert</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-lg font-bold text-orange-400">
              {lowStockCount} Low
            </span>
            <span className="text-lg font-bold text-rose-400">
              {outOfStockCount} Out
            </span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            {outOfStockCount > 0 ? 'Urgent bean reorder required' : 'Stock levels adequate'}
          </span>
        </div>
      </div>

      {/* MONTHLY BEAN ACTIVITY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
        <div className="flex items-center justify-between p-2">
          <span className="text-xs text-zinc-400">Brewed / Consumed This Month:</span>
          <div className="text-right">
            <span className="text-sm font-bold text-zinc-200 font-mono">
              {Math.abs(consumedThisMonth._sum.quantity || 0).toFixed(1)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block">
              ({formatCurrency(Math.abs(consumedThisMonth._sum.totalCost || 0))})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 border-t md:border-t-0 md:border-l border-zinc-800">
          <span className="text-xs text-zinc-400">Purchased This Month:</span>
          <div className="text-right">
            <span className="text-sm font-bold text-emerald-400 font-mono">
              +{purchasedThisMonth._sum.quantity || 0} kg
            </span>
            <span className="text-[10px] text-zinc-500 block">
              ({formatCurrency(purchasedThisMonth._sum.totalCost || 0)})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 border-t md:border-t-0 md:border-l border-zinc-800">
          <span className="text-xs text-zinc-400">Bean Loss / Spillage:</span>
          <div className="text-right">
            <span className="text-sm font-bold text-rose-400 font-mono">
              {Math.abs(wasteThisMonth._sum.quantity || 0).toFixed(2)} kg
            </span>
            <span className="text-[10px] text-zinc-500 block">
              ({formatCurrency(Math.abs(wasteThisMonth._sum.totalCost || 0))})
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Client Component for Coffee Beans with Editable Ledger */}
      <CoffeeBeansClientView
        beans={beans}
        suppliers={suppliers}
        transactions={recentTransactions}
      />
    </div>
  );
}
