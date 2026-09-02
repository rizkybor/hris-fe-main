const AnalyticsDashboard = () => import('@/views/admin/analytics/AnalyticsDashboard.vue');

export default [
  {
    path: 'analytics',
    name: 'admin.analytics.dashboard',
    component: AnalyticsDashboard,
  },
];
