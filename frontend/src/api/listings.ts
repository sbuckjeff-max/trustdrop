import { apiClient, authHeaders } from './client';
import type { Listing, ListingsResponse } from '../types';

export interface ListingsParams {
  search?: string;
  category?: string;
  metal_type?: string;
  min_price?: number;
  max_price?: number;
  shipping?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export async function getListings(params: ListingsParams = {}) {
  const response = await apiClient.get('/listings', { params });
  return response.data as ListingsResponse;
}

export async function getListing(id: number) {
  const response = await apiClient.get(`/listings/${id}`);
  return response.data as Listing;
}

export async function createListing(
  token: string | null,
  data: {
    title: string;
    description: string;
    category: string;
    denomination?: string;
    metalType?: string;
    weightGrams?: number;
    priceCents: number;
    shippingOption?: string;
    freeShipping?: boolean;
    packageWeightGrams?: number;
    packageLengthCm?: number;
    packageWidthCm?: number;
    packageHeightCm?: number;
    images?: string[];
  },
) {
  const response = await apiClient.post('/listings', data, { headers: authHeaders(token) });
  return response.data as { id: number; message: string };
}

export async function uploadListingImages(
  token: string | null,
  listingId: number,
  files: File[],
) {
  const formData = new FormData();
  files.forEach((f) => formData.append('images', f));
  const response = await apiClient.post(`/listings/${listingId}/images`, formData, {
    headers: { ...authHeaders(token), 'Content-Type': 'multipart/form-data' },
  });
  return response.data as { images: string[]; added: number; total: number };
}
