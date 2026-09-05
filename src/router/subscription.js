const SubscriptionsDashboard = () => import('@/views/admin/subscriptions/SubscriptionsDashboard.vue');

export default [
  {
    path: 'subscriptions',
    name: 'admin.subscriptions.dashboard',
    component: SubscriptionsDashboard,
  },
];
