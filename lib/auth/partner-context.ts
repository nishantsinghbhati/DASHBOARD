export interface Partner {
  id: string;
  name: string;
  email: string;
  ownershipPercentage: number;
  role: string;
  initials: string;
  avatarColor: string;
}

export const FIXED_PARTNERS: Record<string, Partner> = {
  PARTNER_NISHANT: {
    id: 'PARTNER_NISHANT',
    name: 'Nishant',
    email: 'nishant@breww1671.com',
    ownershipPercentage: 50.0,
    role: 'ADMIN',
    initials: 'NP',
    avatarColor: 'bg-amber-600',
  },
  PARTNER_CHINMAY: {
    id: 'PARTNER_CHINMAY',
    name: 'Chinmay',
    email: 'chinmay@breww1671.com',
    ownershipPercentage: 50.0,
    role: 'ADMIN',
    initials: 'CK',
    avatarColor: 'bg-emerald-600',
  },
} as const;

export const DEFAULT_PARTNER_ID = 'PARTNER_NISHANT';

export function getPartner(partnerId?: string | null): Partner {
  if (partnerId && FIXED_PARTNERS[partnerId]) {
    return FIXED_PARTNERS[partnerId];
  }
  return FIXED_PARTNERS[DEFAULT_PARTNER_ID];
}

export function getAllPartners(): Partner[] {
  return [FIXED_PARTNERS.PARTNER_NISHANT, FIXED_PARTNERS.PARTNER_CHINMAY];
}
