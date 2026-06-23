import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDealerDelivery } from '../api/deliveries';
import { useAuth } from '../context/AuthContext';
import type { Delivery } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';

export default function DealerDeliveryDetail() {
  const { id } = useParams();
  const deliveryId = Number.parseInt(id ?? '', 10);
  const { token } = useAuth();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
              <strong>Status:</strong> <span className={`status-pill status-${delivery.status}`}>{statusLabel(delivery.status)}</span>
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
