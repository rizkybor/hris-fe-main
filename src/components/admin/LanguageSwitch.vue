<script setup>
// Language switch in the top bar: the current language's flag; the menu
// lists both languages. Flags are inline SVG (emoji flags don't render on
// Windows).
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { Check } from "lucide-vue-next";
import { setLocale } from "@/i18n";

const { t, locale } = useI18n();
const open = ref(false);
const root = ref(null);
const OPTIONS = computed(() => [
  { value: "id", label: t("common.language.id") },
  { value: "en", label: t("common.language.en") },
]);

const choose = (value) => {
  setLocale(value);
  open.value = false;
};
const onDocClick = (event) => {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false;
};
const onKey = (event) => {
  if (event.key === "Escape") open.value = false;
};
onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKey);
});
</script>

<template>
  <div ref="root" class="relative">
    <button
      type="button"
      class="w-9 h-9 inline-flex items-center justify-center rounded-ui-control hover:bg-ui-hover transition-colors"
      :aria-label="t('common.language.title')"
      :title="t('common.language.title')"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="flag" aria-hidden="true">
        <svg v-if="locale === 'id'" viewBox="0 0 3 2"><rect width="3" height="1" fill="#E70011" /><rect y="1" width="3" height="1" fill="#fff" /></svg>
        <svg v-else viewBox="0 0 60 30"><clipPath id="uk-s"><path d="M0,0 v30 h60 v-30 z" /></clipPath><clipPath id="uk-t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath><g clip-path="url(#uk-s)"><path d="M0,0 v30 h60 v-30 z" fill="#012169" /><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" /><path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#uk-t)" stroke="#C8102E" stroke-width="4" /><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" /><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" /></g></svg>
      </span>
    </button>

    <Transition name="ui-pop">
      <div v-if="open" role="menu" class="absolute right-0 top-full mt-2 w-44 bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-overlay p-1.5 origin-top-right z-50">
        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          type="button"
          role="menuitemradio"
          :aria-checked="locale === opt.value"
          class="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink transition-colors"
          @click="choose(opt.value)"
        >
          <span class="flag" aria-hidden="true">
            <svg v-if="opt.value === 'id'" viewBox="0 0 3 2"><rect width="3" height="1" fill="#E70011" /><rect y="1" width="3" height="1" fill="#fff" /></svg>
            <svg v-else viewBox="0 0 60 30"><g><path d="M0,0 v30 h60 v-30 z" fill="#012169" /><path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6" /><path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" stroke-width="2" /><path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10" /><path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" /></g></svg>
          </span>
          <span class="flex-1 text-left">{{ opt.label }}</span>
          <Check v-if="locale === opt.value" class="w-4 h-4 text-ui-accent" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Small rounded flag with a hairline so white stripes show on light bars. */
.flag {
  display: inline-flex;
  width: 22px;
  height: 15px;
  border-radius: 3px;
  overflow: hidden;
  box-shadow: 0 0 0 1px rgb(var(--ui-line-strong));
}
.flag svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
