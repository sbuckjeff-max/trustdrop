import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getListing } from '../api/listings';
import { useAuth } from '../context/AuthContext';
import type { Listing } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  coin: 'Coin',
  paper_money: 'Paper Money',
  bullion: 'Bullion',
  scrap: 'Scrap / Lot',
};

const SHIPPING_LABELS: Record<string, string> = {
  seller_ships: 'Seller ships directly',
  local_pickup: 'Local pickup only',
  trustdrop_delivery: 'TrustDrop delivery available',
};

function formatPrice(cents: number) {
  return `${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const listingId = Number.parseInt(id ?? '', 10);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Number.isNaN(listingId)) {
      setLoading(false);
      setError('Invalid listing id.');
      return;
    }

    async function load() {
      try {
        const data = await getListing(listingId);
        setListing(data);
      } catch {
        setError('Listing not found.');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [listingId]);

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <h1>{listing?.title ?? 'Listing Detail'}</h1>
          <Link className="button secondary" to="/marketplace">
            ← Back to marketplace
          </Link>
        </div>

        {loading ? <p>Loading…</p> : null}
        {error ? <div className="alert error">{error}</div> : null}

        {listing ? (
          <div className="detail-grid">
            <p>
              <strong>Price:</strong> {formatPrice(listing.priceCents)}
            </p>
            <p>
              <strong>Category:</strong> {CATEGORY_LABELS[listing.category] ?? listing.category}
            </p>
            {listing.denomination ? (
              <p><strong>Denomination:</strong> {listing.denomination}</p>
            ) : null}
            {listing.metalType ? (
              <p><strong>Metal:</strong> {listing.metalType}{listing.weightGrams ? ` · ${listing.weightGrams}g` : ''}</p>
            ) : null}
            <p>
              <strong>Shipping:</strong> {SHIPPING_LABELS[listing.shippingOption] ?? listing.shippingOption}
              {listing.freeShipping ? ' (Free shipping offered)' : ''}
            </p>
            {listing.packageWeightGrams ? (
              <p><strong>Package weight:</strong> {listing.packageWeightGrams}g</p>
            ) : null}
            <p>
              <strong>Seller:</strong> {listing.sellerName}
            </p>
            <p>
              <strong>Listed:</strong> {new Date(listing.createdAt + 'Z').toLocaleDateString()}
            </p>

            <div>
              <h2>Description</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>
            </div>

            {/* Images */}
            {listing.images && listing.images.length > 0 ? (
              <div>
                <h2>Images</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {listing.images.map((img, i) => (
                    <a key={img} href={img} target="_blank" rel="noreferrer">
                      <img
                        src={img}
                        alt={`${listing.title} - ${i + 1}`}
                        style={{
                          width: '120px', height: '120px', objectFit: 'cover',
                          borderRadius: '8px', border: '1px solid #e5e7eb', cursor: 'pointer',
                        }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              {isAuthenticated ? (
                <button
                  className="button"
                  onClick={() => navigate(`/checkout/${listing.id}`)}
                  style={{ fontSize: '1.1rem', padding: '12px 32px' }}
                >
                  Buy Now — {formatPrice(listing.priceCents)}
                  {listing.freeShipping ? ' + Free Shipping' : ' + shipping'}
                </button>
              ) : (
                <Link className="button" to={`/login?redirect=/checkout/${listing.id}`}>
                  Log in to Purchase
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
