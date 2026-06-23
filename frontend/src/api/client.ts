import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
});

export function authHeaders(token: string | null): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
}
