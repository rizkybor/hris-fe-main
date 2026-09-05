const ClientDashboard = () => import('@/views/admin/clients/ClientDashboard.vue');
const ClientCreate = () => import('@/views/admin/clients/ClientCreate.vue');
const ClientDetail = () => import('@/views/admin/clients/ClientDetail.vue');
const ClientEdit = () => import('@/views/admin/clients/ClientEdit.vue');
export default [
  {
    path: 'clients',
    name: 'admin.clients.dashboard',
    component: ClientDashboard,
  },
  {
    path: "clients/create",
    name: "admin.clients.create",
    component: ClientCreate,
  },
  {
    path: "clients/:id",
    name: "admin.clients.detail",
    component: ClientDetail,
  },
  {
    path: "clients/:id/edit",
    name: "admin.clients.edit",
    component: ClientEdit,
  },
];
