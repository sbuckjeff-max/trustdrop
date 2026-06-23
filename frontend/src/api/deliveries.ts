import { apiClient, authHeaders } from './client';
import type { Delivery, DeliveryStatus } from '../types';

interface CreateDeliveryPayload {
  pickupAddress: string;
  dropoffAddress: string;
  itemDescription: string;
  estimatedValue: number;
}

export async function createDelivery(token: string, payload: CreateDeliveryPayload) {
  const response = await apiClient.post('/deliveries', payload, {
    headers: authHeaders(token),
  });

  return response.data as Delivery;
}

export async function getDealerDeliveries(token: string, status?: DeliveryStatus) {
  const response = await apiClient.get('/deliveries', {
    headers: authHeaders(token),
    params: status ? { status } : undefined,
  });

  return response.data as Delivery[];
}

export async function getDealerDelivery(token: string | null, id: number) {
  const response = await apiClient.get(`/deliveries/${id}`, {
    headers: authHeaders(token),
  });

  return response.data as Delivery;
}
