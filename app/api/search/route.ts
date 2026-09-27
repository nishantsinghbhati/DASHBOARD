import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() || '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const query = q.toLowerCase();

  const [batches, lots, rawMaterials, products, cafes, sales] = await Promise.all([
    prisma.productionBatch.findMany({
      where: {
        OR: [
          { batchNumber: { contains: query } },
          { notes: { contains: query } },
          { product: { name: { contains: query } } },
        ],
      },
      include: { product: true },
      take: 5,
    }),
    prisma.finishedGoodsLot.findMany({
      where: {
        OR: [
          { lotNumber: { contains: query } },
          { product: { name: { contains: query } } },
        ],
      },
      include: { product: true },
      take: 5,
    }),
    prisma.inventoryItem.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { category: { contains: query } },
        ],
      },
      take: 5,
    }),
    prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { sku: { contains: query } },
          { variant: { contains: query } },
        ],
      },
      take: 5,
    }),
    prisma.cafe.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { contactPerson: { contains: query } },
          { area: { contains: query } },
        ],
      },
      take: 5,
    }),
    prisma.sale.findMany({
      where: {
        OR: [
          { saleNumber: { contains: query } },
          { cafe: { name: { contains: query } } },
        ],
      },
      include: { cafe: true },
      take: 5,
    }),
  ]);

  const results: Array<{
    type: 'Batch' | 'Lot' | 'Raw Material' | 'Product' | 'Café' | 'Sale';
    title: string;
    subtitle: string;
    url: string;
    badge?: string;
  }> = [];

  batches.forEach((b) => {
    results.push({
      type: 'Batch',
      title: `${b.batchNumber} (${b.product.name})`,
      subtitle: `${b.actualOutput} bottles produced • Yield ${b.yieldPercent}%`,
      url: `/production/${b.batchNumber}`,
      badge: b.status,
    });
  });

  lots.forEach((l) => {
    results.push({
      type: 'Lot',
      title: `${l.lotNumber} - ${l.product.name}`,
      subtitle: `${l.quantityAvailable} avail / ${l.quantityProduced} produced • ₹${l.unitCost}/ea`,
      url: `/inventory/finished-goods#${l.lotNumber}`,
      badge: l.status,
    });
  });

  rawMaterials.forEach((rm) => {
    results.push({
      type: 'Raw Material',
      title: rm.name,
      subtitle: `${rm.currentQuantity} ${rm.unit} in stock (${rm.category})`,
      url: rm.isCoffeeBean ? `/inventory/coffee-beans#${rm.sku}` : `/inventory/raw-materials#${rm.sku}`,
      badge: `${rm.currentQuantity} ${rm.unit}`,
    });
  });

  products.forEach((p) => {
    results.push({
      type: 'Product',
      title: p.name,
      subtitle: `Selling ₹${p.sellingPrice} • Std Cost ₹${p.standardCost}`,
      url: `/inventory/finished-goods`,
      badge: p.size,
    });
  });

  cafes.forEach((c) => {
    results.push({
      type: 'Café',
      title: c.name,
      subtitle: `${c.area || c.city} • Lead: ${c.contactPerson || 'Direct'}`,
      url: `/cafes#${c.id}`,
      badge: c.status,
    });
  });

  sales.forEach((s) => {
    results.push({
      type: 'Sale',
      title: `${s.saleNumber} - ₹${s.total.toLocaleString('en-IN')}`,
      subtitle: `Customer: ${s.cafe?.name || 'B2B Client'} (${s.paymentStatus})`,
      url: `/sales#${s.saleNumber}`,
      badge: s.paymentStatus,
    });
  });

  return NextResponse.json({ results });
}
