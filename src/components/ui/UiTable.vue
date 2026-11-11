<script setup>
// Data table of the redesign. Every table starts with a "#" column: the
// row's number, continuing across pages (pass the API `meta`).
//
// columns: [{ key, label, align?: 'left'|'right'|'center', width?, class? }]
// Slots: cell-<key> ({ row, value, index, number }), empty, and `mobile`
// ({ row, number }) -- when given, phones get that card list instead of
// the table.
import { computed } from "vue";
import { firstRowNumber } from "./table";

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  rowKey: { type: [String, Function], default: "id" },
  meta: { type: Object, default: null },
  numbered: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  skeletonRows: { type: Number, default: 5 },
  emptyText: { type: String, default: "No data yet." },
  clickable: { type: Boolean, default: false },
  // Rows rise in when the data changes (first 8 staggered, CSS only).
  animated: { type: Boolean, default: true },
});
const emit = defineEmits(["row-click"]);

const start = computed(() => firstRowNumber(props.meta));
const keyOf = (row, index) => (typeof props.rowKey === "function" ? props.rowKey(row) : row?.[props.rowKey]) ?? index;
const ALIGN = { right: "text-right", center: "text-center", left: "text-left" };
const colCount = computed(() => props.columns.length + (props.numbered ? 1 : 0));
const onRow = (row) => props.clickable && emit("row-click", row);
</script>

<template>
  <div class="min-w-0">
    <!-- Phones: the caller's card list, when provided -->
    <ul v-if="$slots.mobile" :class="['md:hidden divide-y divide-ui-line', animated && !loading ? 'ui-stagger' : '']">
      <template v-if="loading">
        <li v-for="i in 3" :key="`m-skel-${i}`" class="px-4 py-3.5"><div class="h-4 w-2/3 rounded bg-ui-subtle animate-pulse"></div></li>
      </template>
      <li v-else-if="!rows.length" class="px-4 py-8 text-center text-ui-small text-ui-muted"><slot name="empty">{{ emptyText }}</slot></li>
      <template v-else>
        <li v-for="(row, index) in rows" :key="keyOf(row, index)" :class="clickable ? 'cursor-pointer active:bg-ui-hover' : ''" @click="onRow(row)">
          <slot name="mobile" :row="row" :number="start + index" :index="index" />
        </li>
      </template>
    </ul>

    <div :class="['overflow-x-auto', $slots.mobile ? 'hidden md:block' : '']">
      <table class="w-full border-collapse">
        <thead>
          <tr>
            <th v-if="numbered" scope="col" class="w-11 pl-4 pr-0 h-10 text-left text-ui-cap font-medium text-ui-muted border-b border-ui-line bg-ui-surface">#</th>
            <th
              v-for="col in columns"
              :key="col.key"
              scope="col"
              :style="col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined"
              :class="['px-4 h-10 text-ui-cap font-medium text-ui-muted border-b border-ui-line bg-ui-surface whitespace-nowrap', ALIGN[col.align] || 'text-left', col.class || '']"
            >{{ col.label }}</th>
          </tr>
        </thead>
        <tbody :class="animated && !loading ? 'ui-stagger' : ''">
          <template v-if="loading">
            <tr v-for="i in skeletonRows" :key="`skel-${i}`">
              <td :colspan="colCount" class="px-4 h-14 border-b border-ui-line"><div class="h-4 rounded bg-ui-subtle animate-pulse" :style="{ width: `${50 + ((i * 13) % 40)}%` }"></div></td>
            </tr>
          </template>
          <tr v-else-if="!rows.length">
            <td :colspan="colCount" class="px-4 py-10 text-center text-ui-small text-ui-muted"><slot name="empty">{{ emptyText }}</slot></td>
          </tr>
          <template v-else>
          <tr
            v-for="(row, index) in rows"
            :key="keyOf(row, index)"
            :class="['group transition-colors', clickable ? 'cursor-pointer hover:bg-ui-hover' : 'hover:bg-ui-subtle/60']"
            @click="onRow(row)"
          >
            <td v-if="numbered" class="pl-4 pr-0 h-14 text-ui-cap text-ui-faint tabular-nums border-b border-ui-line group-last:border-b-0">{{ start + index }}</td>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="['px-4 h-14 text-ui-small text-ui-text border-b border-ui-line group-last:border-b-0', ALIGN[col.align] || 'text-left', col.class || '']"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="row?.[col.key]" :index="index" :number="start + index">{{ row?.[col.key] ?? "—" }}</slot>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
