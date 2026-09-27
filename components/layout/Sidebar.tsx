'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Boxes,
  Coffee,
  Package,
  Layers,
  ShoppingBag,
  Receipt,
  Users,
  Store,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronRight,
  Target,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePartner } from '@/lib/auth/partner-client';

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const { partner } = usePartner();

  const navItems = [
    {
      title: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      matchExact: true,
    },
    {
      title: 'Purchases & Supplies',
      href: '/purchases',
      icon: ShoppingBag,
    },
    {
      title: 'Café Pipeline',
      href: '/cafes/pitching',
      icon: Target,
    },
    {
      title: 'Sales & Deliveries',
      href: '/sales',
      icon: Store,
    },
    {
      title: 'Brew Batches',
      href: '/production',
      icon: Coffee,
    },
    {
      title: 'Packaging & Stock',
      href: '/inventory',
      icon: Boxes,
      subItems: [
        { title: 'Stock Overview', href: '/inventory', icon: Boxes },
        { title: 'Coffee Beans', href: '/inventory/coffee-beans', icon: Coffee },
        { title: 'Packaging Materials', href: '/inventory/raw-materials', icon: Layers },
        { title: 'Bottled Cold Brew', href: '/inventory/finished-goods', icon: Package },
      ],
    },
    {
      title: 'Expenses & 50/50 Split',
      href: '/expenses',
      icon: Receipt,
      subItems: [
        { title: 'All Expenses', href: '/expenses', icon: Receipt },
        { title: '50-50 Partner Split', href: '/partners', icon: Users },
      ],
    },
    {
      title: 'Café Accounts & Dues',
      href: '/cafes',
      icon: DollarSign,
    },
    {
      title: 'Reports & Analytics',
      href: '/reports',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      href: '/settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950/95 border-r border-zinc-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-30',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Mobile top close button & Brand header */}
          <div className="h-16 px-5 border-b border-zinc-800/70 flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-500" />
              <span className="font-bold text-zinc-100">BREWW 1671</span>
            </div>
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md"
            >
              Close
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Core Operations
            </div>

            {navItems.map((item) => {
              const isActive = item.matchExact
                ? pathname === item.href
                : pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

              return (
                <div key={item.href} className="space-y-0.5">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group',
                      isActive
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive
                            ? 'text-amber-400'
                            : 'text-zinc-400 group-hover:text-zinc-300'
                        )}
                      />
                      <span>{item.title}</span>
                    </div>
                    {item.subItems && (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                  </Link>

                  {/* Sub-items */}
                  {item.subItems && (
                    <div className="pl-6 pr-1 py-0.5 space-y-0.5">
                      {item.subItems.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors',
                              isSubActive
                                ? 'bg-amber-500/15 text-amber-300 font-semibold'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                            )}
                          >
                            <sub.icon className="w-3.5 h-3.5" />
                            <span>{sub.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Partner Equity Badge */}
          <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40">
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <div className="text-[11px]">
                  <div className="font-bold text-zinc-200">50 / 50 Ownership</div>
                  <div className="text-zinc-400 text-[10px]">
                    Nishant (50%) • Chinmay (50%)
                  </div>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
