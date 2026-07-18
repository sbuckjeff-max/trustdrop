import { apiClient, authHeaders } from './client';
import type { User, UserRole } from '../types';

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'dealer' | 'courier'>;
  tosAccepted: boolean;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

export async function register(userData: RegisterPayload) {
  const response = await apiClient.post('/auth/register', userData);
  return response.data as { message: string };
}

export async function login(credentials: LoginPayload) {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data as AuthResponse;
}

export async function getMe(token: string) {
  const response = await apiClient.get('/auth/me', {
    headers: authHeaders(token),
  });

  return response.data as User;
}

export async function demoLogin(role: string) {
  const response = await apiClient.post('/auth/demo-login', { role });
  return response.data as AuthResponse;
}
