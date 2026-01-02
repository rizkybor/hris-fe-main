import CompanyAboutDashboard from '@/views/admin/company-about/CompanyDashboard.vue';
import CompanyAboutCreate from '@/views/admin/company-about/CompanyCreate.vue';
import CompanyAboutEdit from '@/views/admin/company-about/CompanyEdit.vue';


export default [
  {
    path: 'company-about',
    name: 'admin.company-about.dashboard',
    component: CompanyAboutDashboard,
  },
  {
    path: "company-about/create",
    name: "admin.company-about.create",
    component: CompanyAboutCreate,
  },
  {
    path: "company-about/:id/edit",
    name: "admin.company-about.edit",
    component: CompanyAboutEdit,
  },
];
