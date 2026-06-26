import type { DeliveryStatus } from '../types';

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function statusLabel(status: DeliveryStatus) {
  return status.replace('_', ' ').toUpperCase();
}
