import api from './api';

const leaveService = {
  getAll: () => api.get('/Leave').then(r => r.data),
  create: (data) => api.post('/Leave', data).then(r => r.data),
  review: (id, data) => api.put(`/Leave/${id}/review`, data).then(r => r.data),
  delete: (id) => api.delete(`/Leave/${id}`).then(r => r.data),

  // Kalan izin özeti
  getBalanceSummary: () => api.get('/Leave/balance-summary').then(r => r.data),

  // Saatlik izin özeti
  getHourlySummary: () => api.get('/Leave/hourly-summary').then(r => r.data),

  // Saatlik telafi girişi
  addHourlyCompensation: (data) => api.post('/Leave/hourly-compensation', data).then(r => r.data),

  // Tüm saatlik telafi kayıtları
  getAllHourlyCompensations: () => api.get('/Leave/hourly-compensations').then(r => r.data),

  // Sayfalı liste
  getPaged: (params) => api.get('/Leave/paged', { params }).then(r => r.data),
};

export default leaveService;
