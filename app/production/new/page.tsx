import React from 'react';
import Link from 'next/link';
import { Layers, ArrowLeft } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { ProductionBatchForm } from '@/components/production/ProductionBatchForm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function NewProductionBatchPage() {
  const [rawMaterials, products, batchCount] = await Promise.all([
    prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.productionBatch.count(),
  ]);

  const year = new Date().getFullYear();
  const suggestedBatchNumber = `CB-${year}-${String(batchCount + 1).padStart(3, '0')}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link
          href="/production"
          className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            Create Production Batch
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Atomically converts Raw Materials into a batch-tracked Finished Goods Lot
          </p>
        </div>
      </div>

      <ProductionBatchForm
        rawMaterials={rawMaterials}
        products={products}
        suggestedBatchNumber={suggestedBatchNumber}
      />
    </div>
  );
}
