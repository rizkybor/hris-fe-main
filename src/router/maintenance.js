const MaintenanceDashboard = () => import('@/views/admin/maintenance/MaintenanceDashboard.vue');
const MaintenanceDetail = () => import('@/views/admin/maintenance/MaintenanceDetail.vue');

export default [
  {
    path: 'maintenance',
    name: 'admin.maintenance.dashboard',
    component: MaintenanceDashboard,
    meta: { permission: ['maintenance-menu', 'maintenance-list'] },
  },
  {
    path: 'maintenance/:id',
    name: 'admin.maintenance.detail',
    component: MaintenanceDetail,
    meta: { permission: ['maintenance-menu', 'maintenance-list'] },
  },
];
