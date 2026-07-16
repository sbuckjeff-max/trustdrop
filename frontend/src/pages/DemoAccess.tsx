import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { demoLogin } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

export default function DemoAccess() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<UserRole | null>(null);
  const [error, setError] = useState('');

  async function handleDemoLogin(role: Extract<UserRole, 'dealer' | 'courier'>) {
    setLoading(role);
    setError('');

    try {
      const authResponse = await demoLogin(role);
      login(authResponse.token, authResponse.user);
      navigate(role === 'dealer' ? '/dealer/dashboard' : '/courier/dashboard', { replace: true });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Demo login failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="page">
      <section className="card auth-card" style={{ maxWidth: '480px' }}>
        <h1>Demo Access</h1>
        <p className="subtitle">Try TrustDrop instantly — no sign-up required.</p>
        <p className="muted">
          Pick a role below to explore the platform with pre-loaded sample data.
        </p>

        {error ? <div className="alert error">{error}</div> : null}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
          <button
            type="button"
            style={{ padding: '14px', fontSize: '1.05rem' }}
            disabled={loading !== null}
            onClick={() => void handleDemoLogin('dealer')}
          >
            {loading === 'dealer' ? 'Signing in…' : '🏪 Sign in as Demo Dealer'}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Create deliveries, view courier locations, manage your dashboard.
          </p>

          <button
            type="button"
            style={{ padding: '14px', fontSize: '1.05rem' }}
            disabled={loading !== null}
            onClick={() => void handleDemoLogin('courier')}
          >
            {loading === 'courier' ? 'Signing in…' : '🚗 Sign in as Demo Courier'}
          </button>
          <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
            Browse available deliveries, accept jobs, track progress.
          </p>
        </div>

        <p>
          <Link to="/login">← Back to regular sign in</Link>
        </p>
      </section>
    </main>
  );
}
