import api from './api';

const userService = {
  getAll: ()                => api.get('/User').then(r => r.data),
  getById: (id)             => api.get(`/User/${id}`).then(r => r.data),
  create: (data)            => api.post('/User', data).then(r => r.data),
  update: (id, data)        => api.put(`/User/${id}`, data).then(r => r.data),
  delete: (id)              => api.delete(`/User/${id}`).then(r => r.data),
  changePassword: (id, pwd) => api.put(`/User/${id}/password`, { newPassword: pwd }).then(r => r.data),
  getPaged: (params) => api.get('/User/paged', { params }).then(r => r.data),
};

export default userService;
