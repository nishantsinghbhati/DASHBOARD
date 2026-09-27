import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { SettingsClientView } from '@/components/settings/SettingsClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  const [settings, expenseCategories, products, suppliers] = await Promise.all([
    prisma.settings.findFirst(),
    prisma.expenseCategory.findMany({
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      include: {
        _count: { select: { inventoryItems: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const defaultSettings = settings || {
    businessName: 'BREWW 1671',
    logoUrl: '/breww1671-logo.png',
    email: 'founders@breww1671.com',
    phone: '+91 98765 43210',
    address: 'Bengaluru, Karnataka',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    alertThresholdDays: 15,
  };

  return (
    <SettingsClientView
      settings={defaultSettings}
      expenseCategories={expenseCategories as any}
      products={products as any}
      suppliers={suppliers as any}
    />
  );
}
