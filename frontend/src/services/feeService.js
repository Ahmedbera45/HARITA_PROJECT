import api from './api';

const feeService = {
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
