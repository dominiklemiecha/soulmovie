import axios, { AxiosError } from 'axios';
import { useAuthStore } from './auth-store';

export const api = axios.create({ baseURL: '/api/v1', withCredentials: true });

api.interceptors.request.use((cfg) => {
  const token = useAuthStore.getState().accessToken;
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

let refreshing: Promise<void> | null = null;
api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as any;
    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;
      refreshing ??= (async () => {
        try {
          const r = await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
          useAuthStore.getState().setAuth(r.data.accessToken, r.data.user);
        } catch {
          useAuthStore.getState().clear();
        }
      })().finally(() => {
        refreshing = null;
      });
      await refreshing;
      return api(original);
    }
    return Promise.reject(err);
  },
);
