'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Coffee,
  Menu,
  Check,
  ChevronDown,
  Shield,
  DownloadCloud,
} from 'lucide-react';
import { usePartner } from '@/lib/auth/partner-client';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { QuickActionModal } from '@/components/shared/QuickActionModal';

export function Navbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const { partner, partners, openPinModal, lockSession } = usePartner();
  const [partnerMenuOpen, setPartnerMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/export/excel');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `business-management-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Unable to download Excel report.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile menu toggle + Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-900/30 group-hover:scale-105 transition-transform">
              <Coffee className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wider text-base text-zinc-100 group-hover:text-amber-400 transition-colors">
                  BREWW 1671
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  ERP OS
                </span>
              </div>
              <p className="text-[10px] font-medium text-zinc-400 leading-tight hidden sm:block">
                Cold Brew Operations & Traceability
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Search trigger */}
        <div className="flex-1 max-w-md hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 text-xs hover:border-zinc-700 hover:text-zinc-300 transition-all shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-500" />
              <span>Search batches, lots, materials, cafés...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700 rounded shadow">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right: Actions + Partner Switcher */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Excel Export Button */}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-400 text-xs font-semibold shadow-sm hover:border-emerald-600 transition-all disabled:opacity-50"
            title="Download full 19-sheet Excel workbook"
          >
            {exporting ? (
              <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">Excel Export</span>
          </button>

          {/* Quick Action Button */}
          <button
            onClick={() => setQuickActionOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/40 hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span className="hidden sm:inline">Quick Action</span>
          </button>

          {/* Partner Account (Nishant & Chinmay 50/50) */}
          <div className="relative">
            <button
              onClick={() => setPartnerMenuOpen(!partnerMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <div
                className={`w-6 h-6 rounded-lg ${partner.avatarColor} text-white text-[11px] font-bold flex items-center justify-center`}
              >
                {partner.initials}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-200">{partner.name}</span>
                  <span className="text-[10px] font-semibold text-amber-500">Director</span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {partnerMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Active Account
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                      <Shield className="w-3 h-3" /> 50-50 Partner
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    All entries are automatically recorded under your account.
                  </p>
                </div>

                <div className="py-1 space-y-1">
                  {partners.map((p) => {
                    const isActive = p.id === partner.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPartnerMenuOpen(false);
                          if (!isActive) {
                            openPinModal(p.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                          isActive
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg ${p.avatarColor} text-white text-xs font-bold flex items-center justify-center`}
                          >
                            {p.initials}
                          </div>
                          <div>
                            <div className="text-xs font-bold">{p.name}</div>
                            <div className="text-[10px] text-zinc-400">
                              {isActive ? 'Currently Logged In' : 'Click to enter PIN & switch'}
                            </div>
                          </div>
                        </div>
                        {isActive ? (
                          <Check className="w-4 h-4 text-amber-400" />
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                            PIN
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                  <button
                    onClick={() => {
                      setPartnerMenuOpen(false);
                      lockSession();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-colors"
                  >
                    Lock Session
                  </button>
                  <p className="text-[10px] text-zinc-500 text-center">
                    Default PIN: <span className="font-mono text-zinc-400 font-bold">1671</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modals */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
      />
    </>
  );
}
