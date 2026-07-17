export type UserRole = 'dealer' | 'courier' | 'buyer' | 'admin';

export type DeliveryStatus = 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';

export type ListingCategory = 'coin' | 'paper_money' | 'bullion' | 'scrap';
export type ListingStatus = 'active' | 'sold' | 'draft';
export type ShippingOption = 'seller_ships' | 'local_pickup' | 'trustdrop_delivery';

export interface Listing {
  id: number;
  sellerId: number;
  sellerName: string;
  title: string;
  description: string;
  category: ListingCategory;
  denomination: string | null;
  metalType: string | null;
  weightGrams: number | null;
  priceCents: number;
  shippingOption: ShippingOption;
  images: string[];
  status: ListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListingsResponse {
  listings: Listing[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

export interface StatusHistoryEntry {
  id: number;
  status: DeliveryStatus;
  changed_at: string;
  changed_by: number;
}

export interface Delivery {
  id: number;
  dealer_id: number;
  courier_id: number | null;
  pickup_address: string;
  dropoff_address: string;
  item_description: string;
  estimated_value: number;
  status: DeliveryStatus;
  created_at: string;
  updated_at: string;
  courier_name?: string | null;
  courier_email?: string | null;
  dealer_name?: string | null;
  dealer_email?: string | null;
  history?: StatusHistoryEntry[];
}

export interface CourierLocation {
  id: number;
  courier_id: number;
  delivery_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export interface DeliveryLocationData {
  latest: CourierLocation | null;
  trail: CourierLocation[];
}
