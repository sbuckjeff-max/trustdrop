import { apiClient, authHeaders } from './client';

export interface SignatureResponse {
  id: number;
  deliveryId: number;
  courierId: number;
  signatureData: string;
  capturedAt: string;
}

export async function uploadDeliverySignature(token: string | null, deliveryId: number, signatureData: string) {
  const response = await apiClient.post(
    `/deliveries/${deliveryId}/signature`,
    { signatureData },
    { headers: authHeaders(token) },
  );
  return response.data as { message: string };
}

export async function getDeliverySignature(token: string | null, deliveryId: number) {
  const response = await apiClient.get(`/deliveries/${deliveryId}/signature`, {
    headers: authHeaders(token),
  });
  return response.data as SignatureResponse;
}
