// License Manager: license keys for the owner's apps. Every license page
// lives under its product (:product = product code, e.g. "occa").
const LicenseOverview = () => import("@/views/admin/license-manager/LicenseOverview.vue");
const LicenseDashboard = () => import("@/views/admin/license-manager/LicenseDashboard.vue");
const LicenseCreate = () => import("@/views/admin/license-manager/LicenseCreate.vue");
const LicenseDetail = () => import("@/views/admin/license-manager/LicenseDetail.vue");
const LicenseEdit = () => import("@/views/admin/license-manager/LicenseEdit.vue");

// Lowercase letters, digits and single hyphens.
const PRODUCT = ":product([a-z0-9-]+)"; // vue-router param regexes can't contain groups; the API validates codes

export default [
  {
    path: "license-manager",
    name: "admin.license-manager.overview",
    component: LicenseOverview,
    meta: { permission: "license-manager-menu" },
  },
  // Products are managed on the overview now.
  {
    path: "license-manager/products",
    redirect: { name: "admin.license-manager.overview" },
  },
  {
    path: `license-manager/${PRODUCT}/licenses`,
    name: "admin.license-manager.licenses.dashboard",
    component: LicenseDashboard,
    meta: { permission: "license-manager-list" },
  },
  {
    path: `license-manager/${PRODUCT}/licenses/create`,
    name: "admin.license-manager.licenses.create",
    component: LicenseCreate,
    meta: { permission: "license-manager-create" },
  },
  {
    path: `license-manager/${PRODUCT}/licenses/:id(\\d+)`,
    name: "admin.license-manager.licenses.detail",
    component: LicenseDetail,
    meta: { permission: "license-manager-view" },
  },
  {
    path: `license-manager/${PRODUCT}/licenses/:id(\\d+)/edit`,
    name: "admin.license-manager.licenses.edit",
    component: LicenseEdit,
    meta: { permission: "license-manager-edit" },
  },
];
