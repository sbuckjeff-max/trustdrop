import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCourierDelivery, updateCourierDeliveryStatus } from '../api/courier';
import { reportLocation } from '../api/location';
import { uploadDeliveryPhoto } from '../api/photos';
import { useAuth } from '../context/AuthContext';
import type { Delivery, DeliveryStatus } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';

const NEXT_STATUS: Partial<Record<DeliveryStatus, DeliveryStatus>> = {
  assigned: 'picked_up',
  picked_up: 'in_transit',
  in_transit: 'delivered',
};

const ACTIVE_LOCATION_STATUSES: DeliveryStatus[] = ['picked_up', 'in_transit'];

export default function CourierDeliveryDetail() {
  const { id } = useParams();
  const deliveryId = Number.parseInt(id ?? '', 10);
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [locationSharing, setLocationSharing] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  // Photo capture state
  const [showCamera, setShowCamera] = useState(false);
  const [photoStream, setPhotoStream] = useState<MediaStream | null>(null);
  const [photoTaken, setPhotoTaken] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function loadDetail() {
    if (!token || Number.isNaN(deliveryId)) {
      setLoading(false);
      setError('Invalid delivery id.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const record = await getCourierDelivery(token, deliveryId);
      setDelivery(record);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to load delivery details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [token, deliveryId]);

  const isActive = useMemo(
    () => delivery && ACTIVE_LOCATION_STATUSES.includes(delivery.status),
    [delivery],
  );

  const startLocationSharing = useCallback(() => {
    if (!token || !delivery || !navigator.geolocation) return;

    setLocationSharing(true);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await reportLocation(
            token,
            delivery.id,
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy,
          );
        } catch {
          // Silently ignore — don't disrupt the UX for failed location reports
        }
      },
      () => {
        setError('Location access denied. Enable location permissions to share your position.');
        stopLocationSharing();
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 },
    );

    watchIdRef.current = watchId;
  }, [token, delivery]);

  const stopLocationSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationSharing(false);
  }, []);

  // Camera handlers
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setPhotoStream(stream);
      setShowCamera(true);
      setPhotoTaken(false);
      // Connect stream to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch {
      setError('Could not access camera. Please grant camera permissions.');
    }
  }

  function stopCamera() {
    if (photoStream) {
      for (const track of photoStream.getTracks()) {
        track.stop();
      }
      setPhotoStream(null);
    }
    setShowCamera(false);
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || !token || !delivery) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUri = canvas.toDataURL('image/jpeg', 0.85);

    try {
      await uploadDeliveryPhoto(token, delivery.id, dataUri);
      setPhotoTaken(true);
      stopCamera();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to upload photo.');
    }
  }

  // Auto-start location sharing when delivery becomes active
  useEffect(() => {
    if (isActive && !locationSharing) {
      startLocationSharing();
    }
    if (!isActive && locationSharing) {
      stopLocationSharing();
    }

    return () => {
      stopLocationSharing();
    };
  }, [isActive, locationSharing, startLocationSharing, stopLocationSharing]);

  const nextStatus = useMemo(() => (delivery ? NEXT_STATUS[delivery.status] : undefined), [delivery]);

  async function handleStatusUpdate() {
    if (!token || !delivery || !nextStatus) {
      return;
    }

    setUpdating(true);
    setError('');

    try {
      const updated = await updateCourierDeliveryStatus(token, delivery.id, nextStatus);
      setDelivery((prev) => (prev ? { ...prev, ...updated } : updated));
      await loadDetail();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to update delivery status.');
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <h1>Courier Delivery Detail</h1>
          <Link className="button secondary" to="/courier/dashboard">
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
              <span className={`status-pill status-${delivery.status}`}>
                {statusLabel(delivery.status)}
              </span>
            </p>
            <p>
              <strong>Dealer:</strong> {delivery.dealer_name}
            </p>
            <p>
              <strong>Dealer Email:</strong> {delivery.dealer_email}
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
              <strong>Value:</strong> {formatCurrency(delivery.estimated_value)}
            </p>
            <p>
              <strong>Last updated:</strong> {formatDate(delivery.updated_at)}
            </p>

            {isActive ? (
              <div className="location-sharing-indicator">
                <p>
                  <span className={`status-pill ${locationSharing ? 'status-in_transit' : 'status-requested'}`}>
                    {locationSharing ? '📍 Sharing location' : '📍 Location paused'}
                  </span>
                </p>
                {locationSharing ? (
                  <button type="button" className="button secondary" onClick={stopLocationSharing}>
                    Stop sharing
                  </button>
                ) : (
                  <button type="button" onClick={startLocationSharing}>
                    Start sharing
                  </button>
                )}
              </div>
            ) : null}

            {/* Photo capture at handoff */}
            {isActive ? (
              <div className="photo-section" style={{ marginTop: '12px' }}>
                <h3>Handoff Photo</h3>
                <p className="muted">Capture a photo at delivery for verification.</p>

                {photoTaken ? (
                  <p className="alert success">📸 Photo saved successfully!</p>
                ) : null}

                {showCamera ? (
                  <div style={{ position: 'relative', maxWidth: '100%' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', borderRadius: '8px', background: '#000' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button type="button" onClick={capturePhoto}>
                        📸 Capture
                      </button>
                      <button type="button" className="button secondary" onClick={stopCamera}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={startCamera}>
                    📷 Take handoff photo
                  </button>
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            ) : null}

            {nextStatus ? (
              <button type="button" onClick={() => void handleStatusUpdate()} disabled={updating}>
                {updating ? 'Updating…' : `Mark as ${statusLabel(nextStatus)}`}
              </button>
            ) : (
              <p>This delivery is complete.</p>
            )}

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
