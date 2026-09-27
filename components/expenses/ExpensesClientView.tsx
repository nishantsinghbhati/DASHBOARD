'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Receipt,
  Search,
  Filter,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { addExpense, updateExpense, deleteExpense } from '@/lib/actions/expenses';
import { usePartner } from '@/lib/auth/partner-client';
import { formatDate } from '@/lib/utils';

interface ExpenseItem {
  id: string;
  date: Date | string;
  title: string;
  amount: number;
  paidBy: string;
  paymentMethod: string;
  vendor: string | null;
  notes: string | null;
  isSettled: boolean;
  category: { id: string; name: string; color: string };
}

interface CategoryItem {
  id: string;
  name: string;
}

export function ExpensesClientView({
  expenses,
  categories,
}: {
  expenses: ExpenseItem[];
  categories: CategoryItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paidByFilter, setPaidByFilter] = useState('ALL');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<'Nishant' | 'Chinmay' | 'Business Account'>(
    partner.name as any || 'Nishant'
  );
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredExpenses = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || e.category.id === categoryFilter;
    const matchesPaid = paidByFilter === 'ALL' || e.paidBy === paidByFilter;

    return matchesSearch && matchesCat && matchesPaid;
  });

  const handleOpenAdd = () => {
    setTitle('');
    setAmount('');
    setPaidBy(partner.name as any || 'Nishant');
    setVendor('');
    setNotes('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive expense amount.');
      setLoading(false);
      return;
    }

    const res = await addExpense({
      title,
      categoryId,
      amount: parsedAmount,
      paidBy,
      paymentMethod,
      vendor,
      notes,
      date: expenseDate,
    });

    setLoading(false);
    if (res.success) {
      setModalOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to add expense.');
    }
  };

  // Edit Expense State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidBy, setEditPaidBy] = useState<'Nishant' | 'Chinmay' | 'Business Account'>('Nishant');
  const [editPaymentMethod, setEditPaymentMethod] = useState('UPI');
  const [editVendor, setEditVendor] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Expense State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenEdit = (exp: ExpenseItem) => {
    setEditingId(exp.id);
    setEditTitle(exp.title);
    setEditCategoryId(exp.category.id);
    setEditAmount(String(exp.amount));
    setEditPaidBy(exp.paidBy as any);
    setEditPaymentMethod(exp.paymentMethod || 'UPI');
    setEditVendor(exp.vendor || '');
    setEditNotes(exp.notes || '');
    const dateStr =
      typeof exp.date === 'string'
        ? exp.date.split('T')[0]
        : new Date(exp.date).toISOString().split('T')[0];
    setEditDate(dateStr);
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setEditError('Please enter a valid positive expense amount.');
      setEditLoading(false);
      return;
    }

    const res = await updateExpense({
      id: editingId,
      title: editTitle,
      categoryId: editCategoryId,
      amount: parsedAmount,
      paidBy: editPaidBy,
      paymentMethod: editPaymentMethod,
      vendor: editVendor,
      notes: editNotes,
      date: editDate,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success) {
      setEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update expense.');
    }
  };

  const handleDeleteSubmit = async (id: string) => {
    setDeleteLoading(true);
    const res = await deleteExpense(id, partner.id);
    setDeleteLoading(false);
    setDeleteConfirmId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete expense.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search expenses, vendors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={paidByFilter}
            onChange={(e) => setPaidByFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Payers</option>
            <option value="Nishant">Paid by Nishant</option>
            <option value="Chinmay">Paid by Chinmay</option>
            <option value="Business Account">Business Account</option>
          </select>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1.5 transition-all self-stretch md:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Add Expense
        </button>
      </div>

      {/* Expenses Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-semibold">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4">Paid By</th>
              <th className="py-3 px-4">Method & Vendor</th>
              <th className="py-3 px-4 text-center">Settled?</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No expenses recorded matching your criteria.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="py-3 px-4 text-zinc-400 font-mono">
                    {formatDate(exp.date)}
                  </td>
                  <td className="py-3 px-4 font-bold text-zinc-200">
                    {exp.title}
                    {exp.notes && (
                      <span className="text-[10px] text-zinc-500 block font-normal">
                        {exp.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                      {exp.category.name}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-400 text-sm">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        exp.paidBy === 'Nishant'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : exp.paidBy === 'Chinmay'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {exp.paidBy}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-[11px]">
                    <div>{exp.vendor || '-'}</div>
                    <span className="text-zinc-500 font-mono text-[10px]">
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {exp.isSettled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Settled
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Pending 50/50
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(exp)}
                        title="Edit Entry"
                        className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-400 text-zinc-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(exp.id)}
                        title="Delete Entry"
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ADD EXPENSE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" />
              Add Business Expense
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Expense Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amber glass bottles shipment"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Paid By (Fixed 50/50)</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="Nishant">Nishant (Partner 1)</option>
                    <option value="Chinmay">Chinmay (Partner 2)</option>
                    <option value="Business Account">Business Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Origin Estates"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXPENSE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" />
                Edit Expense Entry
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500 font-mono text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Description / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amber glass bottles or Roasting machinery"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Paid By (Partner Split)</label>
                  <select
                    value={editPaidBy}
                    onChange={(e) => setEditPaidBy(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-semibold"
                  >
                    <option value="Nishant">Nishant</option>
                    <option value="Chinmay">Chinmay</option>
                    <option value="Business Account">Business Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Cash">Cash</option>
                    <option value="Net Banking">Net Banking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Vendor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Origin Estates"
                    value={editVendor}
                    onChange={(e) => setEditVendor(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional details"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Update Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">Delete Expense?</h3>
                <p className="text-zinc-400 text-xs">
                  This expense will be permanently removed and partner reconciliation balances will update immediately.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => handleDeleteSubmit(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
