import api from './api';

const dynamicPageService = {
  // Sayfa CRUD
  createPage: (data) => api.post('/DynamicPage', data).then(r => r.data),
  getAllPages: () => api.get('/DynamicPage').then(r => r.data),
  getPage: (id, search, column) =>
    api.get(`/DynamicPage/${id}`, { params: { search, column } }).then(r => r.data),
  deletePage: (id) => api.delete(`/DynamicPage/${id}`).then(r => r.data),

  // Satırlar
  addRow: (pageId, data) => api.post(`/DynamicPage/${pageId}/rows`, data).then(r => r.data),
  updateRow: (pageId, rowId, data) =>
    api.put(`/DynamicPage/${pageId}/rows/${rowId}`, data).then(r => r.data),
  deleteRow: (pageId, rowId) =>
    api.delete(`/DynamicPage/${pageId}/rows/${rowId}`).then(r => r.data),

  // Kolonlar
  addColumn: (pageId, data) =>
    api.post(`/DynamicPage/${pageId}/columns`, data).then(r => r.data),

  // Excel import
  importRows: (pageId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/DynamicPage/${pageId}/import`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

export default dynamicPageService;
