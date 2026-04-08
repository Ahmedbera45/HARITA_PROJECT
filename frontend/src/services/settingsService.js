import api from './api';

const settingsService = {
  getNetworkStoragePath: () => api.get('/Settings/network-storage-path').then(r => r.data),
  updateNetworkStoragePath: (value) => api.put('/Settings/network-storage-path', { value }).then(r => r.data),
  testNetworkPath: (path) => api.get('/Settings/test-network-path', { params: { path } }).then(r => r.data?.accessible ?? false),
};

export default settingsService;
