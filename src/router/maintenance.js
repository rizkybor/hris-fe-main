const MaintenanceDashboard = () => import('@/views/admin/maintenance/MaintenanceDashboard.vue');
const MaintenanceDetail = () => import('@/views/admin/maintenance/MaintenanceDetail.vue');

export default [
  {
    path: 'maintenance',
    name: 'admin.maintenance.dashboard',
    component: MaintenanceDashboard,
  },
  {
    path: 'maintenance/:id',
    name: 'admin.maintenance.detail',
    component: MaintenanceDetail,
  },
];
