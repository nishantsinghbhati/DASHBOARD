'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Coffee,
  Plus,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  Sparkles,
  Pencil,
  History,
  TrendingDown,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatQuantity } from '@/lib/calculations/inventory';
import {
  purchaseRawMaterial,
  recordRawMaterialWaste,
  recordRawMaterialUsage,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateInventoryTransaction,
  deleteInventoryTransaction,
} from '@/lib/actions/inventory';
import { formatDate } from '@/lib/utils';
import { usePartner } from '@/lib/auth/partner-client';

export interface RawItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  currentQuantity: number;
  minStock: number;
  averageCost: number;
  currentStockValue: number;
  storageLocation: string | null;
  supplier: { id: string; name: string } | null;
  isCoffeeBean: boolean;
  coffeeBeanDetails: any | null;
}

export interface InventoryTransactionItem {
  id: string;
  inventoryItemId: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
  };
  type: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reference: string | null;
  notes: string | null;
  date: Date | string;
}

export function RawMaterialClientView({
  items,
  suppliers,
  transactions = [],
}: {
  items: RawItem[];
  suppliers: Array<{ id: string; name: string }>;
  transactions?: InventoryTransactionItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState('ALL');

  // Ledger Filter
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  // Modals state
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTxModalOpen, setEditTxModalOpen] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Purchase form state
  const [purchaseQty, setPurchaseQty] = useState<string>('');
  const [purchaseCost, setPurchaseCost] = useState<string>('');
  const [purchaseRef, setPurchaseRef] = useState<string>('');
  const [purchaseSupplier, setPurchaseSupplier] = useState<string>('');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  // Usage form state
  const [usageQty, setUsageQty] = useState<string>('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [usageRef, setUsageRef] = useState<string>('');
  const [usageNotes, setUsageNotes] = useState<string>('');
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  // Waste form state
  const [wasteQty, setWasteQty] = useState<string>('');
  const [wasteReason, setWasteReason] = useState('Damaged in Handling');
  const [wasteNotes, setWasteNotes] = useState<string>('');
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().split('T')[0]);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteError, setWasteError] = useState('');

  // Create material form state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Packaging');
  const [newUnit, setNewUnit] = useState('units');
  const [newMinStock, setNewMinStock] = useState('20');
  const [newAvgCost, setNewAvgCost] = useState('');
  const [newStorage, setNewStorage] = useState('Warehouse 4B');
  const [newSupplier, setNewSupplier] = useState(suppliers[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit material form state
  const [editItemId, setEditItemId] = useState('');
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Packaging');
  const [editUnit, setEditUnit] = useState('units');
  const [editMinStock, setEditMinStock] = useState('20');
  const [editAvgCost, setEditAvgCost] = useState('');
  const [editStorage, setEditStorage] = useState('Warehouse 4B');
  const [editSupplier, setEditSupplier] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Edit Transaction Form State
  const [editTxId, setEditTxId] = useState('');
  const [editTxItemName, setEditTxItemName] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxType, setEditTxType] = useState('PURCHASE');
  const [editTxQty, setEditTxQty] = useState('');
  const [editTxUnitCost, setEditTxUnitCost] = useState('');
  const [editTxRef, setEditTxRef] = useState('');
  const [editTxNotes, setEditTxNotes] = useState('');
  const [editTxLoading, setEditTxLoading] = useState(false);
  const [editTxError, setEditTxError] = useState('');

  // Unit selection state for weight (kg vs g) & volume (L vs ml)
  const [purchaseUnit, setPurchaseUnit] = useState<string>('units');
  const [usageUnit, setUsageUnit] = useState<string>('units');
  const [wasteUnit, setWasteUnit] = useState<string>('units');
  const [editTxUnit, setEditTxUnit] = useState<string>('units');
  const [editTxBaseUnit, setEditTxBaseUnit] = useState<string>('units');

  const isWeight = (u?: string) => u === 'kg' || u === 'g';
  const isVolume = (u?: string) => u === 'L' || u === 'ml';

  const convertUnitVal = (valStr: string, fromU: string, toU: string): string => {
    const val = parseFloat(valStr);
    if (isNaN(val)) return valStr;
    if (fromU === 'kg' && toU === 'g') return String(Math.round(val * 1000 * 100) / 100);
    if (fromU === 'g' && toU === 'kg') return String(Math.round((val / 1000) * 1000) / 1000);
    if (fromU === 'L' && toU === 'ml') return String(Math.round(val * 1000 * 100) / 100);
    if (fromU === 'ml' && toU === 'L') return String(Math.round((val / 1000) * 1000) / 1000);
    return valStr;
  };

  const togglePurchaseUnit = (targetUnit: string) => {
    if (targetUnit === purchaseUnit) return;
    if (purchaseQty) setPurchaseQty(convertUnitVal(purchaseQty, purchaseUnit, targetUnit));
    setPurchaseUnit(targetUnit);
  };

  const toggleUsageUnit = (targetUnit: string) => {
    if (targetUnit === usageUnit) return;
    if (usageQty) setUsageQty(convertUnitVal(usageQty, usageUnit, targetUnit));
    setUsageUnit(targetUnit);
  };

  const toggleWasteUnit = (targetUnit: string) => {
    if (targetUnit === wasteUnit) return;
    if (wasteQty) setWasteQty(convertUnitVal(wasteQty, wasteUnit, targetUnit));
    setWasteUnit(targetUnit);
  };

  const toggleEditTxUnit = (targetUnit: string) => {
    if (targetUnit === editTxUnit) return;
    if (editTxQty) setEditTxQty(convertUnitVal(editTxQty, editTxUnit, targetUnit));
    setEditTxUnit(targetUnit);
  };

  // Delete material states
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteTxConfirmId, setDeleteTxConfirmId] = useState<string | null>(null);
  const [deleteTxLoading, setDeleteTxLoading] = useState(false);

  // Unique categories
  const categories = Array.from(new Set(items.map((i) => i.category)));

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    let matchesHealth = true;
    if (healthFilter === 'HEALTHY') {
      matchesHealth = item.currentQuantity > item.minStock;
    } else if (healthFilter === 'LOW') {
      matchesHealth = item.currentQuantity <= item.minStock && item.currentQuantity > 0;
    } else if (healthFilter === 'OUT') {
      matchesHealth = item.currentQuantity <= 0;
    }

    return matchesSearch && matchesCategory && matchesHealth;
  });

  // Filtered ledger transactions
  const filteredTransactions = transactions.filter((t) => {
    if (txTypeFilter === 'ALL') return true;
    return t.type === txTypeFilter;
  });

  const handleOpenPurchase = (itemId?: string) => {
    const target = itemId || items[0]?.id || '';
    setSelectedItemId(target);
    const item = items.find((i) => i.id === target);
    setPurchaseCost(item ? String(item.averageCost) : '');
    setPurchaseQty('');
    setPurchaseUnit(item?.unit || 'units');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseRef(`PO-${Date.now().toString().slice(-4)}`);
    setPurchaseSupplier(item?.supplier?.id || suppliers[0]?.id || '');
    setPurchaseNotes('');
    setPurchaseError('');
    setPurchaseModalOpen(true);
  };

  const handleOpenUsage = (itemId?: string) => {
    const target = itemId || items[0]?.id || '';
    setSelectedItemId(target);
    const item = items.find((i) => i.id === target);
    setUsageQty('');
    setUsageUnit(item?.unit || 'units');
    setUsageDate(new Date().toISOString().split('T')[0]);
    setUsageRef(`USE-PKG-${Date.now().toString().slice(-4)}`);
    setUsageNotes('');
    setUsageError('');
    setUsageModalOpen(true);
  };

  const handleOpenWaste = (itemId: string) => {
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    setWasteQty('');
    setWasteUnit(item?.unit || 'units');
    setWasteDate(new Date().toISOString().split('T')[0]);
    setWasteReason('Damaged in Handling');
    setWasteNotes('');
    setWasteError('');
    setWasteModalOpen(true);
  };

  const handleOpenEdit = (item: RawItem) => {
    setEditItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinStock(String(item.minStock));
    setEditAvgCost(String(item.averageCost));
    setEditStorage(item.storageLocation || 'Warehouse 4B');
    setEditSupplier(item.supplier?.id || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleOpenEditTx = (tx: InventoryTransactionItem) => {
    setEditTxId(tx.id);
    setEditTxItemName(tx.inventoryItem?.name || 'Raw Material');
    const rawDate = typeof tx.date === 'string' ? tx.date : tx.date.toISOString();
    setEditTxDate(rawDate.split('T')[0]);
    setEditTxType(tx.type);
    const item = items.find((i) => i.id === tx.inventoryItemId);
    const baseU = item?.unit || tx.unit || 'units';
    setEditTxBaseUnit(baseU);
    setEditTxUnit(baseU);
    setEditTxQty(String(Math.abs(tx.quantity)));
    setEditTxUnitCost(String(tx.unitCost));
    setEditTxRef(tx.reference || '');
    setEditTxNotes(tx.notes || '');
    setEditTxError('');
    setEditTxModalOpen(true);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseLoading(true);
    setPurchaseError('');

    const qty = parseFloat(purchaseQty);
    const cost = parseFloat(purchaseCost);

    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      setPurchaseError(`Please enter valid positive quantity in ${purchaseUnit} and unit cost.`);
      setPurchaseLoading(false);
      return;
    }

    if (!selectedItemId) {
      setPurchaseError('Please select a material from the catalog.');
      setPurchaseLoading(false);
      return;
    }

    const item = items.find((i) => i.id === selectedItemId);
    const baseUnit = item?.unit || 'units';
    let qtyInBase = qty;
    if (baseUnit === 'kg' && purchaseUnit === 'g') qtyInBase = qty / 1000;
    if (baseUnit === 'g' && purchaseUnit === 'kg') qtyInBase = qty * 1000;
    if (baseUnit === 'L' && purchaseUnit === 'ml') qtyInBase = qty / 1000;
    if (baseUnit === 'ml' && purchaseUnit === 'L') qtyInBase = qty * 1000;

    const res = await purchaseRawMaterial({
      inventoryItemId: selectedItemId,
      quantity: qtyInBase,
      unitCost: cost,
      supplierId: purchaseSupplier || undefined,
      reference: purchaseRef,
      partnerId: partner.id,
      notes: purchaseNotes || `Restocked ${qty} ${purchaseUnit}`,
      date: purchaseDate,
    });

    setPurchaseLoading(false);
    if (res.success) {
      setPurchaseModalOpen(false);
      router.refresh();
    } else {
      setPurchaseError(res.error || 'Failed to record purchase.');
    }
  };

  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsageLoading(true);
    setUsageError('');

    const qty = parseFloat(usageQty);
    if (isNaN(qty) || qty <= 0) {
      setUsageError(`Please enter a valid positive quantity in ${usageUnit}.`);
      setUsageLoading(false);
      return;
    }

    const currentItem = items.find((i) => i.id === selectedItemId);
    const baseUnit = currentItem?.unit || 'units';
    let qtyInBase = qty;
    if (baseUnit === 'kg' && usageUnit === 'g') qtyInBase = qty / 1000;
    if (baseUnit === 'g' && usageUnit === 'kg') qtyInBase = qty * 1000;
    if (baseUnit === 'L' && usageUnit === 'ml') qtyInBase = qty / 1000;
    if (baseUnit === 'ml' && usageUnit === 'L') qtyInBase = qty * 1000;

    if (currentItem && qtyInBase > currentItem.currentQuantity) {
      setUsageError(
        `Cannot log usage of ${usageQty} ${usageUnit}. Available stock is only ${currentItem.currentQuantity} ${baseUnit}.`
      );
      setUsageLoading(false);
      return;
    }

    const res = await recordRawMaterialUsage({
      inventoryItemId: selectedItemId,
      quantity: qtyInBase,
      date: usageDate,
      reference: usageRef || undefined,
      partnerId: partner.id,
      notes: usageNotes || `Material usage (${usageQty} ${usageUnit})`,
      type: 'PRODUCTION_CONSUMPTION',
    });

    setUsageLoading(false);
    if (res.success) {
      setUsageModalOpen(false);
      router.refresh();
    } else {
      setUsageError(res.error || 'Failed to record material usage.');
    }
  };

  const handleWasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWasteLoading(true);
    setWasteError('');

    const qty = parseFloat(wasteQty);
    if (isNaN(qty) || qty <= 0) {
      setWasteError(`Please enter a valid positive quantity in ${wasteUnit}.`);
      setWasteLoading(false);
      return;
    }

    const currentItem = items.find((i) => i.id === selectedItemId);
    const baseUnit = currentItem?.unit || 'units';
    let qtyInBase = qty;
    if (baseUnit === 'kg' && wasteUnit === 'g') qtyInBase = qty / 1000;
    if (baseUnit === 'g' && wasteUnit === 'kg') qtyInBase = qty * 1000;
    if (baseUnit === 'L' && wasteUnit === 'ml') qtyInBase = qty / 1000;
    if (baseUnit === 'ml' && wasteUnit === 'L') qtyInBase = qty * 1000;

    if (currentItem && qtyInBase > currentItem.currentQuantity) {
      setWasteError(
        `Cannot waste more than available stock (${currentItem.currentQuantity} ${baseUnit}).`
      );
      setWasteLoading(false);
      return;
    }

    const res = await recordRawMaterialWaste({
      inventoryItemId: selectedItemId,
      quantity: qtyInBase,
      reason: wasteReason,
      partnerId: partner.id,
      notes: wasteNotes ? `${wasteNotes} (${wasteQty} ${wasteUnit})` : `Waste: ${wasteQty} ${wasteUnit}`,
    });

    setWasteLoading(false);
    if (res.success) {
      setWasteModalOpen(false);
      router.refresh();
    } else {
      setWasteError(res.error || 'Failed to record waste.');
    }
  };

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Material name is required.');
      setCreateLoading(false);
      return;
    }

    const res = await createInventoryItem({
      name: newName.trim(),
      category: newCategory,
      unit: newUnit,
      minStock: parseFloat(newMinStock) || 0,
      averageCost: parseFloat(newAvgCost) || 0,
      supplierId: newSupplier || undefined,
      storageLocation: newStorage,
      isCoffeeBean: false,
      notes: newNotes,
      partnerId: partner.id,
    });

    setCreateLoading(false);
    if (res.success) {
      setCreateModalOpen(false);
      setNewName('');
      router.refresh();
    } else {
      setCreateError(res.error || 'Failed to create material.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    if (!editName.trim()) {
      setEditError('Material name is required.');
      setEditLoading(false);
      return;
    }

    const res = await updateInventoryItem({
      id: editItemId,
      name: editName.trim(),
      category: editCategory,
      unit: editUnit,
      minStock: parseFloat(editMinStock) || 0,
      averageCost: parseFloat(editAvgCost) || 0,
      storageLocation: editStorage,
      supplierId: editSupplier || undefined,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success) {
      setEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update material.');
    }
  };

  const handleEditTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditTxLoading(true);
    setEditTxError('');

    let parsedQty = parseFloat(editTxQty);
    const parsedCost = parseFloat(editTxUnitCost);

    if (isNaN(parsedQty) || parsedQty <= 0 || isNaN(parsedCost) || parsedCost < 0) {
      setEditTxError(`Please enter a valid positive quantity in ${editTxUnit} and unit cost.`);
      setEditTxLoading(false);
      return;
    }

    if (editTxBaseUnit === 'kg' && editTxUnit === 'g') parsedQty = parsedQty / 1000;
    if (editTxBaseUnit === 'g' && editTxUnit === 'kg') parsedQty = parsedQty * 1000;
    if (editTxBaseUnit === 'L' && editTxUnit === 'ml') parsedQty = parsedQty / 1000;
    if (editTxBaseUnit === 'ml' && editTxUnit === 'L') parsedQty = parsedQty * 1000;

    const isOut =
      editTxType === 'PRODUCTION_CONSUMPTION' ||
      editTxType === 'WASTE' ||
      editTxType === 'DAMAGE';
    const signedQuantity = isOut ? -Math.abs(parsedQty) : Math.abs(parsedQty);

    const res = await updateInventoryTransaction({
      id: editTxId,
      date: editTxDate,
      type: editTxType,
      quantity: signedQuantity,
      unitCost: parsedCost,
      reference: editTxRef,
      notes: editTxNotes,
      partnerId: partner.id,
    });

    setEditTxLoading(false);
    if (res.success) {
      setEditTxModalOpen(false);
      router.refresh();
    } else {
      setEditTxError(res.error || 'Failed to update entry.');
    }
  };

  const handleDeleteSubmit = async (id: string) => {
    setDeleteLoading(true);
    const res = await deleteInventoryItem(id, partner.id);
    setDeleteLoading(false);
    setDeleteConfirmId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete material.');
    }
  };

  const handleDeleteTxSubmit = async (id: string) => {
    setDeleteTxLoading(true);
    const res = await deleteInventoryTransaction(id, partner.id);
    setDeleteTxLoading(false);
    setDeleteTxConfirmId(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete entry.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Controls Bar: Search + Category + Health Filter + Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Categories ({items.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Health Filter */}
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Health Levels</option>
            <option value="HEALTHY">Healthy Stock</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          <Link
            href="/inventory/coffee-beans"
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold flex items-center gap-1.5 transition-all border border-amber-500/25"
            title="Switch to Coffee Beans stock"
          >
            <Coffee className="w-3.5 h-3.5" />
            Coffee Beans Stock
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + New Material
          </button>
          <button
            onClick={() => handleOpenUsage()}
            className="px-3.5 py-2 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 border border-orange-800/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            title="Record bottles, caps, or materials consumed"
          >
            <TrendingDown className="w-4 h-4" />
            + Log Material Usage
          </button>
          <button
            onClick={() => handleOpenPurchase()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            + Purchase Material
          </button>
        </div>
      </div>

      {/* Raw Materials Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-semibold">
              <th className="py-3 px-4">SKU &amp; Item Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4 text-right">In Stock</th>
              <th className="py-3 px-4 text-right">Avg Cost</th>
              <th className="py-3 px-4 text-right">Stock Value</th>
              <th className="py-3 px-4 text-center">Health Status</th>
              <th className="py-3 px-4">Storage &amp; Supplier</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No raw materials found matching your filters.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isOut = item.currentQuantity <= 0;
                const isLow = !isOut && item.currentQuantity <= item.minStock;

                return (
                  <tr
                    key={item.id}
                    id={item.sku}
                    className="hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-200">{item.name}</div>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {item.sku}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium text-[11px]">
                        {item.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          isOut
                            ? 'text-rose-400'
                            : isLow
                            ? 'text-orange-400'
                            : 'text-emerald-400'
                        }
                      >
                        {formatQuantity(item.currentQuantity, item.unit)}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-normal">
                        Min: {item.minStock} {item.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-zinc-200">
                      {formatCurrency(item.averageCost)}
                      <span className="text-[10px] text-zinc-500 block">
                        /{item.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {formatCurrency(item.currentStockValue)}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          <AlertTriangle className="w-3 h-3" /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Healthy
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      <div>{item.storageLocation || 'Warehouse 4B'}</div>
                      <span className="text-zinc-500">
                        {item.supplier?.name || 'Local Supplier'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenPurchase(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700"
                        title="Restock this item"
                      >
                        + Restock
                      </button>
                      <button
                        onClick={() => handleOpenUsage(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 text-xs font-semibold border border-orange-800/50"
                        title="Log material usage"
                      >
                        Usage
                      </button>
                      <button
                        onClick={() => handleOpenWaste(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-800/50"
                        title="Record damaged or spilled material"
                      >
                        Waste
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-400 text-zinc-400 text-xs transition-colors inline-flex items-center"
                        title="Edit material details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 text-xs transition-colors inline-flex items-center"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* EDITABLE PACKAGING & MATERIAL TRANSACTION LEDGER */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Packaging &amp; Material Movement Ledger
              </h3>
              <p className="text-[11px] text-zinc-400">
                Every purchase and usage entry is fully editable with date, quantity, cost, and reference
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Movements ({transactions.length})</option>
              <option value="PURCHASE">Purchases Only</option>
              <option value="PRODUCTION_CONSUMPTION">Usages / Bottling Only</option>
              <option value="WASTE">Loss / Waste Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Material</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Quantity Change</th>
                <th className="py-2.5 px-3 text-right">Unit Cost</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3">Reference / Batch</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-500">
                    No material transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-zinc-400 font-mono">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-200">
                      {tx.inventoryItem?.name || 'Material'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          tx.type === 'PURCHASE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : tx.type === 'PRODUCTION_CONSUMPTION'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {tx.type === 'PRODUCTION_CONSUMPTION'
                          ? 'USAGE'
                          : tx.type}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        tx.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                      {formatCurrency(tx.unitCost)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-100">
                      {formatCurrency(tx.totalCost)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400 text-[11px]">
                      {tx.reference || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400 text-[11px] max-w-xs truncate">
                      {tx.notes || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditTx(tx)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-400 text-zinc-400 transition-colors inline-flex items-center"
                        title="Edit entry details &amp; date"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTxConfirmId(tx.id)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 transition-colors inline-flex items-center"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PURCHASE MODAL */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-500" />
                Purchase Raw Material
              </h3>
              <button
                onClick={() => setPurchaseModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {purchaseError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {purchaseError}
              </div>
            )}

            <form onSubmit={handlePurchaseSubmit} className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-400">Select Raw Material *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseModalOpen(false);
                      setCreateModalOpen(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold"
                  >
                    + Define New Material
                  </button>
                </div>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const item = items.find((i) => i.id === e.target.value);
                    if (item) {
                      setPurchaseCost(String(item.averageCost));
                      setPurchaseUnit(item.unit);
                    }
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
                >
                  {items.length === 0 ? (
                    <option value="" disabled className="bg-zinc-900 text-zinc-400">
                      -- No materials in catalog (Click &quot;+ Define New Material&quot; above) --
                    </option>
                  ) : (
                    <>
                      <option value="" disabled className="bg-zinc-900 text-zinc-400">
                        -- Select Raw Material ({items.length} items in catalog) --
                      </option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id} className="bg-zinc-900 text-zinc-100 py-1.5">
                          {i.name} ({i.unit}) — In Stock: {i.currentQuantity} {i.unit}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 font-semibold">
                      Quantity ({purchaseUnit}) *
                    </label>
                    {isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => togglePurchaseUnit('kg')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            purchaseUnit === 'kg'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          kg
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePurchaseUnit('g')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            purchaseUnit === 'g'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          g
                        </button>
                      </div>
                    )}
                    {isVolume(items.find((i) => i.id === selectedItemId)?.unit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => togglePurchaseUnit('L')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            purchaseUnit === 'L'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePurchaseUnit('ml')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            purchaseUnit === 'ml'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          ml
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    step={purchaseUnit === 'g' || purchaseUnit === 'ml' ? '1' : '0.01'}
                    required
                    placeholder="e.g. 10"
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  {purchaseQty && isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                      {purchaseUnit === 'g'
                        ? `= ${(parseFloat(purchaseQty) / 1000).toFixed(3)} kg`
                        : `= ${(parseFloat(purchaseQty) * 1000).toLocaleString()} g`}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1200"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">PO / Invoice Ref</label>
                  <input
                    type="text"
                    value={purchaseRef}
                    onChange={(e) => setPurchaseRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Supplier</label>
                  <select
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      Direct / Spot Purchase
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100 py-1">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional delivery details or lot code"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPurchaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={purchaseLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {purchaseLoading ? 'Recording...' : 'Confirm Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG USAGE MODAL */}
      {usageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-orange-400">
                <TrendingDown className="w-5 h-5 text-orange-500" />
                Log Material Usage / Consumption
              </h3>
              <button
                onClick={() => setUsageModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {usageError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {usageError}
              </div>
            )}

            <form onSubmit={handleUsageSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Select Material *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const item = items.find((i) => i.id === e.target.value);
                    if (item) setUsageUnit(item.unit);
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-orange-500"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit}) — In Stock: {i.currentQuantity} {i.unit}
                    </option>
                  ))}
                </select>
                {selectedItemId && (
                  <div className="mt-1 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Available In Stock:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {items.find((i) => i.id === selectedItemId)?.currentQuantity || 0}{' '}
                      {items.find((i) => i.id === selectedItemId)?.unit}
                      {isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                        items.find((i) => i.id === selectedItemId)?.unit === 'kg'
                          ? ` (${((items.find((i) => i.id === selectedItemId)?.currentQuantity || 0) * 1000).toLocaleString()} g)`
                          : ` (${((items.find((i) => i.id === selectedItemId)?.currentQuantity || 0) / 1000).toFixed(3)} kg)`
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Usage Date *</label>
                  <input
                    type="date"
                    required
                    value={usageDate}
                    onChange={(e) => setUsageDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 font-semibold">
                      Quantity Used ({usageUnit}) *
                    </label>
                    {isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleUsageUnit('kg')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            usageUnit === 'kg'
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          kg
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUsageUnit('g')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            usageUnit === 'g'
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          g
                        </button>
                      </div>
                    )}
                    {isVolume(items.find((i) => i.id === selectedItemId)?.unit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleUsageUnit('L')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            usageUnit === 'L'
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUsageUnit('ml')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            usageUnit === 'ml'
                              ? 'bg-orange-500 text-white shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          ml
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    step={usageUnit === 'g' || usageUnit === 'ml' ? '1' : '0.01'}
                    required
                    placeholder="e.g. 50"
                    value={usageQty}
                    onChange={(e) => setUsageQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                  {usageQty && isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                      {usageUnit === 'g'
                        ? `= ${(parseFloat(usageQty) / 1000).toFixed(3)} kg`
                        : `= ${(parseFloat(usageQty) * 1000).toLocaleString()} g`}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Batch / Purpose Reference</label>
                <input
                  type="text"
                  placeholder="e.g. CB-2026-001 or Tasting Event"
                  value={usageRef}
                  onChange={(e) => setUsageRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 50 bottles used for cold brew bottling run"
                  value={usageNotes}
                  onChange={(e) => setUsageNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setUsageModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={usageLoading}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold disabled:opacity-50"
                >
                  {usageLoading ? 'Deducting...' : 'Record Usage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WASTE MODAL */}
      {wasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 text-rose-400">
                <Trash2 className="w-4 h-4 text-rose-500" />
                Record Material Loss / Waste
              </h3>
              <button
                onClick={() => setWasteModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {wasteError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
                {wasteError}
              </div>
            )}

            <form onSubmit={handleWasteSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Item</label>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold">
                  {items.find((i) => i.id === selectedItemId)?.name}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-400 font-semibold">
                    Waste Quantity ({wasteUnit}) *
                  </label>
                  {isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                    <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleWasteUnit('kg')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          wasteUnit === 'kg'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        kg
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWasteUnit('g')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          wasteUnit === 'g'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        g
                      </button>
                    </div>
                  )}
                  {isVolume(items.find((i) => i.id === selectedItemId)?.unit) && (
                    <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() => toggleWasteUnit('L')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          wasteUnit === 'L'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        L
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleWasteUnit('ml')}
                        className={`px-2 py-0.5 rounded font-bold transition-all ${
                          wasteUnit === 'ml'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        ml
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  step={wasteUnit === 'g' || wasteUnit === 'ml' ? '1' : '0.01'}
                  required
                  placeholder="e.g. 2"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
                {wasteQty && isWeight(items.find((i) => i.id === selectedItemId)?.unit) && (
                  <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                    {wasteUnit === 'g'
                      ? `= ${(parseFloat(wasteQty) / 1000).toFixed(3)} kg`
                      : `= ${(parseFloat(wasteQty) * 1000).toLocaleString()} g`}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Reason for Waste</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="Damaged in Handling">Damaged in Handling</option>
                  <option value="Packaging Broken">Packaging Broken / Cracked Bottle</option>
                  <option value="Expired / Degraded Quality">Expired / Degraded Quality</option>
                  <option value="Spilled during Staging">Spilled during Staging</option>
                  <option value="Supplier Defect">Supplier Defect</option>
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

      {/* CREATE NEW MATERIAL MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                Add New Inventory Item / Raw Material
              </h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMaterialSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amber Glass Bottle 250ml or Black Crown Caps"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Packaging">Packaging</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Water">Water</option>
                    <option value="Cleaning Chemicals">Cleaning Chemicals</option>
                    <option value="Ingredients">Ingredients / Flavors</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="units">units / bottles / caps</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="L">Liters (L)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">pcs</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Standard Cost per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 8.5"
                    value={newAvgCost}
                    onChange={(e) => setNewAvgCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Storage Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Pallet R-01"
                    value={newStorage}
                    onChange={(e) => setNewStorage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Supplier</label>
                  <select
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional specs, dimensions, or vendor details"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {createLoading ? 'Saving...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MATERIAL MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" />
                Edit Raw Material
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
              <div>
                <label className="block text-zinc-400 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Packaging">Packaging</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Water">Water</option>
                    <option value="Cleaning Chemicals">Cleaning Chemicals</option>
                    <option value="Ingredients">Ingredients</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="units">units / bottles / caps</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="g">Grams (g)</option>
                    <option value="L">Liters (L)</option>
                    <option value="ml">Milliliters (ml)</option>
                    <option value="pcs">pcs</option>
                    <option value="boxes">boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Min Stock Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Average Cost (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAvgCost}
                    onChange={(e) => setEditAvgCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Storage Location</label>
                  <input
                    type="text"
                    value={editStorage}
                    onChange={(e) => setEditStorage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Supplier</label>
                  <select
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
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
                  {editLoading ? 'Saving...' : 'Update Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" />
                Edit Transaction Entry
              </h3>
              <button
                onClick={() => setEditTxModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 text-sm p-1"
              >
                ✕
              </button>
            </div>

            {editTxError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {editTxError}
              </div>
            )}

            <form onSubmit={handleEditTxSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Material</label>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold">
                  {editTxItemName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Entry Type</label>
                  <select
                    value={editTxType}
                    onChange={(e) => setEditTxType(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="PURCHASE">PURCHASE (+ In Stock)</option>
                    <option value="PRODUCTION_CONSUMPTION">USAGE (- Deduct Stock)</option>
                    <option value="WASTE">WASTE (- Broken/Damaged)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 font-semibold">
                      Quantity Change ({editTxUnit}) *
                    </label>
                    {isWeight(editTxBaseUnit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleEditTxUnit('kg')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            editTxUnit === 'kg'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          kg
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEditTxUnit('g')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            editTxUnit === 'g'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          g
                        </button>
                      </div>
                    )}
                    {isVolume(editTxBaseUnit) && (
                      <div className="inline-flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-[11px]">
                        <button
                          type="button"
                          onClick={() => toggleEditTxUnit('L')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            editTxUnit === 'L'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          L
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleEditTxUnit('ml')}
                          className={`px-2 py-0.5 rounded font-bold transition-all ${
                            editTxUnit === 'ml'
                              ? 'bg-amber-500 text-zinc-950 shadow-sm'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          ml
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    step={editTxUnit === 'g' || editTxUnit === 'ml' ? '1' : '0.01'}
                    required
                    value={editTxQty}
                    onChange={(e) => setEditTxQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  {editTxQty && isWeight(editTxBaseUnit) && (
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                      {editTxUnit === 'g'
                        ? `= ${(parseFloat(editTxQty) / 1000).toFixed(3)} kg`
                        : `= ${(parseFloat(editTxQty) * 1000).toLocaleString()} g`}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editTxUnitCost}
                    onChange={(e) => setEditTxUnitCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Batch / Reference</label>
                <input
                  type="text"
                  value={editTxRef}
                  onChange={(e) => setEditTxRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  value={editTxNotes}
                  onChange={(e) => setEditTxNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editTxLoading}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold disabled:opacity-50"
                >
                  {editTxLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODALS */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Delete Material Item?
            </h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete{' '}
              <span className="text-zinc-200 font-semibold">
                {items.find((i) => i.id === deleteConfirmId)?.name}
              </span>
              ? This action cannot be undone. Items used in past production batches cannot be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => handleDeleteSubmit(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTxConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-zinc-100 text-sm flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Delete Transaction Entry?
            </h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete this transaction entry? The material balance will be automatically recalculated.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteTxConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTxLoading}
                onClick={() => handleDeleteTxSubmit(deleteTxConfirmId)}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs disabled:opacity-50"
              >
                {deleteTxLoading ? 'Deleting...' : 'Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
