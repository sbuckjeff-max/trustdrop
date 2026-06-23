import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createDelivery } from '../api/deliveries';
import { useAuth } from '../context/AuthContext';

export default function NewDelivery() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    pickupAddress: '',
    dropoffAddress: '',
    itemDescription: '',
    estimatedValue: '',
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setError('You must be logged in to create a delivery.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const delivery = await createDelivery(token, {
        pickupAddress: formData.pickupAddress,
        dropoffAddress: formData.dropoffAddress,
        itemDescription: formData.itemDescription,
        estimatedValue: Number(formData.estimatedValue),
      });
      navigate(`/dealer/deliveries/${delivery.id}`);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Unable to create delivery.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="top-row">
          <h1>Create Delivery Request</h1>
          <Link className="button secondary" to="/dealer/dashboard">
            Back to dashboard
          </Link>
        </div>

        {error ? <div className="alert error">{error}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Pickup address
            <input
              type="text"
              required
              value={formData.pickupAddress}
              onChange={(event) => setFormData((prev) => ({ ...prev, pickupAddress: event.target.value }))}
            />
          </label>
          <label>
            Drop-off address
            <input
              type="text"
              required
              value={formData.dropoffAddress}
              onChange={(event) => setFormData((prev) => ({ ...prev, dropoffAddress: event.target.value }))}
            />
          </label>
          <label>
            Item description
            <textarea
              required
              rows={4}
              value={formData.itemDescription}
              onChange={(event) => setFormData((prev) => ({ ...prev, itemDescription: event.target.value }))}
            />
          </label>
          <label>
            Estimated value (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.estimatedValue}
              onChange={(event) => setFormData((prev) => ({ ...prev, estimatedValue: event.target.value }))}
            />
          </label>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create delivery'}
          </button>
        </form>
      </section>
    </main>
  );
}
