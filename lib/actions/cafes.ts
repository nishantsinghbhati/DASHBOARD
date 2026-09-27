'use server';

import { safeRevalidatePath } from '@/lib/utils';
import { prisma } from '@/lib/db/prisma';

export async function addCafe(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  website?: string;
  location?: string;
  city?: string;
  area?: string;
  leadSource?: string;
  status?: string; // 'TO_PITCH' | 'PITCHED' | 'ACCEPTED' | 'REJECTED' | 'CUSTOMER' | 'NEW'
  pitchDate?: string | Date;
  pitchNotes?: string;
  rejectionReason?: string;
  estMonthlyRequirement?: number;
  productInterest?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      instagram,
      website,
      location,
      city = 'Bengaluru',
      area,
      leadSource = 'Pitch Outreach',
      status = 'TO_PITCH',
      pitchDate,
      pitchNotes,
      rejectionReason,
      estMonthlyRequirement,
      productInterest,
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!name.trim()) {
      return { success: false, error: 'Café name is required.' };
    }

    const cafe = await prisma.$transaction(async (tx) => {
      const c = await tx.cafe.create({
        data: {
          name: name.trim(),
          contactPerson,
          phone,
          email,
          instagram,
          website,
          location,
          city,
          area,
          leadSource,
          estMonthlyRequirement,
          productInterest,
          notes,
          status,
          pitchDate: pitchDate ? new Date(pitchDate) : (status === 'PITCHED' ? new Date() : null),
          pitchNotes,
          rejectionReason,
          lastContacted: new Date(),
        },
      });

      await tx.cafeStatusHistory.create({
        data: {
          cafeId: c.id,
          oldStatus: null,
          newStatus: status,
          changedBy: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          notes: pitchNotes || `Added to CRM / Pitch list as ${status}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_ADDED',
          entity: 'Cafe',
          entityId: c.id,
          oldValue: null,
          newValue: c.name,
          details: `Added café "${c.name}" with status ${status} in ${area || city}`,
        },
      });

      return c;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/cafes/pitching');
    safeRevalidatePath('/');
    return { success: true, data: cafe };
  } catch (error: any) {
    console.error('Error adding cafe:', error);
    return { success: false, error: error.message || 'Unable to add café.' };
  }
}

export async function updateCafeStatus(params: {
  cafeId: string;
  newStatus: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const { cafeId, newStatus, notes, partnerId = 'PARTNER_NISHANT' } = params;

    const result = await prisma.$transaction(async (tx) => {
      const cafe = await tx.cafe.findUnique({ where: { id: cafeId } });
      if (!cafe) throw new Error('Café not found.');

      const oldStatus = cafe.status;
      if (oldStatus === newStatus && !notes) return cafe;

      const updated = await tx.cafe.update({
        where: { id: cafeId },
        data: {
          status: newStatus,
          lastContacted: new Date(),
          ...(newStatus === 'PITCHED' && !cafe.pitchDate ? { pitchDate: new Date() } : {}),
        },
      });

      await tx.cafeStatusHistory.create({
        data: {
          cafeId,
          oldStatus,
          newStatus,
          changedBy: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          notes: notes || `Moved pipeline status to ${newStatus}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_STATUS_UPDATED',
          entity: 'Cafe',
          entityId: cafe.id,
          oldValue: oldStatus,
          newValue: newStatus,
          details: `Updated "${cafe.name}" status from ${oldStatus} to ${newStatus}`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/cafes/pitching');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating cafe status:', error);
    return { success: false, error: error.message || 'Unable to update status.' };
  }
}

export async function updateCafePitchStatus(params: {
  cafeId: string;
  status: 'TO_PITCH' | 'PITCHED' | 'ACCEPTED' | 'REJECTED' | string;
  pitchNotes?: string;
  rejectionReason?: string;
  pitchDate?: string | Date;
  partnerId?: string;
}) {
  try {
    const {
      cafeId,
      status,
      pitchNotes,
      rejectionReason,
      pitchDate,
      partnerId = 'PARTNER_NISHANT',
    } = params;

    const result = await prisma.$transaction(async (tx) => {
      const cafe = await tx.cafe.findUnique({ where: { id: cafeId } });
      if (!cafe) throw new Error('Café not found.');

      const oldStatus = cafe.status;

      const updated = await tx.cafe.update({
        where: { id: cafeId },
        data: {
          status,
          pitchNotes: pitchNotes !== undefined ? pitchNotes : cafe.pitchNotes,
          rejectionReason: rejectionReason !== undefined ? rejectionReason : cafe.rejectionReason,
          pitchDate: pitchDate ? new Date(pitchDate) : (status === 'PITCHED' && !cafe.pitchDate ? new Date() : cafe.pitchDate),
          lastContacted: new Date(),
        },
      });

      await tx.cafeStatusHistory.create({
        data: {
          cafeId,
          oldStatus,
          newStatus: status,
          changedBy: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          notes: pitchNotes || `Pitch status updated to ${status}`,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_PITCH_UPDATED',
          entity: 'Cafe',
          entityId: cafe.id,
          oldValue: oldStatus,
          newValue: status,
          details: `Pitch updated for "${cafe.name}" to ${status}${rejectionReason ? ` (Reason: ${rejectionReason})` : ''}`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/cafes/pitching');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating pitch status:', error);
    return { success: false, error: error.message || 'Failed to update pitch status.' };
  }
}

export async function recordCafePayment(params: {
  cafeId: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      cafeId,
      amount,
      paymentMethod = 'UPI',
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = params;

    if (amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const cafe = await tx.cafe.findUnique({
        where: { id: cafeId },
        include: {
          sales: {
            where: {
              paymentStatus: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            },
            orderBy: { date: 'asc' }, // Oldest pending invoice first
          },
        },
      });

      if (!cafe) throw new Error('Café not found.');

      let remainingPayment = amount;

      for (const sale of cafe.sales) {
        if (remainingPayment <= 0) break;

        const currentPaid = sale.amountPaid || 0;
        const pendingOnSale = Math.max(0, sale.total - currentPaid);

        if (pendingOnSale <= 0) continue;

        const payTowardsSale = Math.min(remainingPayment, pendingOnSale);
        const newPaid = currentPaid + payTowardsSale;
        const newStatus = newPaid >= sale.total ? 'PAID' : 'PARTIAL';

        await tx.sale.update({
          where: { id: sale.id },
          data: {
            amountPaid: Math.round(newPaid * 100) / 100,
            paymentStatus: newStatus,
            paymentMethod,
          },
        });

        remainingPayment -= payTowardsSale;
      }

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_PAYMENT_RECEIVED',
          entity: 'Cafe',
          entityId: cafe.id,
          oldValue: null,
          newValue: `₹${amount}`,
          details: `Received ₹${amount} payment from ${cafe.name} via ${paymentMethod}. ${notes || ''}`,
        },
      });

      return { cafe, remainingPayment };
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/sales');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error recording cafe payment:', error);
    return { success: false, error: error.message || 'Failed to record payment.' };
  }
}

export async function createFollowUp(params: {
  cafeId: string;
  title: string;
  dueDate: string;
  notes?: string;
}) {
  try {
    const { cafeId, title, dueDate, notes } = params;
    const followUp = await prisma.followUp.create({
      data: {
        cafeId,
        title,
        dueDate: new Date(dueDate),
        notes,
      },
    });

    safeRevalidatePath('/cafes');
    return { success: true, data: followUp };
  } catch (error: any) {
    console.error('Error creating follow up:', error);
    return { success: false, error: error.message || 'Unable to create follow-up.' };
  }
}

export async function completeFollowUp(id: string) {
  try {
    await prisma.followUp.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
    safeRevalidatePath('/cafes');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateCafe(data: {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  instagram?: string;
  website?: string;
  location?: string;
  city?: string;
  area?: string;
  status?: string;
  estMonthlyRequirement?: number;
  productInterest?: string;
  pitchNotes?: string;
  notes?: string;
  partnerId?: string;
}) {
  try {
    const {
      id,
      name,
      contactPerson,
      phone,
      email,
      instagram,
      website,
      location,
      city,
      area,
      status,
      estMonthlyRequirement,
      productInterest,
      pitchNotes,
      notes,
      partnerId = 'PARTNER_NISHANT',
    } = data;

    if (!id || !name.trim()) {
      return { success: false, error: 'Café ID and name are required.' };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.cafe.findUnique({ where: { id } });
      if (!existing) throw new Error('Café not found.');

      const updated = await tx.cafe.update({
        where: { id },
        data: {
          name: name.trim(),
          contactPerson,
          phone,
          email,
          instagram,
          website,
          location,
          city,
          area,
          ...(status ? { status } : {}),
          estMonthlyRequirement,
          productInterest,
          ...(pitchNotes !== undefined ? { pitchNotes } : {}),
          notes,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: partnerId,
          partnerName: partnerId.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_UPDATED',
          entity: 'Cafe',
          entityId: updated.id,
          oldValue: `${existing.name} (${existing.status})`,
          newValue: `${updated.name} (${updated.status})`,
          details: `Updated details for café "${updated.name}" (${updated.status})`,
        },
      });

      return updated;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/cafes/pitching');
    safeRevalidatePath('/pipeline');
    safeRevalidatePath('/sales');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error updating cafe:', error);
    return { success: false, error: error.message || 'Unable to update café.' };
  }
}

export async function deleteCafe(id: string, partnerId?: string) {
  try {
    if (!id) return { success: false, error: 'Café ID is required.' };

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.cafe.findUnique({
        where: { id },
        include: {
          sales: true,
          statusHistory: true,
          followUps: true,
        },
      });

      if (!existing) throw new Error('Café not found.');

      if (existing.sales.length > 0) {
        throw new Error('Cannot delete this café because it has recorded sales history.');
      }

      await tx.cafeStatusHistory.deleteMany({ where: { cafeId: id } });
      await tx.followUp.deleteMany({ where: { cafeId: id } });
      await tx.cafe.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          userId: partnerId || 'PARTNER_NISHANT',
          partnerName: partnerId?.includes('CHINMAY') ? 'Chinmay' : 'Nishant',
          action: 'CAFE_DELETED',
          entity: 'Cafe',
          entityId: id,
          oldValue: existing.name,
          newValue: null,
          details: `Deleted café lead "${existing.name}"`,
        },
      });

      return existing;
    });

    safeRevalidatePath('/cafes');
    safeRevalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Error deleting cafe:', error);
    return { success: false, error: error.message || 'Unable to delete café.' };
  }
}
