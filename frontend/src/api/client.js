import axios from 'axios';

const DEFAULT_API_HOST = 'https://contract-farming-website.onrender.com';

const resolveApiConfig = () => {
  // In dev, use Vite proxy (vite.config.js forwards /api -> localhost:5000)
  if (import.meta.env.DEV) {
    return { host: '', baseUrl: '/api' };
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envUrl) {
    return { host: DEFAULT_API_HOST, baseUrl: `${DEFAULT_API_HOST}/api` };
  }

  if (envUrl.endsWith('/api')) {
    const host = envUrl.replace(/\/api\/?$/, '');
    return { host, baseUrl: envUrl.replace(/\/$/, '') };
  }

  const host = envUrl.replace(/\/$/, '');
  return { host, baseUrl: `${host}/api` };
};

const { host, baseUrl } = resolveApiConfig();

// Raw axios imports across the app use paths like `/api/auth/login`
axios.defaults.baseURL = host;

export const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

const stripJsonContentTypeForFormData = (config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
};

api.interceptors.request.use(stripJsonContentTypeForFormData);
axios.interceptors.request.use(stripJsonContentTypeForFormData);

export const setAuthToken = (token) => {
  if (token) {
    const value = `Bearer ${token}`;
    api.defaults.headers.common.Authorization = value;
    axios.defaults.headers.common.Authorization = value;
  } else {
    delete api.defaults.headers.common.Authorization;
    delete axios.defaults.headers.common.Authorization;
  }
};
