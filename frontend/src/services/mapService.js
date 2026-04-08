import api from './api';

const mapService = {
  getLayers: () => api.get('/Map/layers').then(r => r.data),
  createLayer: (data) => api.post('/Map/layers', data).then(r => r.data),
  updateLayer: (id, data) => api.put(`/Map/layers/${id}`, data).then(r => r.data),
  deleteLayer: (id) => api.delete(`/Map/layers/${id}`).then(r => r.data),
  uploadShp: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/Map/layers/shp', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  getParcelsGeoJson: () => api.get('/Map/parcels/geojson').then(r => r.data),
  getParcelCount: () => api.get('/Map/parcels/count').then(r => r.data),
  getLayerGeoJson: (id) => api.get(`/Map/layers/${id}/geojson`).then(r => r.data),
};

export default mapService;
