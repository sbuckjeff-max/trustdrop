import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getListing } from '../api/listings';
import { getShippingRates } from '../api/shipping';
import { createOrder } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import type { Listing, ShippingRate, ShippingMethod, Order } from '../types';

const CARRIER_GROUPS: Record<string, ShippingRate[]> = {};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SHIPPING_LABELS: Record<string, string> = {
  seller_ships: 'Seller ships directly',
  local_pickup: 'Local pickup only',
  trustdrop_delivery: 'TrustDrop delivery available',
};

export default function Checkout() {
  const { id } = useParams();
  const listingId = Number.parseInt(id ?? '', 10);
  const { token, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState<ShippingMethod>('usps_priority');
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  useEffect(() => {
    if (Number.isNaN(listingId)) {
      setLoading(false);
      setError('Invalid listing id.');
      return;
    }

    async function load() {
      try {
        const [listingData, ratesData] = await Promise.all([
          getListing(listingId),
          getShippingRates(),
        ]);
        setListing(listingData);
        setRates(ratesData.rates);

        // Set default shipping method based on listing's shipping_option
        if (listingData.shippingOption === 'trustdrop_delivery') {
          setSelectedMethod('trustdrop');
        }

        // Use listing's package weight if available for more accurate rates
        if (listingData.packageWeightGrams) {
          const updatedRates = await getShippingRates(listingData.packageWeightGrams);
          setRates(updatedRates.rates);
        }
      } catch {
        setError('Failed to load checkout data.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [listingId]);

  const carrierGroups = useMemo(() => {
    const groups: Record<string, ShippingRate[]> = {
      TrustDrop: [],
      USPS: [],
      FedEx: [],
      UPS: [],
    };
    for (const rate of rates) {
      if (groups[rate.carrier]) {
        groups[rate.carrier].push(rate);
      }
    }
    return groups;
  }, [rates]);

  const selectedRate = rates.find((r) => r.method === selectedMethod);
  const shippingCost = listing?.freeShipping ? 0 : (selectedRate?.rate_cents ?? 0);
  const totalCents = (listing?.priceCents ?? 0) + shippingCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !listing) return;

    if (!address.line1 || !address.city || !address.state || !address.zip) {
      setError('Please fill in all required address fields.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await createOrder(token, {
        listingId: listing.id,
        shippingMethod: selectedMethod,
        shippingCostCents: shippingCost,
        shippingAddressLine1: address.line1,
        shippingAddressLine2: address.line2,
        shippingCity: address.city,
        shippingState: address.state,
        shippingZip: address.zip,
        shippingCountry: address.country,
      });

      navigate(`/orders/${result.id}`, { state: { orderCreated: true } });
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create order.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="page"><p>Loading checkout…</p></main>;
  }

  if (error && !listing) {
    return <main className="page"><div className="alert error">{error}</div></main>;
  }

  if (!listing) {
    return <main className="page"><p>Listing not found.</p></main>;
  }

  if (!isAuthenticated) {
    return (
      <main className="page">
        <section className="card">
          <h1>Checkout</h1>
          <p>Please <a href="/login">log in</a> to purchase this item.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Checkout</h1>

        {error ? <div className="alert error">{error}</div> : null}

        {/* Order summary */}
        <div style={{ marginBottom: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{listing.title}</h2>
          <p className="muted" style={{ margin: '0 0 4px 0' }}>Seller: {listing.sellerName}</p>
          <p style={{ fontWeight: 700, fontSize: '1.2rem', margin: '4px 0' }}>
            Item price: {formatPrice(listing.priceCents)}
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Shipping: {SHIPPING_LABELS[listing.shippingOption] ?? listing.shippingOption}
            {listing.freeShipping ? ' (Free shipping offered by seller)' : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Shipping method selection */}
          <fieldset style={{ marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
            <legend style={{ fontWeight: 600, padding: '0 8px' }}>Select Shipping Method</legend>

            {listing.freeShipping ? (
              <div style={{ padding: '8px 0' }}>
                <p style={{ color: '#059669', fontWeight: 600 }}>🎉 Free shipping! The seller covers shipping costs.</p>
              </div>
            ) : null}

            {Object.entries(carrierGroups).map(([carrier, carrierRates]) => {
              if (carrierRates.length === 0) return null;
              return (
                <div key={carrier} style={{ marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 4px 0', color: '#374151' }}>
                    {carrier}
                  </h3>
                  {carrierRates.map((rate) => (
                    <label
                      key={rate.method}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        marginBottom: '4px',
                        border: `1px solid ${selectedMethod === rate.method ? '#1e3a5f' : '#e5e7eb'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        background: selectedMethod === rate.method ? '#eff6ff' : 'white',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="radio"
                          name="shippingMethod"
                          value={rate.method}
                          checked={selectedMethod === rate.method}
                          onChange={() => setSelectedMethod(rate.method)}
                        />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rate.label}</div>
                          <div className="muted" style={{ fontSize: '0.75rem' }}>{rate.estimated_days}</div>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {listing.freeShipping ? (
                          <span style={{ color: '#059669' }}>FREE</span>
                        ) : (
                          formatPrice(rate.rate_cents)
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              );
            })}
          </fieldset>

          {/* Shipping address */}
          <fieldset style={{ marginBottom: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
            <legend style={{ fontWeight: 600, padding: '0 8px' }}>Shipping Address</legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  required
                  placeholder="123 Main St"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                  placeholder="Apt 4B"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                    City *
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                    State *
                  </label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    required
                    placeholder="CA"
                    maxLength={2}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>
                    ZIP *
                  </label>
                  <input
                    type="text"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    required
                    placeholder="90210"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </fieldset>

          {/* Order total */}
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: '#1e3a5f',
            color: 'white',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '1.1rem' }}>Order Total:</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{formatPrice(totalCents)}</span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => navigate(`/marketplace/${listingId}`)}
            >
              ← Back
            </button>
            <button
              type="submit"
              className="button"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? 'Placing order…' : `Place Order — ${formatPrice(totalCents)}`}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
