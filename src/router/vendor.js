const VendorsDashboard = () => import('@/views/admin/vendors/VendorsDashboard.vue');
const VendorsCreate = () => import('@/views/admin/vendors/VendorsCreate.vue');
const VendorsDetail = () => import('@/views/admin/vendors/VendorsDetail.vue');
const VendorsEdit = () => import('@/views/admin/vendors/VendorsEdit.vue');
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
