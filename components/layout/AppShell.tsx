'use client';

import React, { useState } from 'react';
import { PartnerProvider } from '@/lib/auth/partner-client';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <PartnerProvider>
      <div className="min-h-screen bg-[#0d0e12] text-zinc-100 flex flex-col antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </PartnerProvider>
  );
}
