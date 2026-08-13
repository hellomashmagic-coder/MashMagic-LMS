import axios from 'axios';
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = sessionStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth expiration safely
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const isExpired = Boolean(error?.response?.data?.isExpired);
        const message = String(error?.response?.data?.message || '').toLowerCase();
        const looksLikeTokenProblem =
            message.includes('token expired') ||
            message.includes('token failed') ||
            message.includes('no token') ||
            message.includes('not authorized');

        // ONLY force logout for genuine 401 (Unauthorized/Expired) or explicit expired flags.
        // Do NOT logout on 403 (Forbidden/Role mismatch).
        if (status === 401 || isExpired) {
            console.warn(`[AUTH EXPIRED] Status ${status}: clearing session`);
            
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            sessionStorage.removeItem('role');
            
            // Optional: notify user or redirect
            // window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);
export default api;
