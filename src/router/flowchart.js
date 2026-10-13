const FlowchartDashboard = () => import("@/views/admin/flowchart/FlowchartDashboard.vue");
const FlowchartEditor = () => import("@/views/admin/flowchart/FlowchartEditor.vue");

export default [
  {
    path: "flowcharts",
    name: "admin.flowchart.dashboard",
    component: FlowchartDashboard,
  },
  {
    path: "flowcharts/create",
    name: "admin.flowchart.create",
    component: FlowchartEditor,
  },
  {
    path: "flowcharts/:id",
    name: "admin.flowchart.detail",
    component: FlowchartEditor,
    props: { readonly: true },
  },
  {
    path: "flowcharts/:id/edit",
    name: "admin.flowchart.edit",
    component: FlowchartEditor,
  },
];
