<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { Plus, Trash2, Receipt, User, Package, Wallet, Briefcase } from "lucide-vue-next";
import { useInvoiceStore } from "@/stores/invoice";
import { useBankAccountStore } from "@/stores/bankAccount";
import { useProjectStore } from "@/stores/project";

const store = useInvoiceStore();
const router = useRouter();
const bankAccountStore = useBankAccountStore();
const { bankAccounts } = storeToRefs(bankAccountStore);
const projectStore = useProjectStore();
const { projects } = storeToRefs(projectStore);
onMounted(() => {
  bankAccountStore.fetchBankAccounts();
  projectStore.fetchProjects();
});

const form = ref({
  project_id: "",
  faktur_pajak_number: "",
  numbering_mode: "automatic",
  client_code: "",
  invoice_number: "",
  client_name: "",
  client_pic: "",
  client_email: "",
  client_phone: "",
  client_npwp: "",
  date: new Date().toISOString().slice(0, 10),
  items: [{ description: "", quantity: "", rate: "", total: 0 }],
  ppn_percentage: 0,
  admin_fee: 0,
  bank_name: "",
  bank_account: "",
  terms: "Payment is due within 14 days of the invoice date.\nServices may be suspended if payment is not received.\nPayments already made are non-refundable.",
});

const submitting = ref(false);
const errorMessage = ref("");

const addItem = () => form.value.items.push({ description: "", quantity: "", rate: "", total: 0 });
const removeItem = (i) => form.value.items.splice(i, 1);

const handleBankNameChange = () => {
  const selected = bankAccounts.value.find((a) => a.bank_name === form.value.bank_name);
  form.value.bank_account = selected?.account_number || "";
};

const subtotal = computed(() => form.value.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
const ppnAmount = computed(() => Math.round(subtotal.value * ((Number(form.value.ppn_percentage) || 0) / 100)));
const total = computed(() => subtotal.value + ppnAmount.value + (Number(form.value.admin_fee) || 0));

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    const payload = { ...form.value };
    if (payload.numbering_mode === "manual") {
      delete payload.client_code;
    } else {
      delete payload.invoice_number;
    }
    await store.createInvoice(payload);
    router.push({ name: "admin.invoices.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Failed to create Invoice.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Receipt class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Create Invoice</h3>
          <p class="text-brand-light text-sm">
            {{ form.numbering_mode === "manual" ? "Invoice number will be used exactly as entered" : "Invoice number will be generated automatically when saved" }}
          </p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-orange-50 rounded-[9px] flex items-center justify-center shrink-0">
            <Briefcase class="w-4 h-4 text-orange-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Project Link (Optional)</h4>
        </div>
        <div>
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Project</label>
          <select v-model="form.project_id" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
            <option value="">No project</option>
            <option v-for="project in projects" :key="project.id" :value="project.id">{{ project.name }}</option>
          </select>
          <p class="text-xs text-gray-400 mt-1">Link this invoice to a project so it shows up on that project's page.</p>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
            <User class="w-4 h-4 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Client Information</h4>
        </div>
        <div class="mb-4">
          <label class="text-sm font-semibold text-brand-dark mb-1 block">Invoice Numbering</label>
          <div class="flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm text-brand-dark">
              <input type="radio" value="automatic" v-model="form.numbering_mode" />
              Automatic
            </label>
            <label class="flex items-center gap-2 text-sm text-brand-dark">
              <input type="radio" value="manual" v-model="form.numbering_mode" />
              Manual
            </label>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-if="form.numbering_mode === 'automatic'">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Client Code</label>
            <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
            <p class="text-xs text-gray-400 mt-1">A short code only (no "/") — combined with the date and sequence, e.g. INV/JCD-ZACO/1805/26.001</p>
          </div>
          <div v-else>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Invoice Number</label>
            <input v-model="form.invoice_number" type="text" required placeholder="e.g. INV/JCD-FASTTRACK/1805/26.001" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            <p class="text-xs text-gray-400 mt-1">Used exactly as entered — must be unique.</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Date</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Client Name</label>
            <input v-model="form.client_name" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">PIC</label>
            <input v-model="form.client_pic" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Email (optional)</label>
            <input v-model="form.client_email" type="email" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Phone</label>
            <input v-model="form.client_phone" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Client NPWP (optional)</label>
            <input v-model="form.client_npwp" type="text" placeholder="00.000.000.0-000.000" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Faktur Pajak Number (optional)</label>
            <input v-model="form.faktur_pajak_number" type="text" placeholder="010.000-26.00000001" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 bg-indigo-50 rounded-[9px] flex items-center justify-center shrink-0">
              <Package class="w-4 h-4 text-indigo-600" />
            </div>
            <h4 class="text-brand-dark font-bold">Billing Items</h4>
          </div>
          <button type="button" @click="addItem" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Add Item
          </button>
        </div>
        <div v-for="(item, i) in form.items" :key="i" class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 items-start">
          <textarea
            v-model="item.description"
            placeholder="Description"
            required
            rows="1"
            class="md:col-span-2 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm resize-y"
          ></textarea>
          <input v-model="item.quantity" type="text" placeholder="Qty (e.g. 1 tahun)" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          <input v-model="item.rate" type="text" placeholder="Rate" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          <div class="flex items-center gap-2">
            <input v-model.number="item.total" type="number" min="0" placeholder="Total (Rp)" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <button v-if="form.items.length > 1" type="button" @click="removeItem(i)" class="text-red-500 shrink-0">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-emerald-50 rounded-[9px] flex items-center justify-center shrink-0">
            <Wallet class="w-4 h-4 text-emerald-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Payment & Tax</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">VAT (%)</label>
            <input v-model.number="form.ppn_percentage" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Admin Fee (Rp)</label>
            <input v-model.number="form.admin_fee" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Bank Name</label>
            <select v-model="form.bank_name" @change="handleBankNameChange" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="" disabled>Select a bank</option>
              <option v-for="account in bankAccounts" :key="account.id" :value="account.bank_name">{{ account.bank_name }}</option>
            </select>
            <p v-if="bankAccounts.length === 0" class="text-xs text-gray-400 mt-1">
              No bank accounts configured yet. Add one in Settings &rarr; Bank Accounts.
            </p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Account Number</label>
            <input v-model="form.bank_account" type="text" readonly class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm bg-gray-50" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Terms & Conditions</label>
            <textarea v-model="form.terms" rows="3" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <div class="flex justify-between"><span>Subtotal</span><span>Rp {{ subtotal.toLocaleString("id-ID") }}</span></div>
          <div class="flex justify-between"><span>VAT ({{ form.ppn_percentage || 0 }}%)</span><span>Rp {{ ppnAmount.toLocaleString("id-ID") }}</span></div>
          <div class="flex justify-between"><span>Admin Fee</span><span>Rp {{ (Number(form.admin_fee) || 0).toLocaleString("id-ID") }}</span></div>
          <div class="flex justify-between font-bold text-brand-dark pt-1 border-t border-gray-200"><span>Total</span><span>Rp {{ total.toLocaleString("id-ID") }}</span></div>
        </div>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : "Save Invoice" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.invoices.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </router-link>
      </div>
    </form>
  </div>
</template>
