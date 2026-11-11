<script setup>
import { onMounted, ref } from "vue";
import { Wrench, Plus, PiggyBank, ChevronRight } from "lucide-vue-next";
import { useMaintenanceStore } from "@/stores/maintenance";
import { can } from "@/helpers/permissionHelper";
import { formatHours, formatMonth, CONTRACT_STATUS, usageColor } from "@/utils/maintenance";
import { UiEmpty } from "@/components/ui";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";

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
  <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
    <div class="flex items-start justify-between gap-3 mb-4">
      <div class="flex items-start gap-2.5 min-w-0">
        <Wrench class="w-4 h-4 text-ui-faint shrink-0 mt-1" />
        <div class="min-w-0">
          <h4 class="text-ui-h2 text-ui-ink">{{ $t("maintenance.panel.title") }}</h4>
          <p class="text-ui-cap text-ui-muted">{{ $t("maintenance.panel.subtitle") }}</p>
        </div>
      </div>
      <router-link
        v-if="can('maintenance-create')"
        :to="{ name: 'admin.maintenance.dashboard', query: createQuery() }"
        class="text-ui-small font-medium text-ui-accent inline-flex items-center gap-1 hover:underline shrink-0"
      >
        <Plus class="w-3.5 h-3.5" /> {{ $t("maintenance.panel.newContract") }}
      </router-link>
    </div>

    <Skeleton v-if="!loaded" height="72px" rounded="12px" />
    <div v-else-if="!contracts.length" class="rounded-ui-card border border-dashed border-ui-line-strong">
      <UiEmpty :icon="Wrench" :title="$t('maintenance.panel.empty')" compact />
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <router-link
        v-for="c in contracts"
        :key="c.id"
        :to="{ name: 'admin.maintenance.detail', params: { id: c.id } }"
        class="ui-lift group block bg-ui-surface border border-ui-line rounded-ui-card p-4 hover:border-ui-line-strong"
      >
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-ui-h3 text-ui-ink truncate">{{ c.name }}</p>
          <span class="inline-flex items-center h-5 px-1.5 rounded-md text-ui-cap font-medium shrink-0" :class="CONTRACT_STATUS[c.status]?.class">{{ CONTRACT_STATUS[c.status]?.label }}</span>
        </div>
        <template v-if="c.current_period">
          <p class="text-ui-cap text-ui-muted">
            <strong class="text-ui-small font-medium text-ui-ink tabular-nums">{{ formatHours(c.current_period.remaining) }}</strong> {{ $t("maintenance.common.leftOf", { total: formatHours(c.current_period.total) }) }} · {{ formatMonth(c.current_period.month) }}
          </p>
          <div class="w-full h-1.5 bg-ui-subtle rounded-full overflow-hidden mt-1.5">
            <div class="h-full rounded-full" :style="{ width: `${Math.min(c.current_period.used_percent, 100)}%`, backgroundColor: usageColor(c.current_period) }"></div>
          </div>
        </template>
        <div class="flex items-center justify-between text-ui-cap text-ui-muted mt-2.5">
          <span class="inline-flex items-center gap-1 tabular-nums"><PiggyBank class="w-3.5 h-3.5" /> {{ $t("maintenance.common.balance", { hours: formatHours(c.balance_hours) }) }}</span>
          <ChevronRight class="w-4 h-4 text-ui-faint group-hover:text-ui-ink" />
        </div>
      </router-link>
    </div>
  </section>
</template>
