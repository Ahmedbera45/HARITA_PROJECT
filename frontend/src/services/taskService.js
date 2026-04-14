import api from './api';

const taskService = {
  getAll: (params = {}) => api.get('/Task', { params }).then(r => r.data),
  getById: (id) => api.get(`/Task/${id}`).then(r => r.data),
  getSummary: () => api.get('/Task/summary').then(r => r.data),
  create: (data) => api.post('/Task', data).then(r => r.data),
  update: (id, data) => api.put(`/Task/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/Task/${id}`).then(r => r.data),
  getPaged: (params) => api.get('/Task/paged', { params }).then(r => r.data),

  // Dosya ekleri
  getFiles: (taskId) => api.get(`/Task/${taskId}/files`).then(r => r.data),
  uploadFile: (taskId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/Task/${taskId}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  deleteFile: (taskId, fileId) => api.delete(`/Task/${taskId}/files/${fileId}`),
};

export default taskService;