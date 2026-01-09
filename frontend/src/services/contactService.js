import api from './api';

const contactService = {
  // Tüm kişileri getir
  getAll: async () => {
    const response = await api.get('/Contact');
    return response.data;
  },

  // Yeni kişi ekle
  create: async (data) => {
    const response = await api.post('/Contact', data);
    return response.data;
  },

  // Kişi sil
  delete: async (id) => {
    const response = await api.delete(`/Contact/${id}`);
    return response.data;
  },

    // Kişi güncelle
  update: async (id, data) => {
    const response = await api.put(`/Contact/${id}`, data);
    return response.data;
  }

};

export default contactService;