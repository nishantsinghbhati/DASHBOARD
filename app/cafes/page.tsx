import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { CafeAccountsClient } from '@/components/cafes/CafeAccountsClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CafesPage() {
  const cafes = await prisma.cafe.findMany({
    include: {
      sales: {
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return <CafeAccountsClient cafes={cafes as any} />;
}
