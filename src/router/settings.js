const SettingsDashboard = () => import('@/views/admin/settings/SettingsDashboard.vue');
const RolesPermissions = () => import('@/views/admin/settings/RolesPermissions.vue');
const ConfigurableOptions = () => import('@/views/admin/settings/ConfigurableOptions.vue');
const StaffPermissions = () => import('@/views/admin/settings/StaffPermissions.vue');
const DocumentCodes = () => import('@/views/admin/settings/DocumentCodes.vue');
const BankAccounts = () => import('@/views/admin/settings/BankAccounts.vue');
const SdmFields = () => import('@/views/admin/settings/SdmFields.vue');
const CertificateSettings = () => import('@/views/admin/settings/CertificateSettings.vue');
const BackupDatabase = () => import('@/views/admin/settings/BackupDatabase.vue');
const GreetingSettings = () => import('@/views/admin/settings/GreetingSettings.vue');
const AttendanceSettings = () => import('@/views/admin/settings/AttendanceSettings.vue');
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
    path: 'settings/staff-permissions',
    name: 'admin.settings.staff-permissions',
    component: StaffPermissions,
  },
  {
    path: 'settings/dropdown-options',
    name: 'admin.settings.dropdown-options',
    component: ConfigurableOptions,
  },
  {
    path: 'settings/document-codes',
    name: 'admin.settings.document-codes',
    component: DocumentCodes,
  },
  {
    path: 'settings/bank-accounts',
    name: 'admin.settings.bank-accounts',
    component: BankAccounts,
  },
  {
    path: 'settings/sdm-fields',
    name: 'admin.settings.sdm-fields',
    component: SdmFields,
  },
  {
    path: 'settings/certificate',
    name: 'admin.settings.certificate-settings',
    component: CertificateSettings,
  },
  {
    path: 'settings/backup',
    name: 'admin.settings.backup',
    component: BackupDatabase,
  },
  {
    path: 'settings/greetings',
    name: 'admin.settings.greetings',
    component: GreetingSettings,
  },
  {
    path: 'settings/attendance',
    name: 'admin.settings.attendance',
    component: AttendanceSettings,
  },
];
