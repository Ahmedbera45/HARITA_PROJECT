import api from './api';

const gisService = {
  testConnection: () =>
    api.get('/Gis/test').then(r => r.data?.connected ?? false),

  getTables: () =>
    api.get('/Gis/tables').then(r => r.data),

  preview: (params) =>
    api.get('/Gis/preview', { params }).then(r => r.data),

  // body: { schema, table, mahalle?, ada?, batchPrefix, columnMapping: {...} }
  importWithMapping: (body) =>
    api.post('/Gis/import', body).then(r => r.data),

  getGeoJson: (schema, table, limit = 10000) =>
    api.get('/Gis/geojson', { params: { schema, table, limit } }).then(r => r.data),
};

export default gisService;
