import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDealerDelivery } from '../api/deliveries';
import { getDeliveryLocations } from '../api/location';
import { getDeliveryPhoto, type PhotoResponse } from '../api/photos';
import { useAuth } from '../context/AuthContext';
import type { CourierLocation, Delivery } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';

// Leaflet CSS is imported once via a <link> in index.html or we add it here
import 'leaflet/dist/leaflet.css';

const POLL_INTERVAL = 10000; // 10 seconds
const ACTIVE_STATUSES = ['picked_up', 'in_transit'];

export default function DealerDeliveryDetail() {
  const { id } = useParams();
  const deliveryId = Number.parseInt(id ?? '', 10);
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<CourierLocation[]>([]);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const [photo, setPhoto] = useState<PhotoResponse | null>(null);

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

  // Fetch handoff photo
  useEffect(() => {
    if (!delivery || !token) return;

    async function fetchPhoto() {
      try {
        const p = await getDeliveryPhoto(token, delivery!.id);
        setPhoto(p);
      } catch {
        setPhoto(null);
      }
    }

    void fetchPhoto();
  }, [delivery, token]);

  // Poll for location updates when delivery is active
  useEffect(() => {
    if (!delivery || !token || !ACTIVE_STATUSES.includes(delivery.status)) return;

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
  }, [delivery, token]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || !delivery || !ACTIVE_STATUSES.includes(delivery.status)) return;

    let L: any;
    import('leaflet').then((mod) => {
      L = mod.default;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!mapInstanceRef.current && mapRef.current) {
        const map = L.map(mapRef.current).setView([34.0522, -118.2437], 12); // Default to LA area
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [delivery?.status]);

  // Update markers and polyline on map
  useEffect(() => {
    if (!mapInstanceRef.current || locations.length === 0) return;

    const L = (window as any).L;
    if (!L) return;

    // Clear old markers
    for (const marker of markersRef.current) {
      mapInstanceRef.current.removeLayer(marker);
    }
    markersRef.current = [];

    // Clear old polyline
    if (polylineRef.current) {
      mapInstanceRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    // Add trail polyline
    const latlngs = locations.map((loc) => [loc.latitude, loc.longitude] as [number, number]);
    if (latlngs.length >= 2) {
      polylineRef.current = L.polyline(latlngs, { color: '#3b82f6', weight: 4, opacity: 0.7 }).addTo(
        mapInstanceRef.current,
      );
    }

    // Add latest position marker
    const latest = locations[locations.length - 1];
    if (latest) {
      const marker = L.marker([latest.latitude, latest.longitude])
        .bindPopup(
          `Courier position<br>${new Date(latest.timestamp + 'Z').toLocaleTimeString()}<br>Accuracy: ${latest.accuracy ? `${Math.round(latest.accuracy)}m` : 'N/A'}`,
        )
        .addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
      mapInstanceRef.current.setView([latest.latitude, latest.longitude], 14);
    }
  }, [locations]);

  const isActive = delivery && ACTIVE_STATUSES.includes(delivery.status);

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

            {photo ? (
              <div>
                <h2>Handoff Photo</h2>
                <p className="muted">Captured: {new Date(photo.capturedAt + 'Z').toLocaleString()}</p>
                <img
                  src={photo.photoData}
                  alt="Delivery handoff verification"
                  style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border-color, #e5e7eb)' }}
                />
              </div>
            ) : null}

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
                  ref={mapRef}
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
