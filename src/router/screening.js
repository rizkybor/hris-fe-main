const ScreeningList = () => import('@/views/admin/screening/ScreeningList.vue');
const ScreeningDetail = () => import('@/views/admin/screening/ScreeningDetail.vue');
const ScreeningSettings = () => import('@/views/admin/screening/ScreeningSettings.vue');

export default [
  {
    path: 'client-screening',
    name: 'admin.screening.dashboard',
    component: ScreeningList,
    meta: { permission: ['screening-menu', 'screening-list'] },
  },
  {
    path: 'client-screening/:id',
    name: 'admin.screening.detail',
    component: ScreeningDetail,
    meta: { permission: ['screening-menu', 'screening-list'] },
  },
  {
    path: 'settings/client-screening',
    name: 'admin.settings.client-screening',
    component: ScreeningSettings,
    meta: { permission: 'screening-settings' },
  },
];
