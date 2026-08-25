<script setup>
import { onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { FileSignature, Plus, Search, Trash2, Eye, ArrowLeft } from "lucide-vue-next";
import { useRouter } from "vue-router";
import { useDocumentLetterStore } from "@/stores/documentLetter";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";
import SkeletonTable from "@/components/common/skeleton/SkeletonTable.vue";
import Pagination from "@/components/common/Pagination.vue";

const router = useRouter();
const store = useDocumentLetterStore();
const alertModal = useAlertModalStore();
const { documentLetters, meta, loading } = storeToRefs(store);

const search = ref("");
const statusFilter = ref("");

const load = (page = 1) => {
  store.fetchDocumentLetters({
    search: search.value || undefined,
    status: statusFilter.value || undefined,
    page,
  });
};

onMounted(() => load());

const handleSearch = () => load(1);
const handleFilterChange = () => load(1);

const goToDetail = (id) => router.push({ name: "admin.official-memos.detail", params: { id } });

const handleDelete = async (memo) => {
  if (
    !(await alertModal.confirm(`Delete Official Memo "${memo.document_number}"? This action cannot be undone.`, {
      type: "danger",
      confirmText: "Delete",
    }))
  )
    return;
  await store.deleteDocumentLetter(memo.id);
};

const STATUS_LABEL = { draft: "Draft", pending: "Pending", approved: "Approved", rejected: "Rejected" };
const STATUS_CLASS = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" }) : "-";
</script>

<template>
  <div>
    <div class="bg-white p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <router-link
          :to="{ name: 'admin.documents.dashboard' }"
          class="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all duration-300 shrink-0"
          aria-label="Back to Documents"
          title="Back to Documents"
        >
          <ArrowLeft class="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
        </router-link>
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <FileSignature class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Official Memo</h3>
          <p class="text-brand-light text-sm">Internal memos with a Finance Manager approval workflow</p>
        </div>
      </div>

      <router-link
        v-if="can('document-letter-create')"
        :to="{ name: 'admin.official-memos.create' }"
        class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-3 flex items-center gap-2"
      >
        <Plus class="w-4 h-4 text-white" />
        <span class="text-brand-white text-sm font-semibold">Create Official Memo</span>
      </router-link>
    </div>

    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
      <div class="flex flex-col sm:flex-row gap-3 mb-4">
        <div class="relative max-w-sm w-full">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search class="w-4 h-4 text-gray-400" />
          </div>
          <input
            v-model="search"
            @keyup.enter="handleSearch"
            type="text"
            placeholder="Search number, subject..."
            class="w-full pl-9 pr-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
          />
        </div>
        <select
          v-model="statusFilter"
          @change="handleFilterChange"
          class="px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none"
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <SkeletonTable v-if="loading" :rows="6" :cols="6" />

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="text-left text-brand-light border-b border-[#DCDEDD]">
              <th class="py-3 pr-4 font-semibold">No</th>
              <th class="py-3 pr-4 font-semibold">Number</th>
              <th class="py-3 pr-4 font-semibold">Subject</th>
              <th class="py-3 pr-4 font-semibold">Date</th>
              <th class="py-3 pr-4 font-semibold">Status</th>
              <th class="py-3 pr-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(memo, index) in documentLetters"
              :key="memo.id"
              class="border-b border-[#F1F1F1] hover:bg-gray-50 cursor-pointer"
              @click="goToDetail(memo.id)"
            >
              <td class="py-3 pr-4 text-brand-light">{{ (meta.current_page - 1) * meta.per_page + index + 1 }}</td>
              <td class="py-3 pr-4 font-mono text-xs">{{ memo.document_number }}</td>
              <td class="py-3 pr-4">{{ memo.subject }}</td>
              <td class="py-3 pr-4">{{ formatDate(memo.document_date) }}</td>
              <td class="py-3 pr-4">
                <span class="px-2 py-1 rounded-md text-xs font-semibold" :class="STATUS_CLASS[memo.status]">
                  {{ STATUS_LABEL[memo.status] }}
                </span>
              </td>
              <td class="py-3 pr-4" @click.stop>
                <div class="flex items-center justify-end gap-1">
                  <button
                    @click="goToDetail(memo.id)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-[#0C51D9]"
                    title="View Detail"
                  >
                    <Eye class="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    v-if="can('document-letter-delete') && memo.status === 'draft'"
                    @click="handleDelete(memo)"
                    class="flex justify-center items-center border border-[#DCDEDD] rounded-lg p-2 hover:ring-2 hover:ring-red-500 hover:bg-red-50 group"
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!loading && documentLetters.length === 0" class="text-center py-12 text-gray-500">
          <p class="text-lg font-semibold">No Official Memo yet</p>
        </div>
      </div>

      <Pagination :meta="meta" :loading="loading" item-label="memo" @page-change="load" />
    </div>
  </div>
</template>
