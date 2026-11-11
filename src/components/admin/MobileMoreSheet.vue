<script setup>
// Phones and tablets: the full menu as a bottom sheet, opened from the tab
// bar's "More". Profile card, menu search, grouped lists (same data as the
// desktop sidebar via useNavMenu), Settings and Sign out. Drag the handle
// down, tap the backdrop or press Esc to close; it also closes on navigation.
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { ChevronRight, Search, X, Settings as SettingsIcon, LogOut, Key as KeyIcon, History as HistoryIcon } from "lucide-vue-next";
import { useNavMenu } from "@/composables/useNavMenu";
import { useAuthStore } from "@/stores/auth";
import { can } from "@/helpers/permissionHelper";
import Avatar from "@/components/common/Avatar.vue";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";

const props = defineProps({ open: { type: Boolean, default: false } });
const emit = defineEmits(["close", "logout"]);
const { t } = useI18n();
const { user } = storeToRefs(useAuthStore());
const { SECTIONS, showLicenseManager, canListLicenses, canSeeVersions, licenseProducts, isLicenseProductRoute, isLicenseVersionsRoute, settingsActive, route } = useNavMenu();

const query = ref("");
const roleLabel = computed(() => (user.value?.roles || []).join(", "));

// License Manager rows (overview + one per product), shaped like menu items.
const licenseItems = computed(() => {
  if (!showLicenseManager.value) return [];
  const rows = [];
  if (can("license-manager-menu")) {
    rows.push({ key: "lm-overview", label: t("nav.menu.overview"), icon: KeyIcon, to: { name: "admin.license-manager.overview" }, active: route.name === "admin.license-manager.overview" });
  }
  if (canListLicenses.value || canSeeVersions.value) {
    for (const product of licenseProducts.value) {
      rows.push({
        key: `lm-${product.code}`,
        label: product.name,
        product,
        to: { name: canListLicenses.value ? "admin.license-manager.licenses.dashboard" : "admin.license-manager.versions", params: { product: product.code } },
        active: canListLicenses.value ? isLicenseProductRoute(product.code) : isLicenseVersionsRoute(product.code),
      });
      if (canListLicenses.value && canSeeVersions.value) {
        rows.push({ key: `lm-${product.code}-v`, label: t("nav.shell.versionsOf", { product: product.name }), icon: HistoryIcon, to: { name: "admin.license-manager.versions", params: { product: product.code } }, active: isLicenseVersionsRoute(product.code) });
      }
    }
  }
  return rows;
});

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();
  const match = (item) => !q || item.label.toLowerCase().includes(q);
  const list = SECTIONS.value
    .filter((s) => s.show)
    .map((s) => ({ key: s.key, title: s.title, items: s.items.filter((i) => i.show).map((i) => ({ ...i, key: i.label, active: i.active() })).filter(match) }));
  const lm = { key: "licenseManager", title: t("nav.sections.licenseManager"), items: licenseItems.value.filter(match) };
  const insightsIndex = list.findIndex((g) => g.key === "insights");
  list.splice(insightsIndex === -1 ? list.length : insightsIndex, 0, lm);
  return list.filter((g) => g.items.length);
});

// Close on navigation.
watch(() => route.fullPath, () => props.open && emit("close"));

// Lock the page behind while open.
watch(
  () => props.open,
  (open) => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (!open) {
      query.value = "";
      dragY.value = 0;
    }
  }
);
onBeforeUnmount(() => (document.documentElement.style.overflow = ""));

// Drag the handle (or header) down to close.
const dragY = ref(0);
let startY = null;
const onTouchStart = (e) => (startY = e.touches[0].clientY);
const onTouchMove = (e) => {
  if (startY === null) return;
  dragY.value = Math.max(0, e.touches[0].clientY - startY);
};
const onTouchEnd = () => {
  if (dragY.value > 90) emit("close");
  dragY.value = 0;
  startY = null;
};
const onKey = (e) => e.key === "Escape" && props.open && emit("close");
watch(() => props.open, (open) => (open ? document.addEventListener("keydown", onKey) : document.removeEventListener("keydown", onKey)));
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-fade">
      <div v-if="open" class="lg:hidden fixed inset-0 z-[60] bg-ui-scrim/40" @click="emit('close')"></div>
    </Transition>
    <Transition name="sheet">
      <section
        v-if="open"
        class="lg:hidden fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] flex flex-col bg-ui-bg rounded-t-ui-sheet shadow-ui-overlay font-sans"
        :style="dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined"
        role="dialog"
        aria-modal="true"
        :aria-label="t('nav.shell.moreTitle')"
      >
        <!-- Handle + header: the drag area -->
        <header class="shrink-0 px-4 pt-2.5 pb-3" @touchstart.passive="onTouchStart" @touchmove.passive="onTouchMove" @touchend="onTouchEnd">
          <div class="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ui-line-strong" aria-hidden="true"></div>
          <div class="flex items-center gap-3">
            <RouterLink :to="{ name: 'employee.profile' }" class="flex-1 min-w-0 flex items-center gap-3 rounded-ui-card bg-ui-surface border border-ui-line p-3 active:bg-ui-hover">
              <Avatar :src="user?.profile_photo" :alt="user?.name" size="w-11 h-11" icon-size="w-5 h-5" />
              <div class="min-w-0 flex-1">
                <p class="text-ui-body font-semibold text-ui-ink truncate">{{ user?.name }}</p>
                <p class="text-ui-cap text-ui-muted truncate capitalize">{{ roleLabel }}</p>
              </div>
              <ChevronRight class="w-4 h-4 text-ui-faint shrink-0" />
            </RouterLink>
            <button type="button" class="w-10 h-10 rounded-full bg-ui-surface border border-ui-line flex items-center justify-center text-ui-muted" :aria-label="t('common.a11y.close')" @click="emit('close')">
              <X class="w-5 h-5" />
            </button>
          </div>
          <label class="relative mt-3 block">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-faint pointer-events-none" />
            <input
              v-model="query"
              type="search"
              :placeholder="t('nav.shell.searchMenu')"
              class="w-full h-10 pl-9 pr-3 rounded-ui-control bg-ui-subtle border border-transparent text-ui-body text-ui-ink placeholder:text-ui-faint focus:outline-none focus:bg-ui-surface focus:border-ui-accent focus:shadow-ui-focus"
            />
          </label>
        </header>

        <!-- Groups -->
        <nav class="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-5">
          <section v-for="group in groups" :key="group.key">
            <p class="px-1 mb-1.5 text-ui-over uppercase text-ui-muted">{{ group.title }}</p>
            <ul class="rounded-ui-card bg-ui-surface border border-ui-line overflow-hidden divide-y divide-ui-line">
              <li v-for="item in group.items" :key="item.key">
                <RouterLink
                  :to="item.to"
                  class="flex items-center gap-3 h-12 px-3 transition-colors active:bg-ui-hover"
                  :class="item.active ? 'bg-ui-accent-soft/60' : ''"
                  :aria-current="item.active ? 'page' : undefined"
                >
                  <span class="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" :class="item.active ? 'bg-ui-ink text-white' : 'bg-ui-subtle text-ui-muted'">
                    <ProductIcon v-if="item.product" :product="item.product" :size="20" />
                    <component :is="item.icon" v-else class="w-[18px] h-[18px]" />
                  </span>
                  <span class="flex-1 min-w-0 truncate text-ui-body" :class="item.active ? 'text-ui-ink font-semibold' : 'text-ui-text'">{{ item.label }}</span>
                  <ChevronRight class="w-4 h-4 text-ui-faint shrink-0" />
                </RouterLink>
              </li>
            </ul>
          </section>
          <p v-if="!groups.length" class="text-center text-ui-small text-ui-muted py-8">{{ t("nav.shell.noMenuMatch") }}</p>

          <!-- Settings and sign out -->
          <ul class="rounded-ui-card bg-ui-surface border border-ui-line overflow-hidden divide-y divide-ui-line">
            <li>
              <RouterLink :to="{ name: 'admin.settings.dashboard' }" class="flex items-center gap-3 h-12 px-3 active:bg-ui-hover" :class="settingsActive() ? 'bg-ui-accent-soft/60' : ''">
                <span class="w-8 h-8 rounded-[9px] bg-ui-subtle text-ui-muted flex items-center justify-center shrink-0"><SettingsIcon class="w-[18px] h-[18px]" /></span>
                <span class="flex-1 text-ui-body text-ui-text">{{ t("nav.menu.settings") }}</span>
                <ChevronRight class="w-4 h-4 text-ui-faint" />
              </RouterLink>
            </li>
            <li>
              <button type="button" class="w-full flex items-center gap-3 h-12 px-3 text-left active:bg-ui-hover" @click="emit('logout')">
                <span class="w-8 h-8 rounded-[9px] bg-ui-bad-soft text-ui-bad flex items-center justify-center shrink-0"><LogOut class="w-[18px] h-[18px]" /></span>
                <span class="flex-1 text-ui-body text-ui-bad">{{ t("common.actions.signOut") }}</span>
              </button>
            </li>
          </ul>
          <div class="h-[env(safe-area-inset-bottom)]"></div>
        </nav>
      </section>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Sheet slides up (transform only); reduced motion is handled globally. */
.sheet-enter-active {
  transition: transform var(--ui-dur-slow) var(--ui-ease-out);
}
.sheet-leave-active {
  transition: transform var(--ui-dur-base) var(--ui-ease-in);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(100%);
}
</style>
