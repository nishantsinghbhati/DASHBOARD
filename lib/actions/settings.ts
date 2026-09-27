'use server';

import { prisma } from '@/lib/db/prisma';
import { safeRevalidatePath } from '@/lib/utils';
import { getServerPartner } from '@/lib/auth/server';

// 1. Business Profile & System Settings
export async function updateBusinessSettings(data: {
  businessName: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  alertThresholdDays?: number;
  partnerId?: string;
}) {
  try {
    const {
      businessName,
      email,
      phone,
      address,
      currency = 'INR',
      timezone = 'Asia/Kolkata',
      alertThresholdDays = 15,
      partnerId,
    } = data;

    if (!businessName?.trim()) {
      return { success: false, error: 'Business name is required.' };
    }

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existingSettings = await prisma.settings.findFirst();

    let settings;
    if (existingSettings) {
      settings = await prisma.settings.update({
        where: { id: existingSettings.id },
        data: {
          businessName: businessName.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          currency,
          timezone,
          alertThresholdDays: Number(alertThresholdDays) || 15,
        },
      });
    } else {
      settings = await prisma.settings.create({
        data: {
          businessName: businessName.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          currency,
          timezone,
          alertThresholdDays: Number(alertThresholdDays) || 15,
        },
      });
    }

    // Also update Business model if present
    const existingBusiness = await prisma.business.findFirst();
    if (existingBusiness) {
      await prisma.business.update({
        where: { id: existingBusiness.id },
        data: {
          name: businessName.trim(),
          email: email?.trim() || null,
          phone: phone?.trim() || null,
          address: address?.trim() || null,
          currency,
          timezone,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'SETTINGS_UPDATED',
        entity: 'Settings',
        entityId: settings.id,
        oldValue: existingSettings ? existingSettings.businessName : null,
        newValue: businessName,
        details: `Updated company profile: "${businessName}", currency: ${currency}, timezone: ${timezone}`,
      },
    });

    safeRevalidatePath('/settings');
    safeRevalidatePath('/');
    return { success: true, data: settings };
  } catch (error: any) {
    console.error('Error updating business settings:', error);
    return { success: false, error: error.message || 'Failed to update settings.' };
  }
}

// 2. Expense Categories
export async function addExpenseCategory(data: {
  name: string;
  color?: string;
  isProductionRelated?: boolean;
  partnerId?: string;
}) {
  try {
    const { name, color = '#64748b', isProductionRelated = false, partnerId } = data;
    if (!name?.trim()) return { success: false, error: 'Category name is required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.expenseCategory.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return { success: false, error: `Category "${name}" already exists.` };
    }

    const cat = await prisma.expenseCategory.create({
      data: {
        name: name.trim(),
        color,
        isProductionRelated,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'EXPENSE_CATEGORY_CREATED',
        entity: 'ExpenseCategory',
        entityId: cat.id,
        newValue: cat.name,
        details: `Created new expense category "${cat.name}"`,
      },
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/settings');
    return { success: true, data: cat };
  } catch (error: any) {
    console.error('Error adding expense category:', error);
    return { success: false, error: error.message || 'Failed to add expense category.' };
  }
}

export async function updateExpenseCategory(data: {
  id: string;
  name: string;
  color?: string;
  isProductionRelated?: boolean;
  partnerId?: string;
}) {
  try {
    const { id, name, color, isProductionRelated, partnerId } = data;
    if (!id || !name?.trim()) {
      return { success: false, error: 'Category ID and name are required.' };
    }

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.expenseCategory.findUnique({ where: { id } });
    if (!existing) throw new Error('Category not found.');

    const updated = await prisma.expenseCategory.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(color ? { color } : {}),
        ...(isProductionRelated !== undefined ? { isProductionRelated } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'EXPENSE_CATEGORY_UPDATED',
        entity: 'ExpenseCategory',
        entityId: id,
        oldValue: existing.name,
        newValue: updated.name,
        details: `Updated expense category "${existing.name}" to "${updated.name}"`,
      },
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/settings');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating expense category:', error);
    return { success: false, error: error.message || 'Failed to update expense category.' };
  }
}

export async function deleteExpenseCategory(id: string, partnerId?: string) {
  try {
    if (!id) return { success: false, error: 'Category ID is required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.expenseCategory.findUnique({
      where: { id },
      include: { expenses: true },
    });

    if (!existing) throw new Error('Category not found.');

    if (existing.expenses.length > 0) {
      return {
        success: false,
        error: `Cannot delete category "${existing.name}" because it has ${existing.expenses.length} linked expenses. Reassign or delete those expenses first.`,
      };
    }

    await prisma.expenseCategory.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'EXPENSE_CATEGORY_DELETED',
        entity: 'ExpenseCategory',
        entityId: id,
        oldValue: existing.name,
        details: `Deleted expense category "${existing.name}"`,
      },
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting expense category:', error);
    return { success: false, error: error.message || 'Failed to delete expense category.' };
  }
}

// 3. Suppliers Management
export async function addSupplier(data: {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const { name, contactPerson, email, phone, address, notes, partnerId } = data;
    if (!name?.trim()) return { success: false, error: 'Supplier name is required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'SUPPLIER_CREATED',
        entity: 'Supplier',
        entityId: supplier.id,
        newValue: supplier.name,
        details: `Added new supplier "${supplier.name}"`,
      },
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/settings');
    return { success: true, data: supplier };
  } catch (error: any) {
    console.error('Error adding supplier:', error);
    return { success: false, error: error.message || 'Failed to add supplier.' };
  }
}

export async function updateSupplier(data: {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const { id, name, contactPerson, email, phone, address, notes, partnerId } = data;
    if (!id || !name?.trim()) return { success: false, error: 'Supplier ID and name are required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new Error('Supplier not found.');

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name: name.trim(),
        contactPerson: contactPerson?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'SUPPLIER_UPDATED',
        entity: 'Supplier',
        entityId: id,
        oldValue: existing.name,
        newValue: updated.name,
        details: `Updated supplier "${existing.name}" details.`,
      },
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/settings');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating supplier:', error);
    return { success: false, error: error.message || 'Failed to update supplier.' };
  }
}

export async function deleteSupplier(id: string, partnerId?: string) {
  try {
    if (!id) return { success: false, error: 'Supplier ID is required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.supplier.findUnique({
      where: { id },
      include: { inventoryItems: true },
    });

    if (!existing) throw new Error('Supplier not found.');

    if (existing.inventoryItems.length > 0) {
      return {
        success: false,
        error: `Cannot delete supplier "${existing.name}" because it is linked to ${existing.inventoryItems.length} inventory items.`,
      };
    }

    await prisma.supplier.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'SUPPLIER_DELETED',
        entity: 'Supplier',
        entityId: id,
        oldValue: existing.name,
        details: `Deleted supplier "${existing.name}"`,
      },
    });

    safeRevalidatePath('/purchases');
    safeRevalidatePath('/inventory');
    safeRevalidatePath('/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting supplier:', error);
    return { success: false, error: error.message || 'Failed to delete supplier.' };
  }
}

// 4. Finished Goods Lot
export async function updateFinishedGoodsLot(data: {
  id: string;
  status?: string;
  storageLocation?: string;
  bestBeforeDate?: string;
  expiryDate?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const { id, status, storageLocation, bestBeforeDate, expiryDate, notes, partnerId } = data;
    if (!id) return { success: false, error: 'Lot ID is required.' };

    const currentPartner = await getServerPartner();
    const actingPartnerId = partnerId || currentPartner.id;
    const actingPartnerName = actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant';

    const existing = await prisma.finishedGoodsLot.findUnique({ where: { id } });
    if (!existing) throw new Error('Finished goods lot not found.');

    const updated = await prisma.finishedGoodsLot.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(storageLocation !== undefined ? { storageLocation } : {}),
        ...(bestBeforeDate ? { bestBeforeDate: new Date(bestBeforeDate) } : {}),
        ...(expiryDate ? { expiryDate: new Date(expiryDate) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actingPartnerId,
        partnerName: actingPartnerName,
        action: 'LOT_UPDATED',
        entity: 'FinishedGoodsLot',
        entityId: id,
        oldValue: `${existing.lotNumber} (${existing.status})`,
        newValue: `${updated.lotNumber} (${status || existing.status})`,
        details: `Updated finished goods lot ${existing.lotNumber}.`,
      },
    });

    safeRevalidatePath('/inventory/finished-goods');
    safeRevalidatePath('/production');
    safeRevalidatePath('/');
    return { success: true, data: updated };
  } catch (error: any) {
    console.error('Error updating lot:', error);
    return { success: false, error: error.message || 'Failed to update lot.' };
  }
}
