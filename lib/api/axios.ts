import axios from 'axios';
import { getCookie,useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getCookie('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Get the selected profile from the store on each request
    const { selectedProfile } = useAuthStore.getState();
    if(selectedProfile){
      config.params={...config.params,profile:selectedProfile._id};
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't handle 401 errors on login/register endpoints
    const isAuthEndpoint = originalRequest.url?.includes('/userAuth/login') || 
                          originalRequest.url?.includes('/userAuth/register') ||
                          originalRequest.url?.includes('/userAuth/verify-otp') ||
                          originalRequest.url?.includes('/userAuth/req-login-otp') ||
                          originalRequest.url?.includes('/userAuth/login-otp-verify');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/userAuth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        const { logout } = useAuthStore.getState();
        logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
