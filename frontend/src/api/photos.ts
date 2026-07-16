import { apiClient, authHeaders } from './client';

export interface PhotoResponse {
  id: number;
  deliveryId: number;
  courierId: number;
  photoData: string;
  capturedAt: string;
}

export async function uploadDeliveryPhoto(token: string | null, deliveryId: number, photoData: string) {
  const response = await apiClient.post(
    `/deliveries/${deliveryId}/photo`,
    { photoData },
    { headers: authHeaders(token) },
  );
  return response.data as { message: string };
}

export async function getDeliveryPhoto(token: string | null, deliveryId: number) {
  const response = await apiClient.get(`/deliveries/${deliveryId}/photo`, {
    headers: authHeaders(token),
  });
  return response.data as PhotoResponse;
}
