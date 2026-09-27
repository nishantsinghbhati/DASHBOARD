'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Store,
  Plus,
  Phone,
  Mail,
  Share2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  addCafe,
  updateCafe,
  deleteCafe,
  updateCafeStatus,
  createFollowUp,
  completeFollowUp,
} from '@/lib/actions/cafes';
import { usePartner } from '@/lib/auth/partner-client';
import { formatDate } from '@/lib/utils';

interface CafeItem {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  location: string | null;
  city: string | null;
  area: string | null;
  leadSource: string | null;
  status: string;
  estMonthlyRequirement: number | null;
  productInterest: string | null;
  lastContacted: Date | string | null;
  nextFollowUp: Date | string | null;
  notes: string | null;
  followUps: Array<{ id: string; title: string; dueDate: Date | string; status: string }>;
}

const PIPELINE_COLUMNS = [
  { id: 'NEW', label: 'New Lead', color: 'border-zinc-700 text-zinc-300' },
  { id: 'CONTACTED', label: 'Contacted', color: 'border-sky-500/40 text-sky-400' },
  { id: 'INTERESTED', label: 'Interested', color: 'border-amber-500/40 text-amber-400' },
  { id: 'SAMPLE_SENT', label: 'Sample Sent', color: 'border-pink-500/40 text-pink-400' },
  { id: 'FOLLOW_UP', label: 'Follow-up Due', color: 'border-orange-500/40 text-orange-400' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'border-purple-500/40 text-purple-400' },
  { id: 'CUSTOMER', label: 'Customer (Active)', color: 'border-emerald-500/40 text-emerald-400' },
  { id: 'LOST', label: 'Lost / Closed', color: 'border-rose-500/40 text-rose-400' },
];

export function CafeKanbanClient({ cafes }: { cafes: CafeItem[] }) {
  const router = useRouter();
  const { partner } = usePartner();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New Cafe form state
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [leadSource, setLeadSource] = useState('In-Person Visit');
  const [estMonthlyRequirement, setEstMonthlyRequirement] = useState('');
  const [productInterest, setProductInterest] = useState('Original Cold Brew 180ml');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Edit Cafe state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCafeId, setEditCafeId] = useState('');
  const [editName, setEditName] = useState('');
  const [editContactPerson, setEditContactPerson] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCity, setEditCity] = useState('Bengaluru');
  const [editEstMonthly, setEditEstMonthly] = useState('');
  const [editProductInterest, setEditProductInterest] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete Cafe state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleOpenEditCafe = (cafe: CafeItem) => {
    setEditCafeId(cafe.id);
    setEditName(cafe.name);
    setEditContactPerson(cafe.contactPerson || '');
    setEditPhone(cafe.phone || '');
    setEditEmail(cafe.email || '');
    setEditInstagram(cafe.instagram || '');
    setEditArea(cafe.area || '');
    setEditCity(cafe.city || 'Bengaluru');
    setEditEstMonthly(cafe.estMonthlyRequirement ? String(cafe.estMonthlyRequirement) : '');
    setEditProductInterest(cafe.productInterest || '');
    setEditNotes(cafe.notes || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleEditCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    if (!editName.trim()) {
      setEditError('Café name is required.');
      setEditLoading(false);
      return;
    }

    const res = await updateCafe({
      id: editCafeId,
      name: editName.trim(),
      contactPerson: editContactPerson || undefined,
      phone: editPhone || undefined,
      email: editEmail || undefined,
      instagram: editInstagram || undefined,
      area: editArea || undefined,
      city: editCity || undefined,
      estMonthlyRequirement: parseFloat(editEstMonthly) || undefined,
      productInterest: editProductInterest || undefined,
      notes: editNotes || undefined,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success) {
      setEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update café.');
    }
  };

  const handleDeleteCafeSubmit = async (id: string) => {
    setDeleteLoading(true);
    const res = await deleteCafe(id, partner.id);
    setDeleteLoading(false);
    setDeleteConfirmId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete café.');
    }
  };

  // Move status action
  const handleMoveStatus = async (cafeId: string, currentStatus: string, direction: 'forward' | 'backward') => {
    const currentIndex = PIPELINE_COLUMNS.findIndex((col) => col.id === currentStatus);
    const newIndex = direction === 'forward' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < PIPELINE_COLUMNS.length) {
      const nextCol = PIPELINE_COLUMNS[newIndex];
      await updateCafeStatus({
        cafeId,
        newStatus: nextCol.id,
        partnerId: partner.id,
      });
      router.refresh();
    }
  };

  const handleAddCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name.trim()) {
      setError('Please provide a café name.');
      setLoading(false);
      return;
    }

    const res = await addCafe({
      name,
      contactPerson,
      phone,
      email,
      instagram,
      area,
      city,
      leadSource,
      estMonthlyRequirement: parseFloat(estMonthlyRequirement) || undefined,
      productInterest,
      notes,
      partnerId: partner.id,
    });

    setLoading(false);
    if (res.success) {
      setModalOpen(false);
      setName('');
      setContactPerson('');
      setPhone('');
      router.refresh();
    } else {
      setError(res.error || 'Failed to add café.');
    }
  };

  const filteredCafes = cafes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.area || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Add Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search cafés by name, area, contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center justify-center gap-1.5 transition-all self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          + Add Café Lead
        </button>
      </div>

      {/* KANBAN BOARD HORIZONTAL SCROLL */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1500px]">
          {PIPELINE_COLUMNS.map((col, colIdx) => {
            const columnCafes = filteredCafes.filter((c) => c.status === col.id);

            return (
              <div
                key={col.id}
                className="w-72 shrink-0 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 p-3 space-y-3 flex flex-col"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {columnCafes.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1 min-h-[350px]">
                  {columnCafes.length === 0 ? (
                    <div className="h-32 border border-dashed border-zinc-800/80 rounded-xl flex items-center justify-center text-[11px] text-zinc-600">
                      No cafés
                    </div>
                  ) : (
                    columnCafes.map((cafe) => (
                      <div
                        key={cafe.id}
                        id={cafe.id}
                        className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 shadow-md space-y-2 text-xs transition-all group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-zinc-100 group-hover:text-purple-400 transition-colors">
                            {cafe.name}
                          </h4>
                          <div className="flex items-center gap-1">
                            {cafe.estMonthlyRequirement && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-amber-400 border border-zinc-800">
                                {cafe.estMonthlyRequirement} btls/mo
                              </span>
                            )}
                            <button
                              onClick={() => handleOpenEditCafe(cafe)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                              title="Edit café details"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cafe.id)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Delete café"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-400 space-y-0.5">
                          {cafe.contactPerson && (
                            <div>Contact: {cafe.contactPerson}</div>
                          )}
                          <div>Area: {cafe.area || cafe.city}</div>
                          {cafe.productInterest && (
                            <div className="text-zinc-500 truncate">
                              Interest: {cafe.productInterest}
                            </div>
                          )}
                        </div>

                        {/* Contact icons strip */}
                        <div className="flex items-center gap-2 pt-1 text-zinc-500 text-[10px]">
                          {cafe.phone && (
                            <span className="flex items-center gap-1 text-zinc-400">
                              <Phone className="w-3 h-3" /> {cafe.phone}
                            </span>
                          )}
                        </div>

                        {/* Card Move Actions */}
                        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                          {colIdx > 0 ? (
                            <button
                              onClick={() => handleMoveStatus(cafe.id, cafe.status, 'backward')}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                              title="Move back"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span />
                          )}

                          <span className="text-[10px] text-zinc-500 font-mono">
                            {cafe.leadSource || 'Direct'}
                          </span>

                          {colIdx < PIPELINE_COLUMNS.length - 1 ? (
                            <button
                              onClick={() => handleMoveStatus(cafe.id, cafe.status, 'forward')}
                              className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                              title="Advance status"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD CAFE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Store className="w-4 h-4 text-purple-400" />
              Add Prospective B2B Café Lead
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCafeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-semibold">Café Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Third Wave Coffee Roasters"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Raghav Sharma"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Area / Neighborhood</label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Est. Monthly Bottles</label>
                  <input
                    type="number"
                    placeholder="e.g. 150"
                    value={estMonthlyRequirement}
                    onChange={(e) => setEstMonthlyRequirement(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Lead Source</label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="In-Person Visit">In-Person Visit</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Product Interest</label>
                  <input
                    type="text"
                    value={productInterest}
                    onChange={(e) => setProductInterest(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Prefers low-acidity dark chocolate notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
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
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                >
                  {loading ? 'Adding...' : 'Save Café Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CAFE MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-purple-400" />
              Edit Café Details
            </h3>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditCafeSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Café / Business Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editContactPerson}
                    onChange={(e) => setEditContactPerson(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Instagram Handle</label>
                  <input
                    type="text"
                    value={editInstagram}
                    onChange={(e) => setEditInstagram(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Neighborhood / Area</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">City</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Est. Bottles / Month</label>
                  <input
                    type="number"
                    value={editEstMonthly}
                    onChange={(e) => setEditEstMonthly(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Product Interest</label>
                  <input
                    type="text"
                    value={editProductInterest}
                    onChange={(e) => setEditProductInterest(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-purple-500"
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
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CAFE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-sm">Delete Café Lead?</h3>
                <p className="text-zinc-400 text-xs">
                  This café lead and its pipeline history will be permanently deleted.
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
                onClick={() => handleDeleteCafeSubmit(deleteConfirmId)}
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
