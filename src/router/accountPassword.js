const AccountPasswordDashboard = () => import("@/views/admin/account-password/AccountPasswordDashboard.vue");
const AccountPasswordCreate = () => import("@/views/admin/account-password/AccountPasswordCreate.vue");
const AccountPasswordDetail = () => import("@/views/admin/account-password/AccountPasswordDetail.vue");
const AccountPasswordEdit = () => import("@/views/admin/account-password/AccountPasswordEdit.vue");
export default [
  {
    path: "account-password",
    name: "admin.account-password.dashboard",
    component: AccountPasswordDashboard,
  },
  {
    path: "account-password/create",
    name: "admin.account-password.create",
    component: AccountPasswordCreate,
  },
  {
    path: "account-password/:id",
    name: "admin.account-password.detail",
    component: AccountPasswordDetail,
  },
  {
    path: "account-password/:id/edit",
    name: "admin.account-password.edit",
    component: AccountPasswordEdit,
  },
];
