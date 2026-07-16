import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import type { UserRole } from '../types';

type RegisterRole = Extract<UserRole, 'dealer' | 'courier'>;

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [tosChecked, setTosChecked] = useState(false);
  const [tosError, setTosError] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'dealer' as RegisterRole,
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!tosChecked) {
      setTosError(true);
      return;
    }
    setTosError(false);

    try {
      await register({ ...formData, tosAccepted: true });
      navigate('/login', {
        replace: true,
        state: { message: 'Registration successful. Please sign in.' },
      });
    } catch (requestError: any) {
      setError(requestError.response?.data?.message ?? 'Unable to register. Please try again.');
    }
  }

  return (
    <main className="page">
      <section className="card auth-card">
        <h1>Create Account</h1>
        <p className="subtitle">Join TrustDrop as a dealer or courier.</p>

        {error ? <div className="alert error">{error}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={formData.name}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={formData.password}
              onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
              required
            />
          </label>
          <label>
            Account type
            <select
              value={formData.role}
              onChange={(event) => setFormData((prev) => ({ ...prev, role: event.target.value as RegisterRole }))}
            >
              <option value="dealer">Dealer</option>
              <option value="courier">Courier</option>
            </select>
          </label>

          <div className="tos-checkbox-section">
            <label className="tos-label" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={(event) => {
                  setTosChecked(event.target.checked);
                  setTosError(false);
                }}
                style={{ marginTop: '3px' }}
              />
              <span>
                I have read and agree to the{' '}
                <Link to="/tos" target="_blank" onClick={(e) => e.stopPropagation()}>
                  Terms of Service
                </Link>
              </span>
            </label>
            {tosError ? (
              <p className="alert error" style={{ marginTop: '4px' }}>
                You must accept the Terms of Service to create an account.
              </p>
            ) : null}
          </div>

          <button type="submit">Create account</button>
        </form>

        <p>
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
