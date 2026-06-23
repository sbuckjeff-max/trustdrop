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
      setError(requestError.response?.data?.message ?? 'Unable to sign in. Please try again.');
    }
  }

  return (
    <main className="page">
      <section className="card auth-card">
        <h1>TrustDrop Login</h1>
        <p className="subtitle">Secure access for dealers and couriers.</p>

        {successMessage ? <div className="alert success">{successMessage}</div> : null}
        {error ? <div className="alert error">{error}</div> : null}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button type="submit">Sign in</button>
        </form>

        <p>
          Need an account? <Link to="/register">Create one</Link>
        </p>
      </section>
    </main>
  );
}
