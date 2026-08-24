import SettingsDashboard from '@/views/admin/settings/SettingsDashboard.vue';
import RolesPermissions from '@/views/admin/settings/RolesPermissions.vue';
import ConfigurableOptions from '@/views/admin/settings/ConfigurableOptions.vue';
import StaffPermissions from '@/views/admin/settings/StaffPermissions.vue';
import DocumentCodes from '@/views/admin/settings/DocumentCodes.vue';
import BankAccounts from '@/views/admin/settings/BankAccounts.vue';
import SdmFields from '@/views/admin/settings/SdmFields.vue';
import CertificateSettings from '@/views/admin/settings/CertificateSettings.vue';
import BackupDatabase from '@/views/admin/settings/BackupDatabase.vue';

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
];
