'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Tag,
  Package,
  Truck,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations/inventory';
import { usePartner } from '@/lib/auth/partner-client';
import {
  updateBusinessSettings,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  addSupplier,
  updateSupplier,
  deleteSupplier,
} from '@/lib/actions/settings';
import { createProduct, updateProduct, deleteProduct } from '@/lib/actions/production';

interface SettingsData {
  businessName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  alertThresholdDays: number;
}

interface ExpenseCategoryItem {
  id: string;
  name: string;
  color: string;
  isProductionRelated: boolean;
  _count?: { expenses: number };
}

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  variant: string;
  size: string;
  unit: string;
  sellingPrice: number;
  standardCost: number;
  minStock: number;
  isActive: boolean;
  notes: string | null;
}

interface SupplierItem {
  id: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  _count?: { inventoryItems: number };
}

export function SettingsClientView({
  settings: initialSettings,
  expenseCategories: initialCategories,
  products: initialProducts,
  suppliers: initialSuppliers,
}: {
  settings: SettingsData;
  expenseCategories: ExpenseCategoryItem[];
  products: ProductItem[];
  suppliers: SupplierItem[];
}) {
  const router = useRouter();
  const { partner } = usePartner();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'CATEGORIES' | 'PRODUCTS' | 'SUPPLIERS'>('PROFILE');

  // Business Profile Form State
  const [profileForm, setProfileForm] = useState({
    businessName: initialSettings.businessName,
    email: initialSettings.email || '',
    phone: initialSettings.phone || '',
    address: initialSettings.address || '',
    currency: initialSettings.currency || 'INR',
    timezone: initialSettings.timezone || 'Asia/Kolkata',
    alertThresholdDays: initialSettings.alertThresholdDays || 15,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    const res = await updateBusinessSettings({
      ...profileForm,
      partnerId: partner.id,
    });

    setProfileLoading(false);
    if (res.success) {
      setProfileSuccess('Business configuration saved successfully!');
      setTimeout(() => setProfileSuccess(''), 4000);
      router.refresh();
    } else {
      setProfileError(res.error || 'Failed to update settings.');
    }
  };

  // --- 1. Expense Category Modals ---
  const [categories, setCategories] = useState(initialCategories);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#8B4513');
  const [catIsProduction, setCatIsProduction] = useState(false);
  const [catLoading, setCatLoading] = useState(false);
  const [catError, setCatError] = useState('');

  const openAddCategory = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatColor('#8B4513');
    setCatIsProduction(false);
    setCatError('');
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c: ExpenseCategoryItem) => {
    setEditingCategoryId(c.id);
    setCatName(c.name);
    setCatColor(c.color);
    setCatIsProduction(c.isProductionRelated);
    setCatError('');
    setCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatLoading(true);
    setCatError('');

    if (editingCategoryId) {
      const res = await updateExpenseCategory({
        id: editingCategoryId,
        name: catName,
        color: catColor,
        isProductionRelated: catIsProduction,
        partnerId: partner.id,
      });
      setCatLoading(false);
      if (res.success && res.data) {
        setCategories((prev) =>
          prev.map((c) => (c.id === editingCategoryId ? { ...c, ...res.data } : c))
        );
        setCategoryModalOpen(false);
      } else {
        setCatError(res.error || 'Failed to update category.');
      }
    } else {
      const res = await addExpenseCategory({
        name: catName,
        color: catColor,
        isProductionRelated: catIsProduction,
        partnerId: partner.id,
      });
      setCatLoading(false);
      if (res.success && res.data) {
        setCategories((prev) => [...prev, res.data as any]);
        setCategoryModalOpen(false);
      } else {
        setCatError(res.error || 'Failed to add category.');
      }
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    const res = await deleteExpenseCategory(id, partner.id);
    if (res.success) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete category.');
    }
  };

  // --- 2. Products / Bottle Variants Modals ---
  const [products, setProducts] = useState(initialProducts);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Cold Brew');
  const [prodVariant, setProdVariant] = useState('');
  const [prodSize, setProdSize] = useState('180ml');
  const [prodUnit, setProdUnit] = useState('bottles');
  const [prodSellingPrice, setProdSellingPrice] = useState('120');
  const [prodStandardCost, setProdStandardCost] = useState('45');
  const [prodMinStock, setProdMinStock] = useState('20');
  const [prodNotes, setProdNotes] = useState('');
  const [prodLoading, setProdLoading] = useState(false);
  const [prodError, setProdError] = useState('');

  const openAddProduct = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory('Cold Brew');
    setProdVariant('Classic Cold Brew');
    setProdSize('180ml');
    setProdUnit('bottles');
    setProdSellingPrice('120');
    setProdStandardCost('45');
    setProdMinStock('20');
    setProdNotes('');
    setProdError('');
    setProductModalOpen(true);
  };

  const openEditProduct = (p: ProductItem) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdCategory(p.category);
    setProdVariant(p.variant);
    setProdSize(p.size);
    setProdUnit(p.unit);
    setProdSellingPrice(String(p.sellingPrice));
    setProdStandardCost(String(p.standardCost));
    setProdMinStock(String(p.minStock));
    setProdNotes(p.notes || '');
    setProdError('');
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProdLoading(true);
    setProdError('');

    const price = parseFloat(prodSellingPrice);
    const cost = parseFloat(prodStandardCost);
    const minStock = parseFloat(prodMinStock);

    if (editingProductId) {
      const res = await updateProduct({
        id: editingProductId,
        name: prodName,
        category: prodCategory,
        variant: prodVariant,
        size: prodSize,
        unit: prodUnit,
        sellingPrice: price,
        standardCost: cost,
        minStock,
        notes: prodNotes,
        partnerId: partner.id,
      });
      setProdLoading(false);
      if (res.success && res.data) {
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProductId ? { ...p, ...res.data } : p))
        );
        setProductModalOpen(false);
      } else {
        setProdError(res.error || 'Failed to update product.');
      }
    } else {
      const res = await createProduct({
        name: prodName,
        category: prodCategory,
        variant: prodVariant,
        size: prodSize,
        unit: prodUnit,
        sellingPrice: price,
        standardCost: cost,
        minStock,
        notes: prodNotes,
        partnerId: partner.id,
      });
      setProdLoading(false);
      if (res.success && res.data) {
        setProducts((prev) => [...prev, res.data as any]);
        setProductModalOpen(false);
      } else {
        setProdError(res.error || 'Failed to create product.');
      }
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    const res = await deleteProduct(id, partner.id);
    if (res.success) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete product.');
    }
  };

  // --- 3. Suppliers Modals ---
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');
  const [supLoading, setSupLoading] = useState(false);
  const [supError, setSupError] = useState('');

  const openAddSupplier = () => {
    setEditingSupplierId(null);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setSupNotes('');
    setSupError('');
    setSupplierModalOpen(true);
  };

  const openEditSupplier = (s: SupplierItem) => {
    setEditingSupplierId(s.id);
    setSupName(s.name);
    setSupContact(s.contactPerson || '');
    setSupPhone(s.phone || '');
    setSupEmail(s.email || '');
    setSupAddress(s.address || '');
    setSupNotes(s.notes || '');
    setSupError('');
    setSupplierModalOpen(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupLoading(true);
    setSupError('');

    if (editingSupplierId) {
      const res = await updateSupplier({
        id: editingSupplierId,
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        notes: supNotes,
        partnerId: partner.id,
      });
      setSupLoading(false);
      if (res.success && res.data) {
        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplierId ? { ...s, ...res.data } : s))
        );
        setSupplierModalOpen(false);
      } else {
        setSupError(res.error || 'Failed to update supplier.');
      }
    } else {
      const res = await addSupplier({
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        notes: supNotes,
        partnerId: partner.id,
      });
      setSupLoading(false);
      if (res.success && res.data) {
        setSuppliers((prev) => [...prev, res.data as any]);
        setSupplierModalOpen(false);
      } else {
        setSupError(res.error || 'Failed to add supplier.');
      }
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete supplier "${name}"?`)) return;
    const res = await deleteSupplier(id, partner.id);
    if (res.success) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
      router.refresh();
    } else {
      alert(res.error || 'Failed to delete supplier.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100">
              Business Settings &amp; Master Data
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure company information, expense categories, product bottle catalog, and suppliers.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PROFILE'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Company Profile</span>
          </button>

          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CATEGORIES'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Expense Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'PRODUCTS'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('SUPPLIERS')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'SUPPLIERS'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Suppliers ({suppliers.length})</span>
          </button>
        </div>
      </div>

      {/* FIXED PARTNERS ENFORCEMENT NOTICE */}
      <div className="p-5 rounded-3xl bg-zinc-900 border border-amber-500/30 space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-100">
                Permanent Partner Governance (Fixed Architecture)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Equal 50/50 partnership between Nishant and Chinmay
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/25">
            Immutable 50/50
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">Partner 1: Nishant</div>
              <span className="text-[11px] text-zinc-400">Director / Admin Privileges</span>
            </div>
            <span className="text-sm font-bold text-amber-400 font-mono">50.0%</span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="font-bold text-zinc-200">Partner 2: Chinmay</div>
              <span className="text-[11px] text-zinc-400">Director / Admin Privileges</span>
            </div>
            <span className="text-sm font-bold text-emerald-400 font-mono">50.0%</span>
          </div>
        </div>
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleProfileSubmit} className="p-6 rounded-3xl bg-zinc-900/80 border border-zinc-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Building className="w-4 h-4 text-zinc-400" />
              Company Details &amp; Operational Parameters
            </h3>
            {profileSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {profileSuccess}
              </span>
            )}
            {profileError && (
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {profileError}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Company / Brand Name</label>
              <input
                type="text"
                required
                value={profileForm.businessName}
                onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Support / Contact Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Business Phone / WhatsApp</label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">Operating Currency</label>
              <select
                value={profileForm.currency}
                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="INR">INR (₹ Indian Rupee)</option>
                <option value="USD">USD ($ US Dollar)</option>
                <option value="EUR">EUR (€ Euro)</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">System Timezone</label>
              <select
                value={profileForm.timezone}
                onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1">
                Expiry Alert Threshold (Days)
              </label>
              <input
                type="number"
                min="1"
                value={profileForm.alertThresholdDays}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, alertThresholdDays: Number(e.target.value) })
                }
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-400 font-semibold mb-1">
                Brewery / Warehouse Facility Address
              </label>
              <input
                type="text"
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                className="w-full p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              {profileLoading ? 'Saving...' : 'Save Company Settings'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: EXPENSE CATEGORIES */}
      {activeTab === 'CATEGORIES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Expense Categories</h3>
              <p className="text-xs text-zinc-400">
                Manage cost classification categories for partner spending &amp; COGS analysis.
              </p>
            </div>
            <button
              onClick={openAddCategory}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              + Add Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div>
                    <h4 className="font-bold text-xs text-zinc-100">{cat.name}</h4>
                    <span className="text-[10px] text-zinc-400">
                      {cat.isProductionRelated ? 'Production (COGS)' : 'General Operating'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditCategory(cat)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-900/40 text-zinc-300 hover:text-amber-400 transition-colors"
                    title="Edit Category"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCT CATALOG */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Cold Brew Product Catalog</h3>
              <p className="text-xs text-zinc-400">
                Define bottle formats (180ml, 1L), default wholesale rates, and target production costs.
              </p>
            </div>
            <button
              onClick={openAddProduct}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              + Add Product
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 font-semibold">
                  <th className="py-3 px-4">Product Name &amp; SKU</th>
                  <th className="py-3 px-4">Size &amp; Format</th>
                  <th className="py-3 px-4 text-right">Wholesale Rate</th>
                  <th className="py-3 px-4 text-right">Standard Cost</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-zinc-500">
                      No products defined yet. Click &ldquo;Add Product&rdquo; above.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const margin = p.sellingPrice - p.standardCost;
                    const marginPct = p.sellingPrice > 0 ? (margin / p.sellingPrice) * 100 : 0;
                    return (
                      <tr key={p.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-zinc-100">{p.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">{p.sku}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-zinc-800 border border-zinc-700 font-mono text-[11px] font-bold text-zinc-200">
                            {p.size}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-300">
                          {formatCurrency(p.standardCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          <span className={marginPct >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                            {marginPct.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-900/40 text-zinc-300 hover:text-amber-400 transition-colors"
                              title="Edit Product"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPLIERS */}
      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Supplier &amp; Vendor Directory</h3>
              <p className="text-xs text-zinc-400">
                Direct contacts for green coffee estates, bottle manufacturers, caps, and packaging suppliers.
              </p>
            </div>
            <button
              onClick={openAddSupplier}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-950/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              + Add Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suppliers.length === 0 ? (
              <div className="sm:col-span-2 p-8 text-center text-zinc-500 rounded-2xl bg-zinc-900 border border-dashed border-zinc-800 text-xs">
                No suppliers logged yet. Click &ldquo;Add Supplier&rdquo; above.
              </div>
            ) : (
              suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">{s.name}</h4>
                      {s.contactPerson && (
                        <span className="text-xs text-zinc-400 block mt-0.5">
                          Contact: <strong className="text-zinc-300">{s.contactPerson}</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditSupplier(s)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-amber-900/40 text-zinc-300 hover:text-amber-400 transition-colors"
                        title="Edit Supplier"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(s.id, s.name)}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/40 text-zinc-400 hover:text-rose-400 transition-colors"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-400">
                    {s.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span className="font-mono">{s.phone}</span>
                      </div>
                    )}
                    {s.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span className="font-mono">{s.email}</span>
                      </div>
                    )}
                    {s.address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-zinc-500" />
                        <span>{s.address}</span>
                      </div>
                    )}
                  </div>

                  {s.notes && (
                    <div className="pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-400 italic">
                      {s.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: EXPENSE CATEGORY (ADD / EDIT) */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">
                {editingCategoryId ? 'Edit Expense Category' : 'Add Expense Category'}
              </h3>
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {catError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {catError}
              </div>
            )}

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raw Material, Packaging, Marketing..."
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Badge Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="flex-1 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catIsProd"
                  checked={catIsProduction}
                  onChange={(e) => setCatIsProduction(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-800 text-amber-500 focus:ring-0"
                />
                <label htmlFor="catIsProd" className="text-zinc-300 cursor-pointer">
                  Direct Production / COGS Expense (used in bottle unit cost calculation)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catLoading}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-950/40"
                >
                  {catLoading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRODUCT (ADD / EDIT) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">
                {editingProductId ? 'Edit Cold Brew Product' : 'Add Cold Brew Product'}
              </h3>
              <button
                onClick={() => setProductModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {prodError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {prodError}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Product Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Classic Bold Cold Brew 180ml"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Flavor / Variant</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arabica 100%, Cranberry Cold Brew"
                    value={prodVariant}
                    onChange={(e) => setProdVariant(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Bottle Format / Size</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 180ml, 1L, 250ml"
                    value={prodSize}
                    onChange={(e) => setProdSize(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Selling / Wholesale Rate (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={prodSellingPrice}
                    onChange={(e) => setProdSellingPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">
                    Target Standard Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={prodStandardCost}
                    onChange={(e) => setProdStandardCost(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Min Safe Stock (Bottles)</label>
                  <input
                    type="number"
                    min="0"
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Product Description / Notes</label>
                <input
                  type="text"
                  value={prodNotes}
                  onChange={(e) => setProdNotes(e.target.value)}
                  placeholder="Recommended steep time, tasting notes, shelf life..."
                  className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prodLoading}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-950/40"
                >
                  {prodLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPPLIER (ADD / EDIT) */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-100">
                {editingSupplierId ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button
                onClick={() => setSupplierModalOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {supError}
              </div>
            )}

            <form onSubmit={handleSupplierSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Supplier Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Origin Estates, Apex Glass Ltd"
                    value={supName}
                    onChange={(e) => setSupName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Phone / WhatsApp</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Warehouse / Estate Address</label>
                  <input
                    type="text"
                    value={supAddress}
                    onChange={(e) => setSupAddress(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-zinc-400 font-semibold mb-1">Notes &amp; Supplies Handled</label>
                  <input
                    type="text"
                    value={supNotes}
                    onChange={(e) => setSupNotes(e.target.value)}
                    placeholder="e.g. Specialty Arabica beans, 180ml amber bottles..."
                    className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supLoading}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-950/40"
                >
                  {supLoading ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
