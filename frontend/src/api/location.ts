import { apiClient, authHeaders } from './client';
import type { DeliveryLocationData } from '../types';

export async function reportLocation(
  token: string | null,
  deliveryId: number,
  latitude: number,
  longitude: number,
  accuracy?: number,
) {
  const response = await apiClient.post(
    `/deliveries/${deliveryId}/location`,
    { latitude, longitude, accuracy },
    { headers: authHeaders(token) },
  );
  return response.data as { message: string };
}

export async function getDeliveryLocations(token: string | null, deliveryId: number) {
  const response = await apiClient.get(`/deliveries/${deliveryId}/location`, {
    headers: authHeaders(token),
  });
  return response.data as DeliveryLocationData;
}
