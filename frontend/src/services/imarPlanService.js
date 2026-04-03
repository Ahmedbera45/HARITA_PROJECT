import api from './api';

const imarPlanService = {
  getAll:     ()              => api.get('/ImarPlan').then(r => r.data),
  getById:    (id)            => api.get(`/ImarPlan/${id}`).then(r => r.data),
  create:     (data)          => api.post('/ImarPlan', data).then(r => r.data),
  update:     (id, data)      => api.put(`/ImarPlan/${id}`, data).then(r => r.data),
  delete:     (id)            => api.delete(`/ImarPlan/${id}`),
  addEk:      (id, data)      => api.post(`/ImarPlan/${id}/ekler`, data).then(r => r.data),
  deleteEk:   (ekId)          => api.delete(`/ImarPlan/ekler/${ekId}`),
  downloadEk: async (ekId) => {
    const resp = await api.get(`/ImarPlan/ekler/${ekId}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(resp.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = resp.headers['content-disposition']?.split('filename=')[1]?.replace(/"/g, '') || 'dosya';
    a.click();
    URL.revokeObjectURL(url);
  },
  browse:     (path = '')     => api.get('/ImarPlan/browse', { params: { path } }).then(r => r.data),
};

export default imarPlanService;
