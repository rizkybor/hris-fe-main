<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { FileCheck2 } from "lucide-vue-next";
import { usePaymentReceiptStore } from "@/stores/paymentReceipt";
import { useInvoiceStore } from "@/stores/invoice";

const store = usePaymentReceiptStore();
const invoiceStore = useInvoiceStore();
const { invoices } = storeToRefs(invoiceStore);
const router = useRouter();

const form = ref({
  client_code: "",
  date: new Date().toISOString().slice(0, 10),
  received_from: "",
  amount: 0,
  for_payment_of: "",
  invoice_id: "",
  payment_status: "paid",
  recipient_name: "",
});

const submitting = ref(false);
const errorMessage = ref("");

onMounted(() => {
  invoiceStore.fetchInvoices({ row_per_page: 100 });
});

const handleInvoiceSelect = () => {
  const invoice = invoices.value.find((i) => i.id === Number(form.value.invoice_id));
  if (invoice) {
    form.value.client_code = invoice.client_code;
    form.value.amount = Number(invoice.total);
  }
};

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    const payload = { ...form.value, invoice_id: form.value.invoice_id || null };
    await store.createReceipt(payload);
    router.push({ name: "admin.payment-receipts.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal membuat Payment Receipt.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5 mb-6">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <FileCheck2 class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Buat Payment Receipt</h3>
          <p class="text-brand-light text-sm">Nomor receipt akan dibuat otomatis saat disimpan</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[20px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Detail Pembayaran</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Invoice Terkait (opsional)</label>
            <select v-model="form.invoice_id" @change="handleInvoiceSelect" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="">- Tidak terkait invoice -</option>
              <option v-for="invoice in invoices" :key="invoice.id" :value="invoice.id">
                {{ invoice.invoice_number }} - {{ invoice.client_name }}
              </option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kode Klien</label>
            <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Tanggal</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Diterima Dari</label>
            <input v-model="form.received_from" type="text" required placeholder="e.g. Bpk. Zakaria - Zaco Law Firm" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jumlah (Rp)</label>
            <input v-model.number="form.amount" type="number" min="0" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Status Pembayaran</label>
            <select v-model="form.payment_status" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="paid">Lunas (Paid)</option>
              <option value="partial">Sebagian (Partial)</option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Untuk Pembayaran</label>
            <textarea v-model="form.for_payment_of" rows="2" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Penerima (Penandatangan)</label>
            <input v-model="form.recipient_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <p v-if="errorMessage" class="text-red-500 text-sm">{{ errorMessage }}</p>

      <div class="flex items-center gap-3">
        <button
          type="submit"
          :disabled="submitting"
          class="btn-primary rounded-lg border border-[#2151A0] hover:brightness-110 focus:ring-2 focus:ring-[#0C51D9] transition-all duration-300 blue-gradient blue-btn-shadow px-6 py-3 flex items-center gap-2 disabled:opacity-50"
        >
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Menyimpan..." : "Simpan Payment Receipt" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.payment-receipts.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Batal
        </router-link>
      </div>
    </form>
  </div>
</template>
