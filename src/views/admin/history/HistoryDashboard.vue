<script setup>
import { ref, onMounted, computed } from "vue";
import { storeToRefs } from "pinia";
import { debounce } from "lodash";
import {
  History,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Activity,
  CalendarDays,
  Tag,
} from "lucide-vue-next";
import { useActivityLogStore } from "@/stores/activityLog";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import SkeletonStatCards from "@/components/common/skeleton/SkeletonStatCards.vue";

const store = useActivityLogStore();
const { activities, categories, statistics, meta, loading, loadingStatistics } =
  storeToRefs(store);

const searchQuery = ref("");
const categoryFilter = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const perPage = ref(20);
const expandedId = ref(null);

const categoryColors = {
  Security: "bg-red-50 text-red-700",
  "User Management": "bg-red-50 text-red-700",
  Employee: "bg-blue-50 text-blue-700",
  Attendance: "bg-green-50 text-green-700",
  "Leave Request": "bg-yellow-50 text-yellow-700",
  Payroll: "bg-purple-50 text-purple-700",
  Project: "bg-indigo-50 text-indigo-700",
  Team: "bg-teal-50 text-teal-700",
  Company: "bg-orange-50 text-orange-700",
  Finance: "bg-emerald-50 text-emerald-700",
  "Document Files": "bg-cyan-50 text-cyan-700",
  "Business Documents": "bg-sky-50 text-sky-700",
  Vendor: "bg-pink-50 text-pink-700",
};

const categoryClass = (category) => categoryColors[category] || "bg-gray-100 text-gray-700";

const eventLabels = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  login: "Login",
  login_failed: "Failed Login",
  logout: "Logout",
  role_created: "Role Created",
  role_updated: "Role Updated",
  role_deleted: "Role Deleted",
  backup_downloaded: "Backup Downloaded",
};

const eventLabel = (event) => eventLabels[event] || event || "-";

const fetchData = async (page = 1) => {
  await store.fetchActivities({
    page,
    row_per_page: perPage.value,
    search: searchQuery.value || undefined,
    category: categoryFilter.value || undefined,
    date_from: dateFrom.value || undefined,
    date_to: dateTo.value || undefined,
  });
};

const handlePageChange = (page) => fetchData(page);

const toggleExpand = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

const hasProperties = (properties) => {
  if (!properties) return false;
  const keys = Object.keys(properties);
  return keys.length > 0;
};

const formatDate = (date) =>
  new Date(date).toLocaleString("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

onMounted(async () => {
  await store.fetchStatistics();
  await store.fetchCategories();
  await fetchData(1);
});

const debouncedSearch = debounce(() => fetchData(1), 400);
</script>

<template>
  <div class="px-4 py-4">
    <!-- Hero + Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        class="main-card lg:row-span-2 rounded-[14px] border border-[#0B1042] relative overflow-hidden p-5"
      >
        <div class="flex flex-col justify-center h-full relative z-10">
          <div class="flex items-center gap-2 mb-3">
            <div class="flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm">
              <History class="w-3 h-3 text-white" />
              <span class="text-brand-white text-xs font-semibold">Activity Log</span>
            </div>
          </div>
          <div class="flex items-center justify-between mb-4">
            <div class="flex-1 min-w-0 pr-2">
              <p class="text-brand-white-90 text-sm font-medium">Total Activities</p>
              <Skeleton v-if="loadingStatistics" dark width="90px" height="3rem" rounded="8px" class="my-4" />
              <p v-else class="text-brand-white text-3xl lg:text-3xl font-extrabold leading-none my-4">
                {{ statistics.total }}
              </p>
              <p class="text-brand-white-80 text-sm font-normal">All-time system events</p>
            </div>
            <div class="w-16 h-16 bg-white/20 rounded-[14px] flex items-center justify-center flex-shrink-0">
              <Activity class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">Today</p>
            <Skeleton v-if="loadingStatistics" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ statistics.today }}
            </p>
            <p class="text-success text-sm font-medium">Events today</p>
          </div>
          <div class="w-12 h-12 bg-green-50 rounded-[12px] flex items-center justify-center flex-shrink-0">
            <CalendarDays class="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-brand-dark text-sm font-medium">This Week</p>
            <Skeleton v-if="loadingStatistics" width="50px" height="1.75rem" rounded="6px" class="my-2" />
            <p v-else class="text-brand-dark text-3xl font-extrabold leading-tight my-2">
              {{ statistics.this_week }}
            </p>
            <p class="text-brand-light text-sm font-medium">Since Monday</p>
          </div>
          <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Clock class="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-2">
          <p class="text-brand-dark text-sm font-medium">Categories</p>
          <div class="w-10 h-10 bg-purple-50 rounded-[12px] flex items-center justify-center flex-shrink-0">
            <Tag class="w-5 h-5 text-purple-600" />
          </div>
        </div>
        <div v-if="loadingStatistics" class="space-y-1">
          <Skeleton width="100%" height="12px" />
          <Skeleton width="80%" height="12px" />
        </div>
        <div v-else class="space-y-1 max-h-24 overflow-y-auto">
          <div
            v-for="c in statistics.by_category"
            :key="c.log_name"
            class="flex items-center justify-between text-xs"
          >
            <span class="text-brand-light truncate">{{ c.log_name }}</span>
            <span class="text-brand-dark font-semibold">{{ c.total }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters + List -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 class="text-brand-dark text-lg font-bold">All Activity</h3>

        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
          <div class="relative w-full sm:w-56">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
              <Search class="w-4 h-4 text-blue-400" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search activity..."
              class="relative w-full pl-10 pr-4 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
              @input="debouncedSearch"
            />
          </div>

          <select
            v-model="categoryFilter"
            class="w-full sm:w-auto px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            @change="fetchData(1)"
          >
            <option value="">All Categories</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>

          <input
            v-model="dateFrom"
            type="date"
            class="w-full sm:w-auto px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            @change="fetchData(1)"
          />
          <input
            v-model="dateTo"
            type="date"
            class="w-full sm:w-auto px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none transition-all"
            @change="fetchData(1)"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <Skeleton v-for="i in 6" :key="i" height="64px" rounded="16px" />
      </div>

      <!-- Empty -->
      <div
        v-else-if="activities.length === 0"
        class="text-center py-12 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
      >
        <History class="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p class="text-lg font-semibold">No activity found</p>
        <p class="text-sm text-gray-400">Try adjusting your search or filters</p>
      </div>

      <!-- List -->
      <div v-else class="space-y-3">
        <div
          v-for="activity in activities"
          :key="activity.id"
          class="border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] transition-all duration-300"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0">
              <div class="w-10 h-10 bg-blue-50 rounded-[10px] flex items-center justify-center flex-shrink-0">
                <User class="w-5 h-5 text-blue-600" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <span class="text-brand-dark text-sm font-semibold">
                    {{ activity.causer?.name || "System" }}
                  </span>
                  <span
                    :class="categoryClass(activity.category)"
                    class="px-2 py-0.5 rounded-md text-xs font-semibold"
                  >
                    {{ activity.category }}
                  </span>
                  <span class="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    {{ eventLabel(activity.event) }}
                  </span>
                </div>
                <p class="text-brand-light text-sm">
                  {{ activity.description }}
                  <span v-if="activity.subject_type" class="text-gray-400">
                    &middot; {{ activity.subject_type }}
                    <template v-if="activity.subject_id">#{{ activity.subject_id }}</template>
                  </span>
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
              <span class="text-xs text-gray-400 whitespace-nowrap">{{ formatDate(activity.created_at) }}</span>
              <button
                v-if="hasProperties(activity.properties)"
                @click="toggleExpand(activity.id)"
                class="w-8 h-8 rounded-lg border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] transition-all"
                :aria-label="expandedId === activity.id ? 'Hide details' : 'Show details'"
              >
                <ChevronUp v-if="expandedId === activity.id" class="w-4 h-4 text-gray-600" />
                <ChevronDown v-else class="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          <div
            v-if="expandedId === activity.id && hasProperties(activity.properties)"
            class="mt-3 pt-3 border-t border-[#DCDEDD] grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div v-if="activity.properties.old">
              <p class="text-xs font-semibold text-gray-500 mb-1">Before</p>
              <pre class="text-xs bg-red-50 text-red-800 rounded-lg p-3 overflow-x-auto">{{ JSON.stringify(activity.properties.old, null, 2) }}</pre>
            </div>
            <div v-if="activity.properties.attributes">
              <p class="text-xs font-semibold text-gray-500 mb-1">After</p>
              <pre class="text-xs bg-green-50 text-green-800 rounded-lg p-3 overflow-x-auto">{{ JSON.stringify(activity.properties.attributes, null, 2) }}</pre>
            </div>
            <div v-if="!activity.properties.old && !activity.properties.attributes" class="md:col-span-2">
              <pre class="text-xs bg-gray-50 text-gray-700 rounded-lg p-3 overflow-x-auto">{{ JSON.stringify(activity.properties, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && activities.length > 0"
        class="flex items-center justify-between mt-6 pt-4 border-t border-[#DCDEDD]"
      >
        <span class="text-sm text-brand-light">
          Page {{ meta.current_page }} of {{ meta.last_page }}
          <span class="hidden sm:inline">&middot; {{ meta.total }} total activities</span>
        </span>
        <div class="flex gap-2">
          <button
            @click="handlePageChange(meta.current_page - 1)"
            :disabled="meta.current_page === 1"
            class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <button
            @click="handlePageChange(meta.current_page + 1)"
            :disabled="meta.current_page === meta.last_page"
            class="px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm font-semibold text-brand-dark hover:border-[#0C51D9] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
