import axios from 'axios';

// Backend adresini buraya yazıyoruz (Senin swagger portun 5270 idi)
const API_URL = 'http://localhost:5270/api';

const api = axios.create({
  baseURL: API_URL,
});

// Her istekten önce çalışır: Eğer localStorage'da token varsa onu Header'a ekler
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
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