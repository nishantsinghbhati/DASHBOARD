'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Package,
  Gift,
  Trash2,
  Search,
  Filter,
  Layers,
  ArrowRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { issueSampleToCafe, recordFinishedGoodsWaste } from '@/lib/actions/sales';
import { createProduct } from '@/lib/actions/production';
import { usePartner } from '@/lib/auth/partner-client';
import { formatDate } from '@/lib/utils';

interface LotItem {
  id: string;
  lotNumber: string;
  product: { id: string; name: string; sku: string; unit: string; size: string };
  productionBatch: { id: string; batchNumber: string } | null;
  productionDate: Date | string;
  bestBeforeDate: Date | string | null;
  expiryDate: Date | string | null;
  quantityProduced: number;
  quantityAvailable: number;
  quantitySold: number;
  quantitySampled: number;
  quantityWasted: number;
  unitCost: number;
  status: string;
  storageLocation: string | null;
  notes: string | null;
}

interface CafeItem {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
}

export function FinishedGoodsClientView({
  lots,
  cafes,
}: {
  lots: LotItem[];
  cafes: CafeItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [sampleModalOpen, setSampleModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState('');

  // Sample form state
  const [sampleCafeId, setSampleCafeId] = useState(cafes[0]?.id || '');
  const [sampleQty, setSampleQty] = useState('');
  const [sampleNotes, setSampleNotes] = useState('');
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState('');

  // Waste form state
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Seal Failure / Leakage');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteError, setWasteError] = useState('');

  // Create Product Modal state
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Cold Brew');
  const [newProductVariant, setNewProductVariant] = useState('Classic Bold');
  const [newProductSize, setNewProductSize] = useState('250ml');
  const [newProductUnit, setNewProductUnit] = useState('bottles');
  const [newProductSellingPrice, setNewProductSellingPrice] = useState('');
  const [newProductCost, setNewProductCost] = useState('');
  const [newProductMinStock, setNewProductMinStock] = useState('20');
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductLoading(true);
    setProductError('');

    const price = parseFloat(newProductSellingPrice);
    if (isNaN(price) || price <= 0 || !newProductName.trim()) {
      setProductError('Please enter a valid product name and positive selling price.');
      setProductLoading(false);
      return;
    }

    const res = await createProduct({
      name: newProductName.trim(),
      category: newProductCategory,
      variant: newProductVariant,
      size: newProductSize,
      unit: newProductUnit,
      sellingPrice: price,
      standardCost: parseFloat(newProductCost) || undefined,
      minStock: parseInt(newProductMinStock, 10) || 0,
      partnerId: partner.id,
    });

    setProductLoading(false);
    if (res.success) {
      setCreateProductOpen(false);
      setNewProductName('');
      setNewProductSellingPrice('');
      setNewProductCost('');
      router.refresh();
    } else {
      setProductError(res.error || 'Failed to create product.');
    }
  };

  const products = Array.from(new Set(lots.map((l) => l.product.name)));

  const filteredLots = lots.filter((lot) => {
    const matchesSearch =
      lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lot.productionBatch?.batchNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProduct = productFilter === 'ALL' || lot.product.name === productFilter;
    const matchesStatus = statusFilter === 'ALL' || lot.status === statusFilter;

    return matchesSearch && matchesProduct && matchesStatus;
  });

  const handleOpenSample = (lotId: string) => {
    setSelectedLotId(lotId);
    setSampleQty('5'); // typical sample size
    setSampleCafeId(cafes[0]?.id || '');
    setSampleNotes('');
    setSampleError('');
    setSampleModalOpen(true);
  };

  const handleOpenWaste = (lotId: string) => {
    setSelectedLotId(lotId);
    setWasteQty('1');
    setWasteReason('Seal Failure / Leakage');
    setWasteNotes('');
    setWasteError('');
    setWasteModalOpen(true);
  };

  const handleSampleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSampleLoading(true);
    setSampleError('');

    const qty = parseFloat(sampleQty);
    if (isNaN(qty) || qty <= 0) {
      setSampleError('Please enter a valid sample quantity.');
      setSampleLoading(false);
      return;
    }

    const res = await issueSampleToCafe({
      cafeId: sampleCafeId,
      lotId: selectedLotId,
      quantity: qty,
      notes: sampleNotes,
      partnerId: partner.id,
    });

    setSampleLoading(false);
    if (res.success) {
      setSampleModalOpen(false);
      router.refresh();
    } else {
      setSampleError(res.error || 'Failed to issue sample.');
    }
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWasteLoading(true);
    setWasteError('');

    const qty = parseFloat(wasteQty);
    if (isNaN(qty) || qty <= 0) {
      setWasteError('Please enter a valid positive waste quantity.');
      setWasteLoading(false);
      return;
    }

    const res = await recordFinishedGoodsWaste({
      lotId: selectedLotId,
      quantity: qty,
      reason: wasteReason,
      notes: wasteNotes,
      partnerId: partner.id,
    });

    setWasteLoading(false);
    if (res.success) {
      setWasteModalOpen(false);
      router.refresh();
    } else {
      setWasteError(res.error || 'Failed to record waste.');
    }
  };

  const getExpiryBadge = (bestBefore: Date | string | null) => {
    if (!bestBefore) return null;
    const target = new Date(bestBefore);
    const now = new Date();
    const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3 h-3" /> Expired
        </span>
      );
    } else if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3" /> {diffDays}d left
        </span>
      );
    }
    return (
      <span className="text-[10px] text-zinc-400 font-mono">
        {formatDate(bestBefore)}
      </span>
    );
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
              placeholder="Search lot code (FG-), product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Products</option>
            {products.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="PARTIALLY_SOLD">Partially Sold</option>
            <option value="SOLD_OUT">Sold Out</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={() => setCreateProductOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + New Product
          </button>
          <Link
            href="/production/new"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Layers className="w-4 h-4" />
            + Brew New Batch
          </Link>
        </div>
      </div>

      {/* Finished Goods Lots Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-semibold">
              <th className="py-3 px-4">Lot & Batch Ref</th>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4 text-center">Dates & Expiry</th>
              <th className="py-3 px-4 text-right">Produced</th>
              <th className="py-3 px-4 text-right">Available</th>
              <th className="py-3 px-4 text-right">Sold</th>
              <th className="py-3 px-4 text-right">Samples</th>
              <th className="py-3 px-4 text-right">Waste</th>
              <th className="py-3 px-4 text-right">Unit Cost</th>
              <th className="py-3 px-4 text-right">Stock Val</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredLots.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-zinc-500">
                  No finished goods lots found.
                </td>
              </tr>
            ) : (
              filteredLots.map((lot) => {
                const stockVal = lot.quantityAvailable * lot.unitCost;
                return (
                  <tr
                    key={lot.id}
                    id={lot.lotNumber}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-100 font-mono">
                        {lot.lotNumber}
                      </div>
                      {lot.productionBatch && (
                        <Link
                          href={`/production/${lot.productionBatch.batchNumber}`}
                          className="text-[11px] font-mono text-amber-400 hover:underline block"
                        >
                          {lot.productionBatch.batchNumber}
                        </Link>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-200">
                        {lot.product.name}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {lot.product.size}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="text-[11px] text-zinc-300 font-mono">
                        {formatDate(lot.productionDate)}
                      </div>
                      <div className="mt-0.5">
                        {getExpiryBadge(lot.bestBeforeDate)}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-300">
                      {lot.quantityProduced}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {lot.quantityAvailable}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-sky-400">
                      {lot.quantitySold}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-pink-400">
                      {lot.quantitySampled}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-rose-400">
                      {lot.quantityWasted}
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-zinc-300">
                      {formatCurrency(lot.unitCost)}
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(stockVal)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                          lot.quantityAvailable > 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                        }`}
                      >
                        {lot.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {lot.quantityAvailable > 0 && (
                        <>
                          <button
                            onClick={() => handleOpenSample(lot.id)}
                            className="px-2 py-1 rounded-lg bg-pink-950/40 hover:bg-pink-900/50 text-pink-300 font-semibold border border-pink-800/50"
                            title="Issue complimentary sample to café"
                          >
                            Sample
                          </button>
                          <button
                            onClick={() => handleOpenWaste(lot.id)}
                            className="px-2 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 font-semibold border border-rose-800/50"
                            title="Log broken or expired bottle"
                          >
                            Waste
                          </button>
                        </>
                      )}
                      {lot.productionBatch && (
                        <Link
                          href={`/production/${lot.productionBatch.batchNumber}`}
                          className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 inline-block"
                        >
                          Trace
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SAMPLE MODAL */}
      {sampleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Gift className="w-4 h-4 text-pink-500" />
              Issue Complimentary Café Sample
            </h3>
            <p className="text-xs text-zinc-400">
              Samples are logged at ₹0 revenue. Actual batch production cost is recorded to measure acquisition spend.
            </p>

            {sampleError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {sampleError}
              </div>
            )}

            <form onSubmit={handleSampleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Target B2B Café</label>
                <select
                  value={sampleCafeId}
                  onChange={(e) => setSampleCafeId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-pink-500"
                >
                  {cafes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.area || c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Number of Bottles</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={sampleQty}
                  onChange={(e) => setSampleQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes / Feedback Goal</label>
                <input
                  type="text"
                  placeholder="e.g. Tasting session with head barista"
                  value={sampleNotes}
                  onChange={(e) => setSampleNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSampleModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sampleLoading}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold disabled:opacity-50"
                >
                  {sampleLoading ? 'Issuing...' : 'Confirm Sample'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINISHED GOODS WASTE MODAL */}
      {wasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Record Finished Goods Waste
            </h3>

            {wasteError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {wasteError}
              </div>
            )}

            <form onSubmit={handleWasteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Quantity (bottles)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Reason</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="Seal Failure / Leakage">Seal Failure / Leakage</option>
                  <option value="Glass Breakage">Glass Breakage during Delivery/Storage</option>
                  <option value="Past Expiry Date">Past Expiry Date</option>
                  <option value="Off-Flavor QC Reject">Off-Flavor QC Reject</option>
                  <option value="Label Defect">Severe Label / Packaging Defect</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional context"
                  value={wasteNotes}
                  onChange={(e) => setWasteNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setWasteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wasteLoading}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold disabled:opacity-50"
                >
                  {wasteLoading ? 'Deducting...' : 'Log Waste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW PRODUCT MODAL */}
      {createProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-500" />
                Add New Finished Product to Catalog
              </h3>
              <button
                onClick={() => setCreateProductOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {productError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {productError}
              </div>
            )}

            <form onSubmit={handleCreateProductSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Cold Brew 250ml or Nitro Vanilla Cold Brew"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={newProductCategory}
                    onChange={(e) => setNewProductCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cold Brew">Cold Brew</option>
                    <option value="Nitro Cold Brew">Nitro Cold Brew</option>
                    <option value="Cold Brew Concentrate">Cold Brew Concentrate</option>
                    <option value="Flavored Cold Brew">Flavored Cold Brew</option>
                    <option value="Merchandise">Merchandise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Variant / Blend</label>
                  <input
                    type="text"
                    placeholder="e.g. Classic Bold, Vanilla, Ethiopian"
                    value={newProductVariant}
                    onChange={(e) => setNewProductVariant(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Size / Volume</label>
                  <input
                    type="text"
                    placeholder="e.g. 250ml, 500ml, 1L"
                    value={newProductSize}
                    onChange={(e) => setNewProductSize(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Unit of Measure</label>
                  <select
                    value={newProductUnit}
                    onChange={(e) => setNewProductUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="bottles">bottles</option>
                    <option value="cans">cans</option>
                    <option value="pouches">pouches</option>
                    <option value="kegs">kegs</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">B2B Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 150"
                    value={newProductSellingPrice}
                    onChange={(e) => setNewProductSellingPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Standard Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 48.50"
                    value={newProductCost}
                    onChange={(e) => setNewProductCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Min. Stock Alert</label>
                  <input
                    type="number"
                    value={newProductMinStock}
                    onChange={(e) => setNewProductMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateProductOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50"
                >
                  {productLoading ? 'Saving...' : 'Add Product to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
