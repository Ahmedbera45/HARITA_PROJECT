import api from './api';

const permissionService = {
  getGroups: () => api.get('/Permission').then(r => r.data),
  createGroup: (data) => api.post('/Permission', data).then(r => r.data),
  updateGroup: (id, data) => api.put(`/Permission/${id}`, data).then(r => r.data),
  deleteGroup: (id) => api.delete(`/Permission/${id}`),
  getUserGroups: (userId) => api.get(`/Permission/user/${userId}/groups`).then(r => r.data),
  setUserGroups: (userId, groupIds) => api.put(`/Permission/user/${userId}/groups`, groupIds).then(r => r.data),
};

export default permissionService;
