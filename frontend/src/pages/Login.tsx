import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

interface SuccessState {
  message?: string;
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = (location.state as SuccessState | null)?.message;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    try {
      const authResponse = await loginApi({ email, password });
      login(authResponse.token, authResponse.user);
      navigate(authResponse.user.role === 'dealer' ? '/dealer/dashboard' : '/courier/dashboard', { replace: true });
    } catch (requestError: any) {
      const message = requestError.response?.data?.message ?? 'Unable to sign in. Please try again.';
      setError(
        message === 'Invalid credentials'
          ? 'Invalid email or password. Make sure you are using the correct account for your role (dealer or courier).'
          : message,
      );
    }
  }

  return (
    <main className="page">
      <section className="card auth-card">
        <h1>TrustDrop</h1>
        <p className="subtitle">Sign in to your dealer or courier account.</p>

        {successMessage ? <div className="alert success">{successMessage}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit">Sign in</button>
        </form>

        <p>
          <Link to="/register">Create an account</Link>
        </p>
        <p className="muted">
          <small>Need help? <Link to="/register">Register as a dealer or courier first</Link>, then sign in here.</small>
        </p>

        <hr style={{ margin: '16px 0', border: 'none', borderTop: '1px solid var(--border-color, #e5e7eb)' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>Just looking around?</p>
          <Link to="/demo" style={{ fontSize: '0.95rem' }}>
            Try the demo → instant access, no sign-up
          </Link>
        </div>
      </section>
    </main>
  );
}
