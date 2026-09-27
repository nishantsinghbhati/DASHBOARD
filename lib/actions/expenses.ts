'use server';

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';
import { calculatePartnerSpending } from '@/lib/calculations/partners';

export async function addExpense(formData: {
  title: string;
  categoryId: string;
  amount: number;
  paidBy: 'Nishant' | 'Chinmay' | 'Business Account';
  paymentMethod?: string;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
  date?: string;
}) {
  try {
    const { title, categoryId, amount, paidBy, paymentMethod = 'UPI', vendor, receiptUrl, notes, date } = formData;

    if (!title || amount <= 0 || !categoryId) {
      return { success: false, error: 'Please enter a valid title, category, and positive amount.' };
    }

    const expDate = date ? new Date(date) : new Date();
    const partnerId =
      paidBy === 'Nishant'
        ? 'PARTNER_NISHANT'
        : paidBy === 'Chinmay'
        ? 'PARTNER_CHINMAY'
        : null;

    const expense = await prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          title,
          categoryId,
          amount,
          paidBy,
          partnerId,
          paymentMethod,
          vendor,
          receiptUrl,
          notes,
          date: expDate,
        },
        include: { category: true },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId || 'BUSINESS',
          partnerName: paidBy,
          action: 'EXPENSE_CREATED',
          entity: 'Expense',
          entityId: exp.id,
          oldValue: null,
          newValue: `₹${amount}`,
          details: `Logged expense "${title}" (${exp.category.name}) of ₹${amount} paid by ${paidBy}`,
        },
      });

      return exp;
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');
    return { success: true, data: expense };
  } catch (error: any) {
    console.error('Error adding expense:', error);
    return { success: false, error: error.message || 'Unable to record expense.' };
  }
}

export async function settlePartnerExpenses(params: {
  notes?: string;
  actingPartnerId?: string;
}) {
  try {
    const { notes, actingPartnerId = 'PARTNER_NISHANT' } = params;

    const result = await prisma.$transaction(async (tx) => {
      // Find all unsettled expenses
      const unsettledExpenses = await tx.expense.findMany({
        where: { isSettled: false },
      });

      if (unsettledExpenses.length === 0) {
        throw new Error('No unsettled expenses found to settle.');
      }

      const summary = calculatePartnerSpending(unsettledExpenses);
      if (summary.settlementAmount === 0 && summary.partnerTotalExpenses === 0) {
        throw new Error('All expenses are already balanced or zero.');
      }

      const settlementCount = await tx.settlement.count();
      const settlementNumber = `SETTLE-${new Date().getFullYear()}-${String(settlementCount + 1).padStart(3, '0')}`;

      // Create settlement record
      const settlement = await tx.settlement.create({
        data: {
          settlementNumber,
          date: new Date(),
          totalExpenses: summary.totalBusinessExpenses,
          nishantPaid: summary.nishantPaid,
          chinmayPaid: summary.chinmayPaid,
          nishantExpected: summary.expectedNishantContribution,
          chinmayExpected: summary.expectedChinmayContribution,
          settlementAmount: summary.settlementAmount,
          payerPartnerId: summary.payerId,
          receiverPartnerId: summary.receiverId,
          status: 'SETTLED',
          settledAt: new Date(),
          notes: notes || `Settlement between Nishant and Chinmay for ${unsettledExpenses.length} expense items.`,
        },
      });

      // Mark all these expenses as settled
      await tx.expense.updateMany({
        where: { id: { in: unsettledExpenses.map((e) => e.id) } },
        data: {
          isSettled: true,
          settlementId: settlement.id,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: actingPartnerId,
          partnerName: actingPartnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'SETTLEMENT_RESOLVED',
          entity: 'Settlement',
          entityId: settlement.id,
          oldValue: 'UNSETTLED',
          newValue: 'SETTLED',
          details: `Settled ${settlementNumber}: ${summary.payerName || 'Payer'} pays ₹${summary.settlementAmount} to ${summary.receiverName || 'Receiver'}`,
        },
      });

      return settlement;
    });

    safeRevalidatePath('/partners');
    safeRevalidatePath('/expenses');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error settling expenses:', error);
    return { success: false, error: error.message || 'Unable to settle expenses.' };
  }
}

export async function updateExpense(formData: {
  id: string;
  title: string;
  categoryId: string;
  amount: number;
  paidBy: 'Nishant' | 'Chinmay' | 'Business Account';
  paymentMethod?: string;
  vendor?: string;
  receiptUrl?: string;
  notes?: string;
  date?: string;
  partnerId?: string;
}) {
  try {
    const {
      id,
      title,
      categoryId,
      amount,
      paidBy,
      paymentMethod = 'UPI',
      vendor,
      receiptUrl,
      notes,
      date,
      partnerId: actingPartnerId,
    } = formData;

    if (!id || !title || amount <= 0 || !categoryId) {
      return { success: false, error: 'Please enter valid expense details.' };
    }

    const expDate = date ? new Date(date) : new Date();
    const targetPartnerId =
      paidBy === 'Nishant'
        ? 'PARTNER_NISHANT'
        : paidBy === 'Chinmay'
        ? 'PARTNER_CHINMAY'
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!existing) {
        throw new Error('Expense record not found.');
      }

      const updated = await tx.expense.update({
        where: { id },
        data: {
          title,
          categoryId,
          amount,
          paidBy,
          partnerId: targetPartnerId,
          paymentMethod,
          vendor,
          receiptUrl,
          notes,
          date: expDate,
        },
        include: { category: true },
      });

      await tx.auditLog.create({
        data: {
          userId: actingPartnerId || targetPartnerId || 'BUSINESS',
          partnerName: actingPartnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'EXPENSE_UPDATED',
          entity: 'Expense',
          entityId: updated.id,
          oldValue: `₹${existing.amount} (${existing.title})`,
          newValue: `₹${amount} (${title})`,
          details: `Updated expense #${id.slice(-6)}: "${title}" (₹${amount}, paid by ${paidBy})`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating expense:', error);
    return { success: false, error: error.message || 'Unable to update expense.' };
  }
}

export async function deleteExpense(id: string, actingPartnerId?: string) {
  try {
    if (!id) {
      return { success: false, error: 'Expense ID is required.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.expense.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Expense not found.');
      }

      await tx.expense.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          userId: actingPartnerId || existing.partnerId || 'BUSINESS',
          partnerName: actingPartnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'EXPENSE_DELETED',
          entity: 'Expense',
          entityId: id,
          oldValue: `₹${existing.amount} (${existing.title})`,
          newValue: null,
          details: `Deleted expense "${existing.title}" of ₹${existing.amount} paid by ${existing.paidBy}`,
        },
      });

      return existing;
    });

    safeRevalidatePath('/expenses');
    safeRevalidatePath('/partners');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return { success: false, error: error.message || 'Unable to delete expense.' };
  }
}
