const ServerStorageDashboard = () => import('@/views/admin/server-storage/ServerStorageDashboard.vue');

export default [
  {
    path: 'server-list',
    name: 'admin.server-storage.dashboard',
    component: ServerStorageDashboard,
  },
  // Old address, kept working for bookmarks and earlier links.
  {
    path: 'server-storage',
    redirect: { name: 'admin.server-storage.dashboard' },
  },
];
