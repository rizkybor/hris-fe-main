<script>
// projectId -> Promise<employee[]> (module scope: reopening a task, or
// another task of the same project, needs no new request).
const peopleCache = new Map();
</script>

<script setup>
// Several assignees for a task: the chosen people (each removable) and a
// searchable list to add or remove more. v-model is the array of employee
// objects; the parent decides when to save.
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { Check, ChevronDown, Search, SearchX, UserPlus, X } from "lucide-vue-next";
import Avatar from "@/components/common/Avatar.vue";
import { axiosInstance } from "@/plugins/axios";

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  projectId: { type: [Number, String], required: true },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits(["update:modelValue"]);

const open = ref(false);
const query = ref("");
const people = ref([]);
const loading = ref(false);
const root = ref(null);

const load = async () => {
  const key = String(props.projectId);
  if (!peopleCache.has(key)) {
    peopleCache.set(
      key,
      axiosInstance
        .get("employees", { params: { project_id: props.projectId } })
        .then(({ data }) => data.data ?? [])
        .catch(() => {
          peopleCache.delete(key);
          return [];
        })
    );
  }
  loading.value = true;
  people.value = await peopleCache.get(key);
  loading.value = false;
};

const selectedIds = computed(() => new Set(props.modelValue.map((e) => e.id)));
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  const list = q
    ? people.value.filter((e) => [e.user?.name, e.user?.email, e.job_information?.job_title].some((v) => v?.toLowerCase().includes(q)))
    : people.value;
  return list.slice(0, 50);
});

const toggle = (employee) => {
  const next = selectedIds.value.has(employee.id)
    ? props.modelValue.filter((e) => e.id !== employee.id)
    : [...props.modelValue, employee];
  emit("update:modelValue", next);
};
const remove = (employee) => emit("update:modelValue", props.modelValue.filter((e) => e.id !== employee.id));

const onOutside = (event) => {
  if (root.value && !root.value.contains(event.target)) open.value = false;
};
const onKey = (event) => {
  if (event.key === "Escape" && open.value) {
    event.preventDefault();
    open.value = false;
  }
};
watch(open, (isOpen) => {
  if (isOpen) {
    query.value = "";
    load();
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onKey, true); // before the panel's Esc
  } else {
    document.removeEventListener("mousedown", onOutside);
    document.removeEventListener("keydown", onKey, true);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onOutside);
  document.removeEventListener("keydown", onKey, true);
});
</script>

<template>
  <div ref="root" class="relative">
    <ul v-if="modelValue.length" class="space-y-1.5 mb-2">
      <li v-for="employee in modelValue" :key="employee.id" class="flex items-center gap-2.5">
        <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-8 h-8" icon-size="w-4 h-4" />
        <div class="flex-1 min-w-0">
          <p class="text-ui-small font-medium text-ui-ink truncate">{{ employee.user?.name }}</p>
          <p v-if="employee.job_information?.job_title" class="text-ui-cap text-ui-muted truncate">{{ employee.job_information.job_title }}</p>
        </div>
        <button
          v-if="!disabled"
          type="button"
          class="w-7 h-7 inline-flex items-center justify-center rounded-md text-ui-faint hover:bg-ui-bad-soft hover:text-ui-bad shrink-0"
          :title="$t('projects.tasks.detail.removeAssignee')"
          :aria-label="`${$t('projects.tasks.detail.removeAssignee')}: ${employee.user?.name || ''}`"
          @click="remove(employee)"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </li>
    </ul>
    <p v-else-if="disabled" class="text-ui-small text-ui-faint">{{ $t("projects.tasks.unassigned") }}</p>

    <button
      v-if="!disabled"
      type="button"
      class="ui-press w-full h-9 border border-ui-line-strong rounded-ui-control bg-ui-surface hover:bg-ui-subtle px-3 flex items-center gap-2 text-left focus:outline-none focus-visible:shadow-ui-focus"
      :aria-expanded="open"
      aria-haspopup="listbox"
      @click="open = !open"
    >
      <UserPlus class="w-4 h-4 text-ui-faint" />
      <span class="text-ui-small font-medium text-ui-ink flex-1">
        {{ modelValue.length ? $t("projects.tasks.detail.addAssignee") : $t("projects.tasks.detail.selectAssignee") }}
      </span>
      <ChevronDown class="w-4 h-4 text-ui-faint transition-transform duration-200" :class="{ 'rotate-180': open }" />
    </button>

    <Transition name="ui-pop">
      <div
        v-if="open"
        class="absolute top-full left-0 right-0 mt-1.5 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay z-20 max-h-80 overflow-hidden flex flex-col"
      >
        <div class="p-2 border-b border-ui-line">
          <div class="relative">
            <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ui-faint pointer-events-none" />
            <input
              v-model="query"
              type="text"
              :placeholder="$t('projects.tasks.detail.searchEmployees')"
              :aria-label="$t('projects.tasks.detail.searchEmployees')"
              class="w-full h-8 pl-8 pr-3 bg-ui-surface text-ui-small text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            />
          </div>
        </div>
        <div class="overflow-y-auto max-h-64 p-1" role="listbox" aria-multiselectable="true">
          <button
            v-for="employee in filtered"
            :key="employee.id"
            type="button"
            role="option"
            :aria-selected="selectedIds.has(employee.id)"
            class="w-full px-2.5 py-2 rounded-md flex items-center gap-2.5 text-left"
            :class="selectedIds.has(employee.id) ? 'bg-ui-accent-soft' : 'hover:bg-ui-hover'"
            @click="toggle(employee)"
          >
            <Avatar :src="employee.user?.profile_photo" :alt="employee.user?.name" size="w-7 h-7" icon-size="w-3 h-3" />
            <div class="flex-1 min-w-0">
              <p class="text-ui-small font-medium text-ui-ink truncate">{{ employee.user?.name }}</p>
              <p class="text-ui-cap text-ui-muted truncate">{{ employee.job_information?.job_title }}</p>
            </div>
            <Check v-if="selectedIds.has(employee.id)" class="w-4 h-4 text-ui-accent shrink-0" />
          </button>
          <div v-if="loading && !people.length" class="p-4 text-center text-ui-cap text-ui-muted">…</div>
          <div v-else-if="!filtered.length" class="p-5 text-center">
            <SearchX class="w-5 h-5 text-ui-faint mx-auto mb-1.5" />
            <p class="text-ui-cap text-ui-muted">{{ $t("projects.tasks.detail.noEmployees") }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
