import api from './apiClient';

export const agentService = {
  analyzeIntake: (data) => api.post('/agents/analyze', data),
  coordinateBilling: (data) => api.post('/agents/coordinate', data),
  info: () => api.get('/agents/agent-info').then(r => r.data)
};
