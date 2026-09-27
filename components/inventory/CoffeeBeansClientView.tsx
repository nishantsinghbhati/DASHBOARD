'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Coffee,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  Layers,
  Sparkles,
  Pencil,
  ArrowRight,
  Filter,
  History,
  TrendingDown,
  Calendar,
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

export interface CoffeeBeanItem {
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
  coffeeBeanDetails: {
    id: string;
    beanName: string;
    origin: string;
    supplier: string;
    roast: string;
    beanType: string;
    quantityPurchased: number;
    quantityRemaining: number;
    purchaseCost: number;
    costPerKg: number;
  } | null;
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

export function CoffeeBeansClientView({
  beans,
  suppliers,
  transactions = [],
}: {
  beans: CoffeeBeanItem[];
  suppliers: Array<{ id: string; name: string }>;
  transactions?: InventoryTransactionItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roastFilter, setRoastFilter] = useState('ALL');
  const [healthFilter, setHealthFilter] = useState('ALL');

  // Ledger Filter
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  // Modals
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTxModalOpen, setEditTxModalOpen] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Purchase Form State
  const [purchaseQty, setPurchaseQty] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [purchaseRef, setPurchaseRef] = useState('');
  const [purchaseSupplier, setPurchaseSupplier] = useState('');
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  // Usage Form State
  const [usageQty, setUsageQty] = useState('');
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0]);
  const [usageRef, setUsageRef] = useState('');
  const [usageNotes, setUsageNotes] = useState('');
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState('');

  // Waste Form State
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Degraded Aroma / Stale');
  const [wasteNotes, setWasteNotes] = useState('');
  const [wasteDate, setWasteDate] = useState(new Date().toISOString().split('T')[0]);
  const [wasteLoading, setWasteLoading] = useState(false);
  const [wasteError, setWasteError] = useState('');

  // Create Form State
  const [newName, setNewName] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newRoast, setNewRoast] = useState('Medium-Dark');
  const [newBeanType, setNewBeanType] = useState('Arabica');
  const [newMinStock, setNewMinStock] = useState('4');
  const [newAvgCost, setNewAvgCost] = useState('1200');
  const [newStorage, setNewStorage] = useState('Aroma-sealed Bin 01');
  const [newSupplier, setNewSupplier] = useState(suppliers[0]?.id || '');
  const [newNotes, setNewNotes] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit Bean Form State
  const [editItemId, setEditItemId] = useState('');
  const [editName, setEditName] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editRoast, setEditRoast] = useState('Medium-Dark');
  const [editBeanType, setEditBeanType] = useState('Arabica');
  const [editMinStock, setEditMinStock] = useState('4');
  const [editAvgCost, setEditAvgCost] = useState('1200');
  const [editStorage, setEditStorage] = useState('Aroma-sealed Bin 01');
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

  // Unit Toggles for Coffee Beans (kg vs g)
  const [purchaseUnit, setPurchaseUnit] = useState<'kg' | 'g'>('kg');
  const [usageUnit, setUsageUnit] = useState<'kg' | 'g'>('kg');
  const [wasteUnit, setWasteUnit] = useState<'kg' | 'g'>('kg');
  const [editTxUnit, setEditTxUnit] = useState<'kg' | 'g'>('kg');

  const togglePurchaseUnit = (targetUnit: 'kg' | 'g') => {
    if (targetUnit === purchaseUnit) return;
    setPurchaseUnit(targetUnit);
    if (purchaseQty && !isNaN(parseFloat(purchaseQty))) {
      const val = parseFloat(purchaseQty);
      if (targetUnit === 'g') {
        setPurchaseQty(String(Math.round(val * 1000 * 100) / 100));
      } else {
        setPurchaseQty(String(Math.round((val / 1000) * 1000) / 1000));
      }
    }
  };

  const toggleUsageUnit = (targetUnit: 'kg' | 'g') => {
    if (targetUnit === usageUnit) return;
    setUsageUnit(targetUnit);
    if (usageQty && !isNaN(parseFloat(usageQty))) {
      const val = parseFloat(usageQty);
      if (targetUnit === 'g') {
        setUsageQty(String(Math.round(val * 1000 * 100) / 100));
      } else {
        setUsageQty(String(Math.round((val / 1000) * 1000) / 1000));
      }
    }
  };

  const toggleWasteUnit = (targetUnit: 'kg' | 'g') => {
    if (targetUnit === wasteUnit) return;
    setWasteUnit(targetUnit);
    if (wasteQty && !isNaN(parseFloat(wasteQty))) {
      const val = parseFloat(wasteQty);
      if (targetUnit === 'g') {
        setWasteQty(String(Math.round(val * 1000 * 100) / 100));
      } else {
        setWasteQty(String(Math.round((val / 1000) * 1000) / 1000));
      }
    }
  };

  const toggleEditTxUnit = (targetUnit: 'kg' | 'g') => {
    if (targetUnit === editTxUnit) return;
    setEditTxUnit(targetUnit);
    if (editTxQty && !isNaN(parseFloat(editTxQty))) {
      const val = parseFloat(editTxQty);
      if (targetUnit === 'g') {
        setEditTxQty(String(Math.round(val * 1000 * 100) / 100));
      } else {
        setEditTxQty(String(Math.round((val / 1000) * 1000) / 1000));
      }
    }
  };

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteTxConfirmId, setDeleteTxConfirmId] = useState<string | null>(null);
  const [deleteTxLoading, setDeleteTxLoading] = useState(false);

  // Distinct roast profiles
  const roasts = Array.from(
    new Set(
      beans
        .map((b) => b.coffeeBeanDetails?.roast)
        .filter((r): r is string => Boolean(r))
    )
  );

  // Filtered list of beans
  const filteredBeans = beans.filter((item) => {
    const details = item.coffeeBeanDetails;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (details?.origin && details.origin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (details?.roast && details.roast.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRoast = roastFilter === 'ALL' || details?.roast === roastFilter;

    let matchesHealth = true;
    if (healthFilter === 'HEALTHY') {
      matchesHealth = item.currentQuantity > item.minStock;
    } else if (healthFilter === 'LOW') {
      matchesHealth = item.currentQuantity <= item.minStock && item.currentQuantity > 0;
    } else if (healthFilter === 'OUT') {
      matchesHealth = item.currentQuantity <= 0;
    }

    return matchesSearch && matchesRoast && matchesHealth;
  });

  // Filtered ledger transactions
  const filteredTransactions = transactions.filter((t) => {
    if (txTypeFilter === 'ALL') return true;
    return t.type === txTypeFilter;
  });

  const handleOpenPurchase = (itemId?: string) => {
    const target = itemId || beans[0]?.id || '';
    setSelectedItemId(target);
    const item = beans.find((i) => i.id === target);
    setPurchaseCost(item ? String(item.averageCost) : '');
    setPurchaseQty('');
    setPurchaseUnit('kg');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseRef(`PO-BEAN-${Date.now().toString().slice(-4)}`);
    setPurchaseSupplier(item?.supplier?.id || suppliers[0]?.id || '');
    setPurchaseNotes('');
    setPurchaseError('');
    setPurchaseModalOpen(true);
  };

  const handleOpenUsage = (itemId?: string) => {
    const target = itemId || beans[0]?.id || '';
    setSelectedItemId(target);
    setUsageQty('');
    setUsageUnit('kg');
    setUsageDate(new Date().toISOString().split('T')[0]);
    setUsageRef(`USE-BREW-${Date.now().toString().slice(-4)}`);
    setUsageNotes('');
    setUsageError('');
    setUsageModalOpen(true);
  };

  const handleOpenWaste = (itemId: string) => {
    setSelectedItemId(itemId);
    setWasteQty('');
    setWasteUnit('kg');
    setWasteDate(new Date().toISOString().split('T')[0]);
    setWasteReason('Degraded Aroma / Stale');
    setWasteNotes('');
    setWasteError('');
    setWasteModalOpen(true);
  };

  const handleOpenEdit = (item: CoffeeBeanItem) => {
    setEditItemId(item.id);
    setEditName(item.name);
    setEditOrigin(item.coffeeBeanDetails?.origin || 'Estate Origin');
    setEditRoast(item.coffeeBeanDetails?.roast || 'Medium-Dark');
    setEditBeanType(item.coffeeBeanDetails?.beanType || 'Arabica');
    setEditMinStock(String(item.minStock));
    setEditAvgCost(String(item.averageCost));
    setEditStorage(item.storageLocation || 'Aroma-sealed Bin');
    setEditSupplier(item.supplier?.id || '');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleOpenEditTx = (tx: InventoryTransactionItem) => {
    setEditTxId(tx.id);
    setEditTxItemName(tx.inventoryItem?.name || 'Coffee Bean');
    const rawDate = typeof tx.date === 'string' ? tx.date : tx.date.toISOString();
    setEditTxDate(rawDate.split('T')[0]);
    setEditTxType(tx.type);
    setEditTxUnit('kg');
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

    let qty = parseFloat(purchaseQty);
    const cost = parseFloat(purchaseCost);

    if (isNaN(qty) || qty <= 0 || isNaN(cost) || cost < 0) {
      setPurchaseError(`Please enter valid positive quantity in ${purchaseUnit} and unit cost per kg.`);
      setPurchaseLoading(false);
      return;
    }

    if (!selectedItemId) {
      setPurchaseError('Please select a coffee bean from the catalog.');
      setPurchaseLoading(false);
      return;
    }

    const qtyInKg = purchaseUnit === 'g' ? qty / 1000 : qty;

    const res = await purchaseRawMaterial({
      inventoryItemId: selectedItemId,
      quantity: qtyInKg,
      unitCost: cost,
      supplierId: purchaseSupplier || undefined,
      reference: purchaseRef,
      partnerId: partner.id,
      notes: purchaseNotes || `Restocked ${qty} ${purchaseUnit} (${qtyInKg.toFixed(3)} kg) coffee beans`,
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

    const qtyInKg = usageUnit === 'g' ? qty / 1000 : qty;

    const currentItem = beans.find((i) => i.id === selectedItemId);
    if (currentItem && qtyInKg > currentItem.currentQuantity) {
      setUsageError(
        `Cannot log usage of ${usageQty} ${usageUnit} (${qtyInKg.toFixed(3)} kg). Available stock is only ${currentItem.currentQuantity} kg (${(currentItem.currentQuantity * 1000).toLocaleString()} g).`
      );
      setUsageLoading(false);
      return;
    }

    const res = await recordRawMaterialUsage({
      inventoryItemId: selectedItemId,
      quantity: qtyInKg,
      date: usageDate,
      reference: usageRef || undefined,
      partnerId: partner.id,
      notes: usageNotes || `Batch brew usage (${usageQty} ${usageUnit})`,
      type: 'PRODUCTION_CONSUMPTION',
    });

    setUsageLoading(false);
    if (res.success) {
      setUsageModalOpen(false);
      router.refresh();
    } else {
      setUsageError(res.error || 'Failed to record bean usage.');
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

    const qtyInKg = wasteUnit === 'g' ? qty / 1000 : qty;

    const currentItem = beans.find((i) => i.id === selectedItemId);
    if (currentItem && qtyInKg > currentItem.currentQuantity) {
      setWasteError(
        `Cannot waste more than available stock (${currentItem.currentQuantity} kg / ${(currentItem.currentQuantity * 1000).toLocaleString()} g).`
      );
      setWasteLoading(false);
      return;
    }

    const res = await recordRawMaterialWaste({
      inventoryItemId: selectedItemId,
      quantity: qtyInKg,
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

  const handleCreateBeanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError('');

    if (!newName.trim()) {
      setCreateError('Bean name is required.');
      setCreateLoading(false);
      return;
    }

    const res = await createInventoryItem({
      name: newName.trim(),
      category: 'Coffee Beans',
      unit: 'kg',
      minStock: parseFloat(newMinStock) || 3,
      averageCost: parseFloat(newAvgCost) || 1200,
      supplierId: newSupplier || undefined,
      storageLocation: newStorage,
      isCoffeeBean: true,
      origin: newOrigin.trim() || 'Estate Origin',
      roast: newRoast,
      beanType: newBeanType,
      notes: newNotes,
      partnerId: partner.id,
    });

    setCreateLoading(false);
    if (res.success) {
      setCreateModalOpen(false);
      setNewName('');
      setNewOrigin('');
      router.refresh();
    } else {
      setCreateError(res.error || 'Failed to add coffee bean variety.');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');

    if (!editName.trim()) {
      setEditError('Bean name is required.');
      setEditLoading(false);
      return;
    }

    const res = await updateInventoryItem({
      id: editItemId,
      name: editName.trim(),
      category: 'Coffee Beans',
      unit: 'kg',
      minStock: parseFloat(editMinStock) || 0,
      averageCost: parseFloat(editAvgCost) || 0,
      storageLocation: editStorage,
      supplierId: editSupplier || undefined,
      origin: editOrigin.trim(),
      roast: editRoast,
      beanType: editBeanType,
      partnerId: partner.id,
    });

    setEditLoading(false);
    if (res.success) {
      setEditModalOpen(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update coffee bean.');
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

    if (editTxUnit === 'g') {
      parsedQty = parsedQty / 1000;
    }

    // Preserve signed quantity convention
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
      alert(res.error || 'Failed to delete coffee bean.');
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
      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search beans, origin, roast..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Roast Filter */}
          <select
            value={roastFilter}
            onChange={(e) => setRoastFilter(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Roast Profiles</option>
            {roasts.map((r) => (
              <option key={r} value={r}>
                {r} Roast
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
            <option value="ALL">All Stock Levels</option>
            <option value="HEALTHY">Healthy (&gt; Min Stock)</option>
            <option value="LOW">Low Stock</option>
            <option value="OUT">Out of Stock (0 kg)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap">
          <Link
            href="/inventory/raw-materials"
            className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center gap-1 transition-all border border-zinc-700/60"
            title="View bottles, caps, labels and consumables"
          >
            Packaging &amp; Materials
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            + New Bean
          </button>
          <button
            onClick={() => handleOpenUsage()}
            className="px-3.5 py-2 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 border border-orange-800/50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            title="Record coffee bean usage or extraction"
          >
            <TrendingDown className="w-4 h-4" />
            + Log Bean Usage
          </button>
          <button
            onClick={() => handleOpenPurchase()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1.5 transition-all"
          >
            <Coffee className="w-4 h-4" />
            + Purchase Beans
          </button>
        </div>
      </div>

      {/* Coffee Beans Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-semibold">
              <th className="py-3 px-4">Bean Name &amp; SKU</th>
              <th className="py-3 px-4">Origin &amp; Region</th>
              <th className="py-3 px-4">Roast &amp; Type</th>
              <th className="py-3 px-4 text-right">In Stock (kg)</th>
              <th className="py-3 px-4 text-right">Avg Cost / kg</th>
              <th className="py-3 px-4 text-right">Stock Value</th>
              <th className="py-3 px-4 text-center">Health Status</th>
              <th className="py-3 px-4">Storage &amp; Supplier</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredBeans.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-zinc-500">
                  No coffee beans found matching your search.
                </td>
              </tr>
            ) : (
              filteredBeans.map((item) => {
                const details = item.coffeeBeanDetails;
                const isOut = item.currentQuantity <= 0;
                const isLow = !isOut && item.currentQuantity <= item.minStock;

                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-100 flex items-center gap-2">
                        {item.name}
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                          {details?.beanType || 'Arabica'}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-zinc-500">{item.sku}</span>
                    </td>

                    <td className="py-3 px-4 text-zinc-300 font-medium">
                      {details?.origin || 'Estate Profile'}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400 font-semibold text-[11px] border border-zinc-700">
                        {details?.roast || 'Medium-Dark'}
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
                        {formatQuantity(item.currentQuantity, 'kg')}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-normal font-mono">
                        ({(item.currentQuantity * 1000).toLocaleString()} g)
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-normal">
                        Min: {item.minStock} kg
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-zinc-200">
                      {formatCurrency(item.averageCost)}
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
                      <div>{item.storageLocation || 'Aroma-sealed Bin'}</div>
                      <span className="text-zinc-500">
                        {item.supplier?.name || 'Roastery Estate'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenPurchase(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700"
                        title="Restock this bean"
                      >
                        + Restock
                      </button>
                      <button
                        onClick={() => handleOpenUsage(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-orange-950/40 hover:bg-orange-900/50 text-orange-300 text-xs font-semibold border border-orange-800/50"
                        title="Log bean usage"
                      >
                        Usage
                      </button>
                      <button
                        onClick={() => handleOpenWaste(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-800/50"
                        title="Log spillage or stale beans"
                      >
                        Waste
                      </button>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-400 text-zinc-400 text-xs transition-colors inline-flex items-center"
                        title="Edit bean origin &amp; details"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 rounded-lg bg-zinc-800 hover:bg-rose-500/20 hover:text-rose-400 text-zinc-400 text-xs transition-colors inline-flex items-center"
                        title="Delete bean variety"
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

      {/* Coffee Beans Deep Dive Origin Cards */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">
              Coffee Beans Origin &amp; Lot Traceability
            </h3>
            <p className="text-xs text-zinc-400">
              Every bean batch is atomically deducted during cold brew production and traced to cold brew bottles
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {beans.map((cb) => {
            const details = cb.coffeeBeanDetails;
            return (
              <div
                key={cb.id}
                className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-200 text-xs">{cb.name}</h4>
                    <span className="text-[11px] text-amber-400 font-medium">
                      {details?.origin || 'Estate Origin'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                    {details?.roast || 'Medium-Dark'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-800/60">
                  <div>
                    <span className="text-zinc-500 block">Bean Type:</span>
                    <span className="text-zinc-300 font-semibold">
                      {details?.beanType || 'Arabica'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Available:</span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {cb.currentQuantity.toFixed(2)} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Cost / kg:</span>
                    <span className="text-zinc-300 font-mono">
                      {formatCurrency(cb.averageCost)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Storage:</span>
                    <span className="text-zinc-300">
                      {cb.storageLocation || 'Aroma Bin'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">
                    Supplier: {cb.supplier?.name || 'Direct Roaster'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenUsage(cb.id)}
                      className="text-orange-400 hover:text-orange-300 font-semibold"
                    >
                      Usage
                    </button>
                    <button
                      onClick={() => handleOpenPurchase(cb.id)}
                      className="text-amber-400 hover:text-amber-300 font-semibold"
                    >
                      + Restock
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* EDITABLE COFFEE BEAN TRANSACTION LEDGER (Purchases, Usages, Waste) */}
      <div className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Coffee Beans Purchase &amp; Usage Ledger
              </h3>
              <p className="text-[11px] text-zinc-400">
                Every entry is fully editable with date, quantity, cost, reference, and reason
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
              <option value="ALL">All Movement Types ({transactions.length})</option>
              <option value="PURCHASE">Purchases Only</option>
              <option value="PRODUCTION_CONSUMPTION">Usages / Brews Only</option>
              <option value="WASTE">Waste Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 font-semibold">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Bean Variety</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3 text-right">Quantity (kg)</th>
                <th className="py-2.5 px-3 text-right">Cost / kg</th>
                <th className="py-2.5 px-3 text-right">Total Cost</th>
                <th className="py-2.5 px-3">Batch / PO Ref</th>
                <th className="py-2.5 px-3">Notes</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-zinc-500">
                    No coffee bean transactions recorded yet.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-zinc-400 font-mono">
                      {formatDate(tx.date)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-zinc-200">
                      {tx.inventoryItem?.name || 'Bean'}
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
                      <div>
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} kg
                      </div>
                      <span className="text-[10px] text-zinc-500 font-normal block font-mono">
                        ({(Math.abs(tx.quantity) * 1000).toLocaleString()} g)
                      </span>
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

      {/* RESTOCK / PURCHASE BEANS MODAL */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                Purchase / Restock Coffee Beans
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
                  <label className="block text-zinc-400">Select Coffee Bean *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setPurchaseModalOpen(false);
                      setCreateModalOpen(true);
                    }}
                    className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold"
                  >
                    + Define New Bean Variety
                  </button>
                </div>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    const item = beans.find((i) => i.id === e.target.value);
                    if (item) setPurchaseCost(String(item.averageCost));
                  }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-amber-500"
                >
                  {beans.length === 0 ? (
                    <option value="" disabled className="bg-zinc-900 text-zinc-400">
                      -- No coffee beans in catalog --
                    </option>
                  ) : (
                    <>
                      <option value="" disabled className="bg-zinc-900 text-zinc-400">
                        -- Select Coffee Bean ({beans.length} varieties) --
                      </option>
                      {beans.map((b) => (
                        <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-100 py-1.5">
                          {b.name} (In Stock: {b.currentQuantity} kg)
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
                  </div>
                  <input
                    type="number"
                    step={purchaseUnit === 'g' ? '1' : '0.01'}
                    required
                    placeholder={purchaseUnit === 'g' ? 'e.g. 500' : 'e.g. 10'}
                    value={purchaseQty}
                    onChange={(e) => setPurchaseQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  {purchaseQty && !isNaN(parseFloat(purchaseQty)) && (
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                      {purchaseUnit === 'g'
                        ? `= ${(parseFloat(purchaseQty) / 1000).toFixed(3)} kg`
                        : `= ${(parseFloat(purchaseQty) * 1000).toLocaleString()} g`}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit Cost (₹ / kg) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1200"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  {purchaseQty && purchaseCost && !isNaN(parseFloat(purchaseQty)) && !isNaN(parseFloat(purchaseCost)) && (
                    <span className="text-[10px] text-amber-400 mt-1 block font-mono">
                      Total: ₹{((purchaseUnit === 'g' ? parseFloat(purchaseQty) / 1000 : parseFloat(purchaseQty)) * parseFloat(purchaseCost)).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">PO / Lot Reference</label>
                  <input
                    type="text"
                    value={purchaseRef}
                    onChange={(e) => setPurchaseRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Roaster / Supplier</label>
                  <select
                    value={purchaseSupplier}
                    onChange={(e) => setPurchaseSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="" className="bg-zinc-900 text-zinc-400">
                      Direct Roaster Purchase
                    </option>
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
                  placeholder="e.g. Fresh roast batch, tasting notes"
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
                  {purchaseLoading ? 'Recording...' : 'Confirm Restock'}
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
                Log Coffee Bean Usage / Consumption
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
                <label className="block text-zinc-400 mb-1">Select Coffee Bean *</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-medium focus:outline-none focus:border-orange-500"
                >
                  {beans.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (In Stock: {b.currentQuantity} kg / {(b.currentQuantity * 1000).toLocaleString()} g)
                    </option>
                  ))}
                </select>
                {selectedItemId && (
                  <div className="mt-1 text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Available In Stock:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {beans.find((b) => b.id === selectedItemId)?.currentQuantity || 0} kg
                      {' '}({((beans.find((b) => b.id === selectedItemId)?.currentQuantity || 0) * 1000).toLocaleString()} g)
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
                  </div>
                  <input
                    type="number"
                    step={usageUnit === 'g' ? '1' : '0.01'}
                    required
                    placeholder={usageUnit === 'g' ? 'e.g. 750' : 'e.g. 1.5'}
                    value={usageQty}
                    onChange={(e) => setUsageQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                  {usageQty && !isNaN(parseFloat(usageQty)) && (
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
                  placeholder="e.g. CB-2026-001 or Cupping R&D"
                  value={usageRef}
                  onChange={(e) => setUsageRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Coarse grind for 50L immersion batch"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2 text-rose-400">
                <Trash2 className="w-5 h-5 text-rose-500" />
                Record Coffee Bean Spillage / Waste
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
                <label className="block text-zinc-400 mb-1">Bean Variety</label>
                <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-semibold">
                  {beans.find((i) => i.id === selectedItemId)?.name}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-zinc-400 font-semibold">
                    Waste Quantity ({wasteUnit}) *
                  </label>
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
                </div>
                <input
                  type="number"
                  step={wasteUnit === 'g' ? '1' : '0.01'}
                  required
                  placeholder={wasteUnit === 'g' ? 'e.g. 250' : 'e.g. 0.5'}
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-rose-500"
                />
                {wasteQty && !isNaN(parseFloat(wasteQty)) && (
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
                  <option value="Degraded Aroma / Stale">Degraded Aroma / Stale</option>
                  <option value="Spilled during Grinding/Staging">Spilled during Grinding/Staging</option>
                  <option value="Roasting Defect / Over-extracted test">Roasting Defect / Over-extracted test</option>
                  <option value="Moisture Contamination">Moisture Contamination</option>
                  <option value="Packaging Torn">Packaging Torn</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional details"
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
                  {wasteLoading ? 'Logging...' : 'Log Waste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW BEAN VARIETY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-500" />
                Add New Coffee Bean Variety
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

            <form onSubmit={handleCreateBeanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Bean Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ethiopian Yirgacheffe G1 or Colombia Supremo"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Origin / Estate</label>
                  <input
                    type="text"
                    placeholder="e.g. Cerrado Mineiro, Brazil"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Bean Type</label>
                  <select
                    value={newBeanType}
                    onChange={(e) => setNewBeanType(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Arabica">100% Arabica</option>
                    <option value="Robusta">Specialty Robusta</option>
                    <option value="Blend">Arabica / Robusta Blend</option>
                    <option value="Single Origin">Single Origin Micro-Lot</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Roast Profile</label>
                  <select
                    value={newRoast}
                    onChange={(e) => setNewRoast(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Light">Light Roast</option>
                    <option value="Medium-Light">Medium-Light Roast</option>
                    <option value="Medium">Medium Roast</option>
                    <option value="Medium-Dark">Medium-Dark Roast (Cold Brew Standard)</option>
                    <option value="Dark">Dark Roast (French / Espresso)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Roaster / Supplier</label>
                  <select
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Direct Roaster</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Min Stock Threshold (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMinStock}
                    onChange={(e) => setNewMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Average Cost (₹ / kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1200"
                    value={newAvgCost}
                    onChange={(e) => setNewAvgCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Storage Location</label>
                <input
                  type="text"
                  placeholder="e.g. Aroma-sealed Bin 03"
                  value={newStorage}
                  onChange={(e) => setNewStorage(e.target.value)}
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
                  {createLoading ? 'Adding...' : 'Add Bean Variety'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BEAN MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-500" />
                Edit Coffee Bean Variety
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
                <label className="block text-zinc-400 mb-1">Bean Name *</label>
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
                  <label className="block text-zinc-400 mb-1">Origin / Estate</label>
                  <input
                    type="text"
                    value={editOrigin}
                    onChange={(e) => setEditOrigin(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Bean Type</label>
                  <select
                    value={editBeanType}
                    onChange={(e) => setEditBeanType(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Arabica">Arabica</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Blend">Blend</option>
                    <option value="Single Origin">Single Origin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Roast Profile</label>
                  <select
                    value={editRoast}
                    onChange={(e) => setEditRoast(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Light">Light</option>
                    <option value="Medium-Light">Medium-Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Medium-Dark">Medium-Dark</option>
                    <option value="Dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Supplier</label>
                  <select
                    value={editSupplier}
                    onChange={(e) => setEditSupplier(e.target.value)}
                    style={{ colorScheme: 'dark' }}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Direct Roaster</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Min Stock Threshold (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Average Cost (₹ / kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editAvgCost}
                    onChange={(e) => setEditAvgCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={editStorage}
                  onChange={(e) => setEditStorage(e.target.value)}
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
                  {editLoading ? 'Saving...' : 'Update Bean Variety'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TRANSACTION MODAL (Purchases, Usages, Waste) */}
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
                <label className="block text-zinc-400 mb-1">Item</label>
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
                    <option value="WASTE">WASTE (- Damaged)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-400 font-semibold">
                      Quantity ({editTxUnit}) *
                    </label>
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
                  </div>
                  <input
                    type="number"
                    step={editTxUnit === 'g' ? '1' : '0.01'}
                    required
                    value={editTxQty}
                    onChange={(e) => setEditTxQty(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                  {editTxQty && !isNaN(parseFloat(editTxQty)) && (
                    <span className="text-[10px] text-zinc-500 mt-1 block font-mono">
                      {editTxUnit === 'g'
                        ? `= ${(parseFloat(editTxQty) / 1000).toFixed(3)} kg`
                        : `= ${(parseFloat(editTxQty) * 1000).toLocaleString()} g`}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Unit Cost (₹ / kg) *</label>
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
              Delete Coffee Bean Variety?
            </h3>
            <p className="text-xs text-zinc-400">
              Are you sure you want to delete{' '}
              <span className="text-zinc-200 font-semibold">
                {beans.find((i) => i.id === deleteConfirmId)?.name}
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
                {deleteLoading ? 'Deleting...' : 'Delete Variety'}
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
              Are you sure you want to delete this transaction entry? The stock balance for this bean will be automatically recalculated.
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
