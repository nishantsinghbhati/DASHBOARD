'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  AlertCircle,
  Package,
  Layers,
  Store,
  Coffee,
  Sliders,
  Sparkles,
  Droplets,
  Calculator,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { recordSale } from '@/lib/actions/sales';
import { usePartner } from '@/lib/auth/partner-client';
import {
  BREW_PRICING,
  BREW_LIST,
  getBrewPricing,
  calculateBrewUnitPrice,
} from '@/lib/calculations/cafe-rates';

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

  // Basic Info
  const [cafeId, setCafeId] = useState(cafes[0]?.id || '');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);

  // Flavor / Brew selection
  const [flavor, setFlavor] = useState('Classic Cold Brew (100% Arabica)');
  const [customFlavor, setCustomFlavor] = useState('');
  const [isCustomFlavor, setIsCustomFlavor] = useState(false);

  // Format selection: '180ml' | '1L' | 'CUSTOM'
  const [servingFormat, setServingFormat] = useState<'180ml' | '1L' | 'CUSTOM'>('180ml');
  const [customVolume, setCustomVolume] = useState('500');
  const [customVolumeUnit, setCustomVolumeUnit] = useState<'ml' | 'L'>('ml');

  // Pricing & Quantity
  const [quantity, setQuantity] = useState('20');
  const [unitPrice, setUnitPrice] = useState('130');
  const [discount, setDiscount] = useState('0');

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'PENDING' | 'PARTIAL' | 'OVERDUE'>('PAID');
  const [amountPaid, setAmountPaid] = useState('2600');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Active pricing based on selected flavor
  const effectiveFlavor = isCustomFlavor ? customFlavor.trim() || 'Custom Cold Brew' : flavor;
  const activePricing = getBrewPricing(effectiveFlavor);

  // Calculate volume in ml for custom format
  const resolvedCustomMl =
    customVolumeUnit === 'L'
      ? (parseFloat(customVolume) || 0) * 1000
      : parseFloat(customVolume) || 0;

  // Auto-calculate unit price whenever format, flavor, or custom volume changes
  useEffect(() => {
    const calculated = calculateBrewUnitPrice(effectiveFlavor, servingFormat, resolvedCustomMl);
    setUnitPrice(String(calculated));

    const q = parseFloat(quantity) || 0;
    const sub = q * calculated;
    const disc = parseFloat(discount) || 0;
    const total = Math.max(0, sub - disc);

    if (paymentStatus === 'PAID') {
      setAmountPaid(String(total));
    }
  }, [servingFormat, effectiveFlavor, customVolume, customVolumeUnit]);

  // Handle format change
  const handleServingFormatChange = (format: '180ml' | '1L' | 'CUSTOM') => {
    setServingFormat(format);
    const calculated = calculateBrewUnitPrice(effectiveFlavor, format, resolvedCustomMl);
    setUnitPrice(String(calculated));
    const q = parseFloat(quantity) || 0;
    setAmountPaid(String(q * calculated));
  };

  const calculatedSubtotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);
  const calculatedTotal = Math.max(0, calculatedSubtotal - (parseFloat(discount) || 0));

  // Resolved bottle size string for database & audit trail
  const resolvedBottleSize =
    servingFormat === '180ml'
      ? '180ml'
      : servingFormat === '1L'
      ? '1L'
      : `${customVolume}${customVolumeUnit}`;

  // Total volume calculation (in Liters) for display
  const singleUnitMl =
    servingFormat === '180ml' ? 180 : servingFormat === '1L' ? 1000 : resolvedCustomMl;
  const totalVolumeLiters = ((parseFloat(quantity) || 0) * singleUnitMl) / 1000;

  const coreBrews = [
    {
      name: 'Classic Cold Brew (100% Arabica)',
      short: 'Classic (100% Arabica)',
      rate: '₹0.72/ml',
      price180: '₹130/btl',
      price1L: '₹720/1L',
    },
    {
      name: 'Floral Cold Brew',
      short: 'Floral Brew',
      rate: '₹0.86/ml',
      price180: '₹155/btl',
      price1L: '₹860/1L',
    },
    {
      name: 'Rum Infused Barrel Cold Brew',
      short: 'Rum Infused Barrel',
      rate: '₹1.03/ml',
      price180: '₹185/btl',
      price1L: '₹1,030/1L',
    },
    {
      name: 'Whiskey Infused Barrel Cold Brew',
      short: 'Whiskey Infused Barrel',
      rate: '₹1.03/ml',
      price180: '₹185/btl',
      price1L: '₹1,030/1L',
    },
  ];

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

    if (servingFormat === 'CUSTOM' && resolvedCustomMl <= 0) {
      setError('Please enter a valid custom volume in ml or Liters.');
      setLoading(false);
      return;
    }

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
      bottleSize: resolvedBottleSize,
      flavor: effectiveFlavor,
      paymentStatus,
      amountPaid: resolvedAmountPaid,
      paymentMethod,
      notes: notes
        ? `${notes} • Format: ${resolvedBottleSize} • Rate: ₹${activePricing.perMlRate}/ml`
        : `Format: ${resolvedBottleSize} • Rate: ₹${activePricing.perMlRate}/ml`,
      partnerId: partner.id,
      items: [
        {
          bottleSize: resolvedBottleSize,
          flavor: effectiveFlavor,
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
              <option value="">Direct Client / Walk-in Counter</option>
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

      {/* SECTION 2: COLD BREW VARIETY & PER-ML RATE SELECTION */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-500" />
            2. Cold Brew Selection &amp; Per-ML Pricing
          </h3>
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
            Active Rate: ₹{activePricing.perMlRate}/ml
          </span>
        </div>

        {/* 4 Core Brew Quick Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {coreBrews.map((b) => {
            const isSelected = !isCustomFlavor && flavor === b.name;
            return (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  setIsCustomFlavor(false);
                  setFlavor(b.name);
                }}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-zinc-100">{b.short}</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {b.rate}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">
                    180ml: <span className="text-zinc-200 font-semibold">{b.price180}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    1 Litre: <span className="text-zinc-200 font-semibold">{b.price1L}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Flavor Toggle */}
        <div className="text-xs pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-zinc-400 font-medium">Or select from other inventory beans / custom brew:</span>
            <button
              type="button"
              onClick={() => setIsCustomFlavor(!isCustomFlavor)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              {isCustomFlavor ? '← Select Standard Brew' : '+ Custom Bean Name'}
            </button>
          </div>

          {isCustomFlavor ? (
            <input
              type="text"
              required
              placeholder="e.g. Pineapple Ferment Cold Brew, Washed Delhi Arabica..."
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
              {coreBrews.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name} ({b.rate})
                </option>
              ))}
              {coffeeBeans.map((b) => (
                <option key={b.id} value={`${b.name} Cold Brew`}>
                  {b.name} Cold Brew
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* SECTION 3: BOTTLE FORMAT & CUSTOM VOLUME SELECTION */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-500" />
            3. Serving Format &amp; Volume Options
          </h3>
          <span className="text-[11px] text-zinc-400">
            Choose bottled format or customized ml/L volume
          </span>
        </div>

        {/* 3 Large Format Selection Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Format 1: 180ml Bottle */}
          <button
            type="button"
            onClick={() => handleServingFormatChange('180ml')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              servingFormat === '180ml'
                ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md ring-1 ring-amber-500'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm text-zinc-100">180 ml Bottle</span>
                <Coffee className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Single-Serve RTD Glass Bottle</p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500 font-mono">Bottled Price:</span>
              <span className="font-mono font-bold text-amber-400 text-sm">
                ₹{activePricing.price180ml} / btl
              </span>
            </div>
          </button>

          {/* Format 2: 1 Litre Bottle */}
          <button
            type="button"
            onClick={() => handleServingFormatChange('1L')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              servingFormat === '1L'
                ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm text-zinc-100">1 Litre (1L) Bottle</span>
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Café Bulk Pitcher Concentrate</p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500 font-mono">1000ml × ₹{activePricing.perMlRate}:</span>
              <span className="font-mono font-bold text-purple-400 text-sm">
                ₹{activePricing.price1L} / 1L
              </span>
            </div>
          </button>

          {/* Format 3: Custom Volume (ml / Liters) */}
          <button
            type="button"
            onClick={() => handleServingFormatChange('CUSTOM')}
            className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
              servingFormat === 'CUSTOM'
                ? 'bg-cyan-500/15 border-cyan-500 text-cyan-200 shadow-md ring-1 ring-cyan-500'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between w-full">
                <span className="font-bold text-sm text-zinc-100">Custom Volume</span>
                <Droplets className="w-5 h-5 text-cyan-400" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Custom ml or Liters Dispense</p>
            </div>
            <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-[10px] text-zinc-500 font-mono">Rate per ml:</span>
              <span className="font-mono font-bold text-cyan-400 text-sm">
                ₹{activePricing.perMlRate} / ml
              </span>
            </div>
          </button>
        </div>

        {/* CUSTOM VOLUME INTERACTIVE PANEL */}
        {servingFormat === 'CUSTOM' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-xs text-cyan-200 uppercase tracking-wider">
                Specify Custom Volume per Unit (Calculated at ₹{activePricing.perMlRate}/ml)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[11px] text-zinc-300 font-semibold mb-1">
                  Volume Amount
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={customVolume}
                    onChange={(e) => setCustomVolume(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
                    placeholder="e.g. 500"
                  />
                  <select
                    value={customVolumeUnit}
                    onChange={(e) => setCustomVolumeUnit(e.target.value as any)}
                    className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 font-bold text-sm focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ml">ml</option>
                    <option value="L">Liters (L)</option>
                  </select>
                </div>
              </div>

              {/* Live Formula Badge */}
              <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-cyan-500/30 text-xs">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                  Auto-Calculated Unit Price
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-xl font-black text-cyan-400">
                    ₹{unitPrice}
                  </span>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    ({resolvedCustomMl} ml × ₹{activePricing.perMlRate}/ml)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Volume Presets */}
            <div>
              <span className="text-[10px] text-zinc-400 block mb-1.5 font-medium">Quick Volume Presets:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '250 ml', val: '250', unit: 'ml' },
                  { label: '500 ml', val: '500', unit: 'ml' },
                  { label: '750 ml', val: '750', unit: 'ml' },
                  { label: '1,500 ml (1.5L)', val: '1500', unit: 'ml' },
                  { label: '2 Liters (2L)', val: '2', unit: 'L' },
                  { label: '5 Liters (5L)', val: '5', unit: 'L' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCustomVolume(preset.val);
                      setCustomVolumeUnit(preset.unit as any);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-cyan-900/40 border border-zinc-800 hover:border-cyan-700 text-zinc-300 hover:text-cyan-200 text-xs font-mono cursor-pointer transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quantity, Unit Price, Discount */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Quantity ({servingFormat === 'CUSTOM' ? 'Containers / Servings' : 'Bottles'})
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
              {[5, 10, 20, 50, 100].map((preset) => (
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-zinc-400 font-semibold">
                Agreed Rate / Unit (₹)
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                Auto-computed
              </span>
            </div>
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
            <span className="text-[10px] text-zinc-500 mt-1 block">
              You can override this if a special negotiated discount applies.
            </span>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">
              Flat Discount (₹)
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

      {/* SECTION 4: PAYMENT & SETTLEMENT */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4 text-xs">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          4. Payment Settlement &amp; Invoicing
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
              <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
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
            Delivery Notes / Invoice Reference
          </label>
          <input
            type="text"
            placeholder="e.g. Delivered 20 bottles to Indiranagar cafe counter, verified cold"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Dynamic Live Order Summary Card */}
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 text-xs font-semibold">Delivery Scope:</span>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 font-mono text-[11px] font-bold">
                ~{totalVolumeLiters.toFixed(2)} Liters total
              </span>
            </div>
            <div className="font-bold text-zinc-100 text-sm">
              {quantity}x {resolvedBottleSize} {effectiveFlavor}
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Rate applied: ₹{activePricing.perMlRate}/ml • Unit Price: ₹{unitPrice}
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <span className="text-zinc-400 text-[10px] block">Net Invoiced:</span>
              <strong className="text-xl font-black text-emerald-400 font-mono">
                {formatCurrency(calculatedTotal)}
              </strong>
            </div>
            {paymentStatus === 'PARTIAL' && (
              <div>
                <span className="text-zinc-400 text-[10px] block">Pending Balance:</span>
                <strong className="text-xl font-black text-rose-400 font-mono">
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
