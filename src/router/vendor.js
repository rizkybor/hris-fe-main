import VendorsDashboard from '@/views/admin/vendors/VendorsDashboard.vue';
import VendorsCreate from '@/views/admin/vendors/VendorsCreate.vue';
import VendorsDetail from '@/views/admin/vendors/VendorsDetail.vue';
import VendorsEdit from '@/views/admin/vendors/VendorsEdit.vue';


export default [
  {
    path: 'vendors',
    name: 'admin.vendors.dashboard',
    component: VendorsDashboard,
  },
  {
    path: "vendors/create",
    name: "admin.vendors.create",
    component: VendorsCreate,
  },
  {
    path: "vendors/:id",
    name: "admin.vendors.detail",
    component: VendorsDetail,
  },
  {
    path: "vendors/:id/edit",
    name: "admin.vendors.edit",
    component: VendorsEdit,
  },
];
