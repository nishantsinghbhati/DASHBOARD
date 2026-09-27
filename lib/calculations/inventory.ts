export type StockHealthStatus = 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export function getStockHealth(current: number, minStock: number): StockHealthStatus {
  if (current <= 0) return 'OUT_OF_STOCK';
  if (current <= minStock) return 'LOW_STOCK';
  return 'HEALTHY';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatQuantity(amount: number, unit: string): string {
  const rounded = Math.round(amount * 100) / 100;
  return `${rounded.toLocaleString('en-IN')} ${unit}`;
}
