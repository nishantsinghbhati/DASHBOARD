'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Building2,
  Calendar,
  Layers,
  Tag,
  IndianRupee,
  UserCheck,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Trash2,
  X,
  Pencil,
} from 'lucide-react';
import { usePartner } from '@/lib/auth/partner-client';
import { recordPurchase, updatePurchase, deletePurchase } from '@/lib/actions/purchases';
import { useRouter } from 'next/navigation';

interface PurchaseItem {
  id: string;
  date: Date | string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reference?: string | null;
  partnerId?: string | null;
  notes?: string | null;
  inventoryItem: {
    id: string;
    name: string;
    category: string;
    unit: string;
  };
}

interface SupplierSummary {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  totalSpent: number;
  itemsSupplied: string[];
}

interface PurchasesClientProps {
  purchases: PurchaseItem[];
  suppliers: SupplierSummary[];
  existingItems: { name: string; category: string; unit: string; currentQuantity: number }[];
}

const CATEGORIES = [
  'Coffee Beans',
  'Bottles',
  'Caps',
  'Labels',
  'Water',
  'Equipment',
  'Supplies',
] as const;

export function PurchasesClient({
  purchases,
  suppliers,
  existingItems,
}: PurchasesClientProps) {
  const { partner } = usePartner();
  const [activeTab, setActiveTab] = useState<'ledger' | 'comparison'>('ledger');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [selectedComparisonItem, setSelectedComparisonItem] = useState<string>('');
  const router = useRouter();

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editUnit, setEditUnit] = useState('units');
  const [editSupplier, setEditSupplier] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Coffee Beans' as (typeof CATEGORIES)[number],
    bottleSize: '180ml' as '180ml' | '1L',
    quantity: '',
    unit: 'kg',
    unitCost: '',
    supplierName: '',
    supplierContact: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleCategoryChange = (cat: (typeof CATEGORIES)[number]) => {
    let defaultUnit = 'units';
    if (cat === 'Coffee Beans') defaultUnit = 'kg';
    else if (cat === 'Water') defaultUnit = 'liters';
    else if (cat === 'Equipment') defaultUnit = 'units';

    setFormData((prev) => ({
      ...prev,
      category: cat,
      unit: defaultUnit,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName || !formData.supplierName) {
      alert('Please fill in Item Name and Supplier Name.');
      return;
    }
    const qty = parseFloat(formData.quantity);
    const rate = parseFloat(formData.unitCost);
    if (isNaN(qty) || qty <= 0 || isNaN(rate) || rate < 0) {
      alert('Please enter valid quantity and price.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await recordPurchase({
        itemName: formData.itemName,
        category: formData.category,
        bottleSize:
          formData.category === 'Bottles' ||
          formData.category === 'Caps' ||
          formData.category === 'Labels'
            ? formData.bottleSize
            : null,
        quantity: qty,
        unit: formData.unit,
        unitCost: rate,
        supplierName: formData.supplierName,
        supplierContact: formData.supplierContact,
        date: formData.date,
        partnerId: partner.id,
        notes: formData.notes,
      });

      if (res.success) {
        setIsModalOpen(false);
        setFormData({
          itemName: '',
          category: 'Coffee Beans',
          bottleSize: '180ml',
          quantity: '',
          unit: 'kg',
          unitCost: '',
          supplierName: '',
          supplierContact: '',
          date: new Date().toISOString().split('T')[0],
          notes: '',
        });
      } else {
        alert(res.error || 'Failed to record purchase.');
      }
    } catch (err: any) {
      alert(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditPurchase = (p: PurchaseItem) => {
    setEditingPurchase(p);
    setEditQty(String(p.quantity));
    setEditCost(String(p.unitCost));
    setEditUnit(p.unit || p.inventoryItem.unit || 'units');
    const dateStr = typeof p.date === 'string' ? p.date.split('T')[0] : new Date(p.date).toISOString().split('T')[0];
    setEditDate(dateStr);
    setEditNotes(p.notes || '');
    setEditSupplier(p.reference ? p.reference.replace(/^PO-/, '') : '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditPurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPurchase) return;

    setEditSubmitting(true);
    setEditError('');

    const qty = parseFloat(editQty);
    const cost = parseFloat(editCost);

    if (isNaN(qty) || qty <= 0) {
      setEditError('Please enter a valid positive quantity.');
      setEditSubmitting(false);
      return;
    }
    if (isNaN(cost) || cost < 0) {
      setEditError('Please enter a valid unit cost.');
      setEditSubmitting(false);
      return;
    }

    const res = await updatePurchase({
      transactionId: editingPurchase.id,
      quantity: qty,
      unitCost: cost,
      unit: editUnit,
      supplierName: editSupplier,
      date: editDate,
      notes: editNotes,
      partnerId: partner.id,
    });

    setEditSubmitting(false);
    if (res.success) {
      setIsEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update purchase.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this purchase? Stock and partner expense will be adjusted.')) {
      return;
    }
    const res = await deletePurchase(id);
    if (!res.success) alert(res.error || 'Failed to delete');
    else router.refresh();
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.inventoryItem.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || p.inventoryItem.category === selectedCategory;

    const matchesSupplier =
      selectedSupplier === 'ALL' || (p.notes || '').includes(selectedSupplier);

    return matchesSearch && matchesCategory && matchesSupplier;
  });

  // Calculate stats
  const totalSpend = purchases.reduce((acc, p) => acc + p.totalCost, 0);
  const totalItemsCount = purchases.length;
  const uniqueSuppliersCount = suppliers.length;

  // Comparison data
  const distinctItemNames = Array.from(
    new Set(purchases.map((p) => p.inventoryItem.name))
  );

  const activeComparisonItem = selectedComparisonItem || distinctItemNames[0] || '';

  const itemHistory = purchases
    .filter((p) => p.inventoryItem.name === activeComparisonItem)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
              <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Procurement & Purchases
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Track every ingredient, packaging, and supply bought for Brew 1671.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ledger'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Purchases Ledger
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'comparison'
                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Supplier Rate Comparison
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/30 transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Record Purchase</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Spend on Supplies
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">
              ₹{totalSpend.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Auto-synced to 50/50</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Every purchase automatically balances partner spending.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Total Purchases Logged
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400">
              {totalItemsCount}
            </span>
            <span className="text-xs text-zinc-400">transactions</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Complete date-wise traceability for all items.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Active Suppliers
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {uniqueSuppliersCount}
            </span>
            <span className="text-xs text-zinc-400">vendors</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            Beans, glass bottles, caps, labels, and water vendors.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'ledger' ? (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search purchase by item name or note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="py-2 px-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="py-2 px-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.name}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 border-b border-zinc-800/80 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Item & Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Rate / Unit</th>
                    <th className="py-3 px-4 text-right">Total Cost</th>
                    <th className="py-3 px-4">Logged By</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600 mb-2 stroke-[1.5]" />
                        <p className="font-semibold text-zinc-400">No purchases found</p>
                        <p className="text-[11px] text-zinc-600 mt-0.5">
                          Click "Record Purchase" above to add beans, packaging, or supplies.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const pDate = new Date(p.date);
                      const isChinmay = p.partnerId?.includes('CHINMAY');
                      const partnerName = isChinmay ? 'Chinmay' : 'Nishant';
                      const partnerBadge = isChinmay ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';

                      return (
                        <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                            {pDate.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-zinc-100">{p.inventoryItem.name}</div>
                            {p.notes && (
                              <div className="text-[11px] text-zinc-400 mt-0.5">{p.notes}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
                              {p.inventoryItem.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-zinc-200">
                            {p.quantity.toLocaleString('en-IN')} {p.unit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-300">
                            ₹{p.unitCost.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                            ₹{p.totalCost.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${partnerBadge}`}
                            >
                              <UserCheck className="w-3 h-3" />
                              {partnerName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditPurchase(p)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                                title="Edit purchase entry"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Delete purchase entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Supplier Rate Comparison View */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-200">
                Compare Supplier Rates Over Time
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Select an item to see what each supplier charged and identify the best prices.
              </p>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={activeComparisonItem}
                onChange={(e) => setSelectedComparisonItem(e.target.value)}
                className="w-full py-2 px-3 bg-zinc-950 border border-zinc-700 rounded-xl text-xs text-amber-300 font-semibold focus:outline-none focus:border-amber-500"
              >
                {distinctItemNames.length === 0 ? (
                  <option value="">No items bought yet</option>
                ) : (
                  distinctItemNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Rate history for selected item */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Purchase Rate History: <span className="text-zinc-100">{activeComparisonItem || 'None'}</span>
            </h4>

            {itemHistory.length === 0 ? (
              <p className="text-xs text-zinc-500 py-6 text-center">
                No purchase history recorded for this item yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Supplier Note</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Rate / Unit</th>
                      <th className="py-2.5 px-3 text-right">Total Paid</th>
                      <th className="py-2.5 px-3">Purchased By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {itemHistory.map((h, idx) => {
                      const isBestPrice =
                        idx === 0 ||
                        h.unitCost <= Math.min(...itemHistory.map((x) => x.unitCost));
                      return (
                        <tr key={h.id} className="hover:bg-zinc-800/30">
                          <td className="py-2.5 px-3 font-mono text-zinc-400">
                            {new Date(h.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-zinc-200">
                            {h.notes || 'Direct Supplier'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {h.quantity} {h.unit}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-100">
                            ₹{h.unitCost}
                            {isBestPrice && itemHistory.length > 1 && (
                              <span className="ml-1.5 text-[10px] text-emerald-400 font-semibold">
                                ★ Best
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                            ₹{h.totalCost.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="text-zinc-400">
                              {h.partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supplier Directory List */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Supplier Directory & Cumulative Spend
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {suppliers.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 col-span-full text-center">
                  No suppliers registered yet. They will appear here automatically when you log purchases.
                </p>
              ) : (
                suppliers.map((s) => (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200 text-sm">{s.name}</span>
                      <Building2 className="w-4 h-4 text-zinc-500" />
                    </div>
                    {s.contactPerson && (
                      <p className="text-[11px] text-zinc-400 mt-1">Contact: {s.contactPerson}</p>
                    )}
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-500">Total Procured:</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        ₹{s.totalSpent.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Purchase Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-zinc-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-zinc-100">Record New Purchase</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Increases stock & logs expense under your partner account.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-5">
              {/* Active Logged-in Partner Notice (No dropdown, strictly automatic) */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg ${partner.avatarColor} text-white font-bold text-[11px] flex items-center justify-center`}>
                    {partner.initials}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-zinc-200">{partner.name}</span>
                    <span className="text-[11px] text-zinc-400 ml-1.5">(50% Director)</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Auto-Tagged Author
                </span>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                        formData.category === cat
                          ? 'bg-amber-500 text-zinc-950 font-bold border-amber-500 shadow-sm'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottle Size Selector (For Bottles, Caps, Labels) */}
              {(formData.category === 'Bottles' ||
                formData.category === 'Caps' ||
                formData.category === 'Labels') && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Bottle / Packaging Size
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bottleSize: '180ml' })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                        formData.bottleSize === '180ml'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      180ml (Single Serve)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, bottleSize: '1L' })}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                        formData.bottleSize === '1L'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      1 Liter (Bulk Supply)
                    </button>
                  </div>
                </div>
              )}

              {/* Item Name */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.category === 'Coffee Beans'
                      ? 'e.g. Chikmagalur Arabica AAA'
                      : formData.category === 'Bottles'
                      ? 'e.g. Glass Cold Brew Bottles'
                      : 'e.g. RO Filtered Water, Heavy Duty Sealer...'
                  }
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                  className="w-full py-2.5 px-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Supplier Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    required
                    list="suppliers-list"
                    placeholder="e.g. Coorg Roasters / Glasscraft"
                    value={formData.supplierName}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierName: e.target.value })
                    }
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="suppliers-list">
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Supplier Contact (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Phone or contact person"
                    value={formData.supplierContact}
                    onChange={(e) =>
                      setFormData({ ...formData, supplierContact: e.target.value })
                    }
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Quantity, Unit, Price, Total */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="50"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Rate / Unit (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="450"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Calculated Total Banner */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400 font-medium">Calculated Total Spend:</span>
                <span className="text-sm font-mono font-bold text-amber-400">
                  ₹
                  {((parseFloat(formData.quantity) || 0) * (parseFloat(formData.unitCost) || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    Notes / Batch Ref
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lot #489, Paid via UPI"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full py-2 px-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-md shadow-amber-950/40 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Purchase Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: EDIT PURCHASE ENTRY */}
      {isEditModalOpen && editingPurchase && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  Edit Purchase: {editingPurchase.inventoryItem.name}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditPurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Supplier / Vendor</label>
                  <input
                    type="text"
                    placeholder="Supplier name"
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Quantity ({editUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Unit Cost (₹ / {editUnit})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Total Calculation */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total Purchase Cost:</span>
                <strong className="text-amber-400 font-mono text-sm">
                  ₹{((parseFloat(editQty) || 0) * (parseFloat(editCost) || 0)).toLocaleString('en-IN')}
                </strong>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Notes / PO Reference</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full py-2 px-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-950/40"
                >
                  {editSubmitting ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
