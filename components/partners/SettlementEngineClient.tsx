'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { settlePartnerExpenses } from '@/lib/actions/expenses';
import { usePartner } from '@/lib/auth/partner-client';

interface SettlementSummary {
  totalBusinessExpenses: number;
  partnerTotalExpenses: number;
  nishantPaid: number;
  chinmayPaid: number;
  businessAccountPaid: number;
  expectedNishantContribution: number;
  expectedChinmayContribution: number;
  nishantDifference: number;
  chinmayDifference: number;
  settlementAmount: number;
  payerName: string | null;
  receiverName: string | null;
  isBalanced: boolean;
}

export function SettlementEngineClient({
  summary,
  unsettledCount,
}: {
  summary: SettlementSummary;
  unsettledCount: number;
}) {
  const router = useRouter();
  const { partner } = usePartner();

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSettle = async () => {
    if (!confirm(`Confirm 50/50 settlement of ${formatCurrency(summary.settlementAmount)} between Nishant and Chinmay?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const res = await settlePartnerExpenses({
      notes,
      actingPartnerId: partner.id,
    });

    setLoading(false);
    if (res.success) {
      setSuccess('50/50 Settlement resolved and recorded successfully!');
      router.refresh();
    } else {
      setError(res.error || 'Failed to settle expenses.');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {/* 50/50 RECONCILIATION HERO CARD */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl relative overflow-hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Permanent 50/50 Equity Structure
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-100 mt-1">
              Partner Reconciliation Status
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Active operating expenses waiting for settlement: <strong>{unsettledCount} items</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Logged in as:</span>
            <span className="px-2.5 py-1 rounded-xl bg-zinc-800 border border-zinc-700 font-bold text-xs text-zinc-100">
              {partner.name} (50% Admin)
            </span>
          </div>
        </div>

        {/* 2 Equal Partner Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nishant Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white font-black flex items-center justify-center text-sm shadow">
                  NP
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Nishant</h3>
                  <span className="text-xs text-amber-400 font-semibold">50.0% Equity</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                ADMIN
              </span>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-400">Total Spent to Date:</span>
                <span className="font-bold text-zinc-100 font-mono text-sm">
                  {formatCurrency(summary.nishantPaid)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-400">Expected 50% Share:</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(summary.expectedNishantContribution)}
                </span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span className="text-zinc-400">Net Difference:</span>
                <span
                  className={`font-mono text-sm ${
                    summary.nishantDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.nishantDifference >= 0 ? '+' : ''}
                  {formatCurrency(summary.nishantDifference)}
                </span>
              </div>
            </div>
          </div>

          {/* Chinmay Card */}
          <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow">
                  CK
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Chinmay</h3>
                  <span className="text-xs text-emerald-400 font-semibold">50.0% Equity</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                ADMIN
              </span>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-400">Total Spent to Date:</span>
                <span className="font-bold text-zinc-100 font-mono text-sm">
                  {formatCurrency(summary.chinmayPaid)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-900">
                <span className="text-zinc-400">Expected 50% Share:</span>
                <span className="font-mono text-zinc-300">
                  {formatCurrency(summary.expectedChinmayContribution)}
                </span>
              </div>
              <div className="flex justify-between py-1 font-bold">
                <span className="text-zinc-400">Net Difference:</span>
                <span
                  className={`font-mono text-sm ${
                    summary.chinmayDifference >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {summary.chinmayDifference >= 0 ? '+' : ''}
                  {formatCurrency(summary.chinmayDifference)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SETTLEMENT ACTION BOX */}
        <div className="p-6 rounded-2xl bg-zinc-950 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Settlement Calculation
            </span>
            {summary.isBalanced ? (
              <div className="text-lg font-bold text-emerald-400 flex items-center gap-2 mt-1">
                <CheckCircle2 className="w-5 h-5" />
                Contributions are 100% equal (₹0 difference).
              </div>
            ) : (
              <div className="text-lg font-bold text-zinc-100 mt-1">
                <strong className="text-amber-400">{summary.payerName}</strong> pays{' '}
                <strong className="text-emerald-400">{summary.receiverName}</strong>:{' '}
                <span className="text-2xl font-black text-amber-400 font-mono ml-1">
                  {formatCurrency(summary.settlementAmount)}
                </span>
              </div>
            )}
            <p className="text-xs text-zinc-400 mt-1">
              Formula: (|Nishant Spent - Chinmay Spent| / 2) to restore 50/50 balance.
            </p>
          </div>

          <button
            onClick={handleSettle}
            disabled={loading || summary.isBalanced || unsettledCount === 0}
            className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
          >
            {loading ? (
              'Settling...'
            ) : (
              <>
                <span>Mark as Settled</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
