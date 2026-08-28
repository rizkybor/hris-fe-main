const FilesCompanyDashboard = () => import("@/views/admin/files/FilesCompanyDashboard.vue");
const FilesCompanyCreate = () => import("@/views/admin/files/FilesCompanyCreate.vue");
const FilesCompanyDetail = () => import("@/views/admin/files/FilesCompanyDetail.vue");
const FilesCompanyEdit = () => import("@/views/admin/files/FilesCompanyEdit.vue");
export default [
  {
    path: "files-company",
    name: "admin.files-company.dashboard",
    component: FilesCompanyDashboard,
  },
  {
    path: "files-company/create",
    name: "admin.files-company.create",
    component: FilesCompanyCreate,
  },
  {
    path: "files-company/:id",
    name: "admin.files-company.detail",
    component: FilesCompanyDetail,
  },
  {
    path: "files-company/:id/edit",
    name: "admin.files-company.edit",
    component: FilesCompanyEdit,
  },
];
