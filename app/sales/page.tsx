import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { SalesLedgerClient } from '@/components/sales/SalesLedgerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SalesPage() {
  const [sales, cafes, coffeeBeans] = await Promise.all([
    prisma.sale.findMany({
      include: {
        cafe: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.cafe.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.inventoryItem.findMany({
      where: { isCoffeeBean: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <SalesLedgerClient
      initialSales={sales as any}
      cafes={cafes as any}
      coffeeBeans={coffeeBeans as any}
    />
  );
}
