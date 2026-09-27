'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, Layers } from 'lucide-react';
import { updateProductionBatch, deleteProductionBatch } from '@/lib/actions/production';
import { usePartner } from '@/lib/auth/partner-client';

interface BatchActionsProps {
  batch: {
    id: string;
    batchNumber: string;
    batchType: string;
    status: string;
    recipe: string | null;
    notes: string | null;
    actualOutput: number;
    wasteBottles: number;
    expectedOutput: number;
  };
}

export function BatchActionsClient({ batch }: BatchActionsProps) {
  const router = useRouter();
  const { partner } = usePartner();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [batchType, setBatchType] = useState(batch.batchType || 'COMMERCIAL');
  const [status, setStatus] = useState(batch.status || 'CONFIRMED');
  const [recipe, setRecipe] = useState(batch.recipe || '');
  const [notes, setNotes] = useState(batch.notes || '');
  const [actualOutput, setActualOutput] = useState(String(batch.actualOutput));
  const [wasteBottles, setWasteBottles] = useState(String(batch.wasteBottles));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const outputNum = parseFloat(actualOutput);
    const wasteNum = parseFloat(wasteBottles);

    if (isNaN(outputNum) || outputNum < 0) {
      setError('Please enter a valid actual output quantity.');
      setLoading(false);
      return;
    }

    const res = await updateProductionBatch({
      id: batch.id,
      batchType,
      status,
      recipe,
      notes,
      actualOutput: outputNum,
      wasteBottles: isNaN(wasteNum) ? 0 : wasteNum,
      partnerId: partner.id,
    });

    setLoading(false);
    if (res.success) {
      setIsEditOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to update batch.');
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete batch ${batch.batchNumber}? This will restore consumed coffee beans and packaging back into inventory.`
      )
    ) {
      return;
    }

    const res = await deleteProductionBatch(batch.id, partner.id);
    if (res.success) {
      router.push('/production');
    } else {
      alert(res.error || 'Failed to delete batch.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsEditOpen(true)}
        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Pencil className="w-3.5 h-3.5 text-amber-400" />
        <span>Edit Batch</span>
      </button>

      <button
        onClick={handleDelete}
        className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/40 text-zinc-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        title="Delete Batch & Restore Stock"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Delete</span>
      </button>

      {/* Edit Batch Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-zinc-100">
                  Edit Batch: {batch.batchNumber}
                </h3>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Batch Type</label>
                  <select
                    value={batchType}
                    onChange={(e) => setBatchType(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="COMMERCIAL">COMMERCIAL (Client Supply)</option>
                    <option value="TESTING">TESTING / SAMPLES</option>
                    <option value="RD">R&D / TRIAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="CONFIRMED">CONFIRMED (Bottled)</option>
                    <option value="COMPLETED">COMPLETED (Stored in Cold Room)</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Actual Output (Bottles)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={actualOutput}
                    onChange={(e) => setActualOutput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    Expected: {batch.expectedOutput} btls
                  </span>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Waste / Breakage (Bottles)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={wasteBottles}
                    onChange={(e) => setWasteBottles(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1">
                  Brew Recipe & Extraction Parameters
                </label>
                <input
                  type="text"
                  value={recipe}
                  onChange={(e) => setRecipe(e.target.value)}
                  placeholder="e.g. 1:8 brew ratio, 20h steep at 4°C, coarse grind"
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 font-semibold mb-1">
                  Batch Notes & Sensory Quality
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Taste notes, TDS reading, steep temperature..."
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40"
                >
                  {loading ? 'Saving...' : 'Save Batch Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
