const ProjectCalculatorDashboard = () => import("@/views/admin/project-calculator/ProjectCalculatorDashboard.vue");
const ProjectCalculatorForm = () => import("@/views/admin/project-calculator/ProjectCalculatorForm.vue");
const ProjectCalculatorDetail = () => import("@/views/admin/project-calculator/ProjectCalculatorDetail.vue");
export default [
  {
    path: "project-calculator",
    name: "admin.project-calculator.dashboard",
    component: ProjectCalculatorDashboard,
  },
  {
    path: "project-calculator/create",
    name: "admin.project-calculator.create",
    component: ProjectCalculatorForm,
  },
  {
    path: "project-calculator/:id",
    name: "admin.project-calculator.detail",
    component: ProjectCalculatorDetail,
  },
  {
    path: "project-calculator/:id/edit",
    name: "admin.project-calculator.edit",
    component: ProjectCalculatorForm,
  },
];
