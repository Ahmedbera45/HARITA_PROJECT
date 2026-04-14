import api from './api';

const noteService = {
  // Kategoriler
  getCategories: () =>
    api.get('/Note/categories').then(r => r.data),
  createCategory: (data) =>
    api.post('/Note/categories', data).then(r => r.data),
  updateCategory: (id, data) =>
    api.put(`/Note/categories/${id}`, data).then(r => r.data),
  deleteCategory: (id) =>
    api.delete(`/Note/categories/${id}`),

  // Notlar
  getAll: (categoryId) =>
    api.get('/Note', { params: categoryId ? { categoryId } : {} }).then(r => r.data),
  getById: (id) =>
    api.get(`/Note/${id}`).then(r => r.data),
  create: (data) =>
    api.post('/Note', data).then(r => r.data),
  update: (id, data) =>
    api.put(`/Note/${id}`, data).then(r => r.data),
  delete: (id) =>
    api.delete(`/Note/${id}`),

  // Paylaşım
  share: (noteId, data) =>
    api.post(`/Note/${noteId}/shares`, data).then(r => r.data),
  removeShare: (noteId, shareId) =>
    api.delete(`/Note/${noteId}/shares/${shareId}`),

  // Dosyalar
  uploadFile: (noteId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/Note/${noteId}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
  deleteFile: (noteId, fileId) =>
    api.delete(`/Note/${noteId}/files/${fileId}`),
};

export default noteService;
