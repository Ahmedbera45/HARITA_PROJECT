import api from './api';

const leaveService = {
  getAll: () => api.get('/Leave').then(r => r.data),
  create: (data) => api.post('/Leave', data).then(r => r.data),
  review: (id, data) => api.put(`/Leave/${id}/review`, data).then(r => r.data),
  delete: (id) => api.delete(`/Leave/${id}`).then(r => r.data),
};

export default leaveService;
