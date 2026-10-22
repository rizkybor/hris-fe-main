<script setup>
import { onMounted, ref } from "vue";
import { Wrench, Plus, PiggyBank, ChevronRight } from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { can } from "@/helpers/permissionHelper";
import { formatHours, formatMonth, CONTRACT_STATUS, usageColor } from "@/utils/maintenance";

// Maintenance contracts of one client or project, on their detail pages.
const props = defineProps({
  clientId: { type: [Number, String], default: null },
  projectId: { type: [Number, String], default: null },
});

const store = useMaintenanceStore();
const contracts = ref([]);
const loaded = ref(false);

onMounted(async () => {
  try {
    contracts.value = await store.fetchContractsFor(props.projectId ? { project_id: props.projectId } : { client_id: props.clientId });
  } catch {
    contracts.value = [];
  } finally {
    loaded.value = true;
  }
});

const createQuery = () => ({ new: 1, ...(props.clientId ? { client_id: props.clientId } : {}), ...(props.projectId ? { project_id: props.projectId } : {}) });
</script>

<template>
  <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
    <div class="flex items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-teal-50 rounded-[10px] flex items-center justify-center shrink-0">
          <Wrench class="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h4 class="text-brand-dark font-bold">Maintenance</h4>
          <p class="text-brand-light text-xs">Optional — monthly maintenance hour quota</p>
        </div>
      </div>
      <router-link
        v-if="can('maintenance-create')"
        :to="{ name: 'admin.maintenance.dashboard', query: createQuery() }"
        class="text-xs font-semibold text-[#0C51D9] inline-flex items-center gap-1 hover:underline shrink-0"
      >
        <Plus class="w-3.5 h-3.5" /> New contract
      </router-link>
    </div>

    <div v-if="!loaded" class="h-16 bg-gray-100 rounded-[12px] animate-pulse"></div>
    <div v-else-if="!contracts.length" class="text-center py-6 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]">
      <p class="text-sm font-semibold">No maintenance contract</p>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      <router-link
        v-for="c in contracts"
        :key="c.id"
        :to="{ name: 'admin.maintenance.detail', params: { id: c.id } }"
        class="bg-white border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
      >
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-brand-dark text-sm font-bold truncate">{{ c.name }}</p>
          <span class="px-2 py-0.5 rounded-md text-xs font-semibold shrink-0" :class="CONTRACT_STATUS[c.status]?.class">{{ CONTRACT_STATUS[c.status]?.label }}</span>
        </div>
        <template v-if="c.current_period">
          <p class="text-xs text-brand-light">
            <strong class="text-brand-dark text-sm">{{ formatHours(c.current_period.remaining) }}</strong> left of {{ formatHours(c.current_period.total) }} · {{ formatMonth(c.current_period.month) }}
          </p>
          <div class="w-full bg-gray-100 rounded-full overflow-hidden mt-1.5" style="height: 6px">
            <div class="h-full rounded-full" :style="{ width: `${Math.min(c.current_period.used_percent, 100)}%`, backgroundColor: usageColor(c.current_period) }"></div>
          </div>
        </template>
        <div class="flex items-center justify-between text-xs text-gray-500 mt-2.5">
          <span class="inline-flex items-center gap-1"><PiggyBank class="w-3.5 h-3.5" /> {{ formatHours(c.balance_hours) }} balance</span>
          <ChevronRight class="w-4 h-4" />
        </div>
      </router-link>
    </div>
  </div>
</template>
