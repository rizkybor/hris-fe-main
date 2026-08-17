import ProjectCalculatorDashboard from "@/views/admin/project-calculator/ProjectCalculatorDashboard.vue";
import ProjectCalculatorForm from "@/views/admin/project-calculator/ProjectCalculatorForm.vue";
import ProjectCalculatorDetail from "@/views/admin/project-calculator/ProjectCalculatorDetail.vue";

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
