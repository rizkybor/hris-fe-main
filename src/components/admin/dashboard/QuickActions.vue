<script setup>
import { computed } from "vue";
import {
  UserPlusIcon,
  UsersIcon,
  BanknoteIcon,
  CalendarPlusIcon,
  WalletIcon,
  Building2Icon,
  ClockIcon,
  CalendarClockIcon,
  ListChecksIcon,
  ReceiptIcon,
  ZapIcon,
} from "lucide-vue-next";
import { useRouter } from "vue-router";
import { can, canOneOf } from "@/helpers/permissionHelper";

const router = useRouter();

const goTo = (name) => {
  router.push({ name });
};

// Ordered by role-typical priority. Each action only shows if the current
// user actually holds the permission it leads to, so the list self-adapts
// per role (manager/hr/finance/employee) without hardcoding role names.
const allActions = [
  {
    labelKey: "dashboard.quickActions.addEmployee",
    icon: UserPlusIcon,
    route: "admin.employees.create",
    permission: "employee-create",
    variant: "primary",
  },
  {
    labelKey: "dashboard.quickActions.createTeam",
    icon: UsersIcon,
    route: "admin.team.create",
    permission: "team-create",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.processPayroll",
    icon: BanknoteIcon,
    route: "admin.payroll.create",
    permission: "payroll-create",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.viewAttendance",
    icon: CalendarPlusIcon,
    route: "admin.attendances",
    permission: "attendance-list",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.operationalCost",
    icon: WalletIcon,
    route: "admin.company-finance.dashboard",
    permission: "company-finance-create",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.addClient",
    icon: Building2Icon,
    route: "admin.clients.create",
    permission: "clients-create",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.clockInOut",
    icon: ClockIcon,
    route: "employee.attendance.clock",
    permission: () => canOneOf(["attendance-check-in", "attendance-check-out"]),
    variant: "primary",
  },
  {
    labelKey: "dashboard.quickActions.requestLeave",
    icon: CalendarClockIcon,
    route: "employee.attendance.my-attendances",
    permission: "leave-request-create",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.myTasks",
    icon: ListChecksIcon,
    route: "employee.tasks",
    permission: "task-list",
    variant: "default",
  },
  {
    labelKey: "dashboard.quickActions.myPayslips",
    icon: ReceiptIcon,
    route: "employee.payslips",
    permission: "payslip-view",
    variant: "default",
  },
];

const visibleActions = computed(() => {
  return allActions
    .filter((action) =>
      typeof action.permission === "function" ? action.permission() : can(action.permission)
    )
    .slice(0, 4);
});
</script>

<template>
  <div class="lg:row-span-2 bg-ui-surface border border-ui-line rounded-ui-card p-4 flex flex-col">
    <h3 class="text-ui-h3 text-ui-ink px-1 mb-3">{{ $t("dashboard.quickActions.title") }}</h3>
    <div class="space-y-1.5">
      <button
        v-for="action in visibleActions"
        :key="action.labelKey"
        type="button"
        @click="goTo(action.route)"
        class="ui-press w-full h-10 px-3 rounded-ui-control inline-flex items-center gap-2.5 text-ui-small font-medium text-left border"
        :class="action.variant === 'primary' ? 'bg-ui-ink text-white border-ui-ink hover:bg-ui-ink/90' : 'bg-ui-surface text-ui-ink border-ui-line hover:bg-ui-hover'"
      >
        <component :is="action.icon" class="w-4 h-4 shrink-0" :class="action.variant === 'primary' ? 'text-white/80' : 'text-ui-faint'" />
        <span class="truncate">{{ $t(action.labelKey) }}</span>
      </button>
      <p v-if="visibleActions.length === 0" class="text-center text-ui-small text-ui-muted py-6">{{ $t("dashboard.quickActions.empty") }}</p>
    </div>
  </div>
</template>
