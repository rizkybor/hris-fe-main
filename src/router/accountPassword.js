import AccountPasswordDashboard from "@/views/admin/account-password/AccountPasswordDashboard.vue";
import AccountPasswordCreate from "@/views/admin/account-password/AccountPasswordCreate.vue";
import AccountPasswordDetail from "@/views/admin/account-password/AccountPasswordDetail.vue";
import AccountPasswordEdit from "@/views/admin/account-password/AccountPasswordEdit.vue";

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
