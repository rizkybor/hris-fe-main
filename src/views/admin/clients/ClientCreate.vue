<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Briefcase, Save, User, Phone, Mail, MapPin, Tag, Layers, FileText, Building2, ScrollText } from "lucide-vue-next";
import Alert from "@/components/common/Alert.vue";
import { useClientStore } from "@/stores/client";
import { errorMessage } from "@/helpers/errorHelper";

const router = useRouter();
const clientsStore = useClientStore();

const loading = ref(false);
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
  npwp: "",
  siup_number: "",
  nib_number: "",
  notes: "",
});

const submit = async () => {
  error.value = "";
  success.value = "";

  if (!form.value.name || !form.value.pic_name || !form.value.pic_phone) {
    error.value = "Client Name, PIC Name, and PIC Phone are required.";
    return;
  }

  loading.value = true;
  try {
    await clientsStore.createClient(form.value);
    success.value = "Client saved successfully.";

    setTimeout(() => {
      router.push({ name: "admin.clients.dashboard" });
    }, 1200);
  } catch (err) {
    error.value = errorMessage(err, "Failed to save client.");
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-4 mb-5">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Briefcase class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-brand-dark text-base font-bold">Add Client</h1>
          <p class="text-brand-light text-sm">Register a new client or partner company</p>
        </div>
      </div>
    </div>

    <div class="mb-5">
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

    <form @submit.prevent="submit" class="space-y-5">
      <!-- Company Information -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center shrink-0">
            <Building2 class="w-4.5 h-4.5 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Informasi Perusahaan</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-brand-dark text-sm font-semibold mb-1">Client Name <span class="text-red-500">*</span></label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Briefcase class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. PT. Sumber Teknologi"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Client Type</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Tag class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.type"
                type="text"
                placeholder="e.g. Technology, Logistics"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Client Field</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Layers class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.field"
                type="text"
                placeholder="e.g. Software Development"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- PIC / Contact -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-emerald-50 rounded-[10px] flex items-center justify-center shrink-0">
            <User class="w-4.5 h-4.5 text-emerald-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Kontak PIC (Person in Charge)</h4>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">PIC Name <span class="text-red-500">*</span></label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <User class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.pic_name"
                type="text"
                placeholder="Contact person name"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">PIC Phone <span class="text-red-500">*</span></label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Phone class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.pic_phone"
                type="text"
                placeholder="+62..."
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-brand-dark text-sm font-semibold mb-1">Email</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.email"
                type="email"
                placeholder="client@company.com"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Legalitas (optional -- client may be an individual, not a company) -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-1">
          <div class="w-9 h-9 bg-purple-50 rounded-[10px] flex items-center justify-center shrink-0">
            <ScrollText class="w-4.5 h-4.5 text-purple-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Legalitas (Opsional)</h4>
        </div>
        <p class="text-brand-light text-xs mb-4 ml-11">
          Kosongkan jika client merupakan perorangan, bukan badan usaha terdaftar.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">NPWP</label>
            <input
              v-model="form.npwp"
              type="text"
              placeholder="00.000.000.0-000.000"
              class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
            />
          </div>
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Nomor SIUP</label>
            <input
              v-model="form.siup_number"
              type="text"
              placeholder="e.g. SIUP-123/2020"
              class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
            />
          </div>
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Nomor NIB</label>
            <input
              v-model="form.nib_number"
              type="text"
              placeholder="e.g. 1234567890123"
              class="w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
            />
          </div>
        </div>
      </div>

      <!-- Additional Details -->
      <div class="bg-slate-50 border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-1.5 mb-4">
          <div class="w-9 h-9 bg-orange-50 rounded-[10px] flex items-center justify-center shrink-0">
            <MapPin class="w-4.5 h-4.5 text-orange-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Detail Tambahan</h4>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Address</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MapPin class="w-5 h-5 text-gray-400" />
              </div>
              <input
                v-model="form.address"
                type="text"
                placeholder="Client address"
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 font-semibold"
              />
            </div>
          </div>

          <div>
            <label class="block text-brand-dark text-sm font-semibold mb-1">Notes</label>
            <div class="relative">
              <div class="absolute top-3 left-4 pointer-events-none">
                <FileText class="w-5 h-5 text-gray-400" />
              </div>
              <textarea
                v-model="form.notes"
                rows="4"
                placeholder="Additional notes about this client..."
                class="w-full pl-12 pr-3.5 py-2.5 border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 focus:border-[#0C51D9] focus:border-2 transition-all duration-300 resize-none"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          @click="$router.back()"
          class="w-full sm:w-auto border border-[#DCDEDD] rounded-[12px] hover:border-[#0C51D9] hover:border-2 hover:bg-gray-50 transition-all duration-300 px-5 py-2.5 text-brand-dark font-semibold"
        >
          Cancel
        </button>

        <button
          type="submit"
          :disabled="loading"
          class="w-full sm:w-auto btn-primary rounded-[12px] border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-5 py-2.5 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Save class="w-4 h-4 text-white" />
          <span class="text-brand-white text-sm font-semibold">
            {{ loading ? "Saving..." : "Save Client" }}
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
