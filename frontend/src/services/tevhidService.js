import api from './api';

const tevhidService = {
  create: (data) => api.post('/Tevhid', data).then(r => r.data),
  getAll: () => api.get('/Tevhid').then(r => r.data),
  getById: (id) => api.get(`/Tevhid/${id}`).then(r => r.data),
  review: (id, data) => api.put(`/Tevhid/${id}/review`, data).then(r => r.data),
  update: (id, data) => api.put(`/Tevhid/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/Tevhid/${id}`).then(r => r.data),

  getPaged: (params) => api.get('/Tevhid/paged', { params }).then(r => r.data),

  resubmit: (id) => api.put(`/Tevhid/${id}/resubmit`).then(r => r.data),

  uploadFile: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/Tevhid/${id}/upload`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  exportAllApproved: () =>
    api.get('/Tevhid/export/approved', { responseType: 'blob' }),
  exportScenarios: (id) =>
    api.get(`/Tevhid/export/${id}/scenarios`, { responseType: 'blob' }),
  exportApproved: (id) =>
    api.get(`/Tevhid/export/${id}/approved`, { responseType: 'blob' }),
};

export default tevhidService;
