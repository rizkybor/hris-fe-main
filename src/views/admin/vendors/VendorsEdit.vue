<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Briefcase, Save, ArrowLeft, User, Phone, Mail, MapPin, Tag, Layers, FileText, Building2 } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import Skeleton from "@/components/common/skeleton/Skeleton.vue";
import { useVendorsStore } from "@/stores/vendor";
import { errorMessage } from "@/helpers/errorHelper";

const route = useRoute();
const router = useRouter();
const vendorsStore = useVendorsStore();

const initialLoading = ref(true);
const submitting = ref(false);
const loadError = ref("");
const error = ref("");
const success = ref("");

const form = ref({
  name: "",
  type: "",
  field: "",
  pic_name: "",
  pic_phone: "",
  email: "",
  address: "",
  notes: "",
});

const loadVendor = async () => {
  try {
    const vendor = await vendorsStore.fetchVendorById(route.params.id);
    if (!vendor) {
      loadError.value = "Vendor not found.";
      return;
    }
    form.value = {
      name: vendor.name || "",
      type: vendor.type || "",
      field: vendor.field || "",
      pic_name: vendor.pic_name || "",
      pic_phone: vendor.pic_phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      notes: vendor.notes || "",
    };
  } catch (err) {
    loadError.value = "Failed to load vendor data.";
  } finally {
    initialLoading.value = false;
  }
};

onMounted(loadVendor);

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.name || !form.value.pic_name || !form.value.pic_phone) {
    error.value = "Vendor Name, PIC Name, and PIC Phone are required.";
    return;
  }

  submitting.value = true;
  try {
    await vendorsStore.updateVendor(route.params.id, form.value);
    success.value = "Vendor updated successfully.";

    setTimeout(() => {
      router.push({ name: "admin.vendors.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, "Failed to update vendor.");
  } finally {
    submitting.value = false;
  }
};
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

        <div>
          <h1 class="text-brand-dark text-xl font-bold">Edit Vendor</h1>
          <p class="text-brand-light text-sm">Update vendor information</p>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <Transition name="fade">
        <Alert
          v-if="error"
          type="danger"
          :title="error"
          message=""
          :show="!!error"
          @close="error = ''"
        />
      </Transition>
      <Transition name="fade">
        <Alert v-if="success" type="success" :title="success" message="" :show="!!success" />
      </Transition>
    </div>

    <!-- Loading -->
    <div v-if="initialLoading" class="bg-white border border-[#DCDEDD] rounded-[14px] p-6 space-y-4">
      <Skeleton width="200px" height="20px" />
      <Skeleton height="48px" rounded="16px" />
      <Skeleton height="48px" rounded="16px" />
      <Skeleton height="90px" rounded="16px" />
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="text-center py-20 text-red-600">{{ loadError }}</div>

    <!-- Form -->
    <form v-else @submit.prevent="submit" class="space-y-6">
      <!-- Company Information -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Building2 class="w-4.5 h-4.5 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Informasi Perusahaan</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div class="md:col-span-2">
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Vendor Name *</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Briefcase class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.name"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Vendor Type</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Tag class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.type"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Vendor Field</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Layers class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.field"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- PIC / Contact -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
            <User class="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Kontak PIC (Person in Charge)</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">PIC Name *</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.pic_name"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">PIC Phone *</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.pic_phone"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Email</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.email"
                type="email"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Additional Details -->
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-6">
        <div class="flex items-center gap-2 mb-5">
          <div class="w-9 h-9 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
            <MapPin class="w-4.5 h-4.5 text-orange-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Detail Tambahan</h4>
        </div>

        <div class="grid grid-cols-1 gap-5">
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MapPin class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.address"
                type="text"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1.5">Notes</label>
            <div class="relative">
              <div class="absolute top-3 left-4 pointer-events-none">
                <FileText class="w-5 h-5 text-gray-400" />
              </div>
              <textarea
                v-model="form.notes"
                rows="4"
                class="w-full pl-12 pr-4 py-3 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 resize-none"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          @click="router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-6 py-3 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full sm:w-auto btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] blue-gradient blue-btn-shadow px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
        >
          <Save class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ submitting ? "Saving..." : "Save Changes" }}
          </span>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
