'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  PlusCircle,
  Coffee,
  Layers,
  ShoppingBag,
  Store,
  Trash2,
  Gift,
  ArrowRight,
} from 'lucide-react';
import { usePartner } from '@/lib/auth/partner-client';

export function QuickActionModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { partner } = usePartner();

  if (!isOpen) return null;

  const actions = [
    {
      id: 'production',
      title: 'Create Production Batch',
      desc: 'Batch recipe, consume raw materials & yield traceable FG lot',
      icon: <Layers className="w-5 h-5 text-amber-500" />,
      action: () => {
        onClose();
        router.push('/production/new');
      },
      badge: 'Batch Engine',
    },
    {
      id: 'sale',
      title: 'Record B2B Sale',
      desc: 'Invoice a café and fulfill automatically using FIFO stock',
      icon: <ShoppingBag className="w-5 h-5 text-emerald-500" />,
      action: () => {
        onClose();
        router.push('/sales/new');
      },
      badge: 'FIFO Auto',
    },
    {
      id: 'purchase',
      title: 'Record Procurement / Purchase',
      desc: 'Buy beans, bottles (180ml/1L), caps, labels, or water with automatic 50/50 expense link',
      icon: <Coffee className="w-5 h-5 text-orange-400" />,
      action: () => {
        onClose();
        router.push('/purchases');
      },
      badge: 'Procurement',
    },
    {
      id: 'expense',
      title: 'Add Business Expense',
      desc: `Log operational cost paid by ${partner.name} for 50-50 reconciliation`,
      icon: <PlusCircle className="w-5 h-5 text-sky-400" />,
      action: () => {
        onClose();
        router.push('/expenses?action=new');
      },
      badge: '50/50 Split',
    },
    {
      id: 'sample',
      title: 'Issue Café Sample',
      desc: 'Send complimentary cold brew bottles with ₹0 revenue & cost tracking',
      icon: <Gift className="w-5 h-5 text-pink-400" />,
      action: () => {
        onClose();
        router.push('/inventory/finished-goods?action=sample');
      },
      badge: '₹0 Revenue',
    },
    {
      id: 'cafe',
      title: 'Add Café to Pipeline',
      desc: 'Stage 1 To Pitch, Stage 2 Rejected, or Stage 3 Active Supply',
      icon: <Store className="w-5 h-5 text-purple-400" />,
      action: () => {
        onClose();
        router.push('/cafes/pitching');
      },
      badge: 'CRM Pipeline',
    },
    {
      id: 'waste',
      title: 'Record Waste / Loss',
      desc: 'Log broken bottles, expired lots, or production spillage',
      icon: <Trash2 className="w-5 h-5 text-rose-400" />,
      action: () => {
        onClose();
        router.push('/inventory?action=waste');
      },
      badge: 'Loss Tracking',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Quick Action Center
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Logged in as <span className="font-semibold text-amber-400">{partner.name}</span> (50% Admin)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 gap-2 max-h-[75vh] overflow-y-auto">
          {actions.map((act) => (
            <div
              key={act.id}
              onClick={act.action}
              className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-700/60 group-hover:scale-105 transition-transform">
                  {act.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-200 group-hover:text-amber-400 transition-colors">
                      {act.title}
                    </span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/80">
                      {act.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{act.desc}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
