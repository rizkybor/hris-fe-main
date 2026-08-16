<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Plus, Trash2, ShoppingCart } from "lucide-vue-next";
import { usePurchaseOrderStore } from "@/stores/purchaseOrder";

const store = usePurchaseOrderStore();
const router = useRouter();

const form = ref({
  type: "E",
  date: new Date().toISOString().slice(0, 10),
  title: "",
  client_name: "",
  client_address: "",
  client_phone: "",
  client_wa: "",
  items: [{ description: "", specification: "", qty: "1 Unit", price: 0 }],
  payment_terms: [{ termin: "DP (50%)", amount: 0, description: "" }],
  warranty_months: 12,
  replacement_days: 7,
  buyer_signatory_name: "",
  buyer_signatory_title: "",
  vendor_signatory_name: "",
  vendor_signatory_title: "",
});

const submitting = ref(false);
const errorMessage = ref("");

const addItem = () => form.value.items.push({ description: "", specification: "", qty: "1 Unit", price: 0 });
const removeItem = (i) => form.value.items.splice(i, 1);

const addTerm = () => form.value.payment_terms.push({ termin: "", amount: 0, description: "" });
const removeTerm = (i) => form.value.payment_terms.splice(i, 1);

const totalPreview = () => form.value.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    const order = await store.createOrder(form.value);
    router.push({ name: "admin.purchase-orders.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal membuat Purchase Order.");
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
          <ShoppingCart class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Buat Purchase Order</h3>
          <p class="text-brand-light text-sm">Nomor PO akan dibuat otomatis saat disimpan</p>
        </div>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Informasi Umum</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jenis</label>
            <select v-model="form.type" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="E">Eksternal (E)</option>
              <option value="I">Internal (I)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Tanggal</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Judul / Perihal Order</label>
            <input v-model="form.title" type="text" required placeholder="e.g. Pengadaan Smart Locker" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Vendor / Klien</label>
            <input v-model="form.client_name" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Alamat</label>
            <textarea v-model="form.client_address" rows="2" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Telepon</label>
            <input v-model="form.client_phone" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">WhatsApp</label>
            <input v-model="form.client_wa" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-brand-dark font-bold">Detail Order (Item)</h4>
          <button type="button" @click="addItem" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Tambah Item
          </button>
        </div>
        <div v-for="(item, i) in form.items" :key="i" class="border border-[#DCDEDD] rounded-xl p-4 mb-3">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="md:col-span-2">
              <label class="text-xs text-gray-500 mb-1 block">Deskripsi</label>
              <input v-model="item.description" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Qty</label>
              <input v-model="item.qty" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            </div>
            <div>
              <label class="text-xs text-gray-500 mb-1 block">Harga (Rp)</label>
              <input v-model.number="item.price" type="number" min="0" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            </div>
            <div class="md:col-span-4">
              <label class="text-xs text-gray-500 mb-1 block">Spesifikasi (satu baris per poin)</label>
              <textarea v-model="item.specification" rows="3" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm resize-none"></textarea>
            </div>
          </div>
          <button
            v-if="form.items.length > 1"
            type="button"
            @click="removeItem(i)"
            class="mt-2 text-red-500 text-xs font-semibold flex items-center gap-1"
          >
            <Trash2 class="w-3.5 h-3.5" /> Hapus item
          </button>
        </div>
        <div class="text-right font-bold text-brand-dark">
          Total: Rp {{ totalPreview().toLocaleString("id-ID") }}
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-brand-dark font-bold">Skema Pembayaran (opsional)</h4>
          <button type="button" @click="addTerm" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Tambah Termin
          </button>
        </div>
        <div v-for="(term, i) in form.payment_terms" :key="i" class="border border-[#DCDEDD] rounded-xl p-4 mb-3">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input v-model="term.termin" type="text" placeholder="e.g. DP (50%)" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <input v-model.number="term.amount" type="number" min="0" placeholder="Jumlah (Rp)" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
            <input v-model="term.description" type="text" placeholder="Keterangan" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
          </div>
          <button type="button" @click="removeTerm(i)" class="mt-2 text-red-500 text-xs font-semibold flex items-center gap-1">
            <Trash2 class="w-3.5 h-3.5" /> Hapus termin
          </button>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <h4 class="text-brand-dark font-bold mb-4">Ketentuan & Tanda Tangan</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Garansi (bulan)</label>
            <input v-model.number="form.warranty_months" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Waktu Penggantian (hari kerja)</label>
            <input v-model.number="form.replacement_days" type="number" min="0" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Penandatangan Pembeli (Nama)</label>
            <input v-model="form.buyer_signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jabatan</label>
            <input v-model="form.buyer_signatory_title" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Penandatangan Vendor (Nama)</label>
            <input v-model="form.vendor_signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jabatan</label>
            <input v-model="form.vendor_signatory_title" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
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
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Menyimpan..." : "Simpan Purchase Order" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.purchase-orders.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Batal
        </router-link>
      </div>
    </form>
  </div>
</template>
