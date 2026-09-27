import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Coffee,
  Package,
  Layers,
  Users,
  Store,
  AlertTriangle,
  ArrowRight,
  Clock,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  Target,
  CheckCircle2,
  Droplets,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import { calculatePartnerSpending } from '@/lib/calculations/partners';
import { formatDate, formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OverviewDashboardPage() {
  const [
    sales,
    expenses,
    inventoryItems,
    finishedGoodsLots,
    batches,
    cafes,
    auditLogs,
  ] = await Promise.all([
    prisma.sale.findMany({
      include: { items: { include: { product: true } }, cafe: true },
      orderBy: { date: 'desc' },
    }),
    prisma.expense.findMany({
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.inventoryItem.findMany({
      include: { coffeeBeanDetails: true, supplier: true },
    }),
    prisma.finishedGoodsLot.findMany({
      include: { product: true },
    }),
    prisma.productionBatch.findMany({
      include: {
        product: true,
        ingredients: { include: { inventoryItem: true } },
      },
      orderBy: { productionDate: 'desc' },
    }),
    prisma.cafe.findMany({
      include: { sales: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { timestamp: 'desc' },
    }),
  ]);

  // 1. Stock on Hand Breakdown (Module 5)
  const beansStockKg = inventoryItems
    .filter((i) => i.isCoffeeBean || i.category.toLowerCase().includes('bean'))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  const empty180mlBottles = inventoryItems
    .filter((i) => i.category.toLowerCase().includes('bottle') && i.name.includes('180'))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  const empty1LBottles = inventoryItems
    .filter((i) => i.category.toLowerCase().includes('bottle') && (i.name.includes('1L') || i.name.includes('1 Liter') || i.name.includes('1000')))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  const capsCount = inventoryItems
    .filter((i) => i.category.toLowerCase().includes('cap'))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  const labelsCount = inventoryItems
    .filter((i) => i.category.toLowerCase().includes('label'))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  const waterLiters = inventoryItems
    .filter((i) => i.category.toLowerCase().includes('water'))
    .reduce((sum, i) => sum + i.currentQuantity, 0);

  // Filled Finished Bottles available
  const filled180ml = finishedGoodsLots
    .filter((l) => l.product.size?.includes('180') || l.product.name.includes('180'))
    .reduce((sum, l) => sum + l.quantityAvailable, 0);

  const filled1L = finishedGoodsLots
    .filter((l) => l.product.size?.includes('1L') || l.product.name.includes('1L'))
    .reduce((sum, l) => sum + l.quantityAvailable, 0);

  // 2. Sales & Pending Payments (Module 3)
  const totalSalesRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalCollected = sales.reduce(
    (sum, s) => sum + (s.paymentStatus === 'PAID' ? s.total : s.amountPaid || 0),
    0
  );
  const totalPendingDues = Math.max(0, totalSalesRevenue - totalCollected);

  // Sales this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const salesThisMonth = sales
    .filter((s) => new Date(s.date) >= startOfMonth)
    .reduce((sum, s) => sum + s.total, 0);

  const salesThisWeek = sales
    .filter((s) => new Date(s.date) >= startOfWeek)
    .reduce((sum, s) => sum + s.total, 0);

  // Cafes with pending dues
  const cafesWithDues = cafes
    .map((cafe) => {
      const cafeSales = cafe.sales || [];
      const totalBilled = cafeSales.reduce((sum, s) => sum + s.total, 0);
      const totalPaid = cafeSales.reduce(
        (sum, s) => sum + (s.paymentStatus === 'PAID' ? s.total : s.amountPaid || 0),
        0
      );
      const dues = Math.max(0, totalBilled - totalPaid);
      return {
        id: cafe.id,
        name: cafe.name,
        area: cafe.area,
        status: cafe.status,
        totalBilled,
        dues,
        lastSaleDate: cafeSales[0]?.date || null,
      };
    })
    .filter((c) => c.dues > 0)
    .sort((a, b) => b.dues - a.dues);

  // 3. 50-50 Partner Spend & Split (Module 6)
  const partnerSpend = calculatePartnerSpending(expenses);

  // 4. Production Summary (Module 4)
  const totalBatches = batches.length;
  const totalBatchOutputBottles = batches.reduce((sum, b) => sum + b.actualOutput, 0);
  const avgYield =
    totalBatches > 0
      ? batches.reduce((sum, b) => sum + b.yieldPercent, 0) / totalBatches
      : 100;

  // Total cold brew liters brewed (approx 0.18L per 180ml bottle, 1L per 1L bottle)
  const totalLitersBrewed = batches.reduce((sum, b) => {
    const is1L = b.product.size?.includes('1L') || b.product.name.includes('1L');
    return sum + (is1L ? b.actualOutput : b.actualOutput * 0.18);
  }, 0);

  // 5. Café Pipeline Breakdown (Module 2)
  const toPitchCount = cafes.filter((c) =>
    ['TO_PITCH', 'NEW'].includes(c.status.toUpperCase())
  ).length;

  const rejectedCount = cafes.filter((c) =>
    ['REJECTED', 'LOST', 'NOT_INTERESTED'].includes(c.status.toUpperCase())
  ).length;

  const activeSupplyCount = cafes.filter((c) =>
    ['ACCEPTED', 'CUSTOMER'].includes(c.status.toUpperCase())
  ).length;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900 via-amber-950/20 to-zinc-900 border border-zinc-800 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Brew 1671 Cold Brew B2B
              </span>
              <span className="text-xs text-zinc-400">
                Equal Directors: Nishant (50%) & Chinmay (50%)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight mt-2">
              Business Operations Overview
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
              Live interconnected snapshot across purchases, café pipeline, production batches, bottle inventory, and 50-50 partner reconciliation.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              href="/purchases"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>Record Purchase</span>
            </Link>

            <Link
              href="/sales"
              className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>Log Delivery</span>
            </Link>

            <Link
              href="/production/new"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/40 flex items-center gap-1.5 transition-all"
            >
              <Coffee className="w-4 h-4 stroke-[2.5]" />
              <span>Brew New Batch</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 50-50 PARTNER SPLIT HERO (Module 6 Highlight) */}
      <section className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                50-50 Partner Balance & Reconciliation
              </h2>
              <p className="text-[11px] text-zinc-400">
                Tied directly to purchases and verified expenses.
              </p>
            </div>
          </div>
          <Link
            href="/partners"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            Settlement Engine <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Total Spent by Nishant</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                50% Director
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-zinc-100 mt-2">
              ₹{partnerSpend.nishantPaid.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Recorded under Nishant&apos;s login
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">Total Spent by Chinmay</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                50% Director
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-zinc-100 mt-2">
              ₹{partnerSpend.chinmayPaid.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Recorded under Chinmay&apos;s login
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-800/50 flex flex-col justify-between">
            <div>
              <span className="text-xs text-purple-300 font-semibold uppercase tracking-wider">
                Current 50-50 Balance
              </span>
              <div className="mt-1.5">
                {partnerSpend.isBalanced ? (
                  <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Balanced (₹0 difference)</span>
                  </div>
                ) : (
                  <div>
                    <div className="text-base font-bold text-zinc-100">
                      <span className="text-amber-400">{partnerSpend.payerName}</span> owes{' '}
                      <span className="text-emerald-400">{partnerSpend.receiverName}</span>
                    </div>
                    <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                      ₹{partnerSpend.settlementAmount.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 mt-2">
              Amounts balance automatically as purchases are entered.
            </p>
          </div>
        </div>
      </section>

      {/* MODULE 5: STOCK ON HAND OVERVIEW */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
              Stock on Hand (Ingredients & Packaging)
            </h2>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            Detailed Stock Ledger <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">Coffee Beans</span>
            <div className="text-xl font-bold font-mono text-orange-400 mt-1">
              {beansStockKg.toFixed(1)} kg
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Raw roasted beans</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">180ml Bottles</span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {empty180mlBottles}{' '}
              <span className="text-xs text-zinc-400 font-normal">empty</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block font-medium">
              +{filled180ml} filled in cold storage
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">1 Liter Bottles</span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {empty1LBottles}{' '}
              <span className="text-xs text-zinc-400 font-normal">empty</span>
            </div>
            <span className="text-[10px] text-emerald-400 mt-0.5 block font-medium">
              +{filled1L} filled in cold storage
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">Caps & Lids</span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {capsCount} units
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Seals & crowns</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">Brand Labels</span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
              {labelsCount} units
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">Waterproof rolls</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <span className="text-xs text-zinc-400">Brewing Water</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {waterLiters.toFixed(0)} L
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 block">RO treated water</span>
          </div>
        </div>
      </section>

      {/* SALES & CAFÉ DUES (Module 3) & CAFÉ PIPELINE (Module 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Pending Dues (Col 1 & 2) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Sales & Outstanding Café Dues
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Supplied deliveries, payments collected, and pending balances.
                </p>
              </div>
            </div>
            <Link
              href="/sales"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Sales Ledger <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] text-zinc-400">Total B2B Sales</span>
              <div className="text-lg font-bold font-mono text-zinc-100 mt-1">
                ₹{totalSalesRevenue.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] text-zinc-400">Collected</span>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                ₹{totalCollected.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/40">
              <span className="text-[11px] text-rose-300 font-semibold">Total Pending Dues</span>
              <div className="text-lg font-bold font-mono text-rose-400 mt-1">
                ₹{totalPendingDues.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800">
              <span className="text-[11px] text-zinc-400">This Month / Week</span>
              <div className="text-xs font-bold font-mono text-zinc-200 mt-1.5">
                ₹{salesThisMonth.toLocaleString('en-IN')}{' '}
                <span className="text-zinc-500 font-normal">/ ₹{salesThisWeek.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Outstanding Cafés List */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">
              Cafés with Outstanding Payments
            </span>
            {cafesWithDues.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs text-zinc-500">
                All café payments are currently settled and up to date!
              </div>
            ) : (
              <div className="space-y-2">
                {cafesWithDues.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-xs text-zinc-200">{c.name}</div>
                      <div className="text-[10px] text-zinc-400">
                        {c.area || 'Bengaluru'} • Total billed: ₹{c.totalBilled.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-rose-400">
                        ₹{c.dues.toLocaleString('en-IN')} due
                      </div>
                      <Link
                        href="/cafes"
                        className="text-[10px] text-emerald-400 hover:underline font-semibold"
                      >
                        Record Payment →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Café Pipeline Snapshot (Col 3) */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Café Pipeline
                </h2>
              </div>
              <Link
                href="/cafes/pitching"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                Open CRM <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-zinc-400 mt-3">
              Sales pitching stages to expand café accounts across the city:
            </p>

            <div className="space-y-3 mt-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-amber-300">Stage 1: To Pitch</div>
                  <div className="text-[10px] text-zinc-400">Target cafés to approach</div>
                </div>
                <span className="text-xl font-bold font-mono text-amber-400">{toPitchCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-rose-300">Stage 2: Pitched, Rejected</div>
                  <div className="text-[10px] text-zinc-400">With notes & reasons</div>
                </div>
                <span className="text-xl font-bold font-mono text-rose-400">{rejectedCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-emerald-300">Stage 3: Active Supply</div>
                  <div className="text-[10px] text-zinc-400">Regular cold brew clients</div>
                </div>
                <span className="text-xl font-bold font-mono text-emerald-400">{activeSupplyCount}</span>
              </div>
            </div>
          </div>

          <Link
            href="/cafes/pitching"
            className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold text-center block transition-colors mt-4"
          >
            Manage Pitching Pipeline →
          </Link>
        </div>
      </div>

      {/* MODULE 4: PRODUCTION SUMMARY & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Summary */}
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                Brewing Production Summary
              </h2>
            </div>
            <Link
              href="/production"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              All Batches <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Total Batches Brewed</span>
              <span className="font-mono font-bold text-zinc-100">{totalBatches} batches</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Finished Cold Brew Output</span>
              <span className="font-mono font-bold text-amber-400">~{totalLitersBrewed.toFixed(1)} L</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Bottles Packaged</span>
              <span className="font-mono font-bold text-emerald-400">{totalBatchOutputBottles} btls</span>
            </div>

            <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-xs text-zinc-400">Average Yield Efficiency</span>
              <span className="font-mono font-bold text-cyan-400">{avgYield.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Date-wise Recent Audit Activity (Cols 2 & 3) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Recent Activity Ledger
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Date-wise entries stamped with the logged-in partner&apos;s name.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {auditLogs.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No recent activity recorded. New actions will appear here automatically.
              </p>
            ) : (
              auditLogs.map((log) => {
                const isChinmay = log.partnerName?.includes('Chinmay') || log.userId?.includes('CHINMAY');
                const partnerName = isChinmay ? 'Chinmay' : 'Nishant';
                const badgeColor = isChinmay
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                        {partnerName}
                      </span>
                      <div>
                        <div className="text-zinc-200 font-medium">
                          {log.details || log.action}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {log.entity} • {formatDateTime(log.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
