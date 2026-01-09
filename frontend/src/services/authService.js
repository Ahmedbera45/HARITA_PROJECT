import api from './api';

export const login = async (credentials) => {
  const response = await api.post('/Auth/login', credentials);
  
  // DİKKAT: Token'ı buraya kaydediyoruz
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/Auth/register', userData);
  
  // Kayıt olunca da otomatik giriş yapmış sayılırsın
  if (response.data.accessToken) {
    localStorage.setItem('token', response.data.accessToken);
  }
  
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};