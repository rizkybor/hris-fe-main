<script setup>
import { Mail, Phone, Star, User, Briefcase, Edit, Trash2 } from "lucide-vue-next";
import { can } from "@/helpers/permissionHelper";
import { useRouter } from "vue-router";
import { UiBadge } from "@/components/ui";

const router = useRouter();

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  number: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(["delete"]);

const goToEdit = () => {
  router.push({ name: "admin.clients.edit", params: { id: props.data.id } });
};

const goToDetail = () => {
  router.push({ name: "admin.clients.detail", params: { id: props.data.id } });
};
</script>

<template>
  <!-- Client row card (phones): number, name, type/field, PIC, actions -->
  <div class="flex items-start gap-3 px-4 py-3.5 cursor-pointer active:bg-ui-hover" @click.stop="goToDetail">
    <span v-if="number" class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5 shrink-0">{{ number }}</span>
    <div class="flex-1 min-w-0">
      <p class="text-ui-body font-medium text-ui-ink truncate">{{ data?.name || $t("clients.list.unnamed") }}</p>
      <p class="text-ui-cap text-ui-muted mt-0.5 truncate">
        {{ data?.pic_name || "-" }}<template v-if="data?.pic_phone"> · {{ data.pic_phone }}</template>
      </p>
      <p v-if="data?.email" class="text-ui-cap text-ui-faint truncate">{{ data.email }}</p>
      <div v-if="data?.type || data?.field || data?.average_rating" class="flex flex-wrap items-center gap-1.5 mt-2">
        <UiBadge v-if="data?.type" tone="neutral">{{ data.type }}</UiBadge>
        <UiBadge v-if="data?.field" tone="outline">{{ data.field }}</UiBadge>
        <UiBadge v-if="data?.average_rating" tone="warn">
          <Star class="w-3 h-3" fill="currentColor" />{{ data.average_rating }}
        </UiBadge>
      </div>
    </div>
    <div class="flex items-center gap-0.5 shrink-0 -mr-1.5" @click.stop>
      <button
        v-if="can('clients-edit')"
        type="button"
        :title="$t('common.actions.edit')"
        :aria-label="$t('common.actions.edit')"
        class="ui-press w-9 h-9 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
        @click="goToEdit"
      >
        <Edit class="w-4 h-4" />
      </button>
      <button
        v-if="can('clients-delete')"
        type="button"
        :title="$t('common.actions.delete')"
        :aria-label="$t('common.actions.delete')"
        class="ui-press w-9 h-9 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad"
        @click="emit('delete', data)"
      >
        <Trash2 class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
