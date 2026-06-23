import axios from 'axios';

const API_URL = '/api';

export const register = async (userData: any) => {
  const response = await axios.post(`${API_URL}/auth/register`, userData);
  return response.data;
};

export const login = async (credentials: any) => {
  const response = await axios.post(`${API_URL}/auth/login`, credentials);
  return response.data;
};

export const getMe = async (token: string) => {
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return response.data;
};
