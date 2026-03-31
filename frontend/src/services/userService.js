import api from './api';

const userService = {
  getAll: () => api.get('/User').then(r => r.data),
};

export default userService;
