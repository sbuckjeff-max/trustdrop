export type UserRole = 'dealer' | 'courier' | 'admin';

export type DeliveryStatus = 'requested' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered';

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
