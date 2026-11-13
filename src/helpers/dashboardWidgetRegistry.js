import { defineAsyncComponent } from "vue";

export const DASHBOARD_WIDGET_REGISTRY = {
  key_metrics: {
    titleKey: "dashboard.widgets.keyMetrics",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/Statistics.vue")),
  },
  project_budget: {
    titleKey: "dashboard.widgets.projectBudget",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/BudgetChart.vue")),
    props: { compact: true },
  },
  project_realized: {
    titleKey: "dashboard.widgets.projectRealized",
    component: defineAsyncComponent(() => import("@/components/admin/project/list/RealizedChart.vue")),
    props: { compact: true },
  },
  search_section: {
    titleKey: "dashboard.widgets.search",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SearchSection.vue")),
  },
  sticky_notes: {
    titleKey: "dashboard.widgets.stickyNotes",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/StickyNotesWidget.vue")),
  },
  projects_at_risk: {
    titleKey: "dashboard.widgets.projectsAtRisk",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/ProjectsAtRisk.vue")),
  },
  latest_employees: {
    titleKey: "dashboard.widgets.latestEmployees",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestEmployees.vue")),
  },
  latest_teams: {
    titleKey: "dashboard.widgets.latestTeams",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/LatestTeams.vue")),
  },
  quick_links: {
    titleKey: "dashboard.widgets.quickAccess",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/DashboardQuickLinksWidget.vue")),
  },
  system_settings_links: {
    titleKey: "dashboard.widgets.systemSettings",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemSettingsLinksWidget.vue")),
  },
  pending_leave_requests: {
    titleKey: "dashboard.widgets.pendingLeaveRequests",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/PendingLeaveRequestsWidget.vue")),
  },
  employee_statistics: {
    titleKey: "dashboard.widgets.myOverview",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/EmployeeStatistics.vue")),
  },
  system_stats: {
    titleKey: "dashboard.widgets.systemStats",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SystemStatsWidget.vue")),
  },
  recent_activity: {
    titleKey: "dashboard.widgets.recentActivity",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/RecentActivityWidget.vue")),
  },
  upcoming_tasks: {
    titleKey: "dashboard.widgets.upcomingTasks",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/UpcomingTasksWidget.vue")),
  },
  subscriptions: {
    titleKey: "dashboard.widgets.subscriptions",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/SubscriptionsWidget.vue")),
  },
  maintenance: {
    titleKey: "dashboard.widgets.maintenance",
    component: defineAsyncComponent(() => import("@/components/admin/dashboard/MaintenanceWidget.vue")),
  },
};
