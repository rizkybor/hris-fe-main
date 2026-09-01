<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  Briefcase,
  ArrowLeft,
  Pencil,
  User,
  Phone,
  Mail,
  MapPin,
  Tag,
  Layers,
  FileText,
  Clock,
  FolderKanban,
  ScrollText,
  Star,
  Plus,
  Trash2,
  X,
} from "lucide-vue-next";
import { useVendorsStore } from "@/stores/vendor";
import Spinner from "@/components/common/skeleton/Spinner.vue";
import { getProjectStatusColor } from "@/utils/badgeUtils";
import { can } from "@/helpers/permissionHelper";
import { useAlertModalStore } from "@/stores/alertModal";

const route = useRoute();
const router = useRouter();
const vendorsStore = useVendorsStore();
const alertModal = useAlertModalStore();

const vendor = ref(null);
const loading = ref(true);
const error = ref("");

const evaluations = ref([]);
const evaluationsLoading = ref(true);
const showEvaluationModal = ref(false);
const submittingEvaluation = ref(false);
const evaluationForm = ref({
  rating: 5,
  notes: "",
  evaluated_at: new Date().toISOString().split("T")[0],
});

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

const loadEvaluations = async () => {
  evaluationsLoading.value = true;
  try {
    evaluations.value = await vendorsStore.fetchVendorEvaluations(route.params.id);
  } catch (err) {
    // Non-fatal -- the vendor detail itself already loaded successfully.
  } finally {
    evaluationsLoading.value = false;
  }
};

onMounted(async () => {
  try {
    vendor.value = await vendorsStore.fetchVendorById(route.params.id);
    if (!vendor.value) {
      error.value = "Vendor not found.";
      return;
    }
    await loadEvaluations();
  } catch (err) {
    error.value = "Failed to load vendor detail.";
  } finally {
    loading.value = false;
  }
});

const openEvaluationModal = () => {
  evaluationForm.value = { rating: 5, notes: "", evaluated_at: new Date().toISOString().split("T")[0] };
  showEvaluationModal.value = true;
};

const closeEvaluationModal = () => {
  showEvaluationModal.value = false;
};

const submitEvaluation = async () => {
  submittingEvaluation.value = true;
  try {
    await vendorsStore.createVendorEvaluation({
      vendor_id: route.params.id,
      ...evaluationForm.value,
    });
    await loadEvaluations();
    vendor.value = await vendorsStore.fetchVendorById(route.params.id);
    closeEvaluationModal();
  } catch (err) {
    await alertModal.alert(
      err?.response?.data?.message || "Failed to save evaluation.",
      { type: "danger" }
    );
  } finally {
    submittingEvaluation.value = false;
  }
};

const deleteEvaluation = async (id) => {
  const confirmed = await alertModal.confirm(
    "Delete this evaluation? This cannot be undone.",
    { type: "danger" }
  );
  if (!confirmed) return;

  try {
    await vendorsStore.deleteVendorEvaluation(id);
    await loadEvaluations();
    vendor.value = await vendorsStore.fetchVendorById(route.params.id);
  } catch (err) {
    await alertModal.alert(
      err?.response?.data?.message || "Failed to delete evaluation.",
      { type: "danger" }
    );
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 mb-5">
      <div class="flex items-center gap-2.5">
        <button
          @click="router.back()"
          class="bg-white w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>

        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>

        <div class="flex-1">
          <h1 class="text-brand-dark text-base font-bold">Vendor Detail</h1>
          <p class="text-brand-light text-sm">Vendor information (read-only)</p>
        </div>

        <router-link
          :to="{ name: 'admin.vendors.edit', params: { id: route.params.id } }"
          class="btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5"
        >
          <Pencil class="w-4 h-4 text-white" />
          <span class="text-brand-white font-semibold text-sm">Edit</span>
        </router-link>
      </div>
    </div>

    <!-- Loading -->
    <Spinner v-if="loading" label="Loading vendor detail..." />

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-red-600">{{ error }}</div>

    <!-- Content -->
    <div v-else-if="vendor" class="space-y-5">
      <!-- Hero: name + badges -->
      <div class="main-card rounded-[14px] p-5 relative overflow-hidden">
        <div class="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div class="relative z-10 flex items-start gap-3.5">
          <div class="w-10 h-10 bg-white/10 border border-white/10 rounded-[14px] flex items-center justify-center shrink-0">
            <Briefcase class="w-7 h-7 text-blue-300" />
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-white text-lg font-extrabold truncate">{{ vendor.name || "-" }}</h2>
            <div class="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span v-if="vendor.type" class="px-2.5 py-1 rounded-full bg-purple-400/20 text-purple-200 text-xs font-semibold border border-purple-400/20">
                {{ vendor.type }}
              </span>
              <span v-if="vendor.field" class="px-2.5 py-1 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-semibold border border-emerald-400/20">
                {{ vendor.field }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Contact -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
            <User class="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Kontak PIC (Person in Charge)</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="bg-slate-100 flex items-center gap-2.5 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <User class="w-5 h-5 text-gray-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-gray-500">PIC Name</p>
              <p class="text-brand-dark font-semibold truncate">{{ vendor.pic_name || "-" }}</p>
            </div>
          </div>
          <div class="bg-slate-100 flex items-center gap-2.5 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <Phone class="w-5 h-5 text-gray-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-gray-500">PIC Phone</p>
              <p class="text-brand-dark font-semibold truncate">{{ vendor.pic_phone || "-" }}</p>
            </div>
          </div>
          <div class="md:col-span-2 bg-slate-100 flex items-center gap-2.5 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <Mail class="w-5 h-5 text-gray-400 shrink-0" />
            <div class="min-w-0">
              <p class="text-xs text-gray-500">Email</p>
              <p class="text-brand-dark font-semibold truncate">{{ vendor.email || "-" }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Legalitas -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-purple-50 rounded-[10px] flex items-center justify-center shrink-0">
            <ScrollText class="w-4.5 h-4.5 text-purple-600" />
          </div>
          <div>
            <h4 class="text-brand-dark font-bold">Legalitas</h4>
            <p class="text-brand-light text-xs">Opsional -- kosong jika vendor perorangan</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-slate-100 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <p class="text-xs text-gray-500">NPWP</p>
            <p class="text-brand-dark font-semibold truncate">{{ vendor.npwp || "-" }}</p>
          </div>
          <div class="bg-slate-100 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <p class="text-xs text-gray-500">Nomor SIUP</p>
            <p class="text-brand-dark font-semibold truncate">{{ vendor.siup_number || "-" }}</p>
          </div>
          <div class="bg-slate-100 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px]">
            <p class="text-xs text-gray-500">Nomor NIB</p>
            <p class="text-brand-dark font-semibold truncate">{{ vendor.nib_number || "-" }}</p>
          </div>
        </div>
      </div>

      <!-- Rating & Evaluation -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-4 gap-3">
          <div class="flex items-center gap-1.5">
            <div class="w-9 h-9 bg-amber-50 rounded-[10px] flex items-center justify-center shrink-0">
              <Star class="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div>
              <h4 class="text-brand-dark font-bold">Rating & Evaluasi</h4>
              <p class="text-brand-light text-xs">
                <span v-if="vendor.average_rating">
                  {{ vendor.average_rating }}/5 dari {{ vendor.evaluations_count }} evaluasi
                </span>
                <span v-else>Belum ada evaluasi</span>
              </p>
            </div>
          </div>
          <button
            v-if="can('vendors-evaluation-create')"
            @click="openEvaluationModal"
            class="btn-primary rounded-[10px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-3.5 py-2 flex items-center gap-1.5 shrink-0"
          >
            <Plus class="w-4 h-4 text-white" />
            <span class="text-brand-white text-sm font-semibold">Tambah Evaluasi</span>
          </button>
        </div>

        <div v-if="evaluationsLoading" class="text-center py-6 text-gray-400 text-sm">Loading...</div>
        <div
          v-else-if="evaluations.length === 0"
          class="text-center py-8 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
        >
          <Star class="w-8 h-8 text-gray-300 mx-auto mb-2.5" />
          <p class="text-sm font-semibold">Belum ada evaluasi untuk vendor ini</p>
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="evaluation in evaluations"
            :key="evaluation.id"
            class="border border-[#DCDEDD] rounded-[12px] p-4"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-0.5 mb-1.5">
                  <Star
                    v-for="n in 5"
                    :key="n"
                    class="w-4 h-4"
                    :class="n <= evaluation.rating ? 'text-amber-400' : 'text-gray-200'"
                    :fill="n <= evaluation.rating ? 'currentColor' : 'none'"
                  />
                  <span class="text-brand-dark text-sm font-semibold ml-1.5">{{ evaluation.rating }}/5</span>
                </div>
                <p v-if="evaluation.notes" class="text-brand-dark text-sm mb-1.5">{{ evaluation.notes }}</p>
                <p class="text-brand-light text-xs">
                  {{ formatDate(evaluation.evaluated_at) }}
                  <span v-if="evaluation.evaluated_by?.name"> &middot; oleh {{ evaluation.evaluated_by.name }}</span>
                </p>
              </div>
              <button
                v-if="can('vendors-evaluation-delete')"
                @click="deleteEvaluation(evaluation.id)"
                class="w-8 h-8 rounded-[8px] border border-[#DCDEDD] flex items-center justify-center hover:border-red-400 hover:bg-red-50 transition-all shrink-0"
                aria-label="Delete evaluation"
              >
                <Trash2 class="w-4 h-4 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Additional -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
            <MapPin class="w-4.5 h-4.5 text-orange-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Detail Tambahan</h4>
        </div>

        <div class="space-y-4">
          <div>
            <p class="text-xs text-gray-500 mb-1">Address</p>
            <div class="flex items-start gap-2.5">
              <MapPin class="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p class="text-brand-dark font-medium">{{ vendor.address || "-" }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs text-gray-500 mb-1">Notes</p>
            <div class="flex items-start gap-2.5 px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] bg-slate-100">
              <FileText class="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p class="text-brand-dark whitespace-pre-line">{{ vendor.notes || "-" }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-4 mt-4 border-t border-[#DCDEDD]">
          <div class="flex items-center gap-2.5">
            <Clock class="w-5 h-5 text-gray-400" />
            <div>
              <p class="text-xs text-gray-500">Created At</p>
              <p class="text-sm font-semibold">{{ formatDate(vendor.created_at) }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <Clock class="w-5 h-5 text-gray-400" />
            <div>
              <p class="text-xs text-gray-500">Last Updated</p>
              <p class="text-sm font-semibold">{{ formatDate(vendor.updated_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Projects (optional) -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
            <FolderKanban class="w-4.5 h-4.5 text-blue-600" />
          </div>
          <div>
            <h4 class="text-brand-dark font-bold">Projects</h4>
            <p class="text-brand-light text-xs">Optional — projects contracted through this vendor</p>
          </div>
        </div>

        <div
          v-if="!vendor.projects || vendor.projects.length === 0"
          class="text-center py-8 text-gray-500 bg-gray-50 rounded-[12px] border border-dashed border-[#DCDEDD]"
        >
          <FolderKanban class="w-8 h-8 text-gray-300 mx-auto mb-2.5" />
          <p class="text-sm font-semibold">No projects linked yet</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <router-link
            v-for="project in vendor.projects"
            :key="project.id"
            :to="{ name: 'admin.projects.detail', params: { id: project.id } }"
            class="border border-[#DCDEDD] rounded-[12px] p-4 hover:border-[#0C51D9] hover:shadow-sm transition-all"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-brand-dark text-sm font-bold truncate">{{ project.name }}</p>
              <span class="px-2 py-0.5 rounded-full text-xs font-semibold shrink-0" :class="getProjectStatusColor(project.status)">
                {{ project.status }}
              </span>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Add Evaluation Modal -->
    <Teleport to="body">
      <div
        v-if="showEvaluationModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click.self="closeEvaluationModal"
      >
        <div class="bg-white rounded-[14px] border border-[#DCDEDD] w-full max-w-md">
          <div class="p-5 border-b border-[#DCDEDD] flex items-center justify-between">
            <h3 class="text-brand-dark text-lg font-bold">Tambah Evaluasi Vendor</h3>
            <button @click="closeEvaluationModal" class="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
              <X class="w-4 h-4" />
            </button>
          </div>

          <form @submit.prevent="submitEvaluation" class="p-5 space-y-4">
            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1.5">Rating</label>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  @click="evaluationForm.rating = n"
                  class="p-1"
                >
                  <Star
                    class="w-7 h-7 transition-colors"
                    :class="n <= evaluationForm.rating ? 'text-amber-400' : 'text-gray-200'"
                    :fill="n <= evaluationForm.rating ? 'currentColor' : 'none'"
                  />
                </button>
                <span class="text-brand-dark text-sm font-semibold ml-2">{{ evaluationForm.rating }}/5</span>
              </div>
            </div>

            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1.5">Tanggal Evaluasi</label>
              <input
                v-model="evaluationForm.evaluated_at"
                type="date"
                :max="new Date().toISOString().split('T')[0]"
                class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>

            <div>
              <label class="block text-brand-dark text-sm font-semibold mb-1.5">Catatan (Opsional)</label>
              <textarea
                v-model="evaluationForm.notes"
                rows="3"
                placeholder="Kualitas kerja, ketepatan waktu, dll."
                class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 resize-none"
              ></textarea>
            </div>

            <div class="flex gap-2.5 pt-1">
              <button
                type="button"
                @click="closeEvaluationModal"
                class="flex-1 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-4 py-2.5 text-brand-dark font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="submittingEvaluation"
                class="flex-1 btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-4 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span class="text-brand-white text-sm font-semibold">
                  {{ submittingEvaluation ? "Saving..." : "Save Evaluation" }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
