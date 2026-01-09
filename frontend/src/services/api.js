import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5270/api', // Backend adresin
});

// Her istekten (Request) önce çalışacak kod:
api.interceptors.request.use(
  (config) => {
    // 1. LocalStorage'dan Token'ı al
    const token = localStorage.getItem('token');
    
    // 2. Eğer token varsa, isteğin başlığına ekle
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;