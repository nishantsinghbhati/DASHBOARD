'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { FIXED_PARTNERS, DEFAULT_PARTNER_ID, Partner } from './partner-context';
import { Lock, KeyRound, ShieldCheck, Check, ArrowRight, UserCheck } from 'lucide-react';

interface PartnerContextType {
  partner: Partner;
  partners: Partner[];
  isLocked: boolean;
  lockSession: () => void;
  openPinModal: (targetPartnerId?: string) => void;
  unlockWithPin: (partnerId: string, pin: string) => { success: boolean; error?: string };
}

const PartnerContext = createContext<PartnerContextType>({
  partner: FIXED_PARTNERS[DEFAULT_PARTNER_ID],
  partners: [FIXED_PARTNERS.PARTNER_NISHANT, FIXED_PARTNERS.PARTNER_CHINMAY],
  isLocked: false,
  lockSession: () => {},
  openPinModal: () => {},
  unlockWithPin: () => ({ success: false }),
});

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string>(DEFAULT_PARTNER_ID);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(DEFAULT_PARTNER_ID);
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('breww1671_active_partner');
    const isSessionLocked = localStorage.getItem('breww1671_session_locked');

    if (saved && FIXED_PARTNERS[saved]) {
      setActiveId(saved);
      setSelectedPartnerId(saved);
      document.cookie = `active_partner_id=${saved}; path=/; max-age=31536000; SameSite=Lax`;
    } else {
      document.cookie = `active_partner_id=${DEFAULT_PARTNER_ID}; path=/; max-age=31536000; SameSite=Lax`;
    }

    if (isSessionLocked === 'true') {
      setIsLocked(true);
      setIsModalOpen(true);
    }
  }, []);

  const lockSession = () => {
    setIsLocked(true);
    setIsModalOpen(true);
    setPin('');
    setPinError(null);
    localStorage.setItem('breww1671_session_locked', 'true');
  };

  const openPinModal = (targetId?: string) => {
    if (targetId && FIXED_PARTNERS[targetId]) {
      setSelectedPartnerId(targetId);
    } else {
      setSelectedPartnerId(activeId);
    }
    setPin('');
    setPinError(null);
    setIsModalOpen(true);
  };

  const unlockWithPin = (partnerId: string, enteredPin: string) => {
    // Default PIN for both Nishant and Chinmay is 1671
    const validPin = '1671';
    if (enteredPin === validPin) {
      setActiveId(partnerId);
      setIsLocked(false);
      setIsModalOpen(false);
      setPin('');
      setPinError(null);
      localStorage.setItem('breww1671_active_partner', partnerId);
      localStorage.removeItem('breww1671_session_locked');
      document.cookie = `active_partner_id=${partnerId}; path=/; max-age=31536000; SameSite=Lax`;
      return { success: true };
    }
    return { success: false, error: 'Incorrect 4-digit PIN. (Default PIN: 1671)' };
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length !== 4) {
      setPinError('Please enter the 4-digit PIN');
      return;
    }
    const res = unlockWithPin(selectedPartnerId, pin);
    if (!res.success) {
      setPinError(res.error || 'Invalid PIN');
    }
  };

  const partner = FIXED_PARTNERS[activeId] || FIXED_PARTNERS[DEFAULT_PARTNER_ID];
  const targetPartner = FIXED_PARTNERS[selectedPartnerId] || partner;

  return (
    <PartnerContext.Provider
      value={{
        partner,
        partners: [FIXED_PARTNERS.PARTNER_NISHANT, FIXED_PARTNERS.PARTNER_CHINMAY],
        isLocked,
        lockSession,
        openPinModal,
        unlockWithPin,
      }}
    >
      {children}

      {/* PIN Authentication & Switch Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/20 text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-100">
                {isLocked ? 'Enter PIN to Unlock' : 'Switch Partner Account'}
              </h2>
              <p className="text-xs text-zinc-400">
                Brew 1671 operates with 2 equal directors. Entries are strictly recorded under your verified account.
              </p>
            </div>

            {/* Partner selector cards */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              {[FIXED_PARTNERS.PARTNER_NISHANT, FIXED_PARTNERS.PARTNER_CHINMAY].map((p) => {
                const isSelected = p.id === selectedPartnerId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPartnerId(p.id);
                      setPin('');
                      setPinError(null);
                    }}
                    className={`flex flex-col items-center p-4 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/20 text-zinc-100'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl ${p.avatarColor} text-white font-bold flex items-center justify-center text-sm shadow-md mb-2`}
                    >
                      {p.initials}
                    </div>
                    <span className="font-bold text-sm text-zinc-200">{p.name}</span>
                    <span className="text-[11px] text-amber-500 font-semibold mt-0.5">50% Director</span>
                  </button>
                );
              })}
            </div>

            {/* PIN Input form */}
            <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-2 text-center">
                  Enter 4-Digit PIN for <span className="text-amber-400 font-bold">{targetPartner.name}</span>
                </label>
                <div className="flex justify-center gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setPin(val);
                      setPinError(null);
                      if (val.length === 4) {
                        const res = unlockWithPin(selectedPartnerId, val);
                        if (!res.success) {
                          setPinError(res.error || 'Incorrect PIN');
                        }
                      }
                    }}
                    className="w-44 text-center tracking-[0.5em] text-2xl font-mono py-2.5 px-4 bg-zinc-950 border border-zinc-700 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 text-amber-300"
                  />
                </div>
                {pinError ? (
                  <p className="text-xs text-rose-400 text-center mt-2 font-medium">{pinError}</p>
                ) : (
                  <p className="text-[11px] text-zinc-400 text-center mt-2">
                    Default PIN is <span className="font-mono text-amber-400 font-bold">1671</span>
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setPin('');
                      setPinError(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40"
                >
                  <span>Authenticate</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PartnerContext.Provider>
  );
}

export function usePartner() {
  return useContext(PartnerContext);
}
