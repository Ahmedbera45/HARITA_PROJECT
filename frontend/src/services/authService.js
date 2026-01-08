import api from './api';

const authService = {
  // Giriş Yapma
  login: async (email, password) => {
    // Backend'deki LoginDto yapısına uygun veri gönderiyoruz
    const response = await api.post('/Auth/Login', { email, password });
    return response.data; // Token döner
  },

  // Kayıt Olma
  register: async (userData) => {
    const response = await api.post('/Auth/Register', userData);
    return response.data;
  },
  
  // Çıkış (Sadece token'ı sileriz)
  logout: () => {
    localStorage.removeItem('token');
  }
};

export default authService;