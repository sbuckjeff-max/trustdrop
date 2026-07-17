import { apiClient } from './client';
import type { ShippingRatesResponse } from '../types';

export async function getShippingRates(weightGrams?: number) {
  const params: Record<string, number> = {};
  if (weightGrams) params.weight_grams = weightGrams;
  const response = await apiClient.get('/shipping/rates', { params });
  return response.data as ShippingRatesResponse;
}
