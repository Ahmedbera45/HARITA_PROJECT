import api from './api';

const taskService = {
  getAll: (params = {}) => api.get('/Task', { params }).then(r => r.data),
  getById: (id) => api.get(`/Task/${id}`).then(r => r.data),
  getSummary: () => api.get('/Task/summary').then(r => r.data),
  create: (data) => api.post('/Task', data).then(r => r.data),
  update: (id, data) => api.put(`/Task/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/Task/${id}`).then(r => r.data),
};

export default taskService;