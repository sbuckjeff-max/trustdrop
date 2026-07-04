import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { acceptDelivery, getAvailableDeliveries, getCourierDeliveries } from '../api/courier';
import { useAuth } from '../context/AuthContext';
import type { Delivery } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';

export default function CourierDashboard() {
  const { token, user, logout } = useAuth();
  const [availableDeliveries, setAvailableDeliveries] = useState<Delivery[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const [available, mine] = await Promise.all([getAvailableDeliveries(token), getCourierDeliveries(token)]);
      setAvailableDeliveries(available);
      setMyDeliveries(mine);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to load courier dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(deliveryId: number) {
    if (!token) return;

    try {
      await acceptDelivery(token, deliveryId);
      await loadData();
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to accept delivery.');
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <div>
            <h1>Courier Dashboard</h1>
            <p className="subtitle">Welcome back, {user?.name}.</p>
          </div>
          <div className="inline-actions">
            <button type="button" onClick={() => void loadData()}>
              Refresh
            </button>
            <button type="button" className="button danger" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {loading ? <p>Loading deliveries…</p> : null}

        <h2>Available Deliveries</h2>
        {availableDeliveries.length === 0 ? <p>No deliveries available right now. Check back soon or refresh.</p> : null}
        <div className="list-grid">
          {availableDeliveries.map((delivery) => (
            <article key={delivery.id} className="list-card">
              <div className="top-row">
                <h3>Delivery #{delivery.id}</h3>
                <span className="status-pill status-requested">{statusLabel(delivery.status)}</span>
              </div>
              <p>
                <strong>Dealer:</strong> {delivery.dealer_name}
              </p>
              <p>
                <strong>Pickup:</strong> {delivery.pickup_address}
              </p>
              <p>
                <strong>Drop-off:</strong> {delivery.dropoff_address}
              </p>
              <p>
                <strong>Value:</strong> {formatCurrency(delivery.estimated_value)}
              </p>
              <button type="button" onClick={() => void handleAccept(delivery.id)}>
                Accept delivery
              </button>
            </article>
          ))}
        </div>

        <h2>My Deliveries</h2>
        {myDeliveries.length === 0 ? <p>You have not accepted any deliveries yet.</p> : null}
        <div className="list-grid">
          {myDeliveries.map((delivery) => (
            <article key={delivery.id} className="list-card">
              <div className="top-row">
                <h3>Delivery #{delivery.id}</h3>
                <span className={`status-pill status-${delivery.status}`}>{statusLabel(delivery.status)}</span>
              </div>
              <p>
                <strong>Dealer:</strong> {delivery.dealer_name}
              </p>
              <p>
                <strong>Pickup:</strong> {delivery.pickup_address}
              </p>
              <p>
                <strong>Drop-off:</strong> {delivery.dropoff_address}
              </p>
              <p className="muted">Updated: {formatDate(delivery.updated_at)}</p>
              <Link className="button secondary" to={`/courier/deliveries/${delivery.id}`}>
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
