<script setup>
import { ref, onMounted } from "vue";
import { ServerIcon, PaletteIcon } from "lucide-vue-next";
import { UiModal, UiButton, UiAlert } from "@/components/ui";
import { useProjectCalculatorStore } from "@/stores/projectCalculator";
import { storeToRefs } from "pinia";

const emit = defineEmits(["close", "saved"]);
const store = useProjectCalculatorStore();
const { landingPageRateSetting, saving } = storeToRefs(store);

const form = ref({
  server_dedicated_price: 0,
  server_shared_price: 0,
  design_dedicated_price: 0,
  design_template_price: 0,
});
const errorMessage = ref("");

onMounted(() => {
  form.value = {
    server_dedicated_price: landingPageRateSetting.value.server_dedicated_price,
    server_shared_price: landingPageRateSetting.value.server_shared_price,
    design_dedicated_price: landingPageRateSetting.value.design_dedicated_price,
    design_template_price: landingPageRateSetting.value.design_template_price,
  };
});

const submit = async () => {
  errorMessage.value = "";
  try {
    await store.updateLandingPageRateSetting(form.value);
    emit("saved");
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value =
      data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal menyimpan konfigurasi Landing Page.");
  }
};

// Presentation only: native number field (keeps v-model.number) in the field style.
const fieldClass =
  "w-full h-[38px] px-3 text-right tabular-nums bg-ui-surface text-ui-body text-ui-ink border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
</script>

<template>
  <UiModal
    :open="true"
    size="md"
    title="Landing Page Rate Setup"
    description="Configure the package pricing used by the Landing Page scenario"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <UiAlert v-if="errorMessage" tone="bad">{{ errorMessage }}</UiAlert>

      <div>
        <div class="flex items-center gap-1.5 mb-2">
          <ServerIcon class="w-4 h-4 text-ui-faint" />
          <h3 class="text-ui-h3 text-ui-ink">Server</h3>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Dedicated (Rp)</span>
            <input v-model.number="form.server_dedicated_price" type="number" min="0" step="10000" :class="fieldClass" />
          </label>
          <label class="block">
            <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Shared (Rp)</span>
            <input v-model.number="form.server_shared_price" type="number" min="0" step="10000" :class="fieldClass" />
          </label>
        </div>
      </div>

      <div>
        <div class="flex items-center gap-1.5 mb-2">
          <PaletteIcon class="w-4 h-4 text-ui-faint" />
          <h3 class="text-ui-h3 text-ui-ink">Design</h3>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Dedicated (Rp)</span>
            <input v-model.number="form.design_dedicated_price" type="number" min="0" step="10000" :class="fieldClass" />
          </label>
          <label class="block">
            <span class="block text-ui-small font-medium text-ui-ink mb-1.5">Template (Rp)</span>
            <input v-model.number="form.design_template_price" type="number" min="0" step="10000" :class="fieldClass" />
          </label>
        </div>
      </div>
    </div>

    <template #footer>
      <UiButton variant="secondary" :disabled="saving" @click="emit('close')">Cancel</UiButton>
      <UiButton :loading="saving" @click="submit">{{ saving ? "Saving..." : "Save Configuration" }}</UiButton>
    </template>
  </UiModal>
</template>
