'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Target,
  Plus,
  Search,
  Filter,
  Store,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  CreditCard,
  DollarSign,
  Coffee,
  Package,
  Layers,
  RotateCcw,
  Pencil,
  Trash2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { addCafe, updateCafe, updateCafePitchStatus, deleteCafe } from '@/lib/actions/cafes';
import { usePartner } from '@/lib/auth/partner-client';
import { parseCafeRates, formatCafeNotesWithRates } from '@/lib/calculations/cafe-rates';

export type PipelineStage = 'TO_PITCH' | 'REJECTED' | 'ACCEPTED';

interface CafePitchRecord {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  city: string | null;
  area: string | null;
  leadSource: string | null;
  status: string;
  estMonthlyRequirement: number | null;
  productInterest: string | null;
  pitchDate: Date | string | null;
  pitchNotes: string | null;
  rejectionReason: string | null;
  notes: string | null;
  lastContacted: Date | string | null;
  createdAt: Date | string;
}

export function CafePitchingClient({
  initialCafes,
}: {
  initialCafes: CafePitchRecord[];
}) {
  const { partner } = usePartner();
  const [cafes, setCafes] = useState<CafePitchRecord[]>(initialCafes);
  const [activeTab, setActiveTab] = useState<'ALL' | PipelineStage>('ALL');
  const [viewMode, setViewMode] = useState<'BOARD' | 'LIST'>('BOARD');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [cafeToReject, setCafeToReject] = useState<CafePitchRecord | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // Add Cafe Form State
  const [formName, setFormName] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState<PipelineStage>('TO_PITCH');
  const [formRate180ml, setFormRate180ml] = useState('120');
  const [formRate1L, setFormRate1L] = useState('480');
  const [formPitchNotes, setFormPitchNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit Cafe State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCafeId, setEditCafeId] = useState('');
  const [editName, setEditName] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCity, setEditCity] = useState('Bengaluru');
  const [editContact, setEditContact] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStatus, setEditStatus] = useState('TO_PITCH');
  const [editRate180ml, setEditRate180ml] = useState('120');
  const [editRate1L, setEditRate1L] = useState('480');
  const [editPitchNotes, setEditPitchNotes] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Normalize cafe status into 3 distinct business stages
  const getNormalizedStage = (status: string): PipelineStage => {
    const s = status.toUpperCase();
    if (s === 'REJECTED' || s === 'LOST' || s === 'NOT_INTERESTED') return 'REJECTED';
    if (s === 'ACCEPTED' || s === 'CUSTOMER') return 'ACCEPTED';
    // default TO_PITCH, NEW, PITCHED, CONTACTED, etc.
    return 'TO_PITCH';
  };

  // Grouped by the 3 Stages
  const categorized = useMemo(() => {
    const map: Record<PipelineStage, CafePitchRecord[]> = {
      TO_PITCH: [],
      REJECTED: [],
      ACCEPTED: [],
    };

    cafes.forEach((cafe) => {
      const stage = getNormalizedStage(cafe.status);
      map[stage].push(cafe);
    });

    return map;
  }, [cafes]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = cafes.length;
    const toPitch = categorized.TO_PITCH.length;
    const rejected = categorized.REJECTED.length;
    const activeSupply = categorized.ACCEPTED.length;
    const conversionRate = total > 0 ? Math.round((activeSupply / total) * 100) : 0;

    return { total, toPitch, rejected, activeSupply, conversionRate };
  }, [cafes, categorized]);

  // Filtered Cafes for List View
  const filteredCafes = useMemo(() => {
    return cafes.filter((c) => {
      const stage = getNormalizedStage(c.status);
      const matchTab = activeTab === 'ALL' || stage === activeTab;
      const matchSearch =
        !searchTerm.trim() ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm);

      return matchTab && matchSearch;
    });
  }, [cafes, activeTab, searchTerm]);

  // Handle Quick Status Move
  const handleMoveStatus = async (
    cafeId: string,
    newStatus: PipelineStage,
    pitchNotes?: string,
    rejectionReason?: string
  ) => {
    const res = await updateCafePitchStatus({
      cafeId,
      status: newStatus,
      pitchNotes,
      rejectionReason,
      partnerId: partner.id,
    });

    if (res.success && res.data) {
      setCafes(
        cafes.map((c) =>
          c.id === cafeId
            ? {
                ...c,
                status: newStatus,
                pitchNotes: pitchNotes !== undefined ? pitchNotes : c.pitchNotes,
                rejectionReason:
                  rejectionReason !== undefined ? rejectionReason : c.rejectionReason,
                lastContacted: new Date(),
              }
            : c
        )
      );
    } else {
      alert(res.error || 'Failed to update stage.');
    }
  };

  // Rejection Dialog Actions
  const openRejectDialog = (cafe: CafePitchRecord) => {
    setCafeToReject(cafe);
    setRejectionReasonInput(cafe.rejectionReason || '');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!cafeToReject) return;
    await handleMoveStatus(
      cafeToReject.id,
      'REJECTED',
      cafeToReject.pitchNotes || undefined,
      rejectionReasonInput || 'Price / existing supplier / not interested'
    );
    setIsRejectModalOpen(false);
    setCafeToReject(null);
  };

  // Add Cafe Submit
  const handleAddCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setFormLoading(true);
    const notesWithRates = formatCafeNotesWithRates(
      parseFloat(formRate180ml) || 120,
      parseFloat(formRate1L) || 550,
      formPitchNotes
    );

    const res = await addCafe({
      name: formName.trim(),
      area: formArea.trim() || undefined,
      contactPerson: formContact.trim() || undefined,
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      status: formStatus,
      productInterest: `180ml (@₹${formRate180ml}) & 1L (@₹${formRate1L})`,
      pitchNotes: formPitchNotes,
      notes: notesWithRates,
      partnerId: partner.id,
    });
    setFormLoading(false);

    if (res.success && res.data) {
      setCafes([res.data as any, ...cafes]);
      setIsAddModalOpen(false);
      setFormName('');
      setFormArea('');
      setFormContact('');
      setFormPhone('');
      setFormEmail('');
      setFormPitchNotes('');
    } else {
      alert(res.error || 'Failed to add café to pipeline.');
    }
  };

  const openEditCafe = (cafe: CafePitchRecord) => {
    setEditCafeId(cafe.id);
    setEditName(cafe.name);
    setEditArea(cafe.area || '');
    setEditCity(cafe.city || 'Bengaluru');
    setEditContact(cafe.contactPerson || '');
    setEditPhone(cafe.phone || '');
    setEditEmail(cafe.email || '');
    setEditStatus(cafe.status);
    const parsedRates = parseCafeRates(cafe.notes);
    setEditRate180ml(String(parsedRates.rate180ml || 120));
    setEditRate1L(String(parsedRates.rate1L || 480));
    setEditPitchNotes(cafe.pitchNotes || '');
    setEditNotes(parsedRates.notes || '');
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditCafeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
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
      name: editName.trim(),
      contactPerson: editContact.trim() || undefined,
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      area: editArea.trim() || undefined,
      city: editCity.trim() || undefined,
      status: editStatus,
      pitchNotes: editPitchNotes.trim() || undefined,
      notes: formattedNotes,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success && res.data) {
      setCafes((prev) =>
        prev.map((c) => (c.id === editCafeId ? { ...c, ...res.data } : c))
      );
      setIsEditModalOpen(false);
    } else {
      setEditError(res.error || 'Failed to update café.');
    }
  };

  const handleDeleteCafe = async (cafeId: string) => {
    if (!confirm('Are you sure you want to delete this café lead?')) return;
    const res = await deleteCafe(cafeId, partner.id);
    if (res.success) {
      setCafes((prev) => prev.filter((c) => c.id !== cafeId));
    } else {
      alert(res.error || 'Failed to delete café.');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
                Café Pipeline &amp; CRM
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Simple 3-stage pitching pipeline: To Pitch, Pitched/Rejected, and Active Supply.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/cafes"
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Café Accounts &amp; Dues</span>
          </Link>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Café to Pipeline</span>
          </button>
        </div>
      </div>

      {/* 3 STAGE SUMMARY METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. TO PITCH */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Stage 1 – To Pitch
            </span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2 font-mono">
            {metrics.toPitch} <span className="text-xs font-normal text-zinc-400">cafés</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Prospect cafés we plan to approach for cold brew supply.
          </p>
        </div>

        {/* 2. REJECTED */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              Stage 2 – Pitched, Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2 font-mono">
            {metrics.rejected} <span className="text-xs font-normal text-zinc-400">cafés</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Cafés who said no, saved with reasons and notes for future follow-up.
          </p>
        </div>

        {/* 3. ACTIVE SUPPLY */}
        <div className="p-5 rounded-2xl bg-zinc-900/90 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Stage 3 – Active Supply
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
            {metrics.activeSupply} <span className="text-xs font-normal text-zinc-400">accounts</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Currently supplying cold brew. {metrics.conversionRate}% overall conversion rate.
          </p>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search café by name, area, contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-0.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setViewMode('BOARD')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'BOARD'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Stage Board
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                viewMode === 'LIST'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* BOARD VIEW (3 DISTINCT COLUMNS) */}
      {viewMode === 'BOARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* COLUMN 1: TO PITCH */}
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Stage 1 – To Pitch
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[11px] font-bold text-amber-400">
                {categorized.TO_PITCH.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {categorized.TO_PITCH.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  No cafés in To Pitch. Click &ldquo;Add Café&rdquo; above to start your prospecting list.
                </div>
              ) : (
                categorized.TO_PITCH.map((cafe) => {
                  const rates = parseCafeRates(cafe.notes);
                  return (
                    <div
                      key={cafe.id}
                      className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{cafe.name}</h4>
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-zinc-500" />
                            {cafe.area || cafe.city || 'Bengaluru'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditCafe(cafe)}
                            className="p-1 rounded-lg bg-zinc-900 hover:bg-amber-900/40 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Edit Café Details & Rates"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCafe(cafe.id)}
                            className="p-1 rounded-lg bg-zinc-900 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete Café"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {cafe.contactPerson && (
                        <div className="text-[11px] text-zinc-300">
                          Contact: <strong>{cafe.contactPerson}</strong>{' '}
                          {cafe.phone && <span className="text-zinc-500">({cafe.phone})</span>}
                        </div>
                      )}

                      {/* Agreed default rates */}
                      <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Agreed Rates:</span>
                        <div className="font-mono font-bold text-zinc-200">
                          180ml: <span className="text-amber-400">₹{rates.rate180ml}</span> • 1L:{' '}
                          <span className="text-amber-400">₹{rates.rate1L}</span>
                        </div>
                      </div>

                      {cafe.pitchNotes && (
                        <p className="text-[11px] text-zinc-400 italic bg-zinc-900/40 p-2 rounded-lg border border-zinc-800/60">
                          {cafe.pitchNotes}
                        </p>
                      )}

                      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openRejectDialog(cafe)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-[11px] transition-colors"
                        >
                          Mark Rejected
                        </button>

                        <button
                          onClick={() => handleMoveStatus(cafe.id, 'ACCEPTED')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <span>Convert to Active Supply</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: REJECTED */}
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Stage 2 – Pitched, Rejected
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[11px] font-bold text-rose-400">
                {categorized.REJECTED.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {categorized.REJECTED.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  No rejected cafés logged.
                </div>
              ) : (
                categorized.REJECTED.map((cafe) => (
                  <div
                    key={cafe.id}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 shadow-sm opacity-90 hover:opacity-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-200">{cafe.name}</h4>
                        <span className="text-[11px] text-zinc-400">
                          {cafe.area || cafe.city || 'Bengaluru'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditCafe(cafe)}
                          className="p-1 rounded-lg bg-zinc-900 hover:bg-amber-900/40 text-zinc-400 hover:text-amber-400 transition-colors"
                          title="Edit Café Details & Rates"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteCafe(cafe.id)}
                          className="p-1 rounded-lg bg-zinc-900 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                          title="Delete Café"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {cafe.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-950/20 border border-rose-800/40 text-[11px] text-rose-300">
                        <strong className="block text-[10px] uppercase tracking-wider text-rose-400">
                          Rejection Reason:
                        </strong>
                        {cafe.rejectionReason}
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleMoveStatus(cafe.id, 'TO_PITCH')}
                        className="px-2.5 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-approach</span>
                      </button>

                      <button
                        onClick={() => handleMoveStatus(cafe.id, 'ACCEPTED')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] transition-colors"
                      >
                        Maan Gaye (Activate)
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: ACTIVE SUPPLY */}
          <div className="p-4 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-200">
                  Stage 3 – Active Supply
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 font-mono text-[11px] font-bold text-emerald-400">
                {categorized.ACCEPTED.length}
              </span>
            </div>

            <div className="space-y-3 min-h-[220px]">
              {categorized.ACCEPTED.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                  No active supply cafés yet. Move pitched cafés here once agreed!
                </div>
              ) : (
                categorized.ACCEPTED.map((cafe) => {
                  const rates = parseCafeRates(cafe.notes);
                  return (
                    <div
                      key={cafe.id}
                      className="p-4 rounded-2xl bg-zinc-950/80 border border-emerald-500/30 hover:border-emerald-500/50 transition-all space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{cafe.name}</h4>
                          <span className="text-[11px] text-zinc-400">
                            {cafe.area || cafe.city || 'Bengaluru'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openEditCafe(cafe)}
                            className="p-1 rounded-lg bg-zinc-900 hover:bg-amber-900/40 text-zinc-400 hover:text-amber-400 transition-colors"
                            title="Edit Café Details & Rates"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCafe(cafe.id)}
                            className="p-1 rounded-lg bg-zinc-900 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                            title="Delete Café"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Active Supply
                          </span>
                        </div>
                      </div>

                      {/* Selling Rates */}
                      <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Agreed Rates:</span>
                        <div className="font-mono font-bold text-zinc-200">
                          180ml: <span className="text-emerald-400">₹{rates.rate180ml}</span> • 1L:{' '}
                          <span className="text-emerald-400">₹{rates.rate1L}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-zinc-900 flex items-center justify-between gap-2">
                        <Link
                          href="/sales"
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] flex items-center gap-1 transition-all"
                        >
                          <Coffee className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Deliver Cold Brew</span>
                        </Link>

                        <button
                          onClick={() => openRejectDialog(cafe)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 text-[11px]"
                          title="Move to Rejected"
                        >
                          Lost Supply
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-950/60">
                  <th className="py-3 px-4">Café Name</th>
                  <th className="py-3 px-4">Location / Area</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Current Stage</th>
                  <th className="py-3 px-4">Agreed Rates</th>
                  <th className="py-3 px-4">Notes / Feedback</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredCafes.map((cafe) => {
                  const stage = getNormalizedStage(cafe.status);
                  const rates = parseCafeRates(cafe.notes);

                  return (
                    <tr key={cafe.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-bold text-zinc-100">{cafe.name}</td>
                      <td className="py-3 px-4 text-zinc-300">{cafe.area || 'Bengaluru'}</td>
                      <td className="py-3 px-4 text-zinc-300 font-mono text-[11px]">
                        {cafe.contactPerson || '—'} {cafe.phone ? `(${cafe.phone})` : ''}
                      </td>
                      <td className="py-3 px-4">
                        {stage === 'TO_PITCH' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Stage 1: To Pitch
                          </span>
                        )}
                        {stage === 'REJECTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            Stage 2: Pitched, Rejected
                          </span>
                        )}
                        {stage === 'ACCEPTED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Stage 3: Active Supply
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-300">
                        180ml: ₹{rates.rate180ml} | 1L: ₹{rates.rate1L}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 italic text-[11px] max-w-xs truncate">
                        {stage === 'REJECTED' && cafe.rejectionReason
                          ? `Reason: ${cafe.rejectionReason}`
                          : cafe.pitchNotes || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {stage === 'TO_PITCH' && (
                          <button
                            onClick={() => handleMoveStatus(cafe.id, 'ACCEPTED')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 font-bold text-[11px]"
                          >
                            Activate →
                          </button>
                        )}
                        {stage === 'REJECTED' && (
                          <button
                            onClick={() => handleMoveStatus(cafe.id, 'TO_PITCH')}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-bold text-[11px]"
                          >
                            Re-pitch
                          </button>
                        )}
                        {stage === 'ACCEPTED' && (
                          <Link
                            href="/sales"
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-[11px]"
                          >
                            Deliver
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD CAFE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-100">Add Café to Pipeline</h3>
                <p className="text-xs text-zinc-400">
                  Target prospect or existing café client for Brew 1671.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCafeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Café Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Third Wave Coffee Roasters / Blue Tokai"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Area / Neighborhood</label>
                  <input
                    type="text"
                    placeholder="e.g. Indiranagar, Koramangala"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Initial Pipeline Stage</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value="TO_PITCH">Stage 1 – To Pitch</option>
                    <option value="ACCEPTED">Stage 3 – Active Supply</option>
                    <option value="REJECTED">Stage 2 – Pitched, Rejected</option>
                  </select>
                </div>
              </div>

              {/* AGREED DEFAULT SELLING RATES */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-amber-500/20 space-y-2">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Agreed Default Selling Rates (per Café)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      180ml Bottle Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formRate180ml}
                      onChange={(e) => setFormRate180ml(e.target.value)}
                      className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-medium mb-1">
                      1L Bottle Rate (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formRate1L}
                      onChange={(e) => setFormRate1L(e.target.value)}
                      className="w-full p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul (Manager)"
                    value={formContact}
                    onChange={(e) => setFormContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91..."
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Pitch Strategy &amp; Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dropped samples with manager, meeting set for next Tuesday."
                  value={formPitchNotes}
                  onChange={(e) => setFormPitchNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold"
                >
                  {formLoading ? 'Saving...' : 'Add Café to Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {isRejectModalOpen && cafeToReject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" />
                Record Rejection Reason
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              Café: <strong className="text-zinc-100">{cafeToReject.name}</strong>
            </p>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1 text-xs">
                Reason for decline:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Existing cold brew supplier locked in contract; pricing too high; prefers dark roast..."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: EDIT CAFÉ DETAILS */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-zinc-100">Edit Café Details</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
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
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
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
                  <label className="block text-zinc-400 font-semibold mb-1">Pipeline Stage / Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="TO_PITCH">Stage 1: To Pitch / In Discussion</option>
                    <option value="ACCEPTED">Stage 3: Accepted (Active Cold Brew Supply)</option>
                    <option value="CUSTOMER">Stage 3: Customer (Regular Orders)</option>
                    <option value="REJECTED">Stage 2: Rejected (Pitched, Did Not Proceed)</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Pitch Feedback &amp; Meeting Notes</label>
                  <textarea
                    rows={2}
                    value={editPitchNotes}
                    onChange={(e) => setEditPitchNotes(e.target.value)}
                    placeholder="Taste reaction, price objections, manager follow-up notes..."
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">General Notes</label>
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Delivery slot, roast preferences..."
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

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
                  {editLoading ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
