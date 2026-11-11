<script setup lang="ts">
import { APP_VERSION_SHORT } from "@/utils/appVersion";
import { Check } from "lucide-vue-next";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

interface Props {
  currentStep?: number;
}

const props = withDefaults(defineProps<Props>(), {
  currentStep: 1,
});

// Presentation only: the four wizard steps shown in the rail.
const steps = computed(() =>
  ["personal", "job", "emergency", "review"].map((key) => ({
    key,
    title: t(`employees.wizard.steps.${key}.title`),
    hint: t(`employees.wizard.steps.${key}.hint`),
  }))
);

const stateOf = (index: number) => {
  const n = index + 1;
  if (n < props.currentStep) return "done";
  if (n === props.currentStep) return "current";
  return "upcoming";
};
</script>

<template>
  <!-- Vertical step rail (desktop) -->
  <aside class="hidden lg:flex w-64 shrink-0 bg-ui-surface border-r border-ui-line flex-col">
    <!-- Brand -->
    <div class="h-[73px] px-5 flex items-center gap-3 border-b border-ui-line">
      <img
        src="/images/jcd-only-color.png"
        :alt="$t('employees.wizard.companyLogo')"
        class="w-8 h-8 object-contain shrink-0"
      />
      <div class="min-w-0">
        <p class="flex items-center gap-1.5 text-ui-h3 text-ui-ink">
          HRIS+
          <span class="text-ui-cap font-normal px-1.5 rounded border border-ui-line text-ui-muted tabular-nums">v{{ APP_VERSION_SHORT }}</span>
        </p>
        <p class="text-ui-cap text-ui-muted truncate">Jendela Cakra Digital</p>
      </div>
    </div>

    <!-- Steps -->
    <div class="flex-1 overflow-y-auto px-3 py-5">
      <p class="px-2 mb-2 text-ui-over uppercase text-ui-faint">{{ $t("employees.wizard.stepsLabel") }}</p>
      <ol class="space-y-0">
        <li v-for="(step, index) in steps" :key="step.key" class="relative">
          <!-- connector -->
          <span
            v-if="index < steps.length - 1"
            aria-hidden="true"
            class="absolute left-[25px] top-[42px] bottom-[-6px] w-px"
            :class="stateOf(index) === 'done' ? 'bg-ui-ink' : 'bg-ui-line-strong'"
          ></span>
          <div
            class="relative flex items-start gap-3 px-3 py-2.5 rounded-ui-control transition-colors duration-ui-base"
            :class="stateOf(index) === 'current' ? 'bg-ui-subtle' : ''"
            :aria-current="stateOf(index) === 'current' ? 'step' : undefined"
          >
            <span
              class="w-7 h-7 rounded-full shrink-0 inline-flex items-center justify-center text-ui-cap font-semibold tabular-nums border transition-colors duration-ui-base"
              :class="
                stateOf(index) === 'upcoming'
                  ? 'bg-ui-surface border-ui-line-strong text-ui-muted'
                  : 'bg-ui-ink border-ui-ink text-white'
              "
            >
              <Check v-if="stateOf(index) === 'done'" class="w-3.5 h-3.5" />
              <template v-else>{{ index + 1 }}</template>
            </span>
            <div class="min-w-0 pt-0.5">
              <p
                class="text-ui-small font-medium"
                :class="stateOf(index) === 'upcoming' ? 'text-ui-muted' : 'text-ui-ink'"
              >
                {{ step.title }}
              </p>
              <p class="text-ui-cap text-ui-muted mt-0.5">{{ step.hint }}</p>
            </div>
          </div>
        </li>
      </ol>
    </div>
  </aside>
</template>
