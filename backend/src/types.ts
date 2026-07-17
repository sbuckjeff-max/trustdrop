export type UserRole = 'dealer' | 'courier' | 'buyer' | 'admin';

export type DeliveryStatus = 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';

export type ListingCategory = 'coin' | 'paper_money' | 'bullion' | 'scrap';
export type ListingStatus = 'active' | 'sold' | 'draft';
export type ShippingOption = 'seller_ships' | 'local_pickup' | 'trustdrop_delivery';

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  name: string;
}

export interface DeliveryRecord {
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
}

export interface CourierLocationRecord {
  id: number;
  courier_id: number;
  delivery_id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: string;
}

export interface ListingRecord {
  id: number;
  seller_id: number;
  title: string;
  description: string;
  category: ListingCategory;
  denomination: string | null;
  metal_type: string | null;
  weight_grams: number | null;
  price_cents: number;
  shipping_option: ShippingOption;
  images: string;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  seller_name?: string | null;
}
