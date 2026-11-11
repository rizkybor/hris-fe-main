<script setup>
import { useI18n } from "vue-i18n";
import { APP_VERSION_SHORT } from "@/utils/appVersion";
import { computed, ref, watch } from "vue";
import {
  LayoutDashboard,
  ClipboardCheck,
  UsersIcon,
  UsersRound,
  Contact,
  SettingsIcon,
  Handshake,
  ClockIcon,
  CircleUserRound,
  CalendarDays,
  CalendarCheck,
  Wallet,
  Banknote,
  XIcon,
  FolderClosedIcon,
  FolderKanban,
  KeyRoundIcon,
  Key as KeyIcon,
  Building2Icon,
  CircleDollarSign,
  FileStack,
  ListChecksIcon,
  BarChart3,
  History as HistoryIcon,
  HardDrive,
  Workflow,
  Megaphone as MegaphoneIcon,
  Laptop as LaptopIcon,
  PanelLeftClose,
  PanelLeftOpen,
  CalculatorIcon,
  Landmark,
  LineChart,
  RefreshCw,
  Wrench,
  ChevronDown,
  ClipboardList,
} from "lucide-vue-next";

import { useNavMenu } from "@/composables/useNavMenu";
import { can } from "@/helpers/permissionHelper";
import ProductIcon from "@/components/admin/license-manager/ProductIcon.vue";
import { RouterLink } from "vue-router";

const { t } = useI18n();
const props = defineProps(["isOpen"]);
const emit = defineEmits(["navigate"]);

const onNavigate = () => emit("navigate");

const { SECTIONS, showLicenseManager, canListLicenses, canSeeVersions, licenseProducts, isLicenseProductRoute, isLicenseVersionsRoute, settingsActive } = useNavMenu();

// Desktop-only icon-rail collapse. Mobile always shows the full sidebar as
// a drawer, so this is deliberately not wired into the isOpen prop.
const collapsed = ref(localStorage.getItem("sidebar-collapsed") === "true");

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value;
};

watch(collapsed, (value) => {
  localStorage.setItem("sidebar-collapsed", String(value));
});

// Collapsed nav-links lose their visible label, so a floating tooltip
// (teleported to <body> to escape the scrollable nav's clipping) shows it
// on hover instead. Derived from each link's own .nav-label text so no
// per-item label has to be duplicated here.
const tooltipText = ref("");
const tooltipStyle = ref({});

const showTooltip = (event) => {
  if (!collapsed.value || window.innerWidth < 1024) return;
  const label = event.currentTarget.querySelector(".nav-label")?.textContent?.trim();
  if (!label) return;

  const rect = event.currentTarget.getBoundingClientRect();
  tooltipText.value = label;
  tooltipStyle.value = {
    top: `${rect.top + rect.height / 2}px`,
    left: `${rect.right + 12}px`,
  };
};

const hideTooltip = () => {
  tooltipText.value = "";
};

// Each nav section can be individually collapsed via its title. State is
// keyed by section id and persisted so a user's preference survives reloads;
// a section defaults to expanded when its key is absent from storage.
const SECTION_KEYS = ["overview", "myWorkspace", "people", "company", "licenseManager", "finance", "tools", "insights"];

// Every sign-in starts with General, My Workspace and Administration open
// and the rest collapsed (the login clears the saved state); sections the
// user opens or closes during the session stay that way.
const DEFAULT_OPEN = ["overview", "myWorkspace", "people"];
const defaultCollapsed = (key) => !DEFAULT_OPEN.includes(key);

const loadCollapsedSections = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("sidebar-collapsed-sections") || "{}");
    return SECTION_KEYS.reduce((acc, key) => {
      acc[key] = key in raw ? !!raw[key] : defaultCollapsed(key);
      return acc;
    }, {});
  } catch {
    return SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: defaultCollapsed(key) }), {});
  }
};

const collapsedSections = ref(loadCollapsedSections());

const toggleSection = (key) => {
  collapsedSections.value = { ...collapsedSections.value, [key]: !collapsedSections.value[key] };
};

watch(
  collapsedSections,
  (value) => {
    localStorage.setItem("sidebar-collapsed-sections", JSON.stringify(value));
  },
  { deep: true }
);

const sectionsBeforeLicense = computed(() => SECTIONS.value.filter((s) => s.key !== "insights" && s.show));
const sectionsAfterLicense = computed(() => SECTIONS.value.filter((s) => s.key === "insights" && s.show));

const itemClass = (active) => [
  "nav-item group flex items-center gap-2.5 h-8 px-2.5 rounded-[7px] text-ui-small border transition-colors duration-ui-fast",
  active
    ? "bg-ui-surface border-ui-line text-ui-ink font-semibold shadow-ui-raised"
    : "border-transparent text-ui-text hover:bg-ui-hover hover:text-ui-ink",
  collapsed.value ? "lg:justify-center lg:px-0 lg:h-9" : "",
];
const iconClass = (active) => ["w-4 h-4 shrink-0", active ? "text-ui-ink" : "text-ui-muted group-hover:text-ui-ink"];
const labelClass = computed(() => ["nav-label truncate", collapsed.value ? "lg:hidden" : ""]);
</script>

<template>
  <!-- Desktop: a quiet panel next to the content (icon rail when collapsed).
       Phones and tablets: a drawer opened from the tab bar's "More". -->
  <aside
    id="sidebar"
    class="fixed lg:relative inset-y-0 left-0 z-50 h-screen flex flex-col bg-ui-bg border-r border-ui-line font-sans transition-[transform,width] duration-ui-slow ease-ui-out w-[280px]"
    :class="[
      props.isOpen ? 'translate-x-0 shadow-ui-overlay lg:shadow-none' : '-translate-x-full',
      'lg:translate-x-0',
      collapsed ? 'lg:w-[72px] is-collapsed' : 'lg:w-[248px]',
    ]"
    :data-collapsed="collapsed"
    :aria-label="t('nav.shell.mainNavigation')"
  >
    <!-- Brand -->
    <div class="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3" :class="collapsed ? 'lg:flex-col lg:px-2 lg:gap-2' : ''">
      <div class="w-8 h-8 shrink-0 rounded-[9px] bg-ui-surface border border-ui-line flex items-center justify-center">
        <img src="/images/jcd-only-color.png" alt="Jendela Cakra Digital" class="w-6 h-6 object-contain" />
      </div>
      <div class="min-w-0 flex-1" :class="collapsed ? 'lg:hidden' : ''">
        <div class="flex items-center gap-1.5">
          <span class="text-ui-h3 text-ui-ink">HRIS+</span>
          <span class="text-[10.5px] leading-[15px] px-1.5 rounded border border-ui-line text-ui-muted tabular-nums">v{{ APP_VERSION_SHORT }}</span>
        </div>
        <p class="text-ui-cap text-ui-muted truncate">Jendela Cakra Digital</p>
      </div>
      <button
        type="button"
        class="hidden lg:inline-flex w-8 h-8 shrink-0 items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink transition-colors"
        :title="collapsed ? t('nav.shell.expandSidebar') : t('nav.shell.collapseSidebar')"
        :aria-label="collapsed ? t('nav.shell.expandSidebar') : t('nav.shell.collapseSidebar')"
        @click="toggleCollapsed"
      >
        <PanelLeftOpen v-if="collapsed" class="w-4 h-4" />
        <PanelLeftClose v-else class="w-4 h-4" />
      </button>
      <button
        type="button"
        class="lg:hidden w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink"
        :aria-label="t('nav.shell.closeMenu')"
        @click="onNavigate"
      >
        <XIcon class="w-[18px] h-[18px]" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto overscroll-contain px-3 pb-4 space-y-1" :class="collapsed ? 'lg:px-2' : ''">
      <template v-for="section in sectionsBeforeLicense" :key="section.key">
        <div>
          <button
            type="button"
            class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
            :class="collapsed ? 'lg:hidden' : ''"
            :aria-expanded="!collapsedSections[section.key]"
            @click="toggleSection(section.key)"
          >
            <span>{{ section.title }}</span>
            <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections[section.key] }" />
          </button>
          <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
          <div v-show="!collapsedSections[section.key] || collapsed" class="space-y-px">
            <template v-for="item in section.items" :key="item.label">
              <RouterLink
                v-if="item.show"
                :to="item.to"
                :class="itemClass(item.active())"
                :aria-current="item.active() ? 'page' : undefined"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <component :is="item.icon" :class="iconClass(item.active())" />
                <span :class="labelClass">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </div>
      </template>

      <!-- License Manager: Overview, then one entry per product -->
      <div v-if="showLicenseManager">
        <button
          type="button"
          class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
          :class="collapsed ? 'lg:hidden' : ''"
          :aria-expanded="!collapsedSections.licenseManager"
          @click="toggleSection('licenseManager')"
        >
          <span>{{ t("nav.sections.licenseManager") }}</span>
          <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections.licenseManager }" />
        </button>
        <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
        <div v-show="!collapsedSections.licenseManager || collapsed" class="space-y-px">
          <RouterLink
            v-if="can('license-manager-menu')"
            :to="{ name: 'admin.license-manager.overview' }"
            :class="itemClass($route.name === 'admin.license-manager.overview')"
            @click="onNavigate"
            @mouseenter="showTooltip"
            @mouseleave="hideTooltip"
          >
            <KeyIcon :class="iconClass($route.name === 'admin.license-manager.overview')" />
            <span :class="labelClass">{{ t("nav.menu.overview") }}</span>
          </RouterLink>

          <template v-if="canListLicenses || canSeeVersions">
            <template v-for="product in licenseProducts" :key="product.code">
              <!-- Without license-manager-list the product opens its Versions page -->
              <RouterLink
                :to="{
                  name: canListLicenses ? 'admin.license-manager.licenses.dashboard' : 'admin.license-manager.versions',
                  params: { product: product.code },
                }"
                :class="itemClass(canListLicenses ? isLicenseProductRoute(product.code) : isLicenseVersionsRoute(product.code))"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <ProductIcon :product="product" :size="18" class="shrink-0" />
                <span :class="labelClass">{{ product.name }}</span>
              </RouterLink>
              <!-- The product's release history, shown while one of its pages is open -->
              <RouterLink
                v-if="canListLicenses && canSeeVersions && (isLicenseProductRoute(product.code) || isLicenseVersionsRoute(product.code))"
                :to="{ name: 'admin.license-manager.versions', params: { product: product.code } }"
                :class="[itemClass(isLicenseVersionsRoute(product.code)), collapsed ? '' : 'ml-5']"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <HistoryIcon :class="iconClass(isLicenseVersionsRoute(product.code))" />
                <span :class="labelClass">{{ t("nav.menu.versions") }}</span>
              </RouterLink>
            </template>
          </template>
        </div>
      </div>

      <template v-for="section in sectionsAfterLicense" :key="section.key">
        <div>
          <button
            type="button"
            class="w-full flex items-center justify-between px-2.5 pt-3 pb-1 text-ui-over uppercase text-ui-faint hover:text-ui-muted transition-colors"
            :class="collapsed ? 'lg:hidden' : ''"
            :aria-expanded="!collapsedSections[section.key]"
            @click="toggleSection(section.key)"
          >
            <span>{{ section.title }}</span>
            <ChevronDown class="w-3 h-3 shrink-0 transition-transform duration-ui-fast" :class="{ '-rotate-90': collapsedSections[section.key] }" />
          </button>
          <div v-if="collapsed" class="hidden lg:block h-px bg-ui-line mx-2 my-2"></div>
          <div v-show="!collapsedSections[section.key] || collapsed" class="space-y-px">
            <template v-for="item in section.items" :key="item.label">
              <RouterLink
                v-if="item.show"
                :to="item.to"
                :class="itemClass(item.active())"
                :aria-current="item.active() ? 'page' : undefined"
                @click="onNavigate"
                @mouseenter="showTooltip"
                @mouseleave="hideTooltip"
              >
                <component :is="item.icon" :class="iconClass(item.active())" />
                <span :class="labelClass">{{ item.label }}</span>
              </RouterLink>
            </template>
          </div>
        </div>
      </template>
    </nav>

    <!-- Settings: standalone, pinned to the bottom -->
    <div class="px-3 py-3 border-t border-ui-line" :class="collapsed ? 'lg:px-2' : ''">
      <RouterLink
        :to="{ name: 'admin.settings.dashboard' }"
        :class="itemClass(settingsActive())"
        @click="onNavigate"
        @mouseenter="showTooltip"
        @mouseleave="hideTooltip"
      >
        <SettingsIcon :class="iconClass(settingsActive())" />
        <span :class="labelClass">{{ t("nav.menu.settings") }}</span>
      </RouterLink>
    </div>
  </aside>

  <Teleport to="body">
    <Transition name="ui-fade">
      <div
        v-if="tooltipText"
        class="fixed z-[60] -translate-y-1/2 pointer-events-none whitespace-nowrap bg-ui-ink text-white text-ui-cap font-medium px-2.5 py-1.5 rounded-ui-control shadow-ui-overlay"
        :style="tooltipStyle"
      >
        {{ tooltipText }}
      </div>
    </Transition>
  </Teleport>
</template>
