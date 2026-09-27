'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  Store,
  ArrowRight,
  Coffee,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { recordSale } from '@/lib/actions/sales';
import { usePartner } from '@/lib/auth/partner-client';

interface ProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  unit: string;
  size: string;
  variant: string;
  finishedGoodsLots: Array<{
    id: string;
    lotNumber: string;
    quantityAvailable: number;
    unitCost: number;
    productionDate: Date | string;
  }>;
}

interface CafeItem {
  id: string;
  name: string;
  city: string | null;
  area: string | null;
}

interface BeanItem {
  id: string;
  name: string;
}

export function RecordSaleForm({
  products,
  cafes,
  coffeeBeans = [],
}: {
  products: ProductItem[];
  cafes: CafeItem[];
  coffeeBeans?: BeanItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  const [cafeId, setCafeId] = useState(cafes[0]?.id || '');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [bottleSize, setBottleSize] = useState<'180ml' | '1L'>('180ml');
  const [flavor, setFlavor] = useState('Classic Cold Brew (100% Arabica)');
  const [customFlavor, setCustomFlavor] = useState('');
  const [isCustomFlavor, setIsCustomFlavor] = useState(false);

  const [quantity, setQuantity] = useState('20');
  const [unitPrice, setUnitPrice] = useState('120');
  const [discount, setDiscount] = useState('0');

  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE'>('PAID');
  const [amountPaid, setAmountPaid] = useState('2400');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBottleSizeChange = (size: '180ml' | '1L') => {
    setBottleSize(size);
    const p = size === '180ml' ? 120 : 480;
    setUnitPrice(String(p));
    const q = parseFloat(quantity) || 0;
    setAmountPaid(String(q * p));
  };

  const calculatedSubtotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  const calculatedTotal = Math.max(0, calculatedSubtotal - (parseFloat(discount) || 0));

  const flavorList = [
    'Classic Cold Brew (100% Arabica)',
    'Floral Cold Brew (Chikmagalur Arabica)',
    'Single Origin Cerrado Cold Brew',
    'Oak Barrel Aged Cold Brew',
    'Vanilla Infused Cold Brew',
    ...coffeeBeans.map((b) => `${b.name.replace(/\(.*?\)/g, '').trim()} Cold Brew`),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const reqQty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const disc = parseFloat(discount) || 0;

    if (reqQty <= 0 || price < 0) {
      setError('Please provide a valid quantity and unit price.');
      setLoading(false);
      return;
    }

    const finalFlavor = isCustomFlavor ? customFlavor.trim() || 'Custom Cold Brew' : flavor;

    let resolvedAmountPaid = calculatedTotal;
    if (paymentStatus === 'PAID') {
      resolvedAmountPaid = calculatedTotal;
    } else if (paymentStatus === 'PARTIAL') {
      resolvedAmountPaid = parseFloat(amountPaid) || 0;
    } else {
      resolvedAmountPaid = 0;
    }

    const res = await recordSale({
      cafeId: cafeId || undefined,
      date: saleDate,
      bottleSize,
      flavor: finalFlavor,
      paymentStatus,
      amountPaid: resolvedAmountPaid,
      paymentMethod,
      notes,
      partnerId: partner.id,
      items: [
        {
          bottleSize,
          flavor: finalFlavor,
          quantity: reqQty,
          unitPrice: price,
          discount: disc,
        },
      ],
    });

    setLoading(false);

    if (res.success && res.data) {
      router.push('/sales');
    } else {
      setError(res.error || 'Failed to record sale.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-sm text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: CUSTOMER & DATE DETAILS */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Store className="w-4 h-4 text-purple-400" />
          1. Café Customer &amp; Delivery Date
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Target B2B Café</label>
            <select
              value={cafeId}
              onChange={(e) => setCafeId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="">Direct Client / Walk-in</option>
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.area || c.city || 'Bengaluru'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Sale &amp; Fulfillment Date</label>
            <input
              type="date"
              required
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: BOTTLE SIZE & COLD BREW FLAVOR */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-emerald-500" />
          2. Bottle Selection &amp; Cold Brew Profile
        </h3>

        {/* 180ml vs 1L Bottles */}
        <div>
          <label className="block text-xs text-zinc-400 font-semibold mb-2">
            Select Packaging / Bottle Size:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handleBottleSizeChange('180ml')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                bottleSize === '180ml'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-base text-zinc-100">180 ml Bottle</span>
                <Coffee className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Single-Serve RTD Amber Glass Bottle
              </p>
              <div className="mt-2 text-xs font-mono font-bold text-amber-400">
                Default: ₹120 / bottle
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleBottleSizeChange('1L')}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                bottleSize === '1L'
                  ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-base text-zinc-100">1 Litre (1L) Bottle</span>
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Café Bulk Pitcher Concentrate Base
              </p>
              <div className="mt-2 text-xs font-mono font-bold text-purple-400">
                Default: ₹480 / bottle
              </div>
            </button>
          </div>
        </div>

        {/* Cold Brew Flavor / Coffee Bean */}
        <div className="text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-semibold text-zinc-400">
              Cold Brew Flavor Profile (Mapped to Roasted Beans)
            </label>
            <button
              type="button"
              onClick={() => setIsCustomFlavor(!isCustomFlavor)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              {isCustomFlavor ? 'Select from Bean Catalog' : '+ Custom Bean Name'}
            </button>
          </div>

          {isCustomFlavor ? (
            <input
              type="text"
              required
              placeholder="e.g. 100% Arabica Classic, Floral Chikmagalur..."
              value={customFlavor}
              onChange={(e) => setCustomFlavor(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-emerald-500/50 text-zinc-100 font-semibold focus:outline-none"
            />
          ) : (
            <select
              value={flavor}
              onChange={(e) => setFlavor(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              {flavorList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quantity, Unit Price, Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Quantity (Bottles)
            </label>
            <input
              type="number"
              min="1"
              required
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                const q = parseFloat(e.target.value) || 0;
                const p = parseFloat(unitPrice) || 0;
                setAmountPaid(String(q * p));
              }}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
            <div className="flex items-center gap-1.5 mt-1.5">
              {[10, 20, 50, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setQuantity(String(preset));
                    const p = parseFloat(unitPrice) || 0;
                    setAmountPaid(String(preset * p));
                  }}
                  className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-mono cursor-pointer"
                >
                  +{preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Unit Price (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={unitPrice}
              onChange={(e) => {
                setUnitPrice(e.target.value);
                const p = parseFloat(e.target.value) || 0;
                const q = parseFloat(quantity) || 0;
                setAmountPaid(String(q * p));
              }}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Discount (₹)
            </label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: PAYMENT & SETTLEMENT */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4 text-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          3. Payment Settlement &amp; Invoicing
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => {
                const val = e.target.value as any;
                setPaymentStatus(val);
                if (val === 'PAID') {
                  setAmountPaid(String(calculatedTotal));
                } else if (val === 'PENDING') {
                  setAmountPaid('0');
                }
              }}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="PAID">Paid (Full Settlement Received)</option>
              <option value="PARTIAL">Partial Payment</option>
              <option value="PENDING">Pending Invoice (Unpaid Credit)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
            >
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
              <option value="Cash">Cash on Delivery</option>
              <option value="Cheque">Cheque</option>
            </select>
          </div>

          {paymentStatus === 'PARTIAL' && (
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">
                Amount Paid So Far (₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        <div>
          <label className="block text-zinc-400 font-semibold mb-1">
            Order Notes / Special Delivery Instructions
          </label>
          <input
            type="text"
            placeholder="e.g. Weekly batch delivery, chilled bottles delivered directly to counter"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-zinc-400">Order Summary:</span>
            <div className="font-bold text-zinc-100 text-sm">
              {quantity}x {bottleSize} {isCustomFlavor ? customFlavor : flavor}
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-zinc-400 text-[10px] block">Net Invoiced:</span>
              <strong className="text-lg font-black text-emerald-400 font-mono">
                {formatCurrency(calculatedTotal)}
              </strong>
            </div>
            {paymentStatus === 'PARTIAL' && (
              <div>
                <span className="text-zinc-400 text-[10px] block">Pending Receivable:</span>
                <strong className="text-lg font-black text-rose-400 font-mono">
                  {formatCurrency(Math.max(0, calculatedTotal - (parseFloat(amountPaid) || 0)))}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SUBMIT BUTTON */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => router.push('/sales')}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Recording Sale...' : 'Confirm & Record B2B Sale'}
        </button>
      </div>
    </form>
  );
}
