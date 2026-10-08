import React from 'react';
import Link from 'next/link';
import {
  Receipt,
  Plus,
  DollarSign,
  PieChart,
  Users,
  CreditCard,
} from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatCurrency } from '@/lib/calculations/inventory';
import { calculatePartnerSpending } from '@/lib/calculations/partners';
import { ExpensesClientView } from '@/components/expenses/ExpensesClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ExpensesPage() {
  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      include: { category: true },
      orderBy: { date: 'desc' },
    }),
    prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const partnerSpend = calculatePartnerSpending(expenses);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Business Expenses & Operational Costs
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Track business spending by category and partner (Nishant, Chinmay, or Business Account).
          </p>
        </div>

        <Link
          href="/partners"
          className="px-4 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/60 border border-purple-700/60 text-purple-300 text-xs font-bold flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          50/50 Settlement Engine →
        </Link>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Total Business Expenses</span>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            {expenses.length} records logged
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Paid by Nishant</span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {formatCurrency(partnerSpend.nishantPaid)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Partner 1 contribution
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Paid by Chinmay</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(partnerSpend.chinmayPaid)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Partner 2 contribution
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs text-zinc-400">Business Account Paid</span>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {formatCurrency(partnerSpend.businessAccountPaid)}
          </div>
          <span className="text-[10px] text-zinc-500 mt-0.5 block">
            Direct company funds
          </span>
        </div>
      </div>

      {/* Interactive Client View */}
      <ExpensesClientView expenses={expenses} categories={categories} />
    </div>
  );
}
