<script setup>
// Redesign UI kit (development only, /admin/ui-kit): every base component
// and token in one place, to check them against the Figma file.
import { computed, ref } from "vue";
import { Plus, Download, Search, Mail, Trash2 } from "lucide-vue-next";
import { UiBadge, UiButton, UiCard, UiInput, UiModal, UiPagination, UiSelect, UiSwitch, UiTable } from "@/components/ui";
import { useToastStore } from "@/stores/toast";
import { APP_VERSION, APP_VERSION_SHORT } from "@/utils/appVersion";

const toast = useToastStore();

const COLORS = [
  ["bg", "Background"], ["surface", "Surface"], ["subtle", "Subtle"], ["hover", "Hover"], ["line", "Border"], ["line-strong", "Border strong"],
  ["ink", "Ink"], ["text", "Text"], ["muted", "Muted"], ["faint", "Faint"], ["accent", "Accent"], ["accent-soft", "Accent soft"],
];
const STATUS = [["ok", "Success"], ["warn", "Warning"], ["bad", "Danger"], ["info", "Info"]];
const TYPE = [
  ["text-ui-display", "Display · 30/38", "Good morning, Rizky"],
  ["text-ui-h1", "Heading 1 · 22/30", "License detail"],
  ["text-ui-h2", "Heading 2 · 17/26", "Device keys"],
  ["text-ui-h3", "Heading 3 · 14/20", "License terms"],
  ["text-ui-body", "Body · 14/20", "Each device gets its own key; a released key can't be used again."],
  ["text-ui-small", "Small · 13/18", "Last activity 2 hours ago"],
  ["text-ui-cap", "Caption · 12/16", "Issued 11 Nov 2026"],
  ["text-ui-over uppercase", "Overline · 11/16", "People"],
];

// Form demo
const form = ref({ name: "Jane Orienteer", email: "", phone: "12ab", team: "", notes: "", active: true });
const teams = [{ value: "product", label: "Product" }, { value: "design", label: "Design" }, { value: "people", label: "People" }];

// Table demo: 23 rows, 5 per page -- numbering continues on every page.
const ALL = Array.from({ length: 23 }, (_, i) => ({
  id: i + 1,
  number: `INV-2026-${String(118 - i).padStart(3, "0")}`,
  client: ["PT Atlas Nusantara", "Jakarta Orienteering Club", "CV Sinar Mandiri", "Bandung Scouts", "PT Kreasi Digital"][i % 5],
  amount: 1_500_000 * ((i % 7) + 1),
  status: ["Unpaid", "Paid", "Overdue", "Draft", "Paid"][i % 5],
}));
const page = ref(1);
const perPage = 5;
const meta = computed(() => ({ current_page: page.value, per_page: perPage, total: ALL.length, last_page: Math.ceil(ALL.length / perPage) }));
const rows = computed(() => ALL.slice((page.value - 1) * perPage, page.value * perPage));
const columns = [
  { key: "number", label: "Number" },
  { key: "client", label: "Client" },
  { key: "amount", label: "Amount", align: "right" },
  { key: "status", label: "Status", width: 120 },
];
const statusTone = { Paid: "ok", Unpaid: "warn", Overdue: "bad", Draft: "neutral" };
const rupiah = (n) => `Rp ${n.toLocaleString("id-ID")}`;

// Modal demo
const confirmOpen = ref(false);
const formOpen = ref(false);

// Motion demo
const staggerKey = ref(0);
const menuOpen = ref(false);
const listItems = ref(["Andi Pratama", "Aldi Saputra", "Sari Rahma"]);
const extra = ["Budi Santoso", "Dewi Wulandari", "Nadia Lestari", "Yoga Prasetyo"];
const addItem = () => listItems.value.unshift(extra[listItems.value.length % extra.length]);
const removeItem = (i) => listItems.value.splice(i, 1);
</script>

<template>
  <div class="min-h-full bg-ui-bg font-sans text-ui-text -m-3 p-4 sm:p-8 space-y-8">
    <header class="flex flex-wrap items-end gap-4">
      <div class="flex-1 min-w-0">
        <p class="text-ui-over uppercase text-ui-faint">HRIS+ redesign · development only</p>
        <h1 class="text-ui-display text-ui-ink mt-1">UI kit</h1>
        <p class="text-ui-small text-ui-muted mt-1">Palette B · Navy + Blue · Inter. App version v{{ APP_VERSION_SHORT }} ({{ APP_VERSION }}, from package.json).</p>
      </div>
      <UiButton variant="secondary" :icon="Download" @click="toast.info('Nothing to export', 'This is the UI kit.')">Export</UiButton>
      <UiButton :icon="Plus" @click="formOpen = true">New announcement</UiButton>
    </header>

    <UiCard title="Colour" subtitle="CSS variables (RGB channels) → Tailwind ui-* colours">
      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div v-for="[key, name] in COLORS" :key="key">
          <div class="h-14 rounded-ui-control border border-ui-ink/5" :style="{ background: `rgb(var(--ui-${key}))` }"></div>
          <p class="text-ui-cap font-medium text-ui-ink mt-1.5">{{ name }}</p>
          <p class="text-ui-cap text-ui-muted font-mono">ui-{{ key }}</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 mt-5">
        <UiBadge v-for="[key, name] in STATUS" :key="key" :tone="key" dot>{{ name }}</UiBadge>
        <UiBadge tone="accent">Lifetime</UiBadge>
        <UiBadge>Professional</UiBadge>
        <UiBadge tone="outline">Mac</UiBadge>
      </div>
    </UiCard>

    <UiCard title="Typography" subtitle="Inter; JetBrains Mono for keys and codes">
      <div class="divide-y divide-ui-line">
        <div v-for="[cls, spec, sample] in TYPE" :key="cls" class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-8 py-3">
          <span class="w-48 shrink-0 text-ui-cap text-ui-muted">{{ spec }}</span>
          <span :class="[cls, 'text-ui-ink']">{{ sample }}</span>
        </div>
        <div class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-8 py-3">
          <span class="w-48 shrink-0 text-ui-cap text-ui-muted">Mono · 13</span>
          <span class="font-mono text-ui-small font-medium text-ui-ink">OC34-T55E-4BYD-S7EW-0001</span>
        </div>
      </div>
    </UiCard>

    <UiCard title="Buttons">
      <div class="flex flex-wrap items-center gap-3">
        <UiButton :icon="Plus">Create license</UiButton>
        <UiButton variant="secondary" :icon="Download">Export</UiButton>
        <UiButton variant="ghost">Cancel</UiButton>
        <UiButton variant="danger" :icon="Trash2">Delete</UiButton>
        <UiButton loading>Saving</UiButton>
        <UiButton disabled>Disabled</UiButton>
        <UiButton size="sm">Small</UiButton>
        <UiButton size="lg">Large · mobile</UiButton>
      </div>
    </UiCard>

    <UiCard title="Form fields">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <UiInput v-model="form.name" label="Full name" required hint="As it appears on the certificate." />
        <UiInput v-model="form.email" label="Email" type="email" placeholder="name@example.com" :icon="Mail" />
        <UiInput v-model="form.phone" label="Phone" error="Enter 6 to 20 digits." />
        <UiSelect v-model="form.team" label="Team" :options="teams" placeholder="Choose a team" />
        <UiInput v-model="form.notes" class="md:col-span-2" label="Notes" :rows="3" placeholder="Invoice number, event, payment…" />
        <UiInput model-value="OC34-T55E-4BYD-S7EW-0001" label="License key" mono readonly />
        <div class="self-end p-3 border border-ui-line rounded-[10px]">
          <UiSwitch v-model="form.active" label="Active" description="Inactive keys are rejected on the next check." />
        </div>
      </div>
    </UiCard>

    <UiCard title="Table" subtitle="The # column continues across pages (page 2 starts at 6 here)" :padded="false">
      <template #actions>
        <UiInput class="w-56 hidden sm:block" model-value="" placeholder="Search" :icon="Search" />
      </template>
      <div class="pt-3">
        <UiTable :columns="columns" :rows="rows" :meta="meta" clickable @row-click="(r) => toast.success(`Opened ${r.number}`)">
          <template #cell-number="{ value }"><span class="font-mono text-ui-cap font-medium text-ui-ink">{{ value }}</span></template>
          <template #cell-client="{ value }"><span class="text-ui-ink">{{ value }}</span></template>
          <template #cell-amount="{ value }"><span class="tabular-nums text-ui-ink">{{ rupiah(value) }}</span></template>
          <template #cell-status="{ value }"><UiBadge :tone="statusTone[value]" dot>{{ value }}</UiBadge></template>
          <template #mobile="{ row, number }">
            <div class="flex items-start gap-3 px-4 py-3.5">
              <span class="text-ui-cap text-ui-faint tabular-nums w-5 pt-0.5">{{ number }}</span>
              <div class="flex-1 min-w-0">
                <p class="font-mono text-ui-cap text-ui-muted">{{ row.number }}</p>
                <p class="text-ui-body font-medium text-ui-ink">{{ row.client }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5">
                <span class="text-ui-body font-semibold text-ui-ink tabular-nums">{{ rupiah(row.amount) }}</span>
                <UiBadge :tone="statusTone[row.status]" dot>{{ row.status }}</UiBadge>
              </div>
            </div>
          </template>
        </UiTable>
        <UiPagination :meta="meta" item-label="invoices" @change="(p) => (page = p)" />
      </div>
    </UiCard>

    <UiCard title="Overlays" subtitle="Modal on desktop, bottom sheet on phones; toast for short confirmations">
      <div class="flex flex-wrap gap-3">
        <UiButton variant="danger" :icon="Trash2" @click="confirmOpen = true">Delete invoice…</UiButton>
        <UiButton variant="secondary" @click="formOpen = true">Form modal</UiButton>
        <UiButton variant="secondary" @click="toast.success('License created.', 'The PDF is downloading.')">Success toast</UiButton>
        <UiButton variant="secondary" @click="toast.error('Could not save', 'Check your connection and try again.')">Error toast</UiButton>
      </div>
    </UiCard>

    <UiCard title="Motion" subtitle="CSS only · transform + opacity · 120–240 ms · off with Reduce motion">
      <div class="space-y-6">
        <div>
          <div class="flex items-center gap-3 mb-3">
            <p class="text-ui-small font-medium text-ui-ink">Stagger + lift (card grids)</p>
            <UiButton size="sm" variant="secondary" @click="staggerKey++">Replay</UiButton>
          </div>
          <div :key="staggerKey" class="ui-stagger grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div v-for="n in 8" :key="n" class="ui-lift bg-ui-surface border border-ui-line rounded-ui-card p-4 cursor-pointer">
              <p class="text-ui-cap text-ui-muted">Project {{ n }}</p>
              <p class="text-ui-h3 text-ui-ink mt-1">{{ 40 + n * 7 }}%</p>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-start gap-10">
          <div class="relative">
            <p class="text-ui-small font-medium text-ui-ink mb-3">Pop (menus)</p>
            <UiButton variant="secondary" @click="menuOpen = !menuOpen">Actions</UiButton>
            <Transition name="ui-pop">
              <div v-if="menuOpen" class="absolute left-0 top-full mt-2 w-48 bg-ui-surface border border-ui-line rounded-[10px] shadow-ui-overlay p-1 z-10">
                <button v-for="a in ['Edit', 'Duplicate', 'Archive']" :key="a" type="button" class="w-full text-left px-3 h-9 rounded-ui-control text-ui-small text-ui-text hover:bg-ui-hover" @click="menuOpen = false">{{ a }}</button>
              </div>
            </Transition>
          </div>
          <div class="w-72">
            <div class="flex items-center gap-3 mb-3">
              <p class="text-ui-small font-medium text-ui-ink">List (add / remove)</p>
              <UiButton size="sm" variant="secondary" :icon="Plus" @click="addItem">Add</UiButton>
            </div>
            <TransitionGroup name="ui-list" tag="ul" class="relative space-y-2">
              <li v-for="(name, i) in listItems" :key="name + i" class="flex items-center gap-3 bg-ui-surface border border-ui-line rounded-[10px] px-3 h-11">
                <span class="text-ui-small text-ui-ink flex-1">{{ name }}</span>
                <button type="button" class="text-ui-faint hover:text-ui-bad" :aria-label="`Remove ${name}`" @click="removeItem(i)"><Trash2 class="w-4 h-4" /></button>
              </li>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </UiCard>

    <UiModal v-model:open="confirmOpen" title="Delete invoice INV-2026-114?" description="The draft and its line items are removed. This can't be undone." size="sm">
      <p class="text-ui-small text-ui-muted">Confirm dialogs keep their message short; the action button names what happens.</p>
      <template #footer="{ close }">
        <UiButton variant="secondary" @click="close">Cancel</UiButton>
        <UiButton class="!bg-ui-bad hover:!bg-ui-bad/90" @click="close(); toast.success('Invoice deleted.')">Delete</UiButton>
      </template>
    </UiModal>

    <UiModal v-model:open="formOpen" title="New announcement">
      <div class="space-y-4">
        <UiInput model-value="Office closed on 17 November" label="Title" required />
        <UiInput model-value="" label="Message" :rows="4" placeholder="The Bandung office is closed for maintenance…" />
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UiSelect model-value="all" label="Audience" :options="[{ value: 'all', label: 'Everyone' }, { value: 'team', label: 'One team' }]" />
          <UiInput model-value="2026-11-17" label="Show until" type="date" />
        </div>
      </div>
      <template #footer="{ close }">
        <UiButton variant="ghost" @click="close">Cancel</UiButton>
        <UiButton @click="close(); toast.success('Announcement published.')">Publish</UiButton>
      </template>
    </UiModal>
  </div>
</template>
