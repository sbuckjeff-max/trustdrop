import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createListing } from '../api/listings';
import { apiClient, authHeaders } from '../api/client';
import { useAuth } from '../context/AuthContext';

const MAX_FILES = 10;
const MAX_SIZE = 10 * 1024 * 1024;

export default function NewListing() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coin');
  const [denomination, setDenomination] = useState('');
  const [metalType, setMetalType] = useState('');
  const [weightGrams, setWeightGrams] = useState('');
  const [priceDollars, setPriceDollars] = useState('');
  const [shippingOption, setShippingOption] = useState('seller_ships');
  const [freeShipping, setFreeShipping] = useState(false);
  const [packageWeight, setPackageWeight] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_SIZE,
    );
    if (imageFiles.length + newFiles.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} images allowed. You already have ${imageFiles.length}.`);
      return;
    }
    setError('');
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(previews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError('');

    try {
      const priceCents = Math.round(Number.parseFloat(priceDollars) * 100);
      if (Number.isNaN(priceCents) || priceCents <= 0) {
        setError('Please enter a valid price.');
        setSubmitting(false);
        return;
      }

      const result = await createListing(token, {
        title,
        description,
        category,
        denomination: denomination || undefined,
        metalType: metalType || undefined,
        weightGrams: weightGrams ? Number.parseFloat(weightGrams) : undefined,
        priceCents,
        shippingOption,
        freeShipping,
        packageWeightGrams: packageWeight ? Number.parseFloat(packageWeight) : undefined,
      });

      // Upload images if any
      if (imageFiles.length > 0 && result.id) {
        const formData = new FormData();
        imageFiles.forEach((f) => formData.append('images', f));
        await apiClient.post(`/listings/${result.id}/images`, formData, {
          headers: { ...authHeaders(token), 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/marketplace/${result.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create listing.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>Create New Listing</h1>

        {error ? <div className="alert error">{error}</div> : null}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%' }} placeholder="e.g. 1921 Morgan Silver Dollar" />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required style={{ width: '100%', minHeight: '100px' }} placeholder="Describe condition, year, mint mark, etc." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
                <option value="coin">Coin</option>
                <option value="paper_money">Paper Money</option>
                <option value="bullion">Bullion</option>
                <option value="scrap">Scrap / Lot</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Price ($) *</label>
              <input type="number" step="0.01" min="0.01" value={priceDollars} onChange={(e) => setPriceDollars(e.target.value)} required style={{ width: '100%' }} placeholder="49.99" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Denomination</label>
              <input type="text" value={denomination} onChange={(e) => setDenomination(e.target.value)} style={{ width: '100%' }} placeholder="e.g. $1" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Metal</label>
              <select value={metalType} onChange={(e) => setMetalType(e.target.value)} style={{ width: '100%' }}>
                <option value="">None</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="platinum">Platinum</option>
                <option value="copper">Copper</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Weight (g)</label>
              <input type="number" step="0.1" min="0" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} style={{ width: '100%' }} placeholder="26.73" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Shipping</label>
              <select value={shippingOption} onChange={(e) => setShippingOption(e.target.value)} style={{ width: '100%' }}>
                <option value="seller_ships">Seller ships (USPS/FedEx/UPS)</option>
                <option value="trustdrop_delivery">TrustDrop courier delivery</option>
                <option value="local_pickup">Local pickup only</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Package weight (g)</label>
              <input type="number" step="1" min="0" value={packageWeight} onChange={(e) => setPackageWeight(e.target.value)} style={{ width: '100%' }} placeholder="Shipping weight" />
            </div>
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
              <input type="checkbox" checked={freeShipping} onChange={(e) => setFreeShipping(e.target.checked)} />
              Offer free shipping (seller pays)
            </label>
          </div>

          {/* Image upload */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
              Images ({imageFiles.length}/{MAX_FILES})
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragOver ? '#1e3a5f' : '#d1d5db'}`,
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                background: dragOver ? '#eff6ff' : '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <p style={{ margin: 0, color: '#6b7280' }}>
                📷 Drag & drop images here, or click to browse
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                JPG, PNG, GIF, WebP • Max 10MB each • Up to 10 images
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Preview thumbnails */}
            {previews.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {previews.map((url, i) => (
                  <div key={url} style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        background: '#ef4444', color: 'white', border: 'none',
                        borderRadius: '50%', width: '20px', height: '20px',
                        fontSize: '12px', cursor: 'pointer', lineHeight: '20px', padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="button secondary" onClick={() => navigate('/dealer/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="button" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Creating…' : 'Create Listing'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
