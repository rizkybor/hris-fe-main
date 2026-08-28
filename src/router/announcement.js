const AnnouncementDashboard = () => import('@/views/admin/announcement/AnnouncementDashboard.vue');
export default [
  {
    path: 'announcements',
    name: 'admin.announcements.dashboard',
    component: AnnouncementDashboard,
  },
];
