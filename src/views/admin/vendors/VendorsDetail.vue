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
} from "lucide-vue-next";
import { useVendorsStore } from "@/stores/vendor";
import Spinner from "@/components/common/skeleton/Spinner.vue";

const route = useRoute();
const router = useRouter();
const vendorsStore = useVendorsStore();

const vendor = ref(null);
const loading = ref(true);
const error = ref("");

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "-";

onMounted(async () => {
  try {
    vendor.value = await vendorsStore.fetchVendorById(route.params.id);
    if (!vendor.value) {
      error.value = "Vendor tidak ditemukan.";
    }
  } catch (err) {
    error.value = "Gagal memuat detail vendor.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="router.back()"
          class="w-10 h-10 rounded-[12px] border border-[#DCDEDD] flex items-center justify-center hover:border-[#0C51D9] hover:border-2 transition-all"
          aria-label="Back"
        >
          <ArrowLeft class="w-5 h-5 text-gray-600" />
        </button>

        <div class="w-12 h-12 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>

        <div class="flex-1">
          <h1 class="text-brand-dark text-xl font-bold">Vendor Detail</h1>
          <p class="text-brand-light text-sm">Informasi vendor (read-only)</p>
        </div>

        <router-link
          :to="{ name: 'admin.vendors.edit', params: { id: route.params.id } }"
          class="border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all px-4 py-2 flex items-center gap-2"
        >
          <Pencil class="w-4 h-4 text-gray-600" />
          <span class="text-brand-dark font-semibold text-sm">Edit</span>
        </router-link>
      </div>
    </div>

    <!-- Loading -->
    <Spinner v-if="loading" label="Loading vendor detail..." />

    <!-- Error -->
    <div v-else-if="error" class="text-center py-20 text-red-600">{{ error }}</div>

    <!-- Content -->
    <div v-else-if="vendor" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-6">
      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">Vendor Name</label>
        <div class="flex items-center gap-3">
          <Briefcase class="w-5 h-5 text-gray-400" />
          <p class="text-brand-dark font-semibold">{{ vendor.name || "-" }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-brand-dark text-base font-semibold mb-1">Vendor Type</label>
          <div class="flex items-center gap-3">
            <Tag class="w-5 h-5 text-gray-400" />
            <p class="text-brand-dark font-medium">{{ vendor.type || "-" }}</p>
          </div>
        </div>
        <div>
          <label class="block text-brand-dark text-base font-semibold mb-1">Vendor Field</label>
          <div class="flex items-center gap-3">
            <Layers class="w-5 h-5 text-gray-400" />
            <p class="text-brand-dark font-medium">{{ vendor.field || "-" }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-brand-dark text-base font-semibold mb-1">PIC Name</label>
          <div class="flex items-center gap-3">
            <User class="w-5 h-5 text-gray-400" />
            <p class="text-brand-dark font-medium">{{ vendor.pic_name || "-" }}</p>
          </div>
        </div>
        <div>
          <label class="block text-brand-dark text-base font-semibold mb-1">PIC Phone</label>
          <div class="flex items-center gap-3">
            <Phone class="w-5 h-5 text-gray-400" />
            <p class="text-brand-dark font-medium">{{ vendor.pic_phone || "-" }}</p>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">Email</label>
        <div class="flex items-center gap-3">
          <Mail class="w-5 h-5 text-gray-400" />
          <p class="text-brand-dark font-medium">{{ vendor.email || "-" }}</p>
        </div>
      </div>

      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">Address</label>
        <div class="flex items-start gap-3">
          <MapPin class="w-5 h-5 text-gray-400 mt-0.5" />
          <p class="text-brand-dark font-medium">{{ vendor.address || "-" }}</p>
        </div>
      </div>

      <div>
        <label class="block text-brand-dark text-base font-semibold mb-1">Notes</label>
        <div class="flex items-start gap-3 px-4 py-3 border border-[#DCDEDD] rounded-[12px] bg-gray-50">
          <FileText class="w-5 h-5 text-gray-400 mt-0.5" />
          <p class="text-brand-dark whitespace-pre-line">{{ vendor.notes || "-" }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#DCDEDD]">
        <div class="flex items-center gap-3">
          <Clock class="w-5 h-5 text-gray-400" />
          <div>
            <p class="text-xs text-gray-500">Created At</p>
            <p class="text-sm font-semibold">{{ formatDate(vendor.created_at) }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Clock class="w-5 h-5 text-gray-400" />
          <div>
            <p class="text-xs text-gray-500">Last Updated</p>
            <p class="text-sm font-semibold">{{ formatDate(vendor.updated_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
