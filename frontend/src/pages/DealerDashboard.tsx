import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDealerDeliveries } from '../api/deliveries';
import { useAuth } from '../context/AuthContext';
import type { Delivery, DeliveryStatus } from '../types';
import { formatCurrency, formatDate, statusLabel } from '../utils/format';

const STATUS_FILTERS: Array<'all' | DeliveryStatus> = ['all', 'requested', 'assigned', 'picked_up', 'in_transit', 'delivered'];

export default function DealerDashboard() {
  const { token, user, logout } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | DeliveryStatus>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadDeliveries() {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const records = await getDealerDeliveries(token, statusFilter === 'all' ? undefined : statusFilter);
      setDeliveries(records);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Failed to load deliveries.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeliveries();
  }, [token, statusFilter]);

  const counts = useMemo(() => {
    return deliveries.reduce<Record<DeliveryStatus, number>>(
      (acc, delivery) => {
        acc[delivery.status] += 1;
        return acc;
      },
      {
        requested: 0,
        assigned: 0,
        picked_up: 0,
        in_transit: 0,
        delivered: 0,
      },
    );
  }, [deliveries]);

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <div>
            <h1>Dealer Dashboard</h1>
            <p className="subtitle">Welcome back, {user?.name}.</p>
          </div>
          <div className="inline-actions">
            <Link className="button secondary" to="/dealer/new-delivery">
              New delivery
            </Link>
            <button type="button" className="button danger" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="stats-grid">
          <article className="stat-card">
            <span>Requested</span>
            <strong>{counts.requested}</strong>
          </article>
          <article className="stat-card">
            <span>Assigned</span>
            <strong>{counts.assigned}</strong>
          </article>
          <article className="stat-card">
            <span>In Transit</span>
            <strong>{counts.in_transit}</strong>
          </article>
          <article className="stat-card">
            <span>Delivered</span>
            <strong>{counts.delivered}</strong>
          </article>
        </div>

        <div className="toolbar">
          <label>
            Filter by status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | DeliveryStatus)}>
              {STATUS_FILTERS.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {statusValue === 'all' ? 'All statuses' : statusLabel(statusValue)}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => void loadDeliveries()}>
            Refresh
          </button>
        </div>

        {error ? <div className="alert error">{error}</div> : null}
        {loading ? <p>Loading deliveries…</p> : null}

        {!loading && deliveries.length === 0 ? <p>No deliveries found for this filter.</p> : null}

        <div className="list-grid">
          {deliveries.map((delivery) => (
            <article key={delivery.id} className="list-card">
              <div className="top-row">
                <h3>Delivery #{delivery.id}</h3>
                <span className={`status-pill status-${delivery.status}`}>{statusLabel(delivery.status)}</span>
              </div>
              <p>
                <strong>Pickup:</strong> {delivery.pickup_address}
              </p>
              <p>
                <strong>Drop-off:</strong> {delivery.dropoff_address}
              </p>
              <p>
                <strong>Value:</strong> {formatCurrency(delivery.estimated_value)}
              </p>
              <p>
                <strong>Courier:</strong> {delivery.courier_name ?? 'Unassigned'}
              </p>
              <p className="muted">Created: {formatDate(delivery.created_at)}</p>
              <Link className="button secondary" to={`/dealer/deliveries/${delivery.id}`}>
                View details
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
