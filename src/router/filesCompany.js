import FilesCompanyDashboard from "@/views/admin/files/FilesCompanyDashboard.vue";
import FilesCompanyCreate from "@/views/admin/files/FilesCompanyCreate.vue";
import FilesCompanyDetail from "@/views/admin/files/FilesCompanyDetail.vue";
import FilesCompanyEdit from "@/views/admin/files/FilesCompanyEdit.vue";

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
