import React from 'react';
import Link from 'next/link';
import {
  Package,
  Layers,
  DollarSign,
  AlertTriangle,
  XCircle,
  TrendingDown,
  ShoppingBag,
  History,
  ArrowRight,
  Coffee,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';
import { RawMaterialClientView } from '@/components/inventory/RawMaterialClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function RawMaterialsPage() {
  const [items, suppliers, recentTransactions] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { isCoffeeBean: false },
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
          isCoffeeBean: false,
        },
      },
      include: { inventoryItem: true },
      take: 100,
      orderBy: { date: 'desc' },
    }),
  ]);

  // Analytics Metrics
  const totalStockValue = items.reduce((acc, i) => acc + i.currentStockValue, 0);
  const bottleItems = items.filter((i) => i.name.toLowerCase().includes('bottle'));
  const totalBottles = bottleItems.reduce((acc, i) => acc + i.currentQuantity, 0);
  const lowStockCount = items.filter((i) => i.currentQuantity <= i.minStock && i.currentQuantity > 0).length;
  const outOfStockCount = items.filter((i) => i.currentQuantity <= 0).length;

  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const consumedThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'PRODUCTION_CONSUMPTION',
      inventoryItem: { isCoffeeBean: false },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true },
  });

  const purchasedThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'PURCHASE',
      inventoryItem: { isCoffeeBean: false },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true },
  });

  const wasteThisMonth = await prisma.inventoryTransaction.aggregate({
    where: {
      type: 'WASTE',
      inventoryItem: { isCoffeeBean: false },
      date: { gte: firstOfMonth },
    },
    _sum: { totalCost: true },
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Packaging &amp; Other Raw Materials
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Glass bottles (180ml, 1L, Pavva), crown caps, waterproof vinyl labels, brew filters, and brewing water.
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
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-zinc-950 text-xs font-bold shadow"
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

      {/* TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Packaging &amp; Consumable SKUs</span>
          <div className="text-2xl font-black text-zinc-100 mt-1">{items.length}</div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">Bottles, caps, labels, filters, water</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Total Empty Bottles in Stock</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {totalBottles} <span className="text-sm font-normal text-zinc-400">units</span>
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">180ml, 1L, Pavva, Small</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-sm">
          <span className="text-xs text-zinc-400">Packaging Inventory Value</span>
          <div className="text-2xl font-black text-orange-400 mt-1">
            {formatCurrency(totalStockValue)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            At current weighted purchase cost
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
            {outOfStockCount > 0 ? 'Packaging reorder needed' : 'All materials in stock'}
          </span>
        </div>
      </div>

      {/* MONTHLY ACTIVITY STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/80">
        <div className="flex items-center justify-between p-2">
          <span className="text-xs text-zinc-400">Consumed This Month:</span>
          <span className="text-sm font-bold text-zinc-200 font-mono">
            {formatCurrency(Math.abs(consumedThisMonth._sum.totalCost || 0))}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 border-t md:border-t-0 md:border-l border-zinc-800">
          <span className="text-xs text-zinc-400">Purchased This Month:</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            {formatCurrency(purchasedThisMonth._sum.totalCost || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between p-2 border-t md:border-t-0 md:border-l border-zinc-800">
          <span className="text-xs text-zinc-400">Loss / Broken Bottles:</span>
          <span className="text-sm font-bold text-rose-400 font-mono">
            {formatCurrency(Math.abs(wasteThisMonth._sum.totalCost || 0))}
          </span>
        </div>
      </div>

      {/* Interactive Client Component for Packaging & Materials with Editable Ledger */}
      <RawMaterialClientView
        items={items}
        suppliers={suppliers}
        transactions={recentTransactions}
      />
    </div>
  );
}
