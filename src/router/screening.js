const ScreeningList = () => import('@/views/admin/screening/ScreeningList.vue');
const ScreeningDetail = () => import('@/views/admin/screening/ScreeningDetail.vue');
const ScreeningSettings = () => import('@/views/admin/screening/ScreeningSettings.vue');

export default [
  {
    path: 'client-screening',
    name: 'admin.screening.dashboard',
    component: ScreeningList,
  },
  {
    path: 'client-screening/:id',
    name: 'admin.screening.detail',
    component: ScreeningDetail,
  },
  {
    path: 'settings/client-screening',
    name: 'admin.settings.client-screening',
    component: ScreeningSettings,
  },
];
