<script setup>
import { ref, watch } from "vue";
import { X, Loader2 } from "lucide-vue-next";
import { formatHours } from "@/utils/maintenance";

// Add (+) or subtract (-) hours with a reason: a month's quota or the
// development balance.
const props = defineProps({
  show: Boolean,
  loading: Boolean,
  title: { type: String, default: "Adjust hours" },
  description: { type: String, default: "" },
  // For the balance: deductions can't exceed it.
  maxDeduct: { type: Number, default: null },
  errors: { type: Object, default: () => ({}) },
});
const emit = defineEmits(["submit", "close"]);

const direction = ref("add");
const hours = ref(1);
const reason = ref("");
watch(
  () => props.show,
  (open) => {
    if (open) {
      direction.value = "add";
      hours.value = 1;
      reason.value = "";
    }
  }
);

const submit = () => emit("submit", { hours: (direction.value === "add" ? 1 : -1) * Number(hours.value), reason: reason.value });
const err = (field) => props.errors?.[field]?.[0];
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] flex items-center justify-center p-4" @click.self="emit('close')">
    <form class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md" @submit.prevent="submit">
      <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
        <div>
          <h3 class="text-brand-dark text-base font-bold">{{ title }}</h3>
          <p v-if="description" class="text-brand-light text-xs">{{ description }}</p>
        </div>
        <button type="button" class="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100" @click="emit('close')"><X class="w-5 h-5" /></button>
      </div>
      <div class="p-5 space-y-4">
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="mt-dir" :class="{ 'mt-dir--add': direction === 'add' }" @click="direction = 'add'">+ Add hours</button>
          <button type="button" class="mt-dir" :class="{ 'mt-dir--sub': direction === 'sub' }" @click="direction = 'sub'">− Subtract hours</button>
        </div>
        <div>
          <label class="mt-label">Hours <span class="text-red-500">*</span></label>
          <input v-model="hours" type="number" min="0.1" step="any" class="mt-input" required />
          <p v-if="direction === 'sub' && maxDeduct !== null" class="text-xs text-brand-light mt-1">Available: {{ formatHours(maxDeduct) }}</p>
          <p v-if="err('hours')" class="mt-err">{{ err("hours") }}</p>
        </div>
        <div>
          <label class="mt-label">Reason <span class="text-red-500">*</span></label>
          <input v-model="reason" class="mt-input" maxlength="500" placeholder="e.g. Extra package purchased, correction..." required />
          <p v-if="err('reason')" class="mt-err">{{ err("reason") }}</p>
        </div>
      </div>
      <div class="p-5 border-t border-[#DCDEDD] flex justify-end gap-2.5">
        <button type="button" class="rounded-[8px] border border-[#DCDEDD] px-4 py-2.5 text-sm font-semibold text-brand-dark hover:bg-gray-50" @click="emit('close')">Cancel</button>
        <button type="submit" :disabled="loading" class="btn-primary rounded-[8px] border border-[#2151A0] blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center gap-1.5 disabled:opacity-60">
          <Loader2 v-if="loading" class="w-4 h-4 text-white animate-spin" />
          <span class="text-brand-white text-sm font-semibold">Save</span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.mt-label { display: block; font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px; }
.mt-input { width: 100%; border: 1px solid #dcdedd; border-radius: 12px; padding: 9px 12px; font-size: 14px; color: #0f172a; outline: none; }
.mt-input:hover, .mt-input:focus { border-color: #0c51d9; }
.mt-err { color: #ef4444; font-size: 12px; margin-top: 4px; }
.mt-dir { border: 1px solid #dcdedd; border-radius: 10px; padding: 9px; font-size: 13px; font-weight: 600; color: #475569; }
.mt-dir--add { border-color: #16a34a; color: #15803d; background: #f0fdf4; }
.mt-dir--sub { border-color: #dc2626; color: #b91c1c; background: #fef2f2; }
</style>
