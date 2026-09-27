'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  Calendar,
  Store,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Edit3,
  Coffee,
  Sparkles,
  Package,
  Layers,
  ArrowRight,
  X,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { formatDate } from '@/lib/utils';
import { recordSale, updateSale, updateSalePayment, deleteSale } from '@/lib/actions/sales';
import { addCafe } from '@/lib/actions/cafes';
import { usePartner } from '@/lib/auth/partner-client';
import { parseCafeRates } from '@/lib/calculations/cafe-rates';

interface CafeItem {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
  status: string;
  notes?: string | null;
}

interface BeanItem {
  id: string;
  name: string;
  category: string;
  isCoffeeBean: boolean;
}

interface SaleItemDetail {
  id: string;
  bottleSize: string | null;
  flavor: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  product?: {
    name: string;
    size: string;
    variant: string;
  };
}

interface SaleRecord {
  id: string;
  saleNumber: string;
  date: Date | string;
  cafeId: string | null;
  cafe: CafeItem | null;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  paymentStatus: string;
  paymentMethod: string;
  bottleSize: string | null;
  flavor: string | null;
  notes: string | null;
  items: SaleItemDetail[];
}

export function SalesLedgerClient({
  initialSales,
  cafes,
  coffeeBeans,
}: {
  initialSales: SaleRecord[];
  cafes: CafeItem[];
  coffeeBeans: BeanItem[];
}) {
  const { partner } = usePartner();
  const [sales, setSales] = useState<SaleRecord[]>(initialSales);
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState<'ALL' | '180ml' | '1L'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'PARTIAL'>('ALL');
  const [selectedCafeFilter, setSelectedCafeFilter] = useState('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<SaleRecord | null>(null);
  const [isNewCafeModalOpen, setIsNewCafeModalOpen] = useState(false);

  // New Sale Form State
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formCafeId, setFormCafeId] = useState('');
  const [formBottleSize, setFormBottleSize] = useState<'180ml' | '1L'>('180ml');
  const [formFlavor, setFormFlavor] = useState('Classic Cold Brew (100% Arabica)');
  const [formCustomFlavor, setFormCustomFlavor] = useState('');
  const [isCustomFlavor, setIsCustomFlavor] = useState(false);
  const [formQuantity, setFormQuantity] = useState('20');
  const [formUnitPrice, setFormUnitPrice] = useState('120');
  const [formPaymentStatus, setFormPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL'>('PAID');
  const [formAmountPaid, setFormAmountPaid] = useState('2400');
  const [formPaymentMethod, setFormPaymentMethod] = useState('UPI');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Payment update modal state
  const [paymentUpdateStatus, setPaymentUpdateStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL'>('PAID');
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState('');
  const [paymentUpdateMethod, setPaymentUpdateMethod] = useState('UPI');
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Edit Sale modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSaleId, setEditSaleId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCafeId, setEditCafeId] = useState('');
  const [editBottleSize, setEditBottleSize] = useState('180ml');
  const [editFlavor, setEditFlavor] = useState('Classic Cold Brew');
  const [editQuantity, setEditQuantity] = useState('1');
  const [editUnitPrice, setEditUnitPrice] = useState('120');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE'>('PAID');
  const [editAmountPaid, setEditAmountPaid] = useState('120');
  const [editPaymentMethod, setEditPaymentMethod] = useState('UPI');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Quick Add Cafe State
  const [newCafeName, setNewCafeName] = useState('');
  const [newCafeArea, setNewCafeArea] = useState('');
  const [newCafeContact, setNewCafeContact] = useState('');
  const [newCafePhone, setNewCafePhone] = useState('');
  const [newCafeLoading, setNewCafeLoading] = useState(false);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let count180ml = 0;
    let count1L = 0;

    sales.forEach((s) => {
      totalRevenue += s.total;
      const paid = s.paymentStatus === 'PAID' ? s.total : s.amountPaid || 0;
      totalPaid += paid;
      totalPending += Math.max(0, s.total - paid);

      s.items.forEach((item) => {
        const size = item.bottleSize || (item.product?.size) || s.bottleSize || '';
        if (size.toLowerCase().includes('180') || size.toLowerCase().includes('180ml')) {
          count180ml += item.quantity;
        } else if (size.toLowerCase().includes('1l') || size.toLowerCase().includes('1 liter') || size.toLowerCase().includes('1000')) {
          count1L += item.quantity;
        } else {
          // fallback
          count180ml += item.quantity;
        }
      });
    });

    return {
      totalRevenue,
      totalPaid,
      totalPending,
      count180ml,
      count1L,
      totalOrders: sales.length,
    };
  }, [sales]);

  // Dynamic flavor options combining beans & standard cold brew recipes
  const flavorOptions = useMemo(() => {
    const list: string[] = [
      'Classic Cold Brew (100% Arabica)',
      'Floral Cold Brew (Chikmagalur Arabica)',
      'Single Origin Cerrado Cold Brew',
      'Oak Barrel Aged Cold Brew',
      'Vanilla Infused Cold Brew',
    ];

    coffeeBeans.forEach((bean) => {
      const beanLabel = `${bean.name.replace(/\(.*?\)/g, '').trim()} Cold Brew`;
      if (!list.includes(beanLabel)) {
        list.push(beanLabel);
      }
    });

    return list;
  }, [coffeeBeans]);

  // Handle bottle size change & update unit price according to agreed cafe rates
  const handleBottleSizeSelect = (size: '180ml' | '1L') => {
    setFormBottleSize(size);
    const selectedCafe = cafes.find((c) => c.id === formCafeId);
    const rates = selectedCafe ? parseCafeRates(selectedCafe.notes) : { rate180ml: 120, rate1L: 480 };
    const applicableRate = size === '180ml' ? rates.rate180ml : rates.rate1L;
    setFormUnitPrice(String(applicableRate));
    const qty = parseFloat(formQuantity) || 0;
    setFormAmountPaid(String(qty * applicableRate));
  };

  // Handle cafe selection & auto-fill that cafe's agreed rates
  const handleCafeSelect = (cafeId: string) => {
    setFormCafeId(cafeId);
    const selectedCafe = cafes.find((c) => c.id === cafeId);
    if (selectedCafe) {
      const rates = parseCafeRates(selectedCafe.notes);
      const applicableRate = formBottleSize === '180ml' ? rates.rate180ml : rates.rate1L;
      setFormUnitPrice(String(applicableRate));
      const qty = parseFloat(formQuantity) || 0;
      setFormAmountPaid(String(qty * applicableRate));
    }
  };

  // Live order calculations for form
  const formSubtotal = (parseFloat(formQuantity) || 0) * (parseFloat(formUnitPrice) || 0);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const searchMatch =
        !searchTerm.trim() ||
        s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.cafe?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.flavor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.notes?.toLowerCase().includes(searchTerm.toLowerCase());

      const sizeMatch =
        sizeFilter === 'ALL' ||
        (sizeFilter === '180ml' && (s.bottleSize?.includes('180') || s.items.some((i) => i.bottleSize?.includes('180')))) ||
        (sizeFilter === '1L' && (s.bottleSize?.includes('1L') || s.items.some((i) => i.bottleSize?.includes('1L') || i.bottleSize?.includes('1000'))));

      const paymentMatch =
        paymentFilter === 'ALL' || s.paymentStatus === paymentFilter;

      const cafeMatch =
        selectedCafeFilter === 'ALL' || s.cafeId === selectedCafeFilter;

      return searchMatch && sizeMatch && paymentMatch && cafeMatch;
    });
  }, [sales, searchTerm, sizeFilter, paymentFilter, selectedCafeFilter]);

  // Group filtered sales by date
  const groupedSalesByDate = useMemo(() => {
    const groups: { [dateStr: string]: SaleRecord[] } = {};
    filteredSales.forEach((sale) => {
      const dateKey = new Date(sale.date).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(sale);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredSales]);

  // Handle Quick Sale Submission
  const handleRecordSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const qty = parseFloat(formQuantity);
    const unitPrice = parseFloat(formUnitPrice);
    if (!qty || qty <= 0 || !unitPrice || unitPrice < 0) {
      setFormError('Please enter valid quantity and price per bottle.');
      setFormLoading(false);
      return;
    }

    const finalFlavor = isCustomFlavor
      ? formCustomFlavor.trim() || 'Custom Cold Brew'
      : formFlavor;

    const total = qty * unitPrice;
    let paidAmount = 0;
    if (formPaymentStatus === 'PAID') {
      paidAmount = total;
    } else if (formPaymentStatus === 'PARTIAL') {
      paidAmount = parseFloat(formAmountPaid) || 0;
    }

    const payload = {
      cafeId: formCafeId || undefined,
      date: formDate,
      bottleSize: formBottleSize,
      flavor: finalFlavor,
      paymentStatus: formPaymentStatus,
      amountPaid: paidAmount,
      paymentMethod: formPaymentMethod,
      notes: formNotes,
      partnerId: partner.id,
      items: [
        {
          bottleSize: formBottleSize,
          flavor: finalFlavor,
          quantity: qty,
          unitPrice: unitPrice,
          discount: 0,
        },
      ],
    };

    const res = await recordSale(payload);
    setFormLoading(false);

    if (res.success && res.data) {
      setSales([res.data as any, ...sales]);
      setIsRecordModalOpen(false);
      // Reset defaults
      setFormQuantity('20');
      setFormNotes('');
      setFormCustomFlavor('');
      setIsCustomFlavor(false);
    } else {
      setFormError(res.error || 'Failed to record sale.');
    }
  };

  // Handle Quick Add Cafe
  const handleAddCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCafeName.trim()) return;

    setNewCafeLoading(true);
    const res = await addCafe({
      name: newCafeName.trim(),
      area: newCafeArea.trim() || undefined,
      contactPerson: newCafeContact.trim() || undefined,
      phone: newCafePhone.trim() || undefined,
      status: 'ACCEPTED',
      partnerId: partner.id,
    });
    setNewCafeLoading(false);

    if (res.success && res.data) {
      cafes.push(res.data as any);
      setFormCafeId(res.data.id);
      setIsNewCafeModalOpen(false);
      setNewCafeName('');
      setNewCafeArea('');
      setNewCafeContact('');
      setNewCafePhone('');
    }
  };

  // Open Payment Update Modal
  const openPaymentModal = (sale: SaleRecord) => {
    setSelectedSaleForPayment(sale);
    setPaymentUpdateStatus((sale.paymentStatus as any) || 'PAID');
    setPaymentUpdateAmount(String(sale.amountPaid || sale.total));
    setPaymentUpdateMethod(sale.paymentMethod || 'UPI');
    setIsPaymentModalOpen(true);
  };

  const handleUpdatePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForPayment) return;
    setPaymentLoading(true);

    const paid = parseFloat(paymentUpdateAmount) || 0;
    const res = await updateSalePayment({
      saleId: selectedSaleForPayment.id,
      paymentStatus: paymentUpdateStatus,
      amountPaid: paid,
      paymentMethod: paymentUpdateMethod,
      partnerId: partner.id,
    });
    setPaymentLoading(false);

    if (res.success && res.data) {
      setSales(
        sales.map((s) =>
          s.id === selectedSaleForPayment.id
            ? {
                ...s,
                paymentStatus: res.data.paymentStatus,
                amountPaid: res.data.amountPaid,
                paymentMethod: res.data.paymentMethod,
              }
            : s
        )
      );
      setIsPaymentModalOpen(false);
      setSelectedSaleForPayment(null);
    }
  };

  const openEditModal = (sale: SaleRecord) => {
    setEditSaleId(sale.id);
    const dateStr = typeof sale.date === 'string' ? sale.date.split('T')[0] : new Date(sale.date).toISOString().split('T')[0];
    setEditDate(dateStr);
    setEditCafeId(sale.cafeId || '');
    const firstItem = sale.items[0];
    setEditBottleSize(sale.bottleSize || firstItem?.bottleSize || '180ml');
    setEditFlavor(sale.flavor || firstItem?.flavor || 'Classic Cold Brew');
    setEditQuantity(String(firstItem?.quantity || 1));
    setEditUnitPrice(String(firstItem?.unitPrice || 120));
    setEditDiscount(String(sale.discount || 0));
    setEditPaymentStatus(sale.paymentStatus as any || 'PAID');
    setEditAmountPaid(String(sale.amountPaid || sale.total));
    setEditPaymentMethod(sale.paymentMethod || 'UPI');
    setEditNotes(sale.notes || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    const qty = parseFloat(editQuantity);
    const price = parseFloat(editUnitPrice);
    const disc = parseFloat(editDiscount) || 0;
    const paid = parseFloat(editAmountPaid) || 0;

    if (isNaN(qty) || qty <= 0) {
      setEditError('Please enter a valid positive quantity.');
      setEditLoading(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setEditError('Please enter a valid unit price.');
      setEditLoading(false);
      return;
    }

    const res = await updateSale({
      saleId: editSaleId,
      cafeId: editCafeId || null,
      date: editDate,
      bottleSize: editBottleSize,
      flavor: editFlavor,
      quantity: qty,
      unitPrice: price,
      discount: disc,
      paymentStatus: editPaymentStatus,
      amountPaid: paid,
      paymentMethod: editPaymentMethod,
      notes: editNotes,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success && res.data) {
      setSales((prev) =>
        prev.map((s) => (s.id === editSaleId ? { ...s, ...res.data, items: res.data.items || s.items, cafe: res.data.cafe || s.cafe } : s))
      );
      setIsEditModalOpen(false);
    } else {
      setEditError(res.error || 'Failed to update sale.');
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale record?')) return;
    const res = await deleteSale(saleId, partner.id);
    if (res.success) {
      setSales(sales.filter((s) => s.id !== saleId));
    } else {
      alert(res.error || 'Failed to delete sale.');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header with Title & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                B2B Café Sales Ledger
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Date-wise bottle fulfillment (180ml &amp; 1L) with cold brew bean flavor tracking &amp; payment settlement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              handleBottleSizeSelect('180ml');
              setIsRecordModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Record B2B Sale
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total B2B Revenue */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Total B2B Billed
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
            {formatCurrency(metrics.totalRevenue)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Across {metrics.totalOrders} delivered orders
          </div>
        </div>

        {/* 180ml Bottles Sold */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
              180ml Bottles Sold
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Single-Serve
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
            {metrics.count180ml}{' '}
            <span className="text-xs font-normal text-zinc-400">btls</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Grab-and-go retail volume
          </div>
        </div>

        {/* 1L Bottles Sold */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-300 uppercase tracking-wider">
              1 Litre (1L) Bottles
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Bulk Pitcher
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-400 mt-1 font-mono">
            {metrics.count1L}{' '}
            <span className="text-xs font-normal text-zinc-400">litres</span>
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Café iced latte &amp; concentrate base
          </div>
        </div>

        {/* Total Collected / Paid */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Amount Received
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-400 mt-1 font-mono">
            {formatCurrency(metrics.totalPaid)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Settled via UPI / Bank Transfer
          </div>
        </div>

        {/* Pending / Outstanding */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-300 uppercase tracking-wider">
              Pending Balance
            </span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 font-mono">
            {formatCurrency(metrics.totalPending)}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            Outstanding receivables from cafés
          </div>
        </div>
      </div>

      {/* FILTERS & SEARCH TOOLBAR */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search sale #, café, flavor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Bottle Size Filter */}
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setSizeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                sizeFilter === 'ALL'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Sizes
            </button>
            <button
              onClick={() => setSizeFilter('180ml')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                sizeFilter === '180ml'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              180ml
            </button>
            <button
              onClick={() => setSizeFilter('1L')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                sizeFilter === '1L'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              1 Litre
            </button>
          </div>

          {/* Payment Status Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid / Cleared</option>
            <option value="PENDING">Pending Invoice</option>
            <option value="PARTIAL">Partially Paid</option>
          </select>

          {/* Cafe Filter */}
          {cafes.length > 0 && (
            <select
              value={selectedCafeFilter}
              onChange={(e) => setSelectedCafeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-semibold focus:outline-none focus:border-emerald-500 max-w-[180px]"
            >
              <option value="ALL">All Cafés</option>
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* DATE-WISE SALES LEDGER TABLE */}
      <div className="space-y-6">
        {groupedSalesByDate.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-200">No B2B sales match your filters</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Record your first B2B cold brew delivery with 180ml bottles or 1 Litre bottles to start tracking date-wise sales.
              </p>
            </div>
            <button
              onClick={() => {
                handleBottleSizeSelect('180ml');
                setIsRecordModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Record First B2B Sale
            </button>
          </div>
        ) : (
          groupedSalesByDate.map(([dateKey, dateSales]) => {
            const dateRevenue = dateSales.reduce((acc, s) => acc + s.total, 0);
            const date180ml = dateSales.reduce(
              (acc, s) =>
                acc +
                s.items
                  .filter((i) => (i.bottleSize || s.bottleSize || '').includes('180'))
                  .reduce((iAcc, item) => iAcc + item.quantity, 0),
              0
            );
            const date1L = dateSales.reduce(
              (acc, s) =>
                acc +
                s.items
                  .filter((i) => (i.bottleSize || s.bottleSize || '').includes('1L') || (i.bottleSize || s.bottleSize || '').includes('1000'))
                  .reduce((iAcc, item) => iAcc + item.quantity, 0),
              0
            );

            return (
              <div
                key={dateKey}
                className="rounded-3xl bg-zinc-900/80 border border-zinc-800 overflow-hidden shadow-sm"
              >
                {/* Date Group Header */}
                <div className="px-6 py-3.5 bg-zinc-950/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-zinc-100 tracking-wide">
                        {formatDate(dateKey)}
                      </span>
                      <span className="text-[11px] text-zinc-400 ml-2">
                        ({dateSales.length} {dateSales.length === 1 ? 'sale' : 'sales'})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    {date180ml > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]">
                        {date180ml} btls (180ml)
                      </span>
                    )}
                    {date1L > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[11px]">
                        {date1L} btls (1L)
                      </span>
                    )}
                    <span className="text-emerald-400 font-bold">
                      Day Total: {formatCurrency(dateRevenue)}
                    </span>
                  </div>
                </div>

                {/* Sales Table for Date */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/30">
                        <th className="py-3 px-5">Sale #</th>
                        <th className="py-3 px-4">Café Client</th>
                        <th className="py-3 px-4">Size &amp; Packaging</th>
                        <th className="py-3 px-4">Cold Brew Flavor / Bean</th>
                        <th className="py-3 px-4 text-right">Quantity</th>
                        <th className="py-3 px-4 text-right">Rate</th>
                        <th className="py-3 px-4 text-right">Total (₹)</th>
                        <th className="py-3 px-4 text-center">Payment Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {dateSales.map((sale) => {
                        const isPaid = sale.paymentStatus === 'PAID';
                        const isPartial = sale.paymentStatus === 'PARTIAL';
                        const isPending = sale.paymentStatus === 'PENDING';
                        const pendingAmt = Math.max(0, sale.total - (sale.amountPaid || 0));

                        // Primary item or summarized info
                        const primarySize = sale.bottleSize || sale.items[0]?.bottleSize || (sale.items[0]?.product?.size) || '180ml';
                        const primaryFlavor = sale.flavor || sale.items[0]?.flavor || (sale.items[0]?.product?.variant) || 'Classic Cold Brew';
                        const totalUnits = sale.items.reduce((acc, i) => acc + i.quantity, 0);

                        return (
                          <tr
                            key={sale.id}
                            className="hover:bg-zinc-800/30 transition-colors group"
                          >
                            {/* Sale # */}
                            <td className="py-3.5 px-5 font-mono font-bold text-amber-400 whitespace-nowrap">
                              {sale.saleNumber}
                            </td>

                            {/* Customer Cafe */}
                            <td className="py-3.5 px-4 font-semibold text-zinc-200">
                              {sale.cafe ? (
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <Store className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span className="font-bold text-zinc-100">{sale.cafe.name}</span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400 block pl-5">
                                    {sale.cafe.area || sale.cafe.city || 'Bengaluru'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-400 italic">Direct Walk-in</span>
                              )}
                            </td>

                            {/* Bottle Size Badge */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {primarySize.includes('1L') || primarySize.includes('1000') ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                  <Package className="w-3 h-3 text-purple-400" />
                                  1 Litre Bottle
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                  <Coffee className="w-3 h-3 text-amber-400" />
                                  180ml Bottle
                                </span>
                              )}
                            </td>

                            {/* Flavor / Bean Profile */}
                            <td className="py-3.5 px-4 text-zinc-200 font-medium">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>{primaryFlavor}</span>
                              </div>
                              {sale.notes && (
                                <span className="text-[10px] text-zinc-400 block italic mt-0.5 truncate max-w-[200px]">
                                  {sale.notes}
                                </span>
                              )}
                            </td>

                            {/* Quantity */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-zinc-100 whitespace-nowrap">
                              {totalUnits} <span className="text-[10px] font-normal text-zinc-400">btls</span>
                            </td>

                            {/* Unit Price */}
                            <td className="py-3.5 px-4 text-right font-mono text-zinc-400 whitespace-nowrap">
                              {sale.items[0]?.unitPrice ? formatCurrency(sale.items[0].unitPrice) : '—'}
                            </td>

                            {/* Total Billed */}
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {formatCurrency(sale.total)}
                            </td>

                            {/* Payment Status */}
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => openPaymentModal(sale)}
                                title="Click to update payment"
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                  isPaid
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                    : isPartial
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                                }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>PAID</span>
                                  </>
                                ) : isPartial ? (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    <span>PARTIAL (₹{sale.amountPaid} pd)</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-rose-400" />
                                    <span>PENDING (₹{sale.total})</span>
                                  </>
                                )}
                              </button>
                              <div className="text-[9px] text-zinc-400 mt-0.5 font-mono">
                                via {sale.paymentMethod}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100">
                                <button
                                  onClick={() => openEditModal(sale)}
                                  title="Edit Sale Details"
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-900/40 text-zinc-300 hover:text-amber-400 transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                </button>
                                <button
                                  onClick={() => openPaymentModal(sale)}
                                  title="Update Payment Settlement"
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-zinc-300" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSale(sale.id)}
                                  title="Delete Sale Record"
                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: RECORD B2B SALE */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-zinc-100">
                    Record New B2B Sale
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Choose bottle size (180ml or 1L), cold brew flavor &amp; client café.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleRecordSaleSubmit} className="space-y-5 text-xs">
              {/* Date & Cafe Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">
                    Delivery / Sale Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-zinc-400 font-semibold">
                      Target Café
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewCafeModalOpen(true)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      + Add New Café
                    </button>
                  </div>
                  <select
                    value={formCafeId}
                    onChange={(e) => handleCafeSelect(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Direct Client / Walk-in</option>
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.area ? `(${c.area})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BOTTLE SIZE SELECTION (180ml vs 1L) */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-2">
                  1. Bottle Size Selection
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleBottleSizeSelect('180ml')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      formBottleSize === '180ml'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-950/30 ring-1 ring-amber-500'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-bold text-sm text-zinc-100">180 ml Bottle</div>
                      <Coffee className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Compact Single-Serve RTD Cold Brew
                    </p>
                    <div className="mt-2 text-xs font-mono font-bold text-amber-400">
                      Standard: ₹120 / bottle
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBottleSizeSelect('1L')}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      formBottleSize === '1L'
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-md shadow-purple-950/30 ring-1 ring-purple-500'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="font-bold text-sm text-zinc-100">1 Litre (1L) Bottle</div>
                      <Package className="w-4 h-4 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Bulk Pitcher / Barista Concentrate
                    </p>
                    <div className="mt-2 text-xs font-mono font-bold text-purple-400">
                      Standard: ₹480 / bottle
                    </div>
                  </button>
                </div>
              </div>

              {/* COLD BREW FLAVOR / BEAN SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-zinc-400 font-semibold">
                    2. Cold Brew Flavor &amp; Bean Variety
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCustomFlavor(!isCustomFlavor)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
                  >
                    {isCustomFlavor ? 'Choose from list' : '+ Custom Flavor'}
                  </button>
                </div>

                {isCustomFlavor ? (
                  <input
                    type="text"
                    required
                    placeholder="e.g. 100% Arabica Classic, Floral Chikmagalur, Hazelnut Cold Brew..."
                    value={formCustomFlavor}
                    onChange={(e) => setFormCustomFlavor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-emerald-500/50 text-zinc-100 font-semibold focus:outline-none"
                  />
                ) : (
                  <select
                    value={formFlavor}
                    onChange={(e) => setFormFlavor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    {flavorOptions.map((flv) => (
                      <option key={flv} value={flv}>
                        {flv}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Flavor profiles map automatically to your roasted coffee bean lots.
                </span>
              </div>

              {/* Quantity & Unit Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">
                    Quantity (Bottles)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formQuantity}
                    onChange={(e) => {
                      setFormQuantity(e.target.value);
                      const q = parseFloat(e.target.value) || 0;
                      const p = parseFloat(formUnitPrice) || 0;
                      setFormAmountPaid(String(q * p));
                    }}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[10, 20, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setFormQuantity(String(preset));
                          const p = parseFloat(formUnitPrice) || 0;
                          setFormAmountPaid(String(preset * p));
                        }}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono cursor-pointer"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5">
                    Unit Price (₹ / bottle)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formUnitPrice}
                    onChange={(e) => {
                      setFormUnitPrice(e.target.value);
                      const p = parseFloat(e.target.value) || 0;
                      const q = parseFloat(formQuantity) || 0;
                      setFormAmountPaid(String(q * p));
                    }}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* PAYMENT DETAILS */}
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-200">Payment &amp; Billing Settlement</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">
                    Order Total: {formatCurrency(formSubtotal)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">
                      Payment Status
                    </label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFormPaymentStatus(val);
                        if (val === 'PAID') {
                          setFormAmountPaid(String(formSubtotal));
                        } else if (val === 'PENDING') {
                          setFormAmountPaid('0');
                        }
                      }}
                      className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold"
                    >
                      <option value="PAID">Full Payment Paid</option>
                      <option value="PARTIAL">Partial Payment Received</option>
                      <option value="PENDING">Pending Invoice (Unpaid)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 font-semibold mb-1">
                      Payment Method
                    </label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold"
                    >
                      <option value="UPI">UPI (GPay / PhonePe)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Cash">Cash on Delivery</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                {formPaymentStatus === 'PARTIAL' && (
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                    <div>
                      <label className="block text-[11px] text-zinc-400 font-semibold mb-0.5">
                        Amount Paid Received (₹)
                      </label>
                      <input
                        type="number"
                        value={formAmountPaid}
                        onChange={(e) => setFormAmountPaid(e.target.value)}
                        className="w-36 p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-400 block">Pending Balance:</span>
                      <strong className="text-rose-400 font-mono text-sm">
                        {formatCurrency(Math.max(0, formSubtotal - (parseFloat(formAmountPaid) || 0)))}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Delivery Notes / Invoice Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivered 20 bottles to Indiranagar cafe counter, verified cold"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading ? 'Recording...' : 'Confirm B2B Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UPDATE PAYMENT STATUS */}
      {isPaymentModalOpen && selectedSaleForPayment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100">
                  Update Payment: {selectedSaleForPayment.saleNumber}
                </h3>
                <span className="text-xs text-zinc-400">
                  Total Order Amount: {formatCurrency(selectedSaleForPayment.total)}
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentUpdateStatus}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    setPaymentUpdateStatus(st);
                    if (st === 'PAID') {
                      setPaymentUpdateAmount(String(selectedSaleForPayment.total));
                    } else if (st === 'PENDING') {
                      setPaymentUpdateAmount('0');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold"
                >
                  <option value="PAID">Full Payment Paid</option>
                  <option value="PARTIAL">Partially Paid</option>
                  <option value="PENDING">Pending (Unpaid)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Amount Received (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentUpdateAmount}
                  onChange={(e) => setPaymentUpdateAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentUpdateMethod}
                  onChange={(e) => setPaymentUpdateMethod(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold"
                >
                  <option value="UPI">UPI (GPay / PhonePe)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {paymentLoading ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK ADD CAFE */}
      {isNewCafeModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-purple-400" />
                Quick Add B2B Café
              </h3>
              <button
                onClick={() => setIsNewCafeModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCafeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Café Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Third Wave Coffee Roasters"
                  value={newCafeName}
                  onChange={(e) => setNewCafeName(e.target.value)}
                  className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Area / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Indiranagar, Bengaluru"
                  value={newCafeArea}
                  onChange={(e) => setNewCafeArea(e.target.value)}
                  className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Raghav"
                    value={newCafeContact}
                    onChange={(e) => setNewCafeContact(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={newCafePhone}
                    onChange={(e) => setNewCafePhone(e.target.value)}
                    className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewCafeModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 text-zinc-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newCafeLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {newCafeLoading ? 'Adding...' : 'Save Café'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT B2B SALE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-zinc-100">Edit B2B Sale Entry</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSaleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Sale Date */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Sale Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Café */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Café Client</label>
                  <select
                    value={editCafeId}
                    onChange={(e) => setEditCafeId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Direct / Counter Sale</option>
                    {cafes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.area ? `(${c.area})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bottle Size */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Bottle Format</label>
                  <select
                    value={editBottleSize}
                    onChange={(e) => setEditBottleSize(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="180ml">180ml Glass Bottle (Ready-to-Drink)</option>
                    <option value="1L">1L Glass Bottle (Commercial Café Dispense)</option>
                    <option value="250ml">250ml Bottle</option>
                    <option value="500ml">500ml Bottle</option>
                  </select>
                </div>

                {/* Flavor / Cold Brew Variant */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Cold Brew Flavor / Bean</label>
                  <input
                    type="text"
                    required
                    value={editFlavor}
                    onChange={(e) => setEditFlavor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Quantity (Bottles)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Agreed Rate / Bottle (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editDiscount}
                    onChange={(e) => setEditDiscount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Payment Status</label>
                  <select
                    value={editPaymentStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as any;
                      setEditPaymentStatus(newStatus);
                      const currentTotal = Math.max(
                        0,
                        (parseFloat(editQuantity) || 0) * (parseFloat(editUnitPrice) || 0) -
                          (parseFloat(editDiscount) || 0)
                      );
                      if (newStatus === 'PAID') {
                        setEditAmountPaid(String(currentTotal));
                      } else if (newStatus === 'PENDING') {
                        setEditAmountPaid('0');
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="PAID">PAID (Full Settlement)</option>
                    <option value="PENDING">PENDING (Unpaid Credit)</option>
                    <option value="PARTIAL">PARTIAL (Advance Received)</option>
                    <option value="OVERDUE">OVERDUE</option>
                  </select>
                </div>

                {/* Amount Paid */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400">Calculated Total: </span>
                  <strong className="text-emerald-400 text-sm font-mono ml-1">
                    ₹
                    {Math.max(
                      0,
                      (parseFloat(editQuantity) || 0) * (parseFloat(editUnitPrice) || 0) -
                        (parseFloat(editDiscount) || 0)
                    ).toLocaleString('en-IN')}
                  </strong>
                </div>
                <div className="text-[11px] text-zinc-400">
                  Remaining Dues:{' '}
                  <strong className="text-amber-400 font-mono">
                    ₹
                    {Math.max(
                      0,
                      (parseFloat(editQuantity) || 0) * (parseFloat(editUnitPrice) || 0) -
                        (parseFloat(editDiscount) || 0) -
                        (parseFloat(editAmountPaid) || 0)
                    ).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1">Fulfillment Notes</label>
                <input
                  type="text"
                  placeholder="Delivery details, invoice reference, batch notes..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40"
                >
                  {editLoading ? 'Saving Changes...' : 'Save Sale Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
