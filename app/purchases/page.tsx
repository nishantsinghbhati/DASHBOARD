import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { PurchasesClient } from '@/components/purchases/PurchasesClient';

export const metadata = {
  title: 'Procurement & Purchases | Brew 1671',
  description: 'Track coffee beans, packaging, water, and supply purchases.',
};

export default async function PurchasesPage() {
  // Fetch all purchase transactions
  const purchaseTxs = await prisma.inventoryTransaction.findMany({
    where: {
      type: 'PURCHASE',
    },
    include: {
      inventoryItem: {
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
        },
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  // Fetch all suppliers with their inventory items
  const suppliersRaw = await prisma.supplier.findMany({
    include: {
      inventoryItems: {
        select: {
          id: true,
          name: true,
          currentStockValue: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  // Compute total spent per supplier from purchase records
  const suppliers = suppliersRaw.map((s) => {
    const matchingTxs = purchaseTxs.filter((tx) =>
      (tx.notes || '').toLowerCase().includes(s.name.toLowerCase())
    );
    const totalSpent = matchingTxs.reduce((sum, tx) => sum + tx.totalCost, 0);
    const itemsSupplied = Array.from(new Set(matchingTxs.map((tx) => tx.inventoryItem.name)));

    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      phone: s.phone,
      totalSpent,
      itemsSupplied,
    };
  });

  // Fetch existing items for quick autocomplete
  const existingItems = await prisma.inventoryItem.findMany({
    where: { isActive: true },
    select: {
      name: true,
      category: true,
      unit: true,
      currentQuantity: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <PurchasesClient
        purchases={purchaseTxs as any}
        suppliers={suppliers}
        existingItems={existingItems}
      />
    </div>
  );
}
