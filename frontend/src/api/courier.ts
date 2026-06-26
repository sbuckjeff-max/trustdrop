import { apiClient, authHeaders } from './client';
import type { Delivery, DeliveryStatus } from '../types';

export async function getAvailableDeliveries(token: string | null) {
  const response = await apiClient.get('/courier/available-deliveries', {
    headers: authHeaders(token),
  });

  return response.data as Delivery[];
}

export async function acceptDelivery(token: string | null, id: number) {
  const response = await apiClient.post(
    `/courier/accept/${id}`,
    {},
    {
      headers: authHeaders(token),
    },
  );

  return response.data as Delivery;
}

export async function getCourierDeliveries(token: string | null) {
  const response = await apiClient.get('/courier/my-deliveries', {
    headers: authHeaders(token),
  });

  return response.data as Delivery[];
}

export async function getCourierDelivery(token: string | null, id: number) {
  const response = await apiClient.get(`/courier/deliveries/${id}`, {
    headers: authHeaders(token),
  });

  return response.data as Delivery;
}

export async function updateCourierDeliveryStatus(token: string | null, id: number, status: DeliveryStatus) {
  const response = await apiClient.patch(
    `/courier/status/${id}`,
    { status },
    {
      headers: authHeaders(token),
    },
  );

  return response.data as Delivery;
}
