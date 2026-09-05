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
    label: "Add Employee",
    icon: UserPlusIcon,
    route: "admin.employees.create",
    permission: "employee-create",
    variant: "primary",
  },
  {
    label: "Create New Team",
    icon: UsersIcon,
    route: "admin.team.create",
    permission: "team-create",
    variant: "default",
  },
  {
    label: "Process Payroll",
    icon: BanknoteIcon,
    route: "admin.payroll.create",
    permission: "payroll-create",
    variant: "default",
  },
  {
    label: "View Attendance",
    icon: CalendarPlusIcon,
    route: "admin.attendances",
    permission: "attendance-list",
    variant: "default",
  },
  {
    label: "Operational Cost",
    icon: WalletIcon,
    route: "admin.company-finance.dashboard",
    permission: "company-finance-create",
    variant: "default",
  },
  {
    label: "Add Client",
    icon: Building2Icon,
    route: "admin.clients.create",
    permission: "clients-create",
    variant: "default",
  },
  {
    label: "Clock In / Out",
    icon: ClockIcon,
    route: "employee.attendance.clock",
    permission: () => canOneOf(["attendance-check-in", "attendance-check-out"]),
    variant: "primary",
  },
  {
    label: "Request Leave",
    icon: CalendarClockIcon,
    route: "employee.attendance.my-attendances",
    permission: "leave-request-create",
    variant: "default",
  },
  {
    label: "My Tasks",
    icon: ListChecksIcon,
    route: "employee.tasks",
    permission: "task-list",
    variant: "default",
  },
  {
    label: "My Payslips",
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
  <div
    class="lg:row-span-2 bg-slate-50 border border-[#DCDEDD] rounded-[14px]
           hover:border-[#0C51D9] hover:border-2
           transition-all duration-300 p-5"
  >
    <div class="flex items-center gap-2 mb-4">
      <div class="w-8 h-8 bg-blue-50 rounded-[10px] flex items-center justify-center">
        <ZapIcon class="w-4 h-4 text-blue-600" />
      </div>
      <h3 class="text-brand-dark text-lg font-bold">Quick Actions</h3>
    </div>

    <div class="space-y-3">
      <button
        v-for="action in visibleActions"
        :key="action.label"
        type="button"
        @click="goTo(action.route)"
        :class="
          action.variant === 'primary'
            ? 'border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] blue-gradient blue-btn-shadow'
            : 'border border-[#DCDEDD] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 focus:bg-white'
        "
        class="bg-white btn-secondary w-full text-left rounded-[12px] transition-all duration-300 px-4 py-3 inline-flex items-center gap-3"
      >
        <div
          :class="action.variant === 'primary' ? 'bg-white/20' : 'bg-gray-100'"
          class="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
        >
          <component
            :is="action.icon"
            class="w-4 h-4"
            :class="action.variant === 'primary' ? 'text-white' : 'text-gray-600'"
          />
        </div>
        <span
          :class="action.variant === 'primary' ? 'text-brand-white' : 'text-brand-dark'"
          class="text-sm font-semibold"
        >
          {{ action.label }}
        </span>
      </button>

      <p v-if="visibleActions.length === 0" class="text-center text-sm text-gray-400 py-6">
        No quick actions available
      </p>
    </div>
  </div>
</template>
