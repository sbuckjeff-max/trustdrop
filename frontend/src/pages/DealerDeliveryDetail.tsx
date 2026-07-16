import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDealerDelivery } from '../api/deliveries';
import { getDeliveryLocations } from '../api/location';
import { useAuth } from '../context/AuthContext';
import type { CourierLocation, Delivery } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';
import 'leaflet/dist/leaflet.css';

const POLL_INTERVAL = 10000;
const ACTIVE_STATUSES = ['picked_up', 'in_transit'];

export default function DealerDeliveryDetail() {
  const { id } = useParams();
  const deliveryId = Number.parseInt(id ?? '', 10);
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<CourierLocation[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Load delivery detail
  useEffect(() => {
    if (!token || Number.isNaN(deliveryId)) {
      setLoading(false);
      setError('Invalid delivery id.');
      return;
    }

    async function loadDetail() {
      try {
        const record = await getDealerDelivery(token, deliveryId);
        setDelivery(record);
      } catch (requestError: any) {
        setError(requestError.response?.data?.message ?? 'Failed to load delivery details.');
      } finally {
        setLoading(false);
      }
    }

    void loadDetail();
  }, [deliveryId, token]);

  const isActive = useMemo(
    () => delivery ? ACTIVE_STATUSES.includes(delivery.status) : false,
    [delivery],
  );

  // Poll for location updates
  useEffect(() => {
    if (!delivery || !token || !isActive) return;

    async function pollLocations() {
      try {
        const data = await getDeliveryLocations(token, delivery!.id);
        setLocations(data.trail);
      } catch {
        // Silently ignore
      }
    }

    void pollLocations();
    const interval = setInterval(pollLocations, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [delivery, token, isActive]);

  // Initialize Leaflet map (runs once when delivery is active)
  useEffect(() => {
    if (!mapContainerRef.current || !isActive || initializedRef.current) return;

    let cancelled = false;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapContainerRef.current) return;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      leafletRef.current = L;

      const map = L.map(mapContainerRef.current).setView([34.0522, -118.2437], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      initializedRef.current = true;
    }

    void initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [isActive]);

  // Update markers and polyline when locations change
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || locations.length === 0) return;

    // Clear old markers
    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current);
    }
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }

    const group = L.layerGroup().addTo(map);
    markersLayerRef.current = group;

    // Trail polyline
    const latlngs = locations.map((loc) => [loc.latitude, loc.longitude] as [number, number]);
    if (latlngs.length >= 2) {
      polylineRef.current = L.polyline(latlngs, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.7,
      }).addTo(map);
    }

    // Latest position marker
    const latest = locations[locations.length - 1];
    L.marker([latest.latitude, latest.longitude])
      .bindPopup(
        `Courier position<br>${new Date(latest.timestamp + 'Z').toLocaleTimeString()}<br>` +
        `Accuracy: ${latest.accuracy ? `${Math.round(latest.accuracy)}m` : 'N/A'}`,
      )
      .addTo(group);

    map.setView([latest.latitude, latest.longitude], 14);
  }, [locations]);

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <h1>Delivery Details</h1>
          <Link className="button secondary" to="/dealer/dashboard">
            Back to dashboard
          </Link>
        </div>

        {loading ? <p>Loading delivery…</p> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {delivery ? (
          <div className="detail-grid">
            <p>
              <strong>ID:</strong> #{delivery.id}
            </p>
            <p>
              <strong>Status:</strong>{' '}
              <span className={`status-pill status-${delivery.status}`}>{statusLabel(delivery.status)}</span>
            </p>
            <p>
              <strong>Pickup:</strong> {delivery.pickup_address}
            </p>
            <p>
              <strong>Drop-off:</strong> {delivery.dropoff_address}
            </p>
            <p>
              <strong>Description:</strong> {delivery.item_description}
            </p>
            <p>
              <strong>Estimated value:</strong> {formatCurrency(delivery.estimated_value)}
            </p>
            <p>
              <strong>Courier:</strong> {delivery.courier_name ?? 'Not assigned yet'}
            </p>
            <p>
              <strong>Created:</strong> {formatDate(delivery.created_at)}
            </p>

            {isActive ? (
              <div>
                <h2>Live Courier Location</h2>
                {locations.length > 0 ? (
                  <p className="muted">
                    Last updated: {new Date(locations[locations.length - 1].timestamp + 'Z').toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="muted">Waiting for courier location data…</p>
                )}
                <div
                  ref={mapContainerRef}
                  style={{ width: '100%', height: '400px', borderRadius: '8px', marginTop: '8px' }}
                />
              </div>
            ) : null}

            <h2>Status History</h2>
            <ul className="history-list">
              {(delivery.history ?? []).map((entry) => (
                <li key={entry.id}>
                  <span>{statusLabel(entry.status)}</span>
                  <span>{formatDate(entry.changed_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </main>
  );
}
