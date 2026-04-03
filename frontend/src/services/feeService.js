import api from './api';

const feeService = {
  // Harç kategorileri
  getCategories: () => api.get('/FeeCalculation/categories').then(r => r.data),
  createCategory: (data) => api.post('/FeeCalculation/categories', data).then(r => r.data),
  updateCategory: (id, data) => api.put(`/FeeCalculation/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id) => api.delete(`/FeeCalculation/categories/${id}`).then(r => r.data),

  // Harç kalemleri
  getRates: () => api.get('/FeeCalculation/rates').then(r => r.data),
  createRate: (data) => api.post('/FeeCalculation/rates', data).then(r => r.data),
  updateRate: (id, data) => api.put(`/FeeCalculation/rates/${id}`, data).then(r => r.data),
  deleteRate: (id) => api.delete(`/FeeCalculation/rates/${id}`).then(r => r.data),

  // Hesaplamalar
  calculate: (data) => api.post('/FeeCalculation', data).then(r => r.data),
  getAll: () => api.get('/FeeCalculation').then(r => r.data),
  getById: (id) => api.get(`/FeeCalculation/${id}`).then(r => r.data),
  delete: (id) => api.delete(`/FeeCalculation/${id}`).then(r => r.data),
};

export default feeService;
