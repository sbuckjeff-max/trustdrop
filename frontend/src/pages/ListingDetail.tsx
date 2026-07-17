import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getListing } from '../api/listings';
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
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ListingDetail() {
  const { id } = useParams();
  const listingId = Number.parseInt(id ?? '', 10);
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
            </p>
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
          </div>
        ) : null}
      </section>
    </main>
  );
}
