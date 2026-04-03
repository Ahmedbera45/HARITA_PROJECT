import api from './api';

const importService = {
  importParcels: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/Import/parcels', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  importShp: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/Import/parcels/shp', form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  getTemplate: () => api.get('/Import/template', { responseType: 'blob' }).then(r => r.data),
  getLogs: () => api.get('/Import/logs').then(r => r.data),
  getParcels: (params = {}) => api.get('/Import/parcels', { params }).then(r => r.data),
  searchParcel: (ada, parsel, mahalle) => api.get('/Import/parcels/search', { params: { ada, parsel, mahalle } }).then(r => r.data),
  updateParcel: (id, data) => api.put(`/Import/parcels/${id}`, data).then(r => r.data),
};

export default importService;
