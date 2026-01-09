import api from './api';

const taskService = {
  // Tüm görevleri getir
  getAll: async () => {
    const response = await api.get('/Task');
    return response.data;
  },

  // Yeni görev oluştur
  create: async (data) => {
    const response = await api.post('/Task', data);
    return response.data;
  },

  // Görevi güncelle (Durum, Başlık vb.)
  update: async (id, data) => {
    const response = await api.put(`/Task/${id}`, data);
    return response.data;
  },

  // Görevi sil
  delete: async (id) => {
    const response = await api.delete(`/Task/${id}`);
    return response.data;
  }
};

export default taskService;