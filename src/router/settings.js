import SettingsDashboard from '@/views/admin/settings/SettingsDashboard.vue';
import RolesPermissions from '@/views/admin/settings/RolesPermissions.vue';
import DocumentCodes from '@/views/admin/settings/DocumentCodes.vue';

export default [
  {
    path: 'settings',
    name: 'admin.settings.dashboard',
    component: SettingsDashboard,
  },
  {
    path: 'settings/roles',
    name: 'admin.settings.roles',
    component: RolesPermissions,
  },
  {
    path: 'settings/document-codes',
    name: 'admin.settings.document-codes',
    component: DocumentCodes,
  },
];
