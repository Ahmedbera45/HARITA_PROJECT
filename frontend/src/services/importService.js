import api from './api';

const importService = {
  importParcels: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/Import/parcels', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  getLogs: () => api.get('/Import/logs').then(r => r.data),
  getParcels: (params = {}) => api.get('/Import/parcels', { params }).then(r => r.data),
};

export default importService;
