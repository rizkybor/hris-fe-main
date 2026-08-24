import { defineAsyncComponent } from "vue";

// Frontend counterpart to hris-api-main's App\Support\DashboardWidgetRegistry
// -- keys must match exactly, since the backend is the source of truth for
// which widgets a user has permission to add to their dashboard, and this
// registry is only responsible for turning an approved key into an actual
// component + its display title/grid span.
export const DASHBOARD_WIDGET_REGISTRY = {
  key_metrics: {
    title: "Key Metrics",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/Statistics.vue")),
  },
  project_budget: {
    title: "Project Budget",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/BudgetChart.vue")),
    props: { compact: true },
  },
  project_realized: {
    title: "Project Realized",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/RealizedChart.vue")),
    props: { compact: true },
  },
  search_section: {
    title: "Search",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SearchSection.vue")),
  },
  sticky_notes: {
    title: "Sticky Notes",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/StickyNotesWidget.vue")),
  },
  projects_at_risk: {
    title: "Projects at Risk",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/ProjectsAtRisk.vue")),
  },
  latest_employees: {
    title: "Latest Employees",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestEmployees.vue")),
  },
  latest_teams: {
    title: "Latest Teams",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestTeams.vue")),
  },
  quick_links: {
    title: "Quick Access",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/DashboardQuickLinksWidget.vue")),
  },
  system_settings_links: {
    title: "System Settings",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemSettingsLinksWidget.vue")),
  },
  pending_leave_requests: {
    title: "Pending Leave Requests",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/PendingLeaveRequestsWidget.vue")),
  },
  employee_statistics: {
    title: "My Overview",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/EmployeeStatistics.vue")),
  },
  system_stats: {
    title: "System Stats",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemStatsWidget.vue")),
  },
  recent_activity: {
    title: "Recent Activity",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/RecentActivityWidget.vue")),
  },
};
