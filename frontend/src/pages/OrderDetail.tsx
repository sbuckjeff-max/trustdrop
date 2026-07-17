import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types';

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const SHIPPING_LABELS: Record<string, string> = {
  trustdrop: 'TrustDrop Courier',
  usps_priority: 'USPS Priority Mail',
  usps_ground: 'USPS Ground Advantage',
  usps_express: 'USPS Priority Mail Express',
  fedex_ground: 'FedEx Ground',
  fedex_saver: 'FedEx Express Saver',
  fedex_overnight: 'FedEx Standard Overnight',
  ups_ground: 'UPS Ground',
  ups_3day: 'UPS 3 Day Select',
  ups_next_day: 'UPS Next Day Air',
};

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number.parseInt(id ?? '', 10);
  const { token } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Number.isNaN(orderId) || !token) {
      setLoading(false);
      if (!token) setError('Please log in to view orders.');
      else setError('Invalid order id.');
      return;
    }

    async function load() {
      try {
        const data = await getOrder(token, orderId);
        setOrder(data);
      } catch {
        setError('Order not found.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [orderId, token]);

  if (loading) return <main className="page"><p>Loading order…</p></main>;
  if (error) return <main className="page"><div className="alert error">{error}</div></main>;
  if (!order) return <main className="page"><p>Order not found.</p></main>;

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <h1>Order #{order.id}</h1>
          <Link className="button secondary" to="/marketplace">← Marketplace</Link>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <span className={`status-pill status-${order.status === 'delivered' ? 'delivered' : order.status === 'cancelled' ? 'requested' : 'picked_up'}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className="detail-grid">
          <p><strong>Item:</strong> {order.listingTitle}</p>
          <p><strong>Seller:</strong> {order.sellerName}</p>
          <p><strong>Shipping Method:</strong> {SHIPPING_LABELS[order.shippingMethod] ?? order.shippingMethod}</p>
          <p><strong>Shipping Cost:</strong> {formatPrice(order.shippingCostCents)}</p>
          <p><strong>Total:</strong> {formatPrice(order.totalCents)}</p>

          <div>
            <h2>Shipping Address</h2>
            <p>
              {order.shippingAddressLine1}<br />
              {order.shippingAddressLine2 ? <>{order.shippingAddressLine2}<br /></> : null}
              {order.shippingCity}, {order.shippingState} {order.shippingZip}<br />
              {order.shippingCountry}
            </p>
          </div>

          {order.trackingNumber ? (
            <div>
              <h2>Tracking</h2>
              <p>
                <strong>Number:</strong> {order.trackingNumber}
                {order.trackingCarrier ? <> ({order.trackingCarrier})</> : null}
              </p>
            </div>
          ) : (
            <p className="muted">No tracking number yet.</p>
          )}

          <p className="muted">
            Created: {new Date(order.createdAt + 'Z').toLocaleDateString()}<br />
            Updated: {new Date(order.updatedAt + 'Z').toLocaleDateString()}
          </p>
        </div>
      </section>
    </main>
  );
}
