export interface CafeRates {
  rate180ml: number;
  rate1L: number;
  notes: string;
}

export function parseCafeRates(rawNotes?: string | null): CafeRates {
  const defaultRates: CafeRates = { rate180ml: 120, rate1L: 550, notes: rawNotes || '' };
  if (!rawNotes) return defaultRates;

  try {
    if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
      const parsed = JSON.parse(rawNotes.trim());
      return {
        rate180ml: typeof parsed.rate180ml === 'number' ? parsed.rate180ml : (parseFloat(parsed.rate180ml) || 120),
        rate1L: typeof parsed.rate1L === 'number' ? parsed.rate1L : (parseFloat(parsed.rate1L) || 550),
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
    rate180ml: Number(rate180ml) || 120,
    rate1L: Number(rate1L) || 550,
    notes: customNotes || '',
  });
}
