import React from 'react';
import { prisma } from '@/lib/db/prisma';
import { CafePitchingClient } from '@/components/cafes/CafePitchingClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CafePitchingPage() {
  const cafes = await prisma.cafe.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return <CafePitchingClient initialCafes={cafes as any} />;
}
