export const queryKeys = {
  authMe: ['auth', 'me'],
  appointments: (params) => ['appointments', params],
  appointment: (id) => ['appointments', id],
  availability: (params) => ['availability', params],
  stats: (params) => ['stats', params],
  users: (params) => ['users', params],
};
