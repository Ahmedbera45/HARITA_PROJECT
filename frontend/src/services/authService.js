import api from './api';

// 1. "export const" diyerek süslü parantez ile çağrılabilmesini sağlıyoruz ({ login })
// 2. Parametreyi (credentials) tek bir nesne olarak alıyoruz ki Login.jsx'den gelen formData ile uyuşsun.

export const login = async (credentials) => {
  // credentials şöyledir: { email: "...", password: "..." }
  const response = await api.post('/Auth/Login', credentials);
  return response.data; 
};

export const register = async (userData) => {
  const response = await api.post('/Auth/Register', userData);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

// İstersen "import authService from..." dendiğinde de çalışsın diye default bırakıyoruz
const authService = {
  login,
  register,
  logout
};

export default authService;