import { defineAsyncComponent } from "vue";

// Frontend counterpart to hris-api-main's App\Support\DashboardWidgetRegistry
// -- keys must match exactly, since the backend is the source of truth for
// which widgets a user has permission to add to their dashboard, and this
// registry is only responsible for turning an approved key into an actual
// component + its display title/grid span.
export const DASHBOARD_WIDGET_REGISTRY = {
  key_metrics: {
    title: "Key Metrics",
    colSpan: "lg:col-span-2",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/Statistics.vue")),
  },
  project_budget: {
    title: "Project Budget",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/BudgetChart.vue")),
    props: { compact: true },
  },
  project_realized: {
    title: "Project Realized",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/RealizedChart.vue")),
    props: { compact: true },
  },
  search_section: {
    title: "Search",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SearchSection.vue")),
  },
  sticky_notes: {
    title: "Sticky Notes",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/StickyNotesWidget.vue")),
  },
  projects_at_risk: {
    title: "Projects at Risk",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/ProjectsAtRisk.vue")),
  },
  latest_employees: {
    title: "Latest Employees",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestEmployees.vue")),
  },
  latest_teams: {
    title: "Latest Teams",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestTeams.vue")),
  },
  quick_links: {
    title: "Quick Access",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/DashboardQuickLinksWidget.vue")),
  },
  system_settings_links: {
    title: "System Settings",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemSettingsLinksWidget.vue")),
  },
  pending_leave_requests: {
    title: "Pending Leave Requests",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/PendingLeaveRequestsWidget.vue")),
  },
  employee_statistics: {
    title: "My Overview",
    colSpan: "lg:col-span-2",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/EmployeeStatistics.vue")),
  },
  system_stats: {
    title: "System Stats",
    colSpan: "lg:col-span-2",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemStatsWidget.vue")),
  },
  recent_activity: {
    title: "Recent Activity",
    colSpan: "lg:col-span-1",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/RecentActivityWidget.vue")),
  },
};
