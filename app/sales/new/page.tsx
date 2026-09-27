import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { RecordSaleForm } from '@/components/sales/RecordSaleForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewSalePage() {
  const [products, cafes, coffeeBeans] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        finishedGoodsLots: {
          where: { quantityAvailable: { gt: 0 } },
          orderBy: { productionDate: 'asc' }, // FIFO order
        },
      },
      orderBy: { name: 'asc' },
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/sales"
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-emerald-500" />
            Record B2B Sale
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            180ml and 1L cold brew bottles fulfillment with bean flavor traceability.
          </p>
        </div>
      </div>

      <RecordSaleForm products={products} cafes={cafes} coffeeBeans={coffeeBeans} />
    </div>
  );
}
