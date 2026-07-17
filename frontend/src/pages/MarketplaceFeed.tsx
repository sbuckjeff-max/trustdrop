import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getListings } from '../api/listings';
import type { Listing } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  coin: 'Coins',
  paper_money: 'Paper Money',
  bullion: 'Bullion',
  scrap: 'Scrap / Lots',
};

const SHIPPING_LABELS: Record<string, string> = {
  seller_ships: 'Seller Ships',
  local_pickup: 'Local Pickup',
  trustdrop_delivery: 'TrustDrop Delivery',
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MarketplaceFeed() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [metalType, setMetalType] = useState(searchParams.get('metal_type') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');

  async function fetchListings(p: number = 1) {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number> = { page: p, limit: 20, sort };
      if (search) params.search = search;
      if (category) params.category = category;
      if (metalType) params.metal_type = metalType;

      const data = await getListings(params);
      setListings(data.listings);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to load listings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchListings(1);
  }, [sort]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    if (category) sp.set('category', category);
    if (metalType) sp.set('metal_type', metalType);
    if (sort) sp.set('sort', sort);
    setSearchParams(sp);
    void fetchListings(1);
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Marketplace</h1>
        <p className="subtitle">Browse coins, paper money, bullion, and precious metals.</p>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: '2 1 200px' }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ flex: '1 1 130px' }}>
            <option value="">All categories</option>
            <option value="coin">Coins</option>
            <option value="paper_money">Paper Money</option>
            <option value="bullion">Bullion</option>
            <option value="scrap">Scrap</option>
          </select>
          <select value={metalType} onChange={(e) => setMetalType(e.target.value)} style={{ flex: '1 1 130px' }}>
            <option value="">All metals</option>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="platinum">Platinum</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ flex: '1 1 130px' }}>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <button type="submit">Search</button>
        </form>

        {error ? <div className="alert error">{error}</div> : null}

        {loading ? (
          <p>Loading listings…</p>
        ) : listings.length === 0 ? (
          <p>No listings found. Try adjusting your filters.</p>
        ) : (
          <>
            <p className="muted">{total} listing{total !== 1 ? 's' : ''} found</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {listings.map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.id}`}
                  className="card listing-card"
                  style={{ textDecoration: 'none', color: 'inherit', padding: '16px' }}
                >
                  {item.images && item.images.length > 0 ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                    />
                  ) : null}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="status-pill" style={{ fontSize: '0.75rem' }}>
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary, #1e3a5f)' }}>
                      {formatPrice(item.priceCents)}
                    </span>
                  </div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '0.95rem' }}>{item.title}</h3>
                  <p className="muted" style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {item.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '8px', color: '#6b7280' }}>
                    <span>Seller: {item.sellerName}</span>
                    <span>{SHIPPING_LABELS[item.shippingOption] ?? item.shippingOption}</span>
                  </div>
                  {item.metalType ? (
                    <span className="status-pill" style={{ fontSize: '0.7rem', marginTop: '6px', display: 'inline-block', background: '#f0f0f0' }}>
                      {item.metalType}{item.weightGrams ? ` · ${item.weightGrams}g` : ''}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>

            {totalPages > 1 ? (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '24px' }}>
                <button disabled={page <= 1} onClick={() => fetchListings(page - 1)}>← Prev</button>
                <span style={{ alignSelf: 'center' }}>Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => fetchListings(page + 1)}>Next →</button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
