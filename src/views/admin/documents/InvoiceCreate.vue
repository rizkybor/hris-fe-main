<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Plus, Trash2, Receipt } from "lucide-vue-next";
import { useInvoiceStore } from "@/stores/invoice";

const store = useInvoiceStore();
const router = useRouter();

const form = ref({
  client_code: "",
  client_name: "",
  client_pic: "",
  client_email: "",
  client_phone: "",
  date: new Date().toISOString().slice(0, 10),
  items: [{ description: "", quantity: "", rate: "", total: 0 }],
  ppn_percentage: 0,
  admin_fee: 0,
  bank_name: "",
  bank_account: "",
  terms: "Pembayaran dilakukan maksimal 14 hari sejak invoice diterbitkan.\nLayanan dapat ditunda apabila pembayaran belum diterima.\nPembayaran yang sudah dilakukan tidak dapat dikembalikan.",
});

const submitting = ref(false);
const errorMessage = ref("");

const addItem = () => form.value.items.push({ description: "", quantity: "", rate: "", total: 0 });
const removeItem = (i) => form.value.items.splice(i, 1);

const subtotal = computed(() => form.value.items.reduce((sum, item) => sum + (Number(item.total) || 0), 0));
const ppnAmount = computed(() => Math.round(subtotal.value * ((Number(form.value.ppn_percentage) || 0) / 100)));
const total = computed(() => subtotal.value + ppnAmount.value + (Number(form.value.admin_fee) || 0));

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    await store.createInvoice(form.value);
    router.push({ name: "admin.invoices.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal membuat Invoice.");
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
          <h3 class="text-brand-dark text-lg font-bold">Buat Invoice</h3>
          <p class="text-brand-light text-sm">Nomor invoice akan dibuat otomatis saat disimpan</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Informasi Klien</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kode Klien</label>
            <input v-model="form.client_code" type="text" required placeholder="e.g. ZACO" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm uppercase" />
            <p class="text-xs text-gray-400 mt-1">Dipakai dalam nomor invoice, cth: INV/JCD-ZACO/...</p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Tanggal</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Klien</label>
            <input v-model="form.client_name" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">PIC</label>
            <input v-model="form.client_pic" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Email</label>
            <input v-model="form.client_email" type="email" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Telepon</label>
            <input v-model="form.client_phone" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-brand-dark font-bold">Item Tagihan</h4>
          <button type="button" @click="addItem" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Tambah Item
          </button>
        </div>
        <div v-for="(item, i) in form.items" :key="i" class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3 items-start">
          <input v-model="item.description" type="text" placeholder="Deskripsi" required class="md:col-span-2 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
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
        <h4 class="text-brand-dark font-bold mb-4">Pembayaran & Pajak</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">PPN (%)</label>
            <input v-model.number="form.ppn_percentage" type="number" min="0" max="100" step="0.01" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Admin Fee (Rp)</label>
            <input v-model.number="form.admin_fee" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Bank</label>
            <input v-model="form.bank_name" type="text" placeholder="e.g. BCA - Jendela Cakra Digital" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">No. Rekening</label>
            <input v-model="form.bank_account" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Syarat & Ketentuan</label>
            <textarea v-model="form.terms" rows="3" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
        </div>

        <div class="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
          <div class="flex justify-between"><span>Subtotal</span><span>Rp {{ subtotal.toLocaleString("id-ID") }}</span></div>
          <div class="flex justify-between"><span>PPN ({{ form.ppn_percentage || 0 }}%)</span><span>Rp {{ ppnAmount.toLocaleString("id-ID") }}</span></div>
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
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Menyimpan..." : "Simpan Invoice" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.invoices.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Batal
        </router-link>
      </div>
    </form>
  </div>
</template>
