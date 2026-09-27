import React from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  History,
  DollarSign,
  Receipt,
  CheckCircle2,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency } from '@/lib/calculations/inventory';
import { calculatePartnerSpending } from '@/lib/calculations/partners';
import { formatDate } from '@/lib/utils';
import { SettlementEngineClient } from '@/components/partners/SettlementEngineClient';

export const revalidate = 0;

export default async function PartnersPage() {
  const [unsettledExpenses, allExpenses, settlements] = await Promise.all([
    prisma.expense.findMany({
      where: { isSettled: false },
      include: { category: true },
    }),
    prisma.expense.findMany({
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.settlement.findMany({
      orderBy: { date: 'desc' },
    }),
  ]);

  const summary = calculatePartnerSpending(unsettledExpenses);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              50/50 Partner Spending & Settlement Engine
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Permanent, hardcoded equal partnership: Nishant (50%) and Chinmay (50%).
          </p>
        </div>

        <Link
          href="/expenses"
          className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto"
        >
          <Receipt className="w-4 h-4 text-amber-400" />
          View All Expenses
        </Link>
      </div>

      {/* Interactive Settlement Engine Component */}
      <SettlementEngineClient
        summary={summary}
        unsettledCount={unsettledExpenses.length}
      />

      {/* PAST SETTLEMENTS LEDGER */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Historical 50/50 Settlement Archive
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Permanent record of partner reconciliations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/60">
                <th className="py-3 px-4">Settlement #</th>
                <th className="py-3 px-4">Settlement Date</th>
                <th className="py-3 px-4 text-right">Total Expenses (₹)</th>
                <th className="py-3 px-4 text-right">Settlement Amount (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-500">
                    No historical settlements recorded yet. Click &ldquo;Mark as Settled&rdquo; above to archive pending expenses.
                  </td>
                </tr>
              ) : (
                settlements.map((st) => (
                  <tr key={st.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">
                      {st.settlementNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">
                      {formatDate(st.date)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-zinc-200">
                      {formatCurrency(st.totalExpenses)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(st.settlementAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400 text-[11px] max-w-sm truncate">
                      {st.notes || '50/50 balance settled'}
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
