'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Coffee,
  Package,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { createProductionBatch } from '@/lib/actions/production';
import { usePartner } from '@/lib/auth/partner-client';

interface RawItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentQuantity: number;
  averageCost: number;
  isCoffeeBean?: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  unit: string;
  size: string;
  sellingPrice: number;
}

export function ProductionBatchForm({
  rawMaterials,
  products,
  suggestedBatchNumber,
}: {
  rawMaterials: RawItem[];
  products: ProductItem[];
  suggestedBatchNumber: string;
}) {
  const router = useRouter();
  const { partner } = usePartner();

  // Basic info
  const [batchNumber, setBatchNumber] = useState(suggestedBatchNumber);
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [batchType, setBatchType] = useState<
    'COMMERCIAL' | 'TESTING' | 'RD' | 'SAMPLE' | 'INTERNAL'
  >('COMMERCIAL');
  const [recipe, setRecipe] = useState('20hr cold immersion extraction at 4°C, 1:8 coffee-to-water ratio');
  const [notes, setNotes] = useState('');

  // Default initial ingredients setup based on prompt example:
  // Coffee Beans: 1.5kg, Water: 12L, Bottles: 50, Caps: 50, Labels: 50
  const findItemByCategory = (keyword: string) =>
    rawMaterials.find(
      (m) =>
        m.name.toLowerCase().includes(keyword) ||
        m.category.toLowerCase().includes(keyword)
    );

  const defaultCoffee = findItemByCategory('bean') || rawMaterials[0];
  const defaultWater = findItemByCategory('water') || rawMaterials[1];
  const defaultBottle = findItemByCategory('bottle') || rawMaterials[2];
  const defaultCap = findItemByCategory('cap') || rawMaterials[3];
  const defaultLabel = findItemByCategory('label') || rawMaterials[4];

  const initialRows = [
    { inventoryItemId: defaultCoffee?.id || '', quantity: '1.5', selectedUnit: 'kg' as 'kg' | 'g' },
    { inventoryItemId: defaultWater?.id || '', quantity: '12', selectedUnit: 'kg' as 'kg' | 'g' },
    { inventoryItemId: defaultBottle?.id || '', quantity: '50', selectedUnit: 'kg' as 'kg' | 'g' },
    { inventoryItemId: defaultCap?.id || '', quantity: '50', selectedUnit: 'kg' as 'kg' | 'g' },
    { inventoryItemId: defaultLabel?.id || '', quantity: '50', selectedUnit: 'kg' as 'kg' | 'g' },
  ].filter((r) => r.inventoryItemId);

  const [ingredients, setIngredients] = useState<
    Array<{ inventoryItemId: string; quantity: string; selectedUnit?: 'kg' | 'g' }>
  >(
    initialRows.length > 0
      ? initialRows
      : [{ inventoryItemId: rawMaterials[0]?.id || '', quantity: '1', selectedUnit: 'kg' }]
  );

  // Outputs
  const [expectedOutput, setExpectedOutput] = useState('50');
  const [actualOutput, setActualOutput] = useState('50');
  const [testingBottles, setTestingBottles] = useState('0');
  const [wasteBottles, setWasteBottles] = useState('0');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic calculations in real-time
  const calculations = useMemo(() => {
    let rawMaterialCost = 0;
    let packagingCost = 0;
    let stockShortages: string[] = [];

    for (const ing of ingredients) {
      const item = rawMaterials.find((m) => m.id === ing.inventoryItemId);
      const rawQty = parseFloat(ing.quantity) || 0;
      const isWeight = item?.unit === 'kg' || item?.isCoffeeBean;
      const qty = isWeight && ing.selectedUnit === 'g' ? rawQty / 1000 : rawQty;
      if (!item || qty <= 0) continue;

      const cost = qty * item.averageCost;
      const cat = (item.category || '').toLowerCase();
      if (
        cat.includes('packaging') ||
        cat.includes('bottle') ||
        cat.includes('cap') ||
        cat.includes('label')
      ) {
        packagingCost += cost;
      } else {
        rawMaterialCost += cost;
      }

      if (qty > item.currentQuantity) {
        stockShortages.push(
          `${item.name}: Required ${qty} ${item.unit}, but only ${item.currentQuantity} ${item.unit} available`
        );
      }
    }

    const totalCost = rawMaterialCost + packagingCost;
    const actual = parseFloat(actualOutput) || 0;
    const expected = parseFloat(expectedOutput) || 1;

    const unitCost = actual > 0 ? totalCost / actual : 0;
    const yieldPct = expected > 0 ? (actual / expected) * 100 : 100;

    const selectedProduct = products.find((p) => p.id === productId);
    let volumeLiters = actual * 0.18;
    if (selectedProduct?.size?.toLowerCase().includes('1l')) {
      volumeLiters = actual * 1.0;
    }
    const costPerLiter = volumeLiters > 0 ? totalCost / volumeLiters : 0;

    return {
      rawMaterialCost,
      packagingCost,
      totalCost,
      unitCost,
      costPerLiter,
      yieldPct,
      stockShortages,
    };
  }, [ingredients, actualOutput, expectedOutput, productId, products, rawMaterials]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { inventoryItemId: rawMaterials[0]?.id || '', quantity: '1' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: 'inventoryItemId' | 'quantity' | 'selectedUnit',
    value: string
  ) => {
    const updated = [...ingredients];
    if (field === 'selectedUnit') {
      const currentUnit = updated[index].selectedUnit || 'kg';
      const targetUnit = value as 'kg' | 'g';
      if (currentUnit !== targetUnit && updated[index].quantity) {
        const val = parseFloat(updated[index].quantity);
        if (!isNaN(val)) {
          updated[index].quantity =
            targetUnit === 'g'
              ? String(Math.round(val * 1000 * 100) / 100)
              : String(Math.round((val / 1000) * 1000) / 1000);
        }
      }
      updated[index].selectedUnit = targetUnit;
    } else {
      (updated[index] as any)[field] = value;
    }
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (calculations.stockShortages.length > 0) {
      setError(
        `Cannot confirm production: ${calculations.stockShortages.join('. ')}`
      );
      setLoading(false);
      return;
    }

    const exp = parseFloat(expectedOutput) || 0;
    const act = parseFloat(actualOutput) || 0;
    const test = parseFloat(testingBottles) || 0;
    const waste = parseFloat(wasteBottles) || 0;
    const comm = Math.max(0, act - test - waste);

    const parsedIngredients = ingredients.map((i) => {
      const rawQty = parseFloat(i.quantity) || 0;
      const finalQty = i.selectedUnit === 'g' ? rawQty / 1000 : rawQty;
      return {
        inventoryItemId: i.inventoryItemId,
        quantity: finalQty,
      };
    });

    const res = await createProductionBatch({
      batchNumber,
      productionDate,
      productId,
      batchType,
      recipe,
      notes,
      expectedOutput: exp,
      actualOutput: act,
      commercialBottles: comm,
      testingBottles: test,
      wasteBottles: waste,
      ingredients: parsedIngredients,
      partnerId: partner.id,
    });

    setLoading(false);

    if (res.success && res.data) {
      router.push(`/production/${batchNumber}`);
    } else {
      setError(res.error || 'Failed to create production batch.');
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

      {/* SECTION 1: BATCH BASIC INFORMATION */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          1. Batch Basic Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Batch Number</label>
            <input
              type="text"
              required
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Production Date</label>
            <input
              type="date"
              required
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Target Product</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.size})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Batch Type</label>
            <select
              value={batchType}
              onChange={(e) => setBatchType(e.target.value as any)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-semibold focus:outline-none focus:border-amber-500"
            >
              <option value="COMMERCIAL">Commercial (For Sale)</option>
              <option value="TESTING">Testing / R&D (Internal)</option>
              <option value="SAMPLE">Promotional Sample</option>
              <option value="INTERNAL">Internal Quality Benchmark</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Brew Recipe & Parameters</label>
            <input
              type="text"
              value={recipe}
              onChange={(e) => setRecipe(e.target.value)}
              placeholder="Extraction temperature, steep duration, grind setting..."
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Batch Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific observations or lot numbers..."
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: PRODUCTION INPUTS (Dynamic Raw Materials) */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-orange-400" />
              2. Raw Material Inputs (Ingredients & Packaging)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Add all coffee, water, bottles, caps, and labels to be consumed.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddIngredient}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Material Input
          </button>
        </div>

        <div className="space-y-2.5">
          {ingredients.map((ing, idx) => {
            const item = rawMaterials.find((m) => m.id === ing.inventoryItemId);
            const reqQty = parseFloat(ing.quantity) || 0;
            const isShort = item && reqQty > item.currentQuantity;

            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isShort
                    ? 'bg-rose-950/20 border-rose-800/80'
                    : 'bg-zinc-950/60 border-zinc-800'
                }`}
              >
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Item</label>
                    <select
                      value={ing.inventoryItemId}
                      onChange={(e) =>
                        handleIngredientChange(idx, 'inventoryItemId', e.target.value)
                      }
                      className="w-full p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
                    >
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-zinc-400 font-semibold">
                          Quantity ({item?.unit === 'kg' || item?.isCoffeeBean ? (ing.selectedUnit || 'kg') : (item?.unit || 'units')})
                        </span>
                        {(item?.unit === 'kg' || item?.isCoffeeBean) && (
                          <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleIngredientChange(idx, 'selectedUnit', 'kg')}
                              className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                                (ing.selectedUnit || 'kg') === 'kg'
                                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              kg
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIngredientChange(idx, 'selectedUnit', 'g')}
                              className={`px-1.5 py-0.5 rounded font-bold transition-all ${
                                ing.selectedUnit === 'g'
                                  ? 'bg-amber-500 text-zinc-950 shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                            >
                              g
                            </button>
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-mono ${
                          isShort ? 'text-rose-400 font-bold' : 'text-zinc-400'
                        }`}
                      >
                        In Stock: {item?.currentQuantity} {item?.unit}
                        {(item?.unit === 'kg' || item?.isCoffeeBean) && (
                          ` (${((item?.currentQuantity || 0) * 1000).toLocaleString()} g)`
                        )}
                      </span>
                    </div>
                    <input
                      type="number"
                      step={ing.selectedUnit === 'g' ? '1' : '0.01'}
                      required
                      value={ing.quantity}
                      onChange={(e) =>
                        handleIngredientChange(idx, 'quantity', e.target.value)
                      }
                      className={`w-full p-2 rounded-xl bg-zinc-900 border text-zinc-100 font-mono font-bold focus:outline-none ${
                        isShort ? 'border-rose-500' : 'border-zinc-800 focus:border-amber-500'
                      }`}
                    />
                    {ing.quantity && (item?.unit === 'kg' || item?.isCoffeeBean) && (
                      <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                        {ing.selectedUnit === 'g'
                          ? `= ${(parseFloat(ing.quantity) / 1000).toFixed(3)} kg`
                          : `= ${(parseFloat(ing.quantity) * 1000).toLocaleString()} g`}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-right">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">Est. Cost</span>
                      <span className="font-mono font-bold text-amber-400">
                        {formatCurrency(reqQty * (item?.averageCost || 0))}
                      </span>
                    </div>

                    {ingredients.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: PRODUCTION OUTPUT */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-400" />
          3. Production Output & Yield
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Expected Bottles</label>
            <input
              type="number"
              required
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Actual Output Bottles</label>
            <input
              type="number"
              required
              value={actualOutput}
              onChange={(e) => setActualOutput(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-emerald-400 font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Testing / QC Bottles</label>
            <input
              type="number"
              value={testingBottles}
              onChange={(e) => setTestingBottles(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-purple-400 font-mono font-bold focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 font-semibold mb-1">Production Waste Bottles</label>
            <input
              type="number"
              value={wasteBottles}
              onChange={(e) => setWasteBottles(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-rose-400 font-mono font-bold focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: REAL-TIME COSTING & CONFIRMATION BOX */}
      <div className="p-6 rounded-3xl bg-zinc-950 border border-amber-500/40 space-y-4 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-zinc-100">
              Live Production Cost & Yield Breakdown
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Yield: {calculations.yieldPct.toFixed(1)}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-400">Raw Material Cost</span>
            <div className="font-bold text-zinc-200 text-base mt-1">
              {formatCurrency(calculations.rawMaterialCost)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-400">Packaging Cost</span>
            <div className="font-bold text-zinc-200 text-base mt-1">
              {formatCurrency(calculations.packagingCost)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-400">Total Batch Cost</span>
            <div className="font-bold text-amber-400 text-base mt-1">
              {formatCurrency(calculations.totalCost)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] text-zinc-400">Cost Per Bottle</span>
            <div className="font-bold text-emerald-400 text-base mt-1">
              {formatCurrency(calculations.unitCost)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-zinc-400">Cost Per Liter</span>
            <div className="font-bold text-zinc-100 text-base mt-1">
              {formatCurrency(calculations.costPerLiter)}
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-zinc-800/80">
          <p className="text-xs text-zinc-400">
            Confirming this batch will atomically deduct raw materials, yield lot{' '}
            <span className="font-mono text-emerald-400 font-semibold">
              FG-{batchNumber.replace(/^CB-/, '')}
            </span>
            , and save audit history for{' '}
            <strong className="text-zinc-200">{partner.name}</strong>.
          </p>

          <button
            type="submit"
            disabled={loading || calculations.stockShortages.length > 0}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-sm shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              'Confirming Batch Transaction...'
            ) : (
              <>
                <span>Confirm & Create Production</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
