import { apiClient, authHeaders } from './client';
import type { Order } from '../types';

export interface CreateOrderData {
  listingId: number;
  shippingMethod: string;
  shippingCostCents: number;
  shippingAddressLine1: string;
  shippingAddressLine2?: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry?: string;
}

export async function createOrder(token: string | null, data: CreateOrderData) {
  const response = await apiClient.post('/orders', data, { headers: authHeaders(token) });
  return response.data as { id: number; message: string; totalCents: number };
}

export async function getOrders(token: string | null, role?: 'buyer' | 'seller', status?: string) {
  const params: Record<string, string> = {};
  if (role) params.role = role;
  if (status) params.status = status;
  const response = await apiClient.get('/orders', { headers: authHeaders(token), params });
  return response.data as Order[];
}

export async function getOrder(token: string | null, id: number) {
  const response = await apiClient.get(`/orders/${id}`, { headers: authHeaders(token) });
  return response.data as Order;
}

export async function addTracking(token: string | null, orderId: number, trackingNumber: string, trackingCarrier?: string) {
  const response = await apiClient.patch(
    `/orders/${orderId}/tracking`,
    { trackingNumber, trackingCarrier },
    { headers: authHeaders(token) },
  );
  return response.data as { message: string };
}
