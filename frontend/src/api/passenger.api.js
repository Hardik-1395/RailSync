import client from './client';

export const passengerApi = {
  list: () => client.get('/users/user/passengers').then((r) => r.data),
  create: (data) => client.post('/users/user/passengers', data).then((r) => r.data),
  update: (id, data) => client.put(`/users/user/passengers/${id}`, data).then((r) => r.data),
  remove: (id) => client.delete(`/users/user/passengers/${id}`).then((r) => r.data),
};
