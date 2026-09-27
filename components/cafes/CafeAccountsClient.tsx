'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  Coffee,
  ChevronDown,
  ChevronUp,
  CreditCard,
  X,
  ArrowRight,
  ExternalLink,
  Target,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';
import { recordCafePayment, addCafe, updateCafe, deleteCafe } from '@/lib/actions/cafes';
import { parseCafeRates, formatCafeNotesWithRates } from '@/lib/calculations/cafe-rates';
import { usePartner } from '@/lib/auth/partner-client';

interface CafeFinancialData {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  area: string | null;
  status: string;
  leadSource: string | null;
  productInterest: string | null;
  lastContacted: Date | string | null;
  sales: Array<{
    id: string;
    saleNumber: string;
    date: Date | string;
    total: number;
    amountPaid: number;
    paymentStatus: string;
    paymentMethod: string;
    bottleSize: string | null;
    flavor: string | null;
    items: Array<{
      quantity: number;
      bottleSize: string | null;
      flavor: string | null;
      unitPrice: number;
      total: number;
    }>;
  }>;
}

export function CafeAccountsClient({
  cafes,
}: {
  cafes: CafeFinancialData[];
}) {
  const { partner } = usePartner();
  const [searchTerm, setSearchTerm] = useState('');
  const [balanceFilter, setBalanceFilter] = useState<'ALL' | 'PENDING' | 'CLEARED'>('ALL');
  const [expandedCafeId, setExpandedCafeId] = useState<string | null>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCafeForPayment, setSelectedCafeForPayment] = useState<CafeFinancialData | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Add Cafe Modal State
  const [isAddCafeModalOpen, setIsAddCafeModalOpen] = useState(false);

  // Edit Cafe Modal State
  const [isEditCafeModalOpen, setIsEditCafeModalOpen] = useState(false);
  const [editCafeId, setEditCafeId] = useState('');
  const [editCafeName, setEditCafeName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCity, setEditCity] = useState('Bengaluru');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('CUSTOMER');
  const [editRate180ml, setEditRate180ml] = useState('120');
  const [editRate1L, setEditRate1L] = useState('480');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [newCafeName, setNewCafeName] = useState('');
  const [newCafeArea, setNewCafeArea] = useState('');
  const [newCafeContact, setNewCafeContact] = useState('');
  const [newCafePhone, setNewCafePhone] = useState('');
  const [newCafeEmail, setNewCafeEmail] = useState('');
  const [newCafeStatus, setNewCafeStatus] = useState('ACCEPTED');
  const [addCafeLoading, setAddCafeLoading] = useState(false);

  // Compute Financial Aggregates per Cafe & Global
  const cafeStats = useMemo(() => {
    return cafes.map((cafe) => {
      let totalBilled = 0;
      let totalPaid = 0;
      let count180ml = 0;
      let count1L = 0;
      let latestSaleDate: Date | null = null;

      cafe.sales.forEach((s) => {
        totalBilled += s.total;
        const paid = s.paymentStatus === 'PAID' ? s.total : (s.amountPaid || 0);
        totalPaid += paid;

        const sDate = new Date(s.date);
        if (!latestSaleDate || sDate > latestSaleDate) {
          latestSaleDate = sDate;
        }

        s.items.forEach((item) => {
          const sz = item.bottleSize || s.bottleSize || '';
          if (sz.includes('1L') || sz.includes('1000')) {
            count1L += item.quantity;
          } else {
            count180ml += item.quantity;
          }
        });
      });

      const pendingBalance = Math.max(0, totalBilled - totalPaid);

      return {
        ...cafe,
        totalBilled,
        totalPaid,
        pendingBalance,
        count180ml,
        count1L,
        latestSaleDate,
        orderCount: cafe.sales.length,
      };
    });
  }, [cafes]);

  // Overall Totals
  const overallFinancials = useMemo(() => {
    let billed = 0;
    let paid = 0;
    let pending = 0;
    let activeAccounts = 0;

    cafeStats.forEach((c) => {
      billed += c.totalBilled;
      paid += c.totalPaid;
      pending += c.pendingBalance;
      if (c.orderCount > 0 || c.status === 'ACCEPTED' || c.status === 'CUSTOMER') {
        activeAccounts += 1;
      }
    });

    return { billed, paid, pending, activeAccounts };
  }, [cafeStats]);

  // Filtered List
  const filteredCafes = useMemo(() => {
    return cafeStats.filter((c) => {
      const matchSearch =
        !searchTerm.trim() ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm);

      const matchBalance =
        balanceFilter === 'ALL' ||
        (balanceFilter === 'PENDING' && c.pendingBalance > 0) ||
        (balanceFilter === 'CLEARED' && c.pendingBalance === 0 && c.totalBilled > 0);

      return matchSearch && matchBalance;
    });
  }, [cafeStats, searchTerm, balanceFilter]);

  // Open Record Payment Modal
  const openPaymentModal = (cafe: CafeFinancialData) => {
    setSelectedCafeForPayment(cafe);
    const stats = cafeStats.find((s) => s.id === cafe.id);
    const pending = stats?.pendingBalance || 0;
    setPaymentAmount(String(pending > 0 ? pending : 0));
    setPaymentNotes('');
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCafeForPayment) return;
    setPaymentLoading(true);
    setPaymentError('');

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Please enter a valid payment amount.');
      setPaymentLoading(false);
      return;
    }

    const res = await recordCafePayment({
      cafeId: selectedCafeForPayment.id,
      amount: amt,
      paymentMethod,
      notes: paymentNotes,
      partnerId: partner.id,
    });

    setPaymentLoading(false);

    if (res.success) {
      setIsPaymentModalOpen(false);
      setSelectedCafeForPayment(null);
      // Reload page state
      window.location.reload();
    } else {
      setPaymentError(res.error || 'Failed to record payment.');
    }
  };

  // Add Cafe Submit
  const handleAddCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCafeName.trim()) return;

    setAddCafeLoading(true);
    const res = await addCafe({
      name: newCafeName.trim(),
      area: newCafeArea.trim() || undefined,
      contactPerson: newCafeContact.trim() || undefined,
      phone: newCafePhone.trim() || undefined,
      email: newCafeEmail.trim() || undefined,
      status: newCafeStatus,
      partnerId: partner.id,
    });
    setAddCafeLoading(false);

    if (res.success) {
      setIsAddCafeModalOpen(false);
      window.location.reload();
    } else {
      alert(res.error || 'Failed to add café.');
    }
  };

  const openEditCafeModal = (cafe: CafeFinancialData) => {
    setEditCafeId(cafe.id);
    setEditCafeName(cafe.name);
    setEditArea(cafe.area || '');
    setEditCity(cafe.city || 'Bengaluru');
    setEditContact(cafe.contactPerson || '');
    setEditPhone(cafe.phone || '');
    setEditEmail(cafe.email || '');
    setEditStatus(cafe.status || 'CUSTOMER');
    const parsedRates = parseCafeRates((cafe as any).notes);
    setEditRate180ml(String(parsedRates.rate180ml || 120));
    setEditRate1L(String(parsedRates.rate1L || 480));
    setEditNotes(parsedRates.notes || (cafe as any).notes || '');
    setEditError('');
    setIsEditCafeModalOpen(true);
  };

  const handleEditCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCafeName.trim()) {
      setEditError('Café name is required.');
      return;
    }

    setEditLoading(true);
    setEditError('');

    const formattedNotes = formatCafeNotesWithRates(
      parseFloat(editRate180ml) || 120,
      parseFloat(editRate1L) || 480,
      editNotes
    );

    const res = await updateCafe({
      id: editCafeId,
      name: editCafeName.trim(),
      contactPerson: editContact.trim() || undefined,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      area: editArea.trim() || undefined,
      city: editCity.trim() || undefined,
      status: editStatus,
      notes: formattedNotes,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success) {
      setIsEditCafeModalOpen(false);
      window.location.reload();
    } else {
      setEditError(res.error || 'Failed to update café.');
    }
  };

  const handleDeleteCafe = async (cafeId: string) => {
    if (!confirm('Are you sure you want to delete this café account?')) return;
    const res = await deleteCafe(cafeId, partner.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || 'Failed to delete café.');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header with Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Café CRM &amp; Financial Ledger
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Track client café billing, amount received, and outstanding pending balances in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View switcher pills */}
          <div className="flex items-center p-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="px-3 py-1.5 rounded-xl font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 shadow-xs">
              Accounts &amp; Billing
            </span>
            <Link
              href="/cafes/pitching"
              className="px-3 py-1.5 rounded-xl font-medium text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <Target className="w-3.5 h-3.5 text-pink-400" />
              Pitching Pipeline
            </Link>
          </div>

          <button
            onClick={() => setIsAddCafeModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Add Café
          </button>
        </div>
      </div>

      {/* TOP FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Billed */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Total Billed to Cafés
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            {formatCurrency(overallFinancials.billed)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Gross B2B invoice volume
          </div>
        </div>

        {/* Amount Received / Paid */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
              Payments Received
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 mt-1 font-mono">
            {formatCurrency(overallFinancials.paid)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Settled and collected revenue
          </div>
        </div>

        {/* Pending Receivables */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
              Pending Balance
            </span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
            {formatCurrency(overallFinancials.pending)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Outstanding payment collections
          </div>
        </div>

        {/* Active Accounts */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Active Café Accounts
            </span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-zinc-100 mt-1 font-mono">
            {overallFinancials.activeAccounts}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Specialty coffee partners
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search café by name, area, contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setBalanceFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                balanceFilter === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Cafés ({cafeStats.length})
            </button>
            <button
              onClick={() => setBalanceFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                balanceFilter === 'PENDING'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              Has Pending Balance ({cafeStats.filter((c) => c.pendingBalance > 0).length})
            </button>
            <button
              onClick={() => setBalanceFilter('CLEARED')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                balanceFilter === 'CLEARED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              All Cleared ({cafeStats.filter((c) => c.pendingBalance === 0 && c.totalBilled > 0).length})
            </button>
          </div>
        </div>
      </div>

      {/* CAFES FINANCIAL ACCOUNTS TABLE */}
      <div className="rounded-3xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/60">
                <th className="py-3.5 px-6">Café Account</th>
                <th className="py-3.5 px-4">Area &amp; Contact</th>
                <th className="py-3.5 px-4 text-right">Total Billed</th>
                <th className="py-3.5 px-4 text-right">Received</th>
                <th className="py-3.5 px-4 text-right">Pending Balance</th>
                <th className="py-3.5 px-4 text-center">Volume Bought</th>
                <th className="py-3.5 px-4">Latest Order</th>
                <th className="py-3.5 px-6 text-right">Financial Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredCafes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No café accounts match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredCafes.map((cafe) => {
                  const isExpanded = expandedCafeId === cafe.id;
                  const hasPending = cafe.pendingBalance > 0;

                  return (
                    <React.Fragment key={cafe.id}>
                      <tr className="hover:bg-zinc-800/30 transition-colors">
                        {/* Cafe Name */}
                        <td className="py-4 px-6 font-semibold text-zinc-100">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="font-bold text-sm text-zinc-100">{cafe.name}</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 pl-6 block">
                            {cafe.orderCount} orders recorded
                          </span>
                        </td>

                        {/* Location & Contact */}
                        <td className="py-4 px-4 text-zinc-300">
                          <div className="flex items-center gap-1 text-zinc-200">
                            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>{cafe.area || cafe.city || 'Bengaluru'}</span>
                          </div>
                          {cafe.contactPerson && (
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {cafe.contactPerson} {cafe.phone ? `(${cafe.phone})` : ''}
                            </span>
                          )}
                        </td>

                        {/* Total Billed */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-zinc-100">
                          {formatCurrency(cafe.totalBilled)}
                        </td>

                        {/* Total Received */}
                        <td className="py-4 px-4 text-right font-mono font-bold text-teal-400">
                          {formatCurrency(cafe.totalPaid)}
                        </td>

                        {/* Pending Balance */}
                        <td className="py-4 px-4 text-right font-mono whitespace-nowrap">
                          {hasPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-xs">
                              <AlertCircle className="w-3 h-3" />
                              {formatCurrency(cafe.pendingBalance)}
                            </span>
                          ) : cafe.totalBilled > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              All Cleared
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Volume Bought */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2 text-[11px] font-mono">
                            {cafe.count180ml > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                {cafe.count180ml}x 180ml
                              </span>
                            )}
                            {cafe.count1L > 0 && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {cafe.count1L}x 1L
                              </span>
                            )}
                            {cafe.count180ml === 0 && cafe.count1L === 0 && (
                              <span className="text-zinc-500">0 btls</span>
                            )}
                          </div>
                        </td>

                        {/* Latest Order */}
                        <td className="py-4 px-4 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                          {cafe.latestSaleDate ? formatDate(cafe.latestSaleDate) : 'No orders yet'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {hasPending && (
                              <button
                                onClick={() => openPaymentModal(cafe)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm flex items-center gap-1 cursor-pointer"
                              >
                                <CreditCard className="w-3 h-3" />
                                Record Payment
                              </button>
                            )}

                            <button
                              onClick={() => openEditCafeModal(cafe)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-900/40 text-zinc-300 hover:text-amber-400 transition-colors"
                              title="Edit Café Details & Agreed Rates"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <Link
                              href={`/sales?cafeId=${cafe.id}`}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                              title="Record New Sale"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => handleDeleteCafe(cafe.id)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Delete Café Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            {cafe.sales.length > 0 && (
                              <button
                                onClick={() => setExpandedCafeId(isExpanded ? null : cafe.id)}
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                                title="View Delivery Ledger"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Ledger Row */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/60 border-y border-zinc-800">
                          <td colSpan={8} className="py-4 px-6">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                  Delivery &amp; Invoicing History for {cafe.name}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  {cafe.sales.length} fulfilled deliveries
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {cafe.sales.map((sale) => (
                                  <div
                                    key={sale.id}
                                    className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono font-bold text-amber-400">
                                        {sale.saleNumber}
                                      </span>
                                      <span className="text-[10px] text-zinc-400 font-mono">
                                        {formatDate(sale.date)}
                                      </span>
                                    </div>

                                    <div className="space-y-0.5 text-zinc-300">
                                      {sale.items.map((it, idx) => (
                                        <div key={idx} className="flex justify-between text-[11px]">
                                          <span>
                                            {it.quantity}x {it.bottleSize || sale.bottleSize || '180ml'} {it.flavor || sale.flavor || 'Classic'}
                                          </span>
                                          <span className="font-mono font-semibold">
                                            {formatCurrency(it.total)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>

                                    <div className="flex items-center justify-between pt-1.5 border-t border-zinc-800 text-[11px]">
                                      <span className="font-mono font-bold text-emerald-400">
                                        Total: {formatCurrency(sale.total)}
                                      </span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          sale.paymentStatus === 'PAID'
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : sale.paymentStatus === 'PARTIAL'
                                            ? 'bg-amber-500/10 text-amber-400'
                                            : 'bg-rose-500/10 text-rose-400'
                                        }`}
                                      >
                                        {sale.paymentStatus}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: RECORD PAYMENT */}
      {isPaymentModalOpen && selectedCafeForPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Record Café Payment
                </h3>
                <span className="text-xs text-purple-400 font-semibold">
                  {selectedCafeForPayment.name}
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Payment Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Cash">Cash on Delivery</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Settlement Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received via GPay from Raghav,Indiranagar branch"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md cursor-pointer"
                >
                  {paymentLoading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CAFE */}
      {isAddCafeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Store className="w-5 h-5 text-purple-400" />
                Add New B2B Café
              </h3>
              <button
                onClick={() => setIsAddCafeModalOpen(false)}
                className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCafeSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Café Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Subko Specialty Coffee"
                  value={newCafeName}
                  onChange={(e) => setNewCafeName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Area / Neighborhood</label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar, Koramangala, Bengaluru"
                  value={newCafeArea}
                  onChange={(e) => setNewCafeArea(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Raghav Sharma"
                    value={newCafeContact}
                    onChange={(e) => setNewCafeContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 99000..."
                    value={newCafePhone}
                    onChange={(e) => setNewCafePhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                <input
                  type="email"
                  placeholder="orders@cafe.com"
                  value={newCafeEmail}
                  onChange={(e) => setNewCafeEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddCafeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addCafeLoading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {addCafeLoading ? 'Adding...' : 'Add Café'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT CAFÉ DETAILS */}
      {isEditCafeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-zinc-100">Edit Café Account</h3>
              </div>
              <button
                onClick={() => setIsEditCafeModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditCafeSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Café Name</label>
                  <input
                    type="text"
                    required
                    value={editCafeName}
                    onChange={(e) => setEditCafeName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Agreed 180ml Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editRate180ml}
                    onChange={(e) => setEditRate180ml(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Agreed 1L Rate (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editRate1L}
                    onChange={(e) => setEditRate1L(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Relationship Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CUSTOMER">Active Supply Partner (CUSTOMER)</option>
                    <option value="INTERESTED">Interested / Follow-up</option>
                    <option value="SAMPLE_SENT">Sample Sent / Tasting</option>
                    <option value="CONTACTED">Contacted / Pitch in Progress</option>
                    <option value="NEW">New Lead</option>
                    <option value="NOT_INTERESTED">Not Interested / Paused</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Notes &amp; Preferences</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Delivery days, manager name, coffee taste profile..."
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditCafeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40"
                >
                  {editLoading ? 'Saving...' : 'Save Café Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
