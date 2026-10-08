export interface CafeRates {
  rate180ml: number;
  rate1L: number;
  notes: string;
}

export type BrewType = 'CLASSIC' | 'FLORAL' | 'RUM' | 'WHISKEY';

export interface BrewPricing {
  key: BrewType;
  name: string;
  shortName: string;
  perMlRate: number;      // in ₹/ml
  price180ml: number;     // ₹ per 180ml bottle
  price1L: number;        // ₹ per 1000ml bottle (1000 * perMlRate)
  description: string;
}

export const BREW_PRICING: Record<BrewType, BrewPricing> = {
  CLASSIC: {
    key: 'CLASSIC',
    name: 'Classic Cold Brew (100% Arabica)',
    shortName: 'Classic 100% Arabica',
    perMlRate: 0.72,
    price180ml: 130,
    price1L: 720,
    description: '100% Arabica • ₹0.72/ml • ₹130 (180ml) • ₹720 (1L)',
  },
  FLORAL: {
    key: 'FLORAL',
    name: 'Floral Cold Brew',
    shortName: 'Floral Brew',
    perMlRate: 0.86,
    price180ml: 155,
    price1L: 860,
    description: 'Floral Single Origin • ₹0.86/ml • ₹155 (180ml) • ₹860 (1L)',
  },
  RUM: {
    key: 'RUM',
    name: 'Rum Infused Barrel Cold Brew',
    shortName: 'Rum Infused',
    perMlRate: 1.03,
    price180ml: 185,
    price1L: 1030,
    description: 'Rum Barrel Infused • ₹1.03/ml • ₹185 (180ml) • ₹1,030 (1L)',
  },
  WHISKEY: {
    key: 'WHISKEY',
    name: 'Whiskey Infused Barrel Cold Brew',
    shortName: 'Whiskey Infused',
    perMlRate: 1.03,
    price180ml: 185,
    price1L: 1030,
    description: 'Whiskey Barrel Infused • ₹1.03/ml • ₹185 (180ml) • ₹1,030 (1L)',
  },
};

export const BREW_LIST: BrewPricing[] = Object.values(BREW_PRICING);

export function getBrewPricing(flavorName: string): BrewPricing {
  const lower = (flavorName || '').toLowerCase();
  if (lower.includes('floral')) {
    return BREW_PRICING.FLORAL;
  }
  if (lower.includes('whiskey') || lower.includes('whisky')) {
    return BREW_PRICING.WHISKEY;
  }
  if (lower.includes('rum')) {
    return BREW_PRICING.RUM;
  }
  if (lower.includes('infused')) {
    return BREW_PRICING.RUM;
  }
  return BREW_PRICING.CLASSIC;
}

export function calculateBrewUnitPrice(
  flavorName: string,
  format: '180ml' | '1L' | 'CUSTOM',
  customVolumeMl: number = 0
): number {
  const pricing = getBrewPricing(flavorName);
  if (format === '180ml') {
    return pricing.price180ml;
  }
  if (format === '1L') {
    return pricing.price1L;
  }
  // CUSTOM volume in ml: volume * perMlRate
  const ml = Math.max(0, customVolumeMl);
  return Math.round(ml * pricing.perMlRate * 100) / 100;
}

export function parseCafeRates(rawNotes?: string | null): CafeRates {
  const defaultRates: CafeRates = { rate180ml: 130, rate1L: 720, notes: rawNotes || '' };
  if (!rawNotes) return defaultRates;

  try {
    if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
      const parsed = JSON.parse(rawNotes.trim());
      return {
        rate180ml: typeof parsed.rate180ml === 'number' ? parsed.rate180ml : (parseFloat(parsed.rate180ml) || 130),
        rate1L: typeof parsed.rate1L === 'number' ? parsed.rate1L : (parseFloat(parsed.rate1L) || 720),
        notes: parsed.notes || '',
      };
    }
  } catch {}

  const match180 = rawNotes.match(/180ml:\s*₹?(\d+)/i);
  const match1L = rawNotes.match(/1L:\s*₹?(\d+)/i);
  if (match180) defaultRates.rate180ml = parseFloat(match180[1]);
  if (match1L) defaultRates.rate1L = parseFloat(match1L[1]);
  return defaultRates;
}

export function formatCafeNotesWithRates(rate180ml: number, rate1L: number, customNotes?: string): string {
  return JSON.stringify({
    rate180ml: Number(rate180ml) || 130,
    rate1L: Number(rate1L) || 720,
    notes: customNotes || '',
  });
}
