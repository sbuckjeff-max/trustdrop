export type UserRole = 'dealer' | 'courier' | 'buyer' | 'admin';

export type DeliveryStatus = 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';

export type ListingCategory = 'coin' | 'paper_money' | 'bullion' | 'scrap';
export type ListingStatus = 'active' | 'sold' | 'draft';
export type ShippingOption = 'seller_ships' | 'local_pickup' | 'trustdrop_delivery';

export type ShippingMethod =
  | 'trustdrop'
  | 'usps_priority'
  | 'usps_ground'
  | 'usps_express'
  | 'fedex_ground'
  | 'fedex_saver'
  | 'fedex_overnight'
  | 'ups_ground'
  | 'ups_3day'
  | 'ups_next_day';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

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
  free_shipping: number;
  package_weight_grams: number | null;
  package_length_cm: number | null;
  package_width_cm: number | null;
  package_height_cm: number | null;
  images: string;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
  seller_name?: string | null;
}

export interface OrderRecord {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  shipping_method: ShippingMethod;
  shipping_cost_cents: number;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  status: OrderStatus;
  total_cents: number;
  created_at: string;
  updated_at: string;
}

export interface ShippingRate {
  method: ShippingMethod;
  label: string;
  carrier: string;
  estimated_days: string;
  rate_cents: number;
}
