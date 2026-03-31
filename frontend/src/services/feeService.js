import api from './api';

const feeService = {
  getRates: () => api.get('/FeeCalculation/rates'),
  calculate: (data) => api.post('/FeeCalculation', data),
  getAll: () => api.get('/FeeCalculation'),
  getById: (id) => api.get(`/FeeCalculation/${id}`),
  delete: (id) => api.delete(`/FeeCalculation/${id}`),
};

export default feeService;
