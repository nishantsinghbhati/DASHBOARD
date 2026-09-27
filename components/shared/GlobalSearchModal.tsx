'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Layers, Package, Coffee, ShoppingBag, Store, Receipt, ArrowRight } from 'lucide-react';

interface SearchResult {
  type: 'Batch' | 'Lot' | 'Raw Material' | 'Product' | 'Café' | 'Sale';
  title: string;
  subtitle: string;
  url: string;
  badge?: string;
}

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'Batch':
        return <Layers className="w-4 h-4 text-amber-500" />;
      case 'Lot':
        return <Package className="w-4 h-4 text-emerald-500" />;
      case 'Raw Material':
        return <Coffee className="w-4 h-4 text-orange-400" />;
      case 'Product':
        return <ShoppingBag className="w-4 h-4 text-sky-400" />;
      case 'Café':
        return <Store className="w-4 h-4 text-purple-400" />;
      case 'Sale':
        return <Receipt className="w-4 h-4 text-emerald-400" />;
      default:
        return <Search className="w-4 h-4 text-zinc-400" />;
    }
  };

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700/70 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 gap-3">
          <Search className="w-5 h-5 text-amber-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batches (e.g. CB-2026-001), lots, products, cafes, sales..."
            className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-zinc-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700 hover:bg-zinc-700"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="p-6 text-center text-xs text-zinc-400 animate-pulse">
              Searching BREWW 1671 records...
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-zinc-400">
              <p className="text-sm font-medium">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-zinc-500 mt-1">
                Try searching for batch numbers (CB-), lots (FG-), bean origins, or café names.
              </p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map((res, i) => (
                <div
                  key={i}
                  onClick={() => handleSelect(res.url)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-800/80 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700/50 group-hover:border-zinc-600">
                      {getIcon(res.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200 group-hover:text-amber-400 transition-colors">
                          {res.title}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {res.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{res.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {res.badge && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-amber-400/90 font-medium border border-zinc-700/60">
                        {res.badge}
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!query && (
            <div className="p-6 text-center text-zinc-500 text-xs">
              <p className="font-medium text-zinc-400">Quick Navigation Tips</p>
              <div className="flex items-center justify-center gap-3 mt-2 text-[11px]">
                <span className="bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700 text-zinc-400">
                  Type <span className="text-amber-400 font-mono">CB-</span> for batches
                </span>
                <span className="bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700 text-zinc-400">
                  Type <span className="text-emerald-400 font-mono">FG-</span> for lots
                </span>
                <span className="bg-zinc-800/80 px-2 py-1 rounded border border-zinc-700 text-zinc-400">
                  Search Café names
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
