<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { storeToRefs } from "pinia";
import { Mail, Settings, Plus, Trash2, Info, Tag, FileText } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useEmployeeStore } from "@/stores/employee";
import { can } from "@/helpers/permissionHelper";

const store = useLetterStore();
const { letterCodes, divisionCodes } = storeToRefs(store);
const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const router = useRouter();

// Reference templates for structured letter types, so the body & required
// sections don't have to be built from scratch every time. Deliberately
// limited to the letter types actually used often -- the rest of the
// (much longer) Kode Surat list still works fine, it just starts from a
// blank body instead of a pre-filled one.
const TEMPLATES = {
  SPK: {
    body:
      "Dengan hormat,\n\nBersama ini kami memberikan perintah kerja kepada [nama/pihak terkait] untuk melaksanakan pekerjaan sebagaimana rincian pada tabel di bawah ini.\n\nPekerjaan tersebut harus diselesaikan sesuai dengan ketentuan dan jangka waktu yang telah disepakati.\n\nDemikian surat perintah kerja ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.",
    useItems: true,
    useSecondParty: true,
    itemsPriced: true,
  },
  BAST: {
    body:
      "Pada hari ini, [hari], tanggal [tanggal] bulan [bulan] tahun [tahun], yang bertanda tangan di bawah ini menyatakan bahwa PIHAK PERTAMA telah menyerahkan dan PIHAK KEDUA telah menerima barang/pekerjaan sebagaimana rincian pada tabel di bawah ini dalam kondisi baik dan lengkap.\n\nDemikian Berita Acara Serah Terima ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.",
    useItems: true,
    useSecondParty: true,
    itemsPriced: false,
  },
  SK: {
    body:
      "Menimbang:\na. bahwa [dasar pertimbangan];\nb. bahwa berdasarkan pertimbangan tersebut perlu ditetapkan Surat Keputusan.\n\nMengingat:\n1. [dasar hukum/acuan];\n\nMEMUTUSKAN\n\nMenetapkan:\nPERTAMA\t: [isi keputusan];\nKEDUA\t: Keputusan ini berlaku sejak tanggal ditetapkan dengan ketentuan apabila di kemudian hari terdapat kekeliruan akan diadakan perbaikan sebagaimana mestinya.\n\nDitetapkan di [kota], pada tanggal [tanggal].",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  ST: {
    body:
      "Dengan hormat,\n\nSehubungan dengan [alasan penugasan], dengan ini menugaskan:\n\nNama\t: [nama]\nJabatan\t: [jabatan]\n\nUntuk melaksanakan [uraian tugas] pada [tanggal/lokasi].\n\nDemikian surat tugas ini dibuat untuk dilaksanakan dengan sebaik-baiknya dan penuh tanggung jawab.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
    requiresEmployee: true,
  },
  SP: {
    body:
      "Yang bertanda tangan di bawah ini menyatakan bahwa:\n\nNama\t: [nama]\nJabatan\t: [jabatan]\n\ndengan ini menyatakan [isi pernyataan] dengan sebenar-benarnya dan penuh rasa tanggung jawab.\n\nDemikian surat pernyataan ini dibuat untuk dapat dipergunakan sebagaimana mestinya.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  SW: {
    body:
      "Dengan hormat,\n\nSehubungan dengan kebutuhan Bapak/Ibu, dengan ini kami PT. Jendela Cakra Digital mengajukan penawaran sebagaimana rincian pada tabel di bawah ini.\n\nBesar harapan kami penawaran ini dapat menjadi pertimbangan Bapak/Ibu. Kami siap melakukan presentasi maupun diskusi lebih lanjut apabila diperlukan.\n\nDemikian penawaran ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.",
    useItems: true,
    useSecondParty: false,
    itemsPriced: true,
  },
  SPH: {
    body:
      "Dengan hormat,\n\nMenindaklanjuti permintaan penawaran dari Bapak/Ibu, dengan ini kami sampaikan penawaran harga sebagaimana rincian pada tabel di bawah ini.\n\nHarga yang tercantum berlaku selama [__] hari sejak tanggal surat ini diterbitkan. Kami siap menyesuaikan penawaran apabila terdapat perubahan spesifikasi kebutuhan.\n\nDemikian penawaran harga ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.",
    useItems: true,
    useSecondParty: false,
    itemsPriced: true,
  },
  SU: {
    body:
      "Dengan hormat,\n\nSehubungan dengan [maksud acara], dengan ini kami mengundang Bapak/Ibu untuk hadir pada:\n\nHari/Tanggal\t: [hari, tanggal]\nWaktu\t: [waktu]\nTempat\t: [lokasi/tautan]\nAgenda\t: [agenda]\n\nMengingat pentingnya acara ini, kami mohon kehadiran Bapak/Ibu tepat pada waktunya.\n\nDemikian undangan ini kami sampaikan, atas perhatian dan kehadirannya kami ucapkan terima kasih.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  MOU: {
    body:
      'Memorandum of Understanding ini dibuat dan ditandatangani oleh dan antara PT. Jendela Cakra Digital ("Pihak Pertama") dan [Nama Pihak Kedua] ("Pihak Kedua"), yang secara bersama-sama disebut "Para Pihak".\n\nPasal 1 - Ruang Lingkup\nPara Pihak sepakat untuk menjalin kerjasama dalam hal [ruang lingkup kerjasama].\n\nPasal 2 - Hak dan Kewajiban\nMasing-masing pihak memiliki hak dan kewajiban sebagaimana diatur dalam memorandum ini.\n\nPasal 3 - Jangka Waktu\nMemorandum ini berlaku selama [__] sejak tanggal ditandatangani dan dapat diperpanjang berdasarkan kesepakatan Para Pihak.\n\nPasal 4 - Penyelesaian Perselisihan\nApabila terjadi perselisihan, Para Pihak sepakat menyelesaikannya secara musyawarah untuk mufakat.\n\nPasal 5 - Penutup\nDemikian memorandum ini dibuat dengan penuh kesadaran oleh Para Pihak tanpa paksaan dari pihak manapun.',
    useItems: false,
    useSecondParty: true,
    itemsPriced: false,
  },
  MOM: {
    body:
      "Hari/Tanggal\t: [hari, tanggal]\nWaktu\t: [waktu]\nTempat\t: [lokasi/tautan]\nPeserta\t: [daftar peserta]\n\nRingkasan Pembahasan:\n1. [poin pembahasan];\n\nKeputusan/Tindak Lanjut:\n1. [action item] - PIC: [nama] - Tenggat: [tanggal];\n\nDemikian catatan rapat ini dibuat sebagai dokumentasi dan acuan tindak lanjut.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
};

const form = ref({
  letter_code_id: "",
  division_code_id: "",
  type: "I",
  date: new Date().toISOString().slice(0, 10),
  subject: "",
  recipient: "",
  employee_id: "",
  body: "",
  signatory_name: "",
  signatory_title: "",
  second_party_name: "",
  second_party_signatory_name: "",
  second_party_signatory_title: "",
});

const useItems = ref(false);
const useSecondParty = ref(false);
const items = ref([{ description: "", specification: "", qty: "", price: 0 }]);

const submitting = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  await Promise.all([
    store.fetchLetterCodes(),
    store.fetchDivisionCodes(),
    employeeStore.fetchEmployees({ limit: 200 }),
  ]);
});

const selectedCode = computed(() => {
  const code = letterCodes.value.find((c) => c.id === Number(form.value.letter_code_id));
  return code?.code ?? null;
});

const requiresEmployee = computed(() => !!TEMPLATES[selectedCode.value]?.requiresEmployee);

const applyTemplate = () => {
  const template = TEMPLATES[selectedCode.value];
  if (!template) return;

  form.value.body = template.body;
  useItems.value = template.useItems;
  useSecondParty.value = template.useSecondParty;
};

const addItem = () => items.value.push({ description: "", specification: "", qty: "", price: 0 });
const removeItem = (i) => items.value.splice(i, 1);

const handleSubmit = async () => {
  errorMessage.value = "";
  submitting.value = true;
  try {
    const payload = { ...form.value, employee_id: form.value.employee_id || null };
    if (useItems.value) {
      payload.items = items.value.filter((i) => i.description);
    }
    if (!useSecondParty.value) {
      payload.second_party_name = null;
      payload.second_party_signatory_name = null;
      payload.second_party_signatory_title = null;
    }
    await store.createLetter(payload);
    router.push({ name: "admin.letters.dashboard" });
  } catch (error) {
    const data = error?.response?.data;
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : "Gagal membuat Surat.");
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div>
    <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5 mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 bg-blue-50 rounded-[12px] flex items-center justify-center">
          <Mail class="w-5 h-5 text-[#0C51D9]" />
        </div>
        <div>
          <h3 class="text-brand-dark text-lg font-bold">Buat Surat</h3>
          <p class="text-brand-light text-sm">Nomor surat akan dibuat otomatis saat disimpan</p>
        </div>
      </div>
      <router-link
        v-if="can('letter-menu')"
        :to="{ name: 'admin.settings.document-codes' }"
        class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1 hover:underline shrink-0"
      >
        <Settings class="w-4 h-4" /> Kelola Kode Surat
      </router-link>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
            <Tag class="w-4 h-4 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Klasifikasi Surat</h4>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kode Surat</label>
            <select v-model="form.letter_code_id" @change="applyTemplate" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="" disabled>Pilih kode surat</option>
              <option v-for="code in letterCodes" :key="code.id" :value="code.id">{{ code.code }} - {{ code.name }}</option>
            </select>
            <p v-if="TEMPLATES[selectedCode]" class="text-xs text-[#0C51D9] mt-1 flex items-center gap-1">
              <Info class="w-3 h-3" /> Template referensi otomatis diisi ke Isi Surat, silakan sesuaikan.
            </p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kode Divisi</label>
            <select v-model="form.division_code_id" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="" disabled>Pilih kode divisi</option>
              <option v-for="code in divisionCodes" :key="code.id" :value="code.id">{{ code.code }} - {{ code.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jenis</label>
            <select v-model="form.type" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="I">Internal (I)</option>
              <option value="E">Eksternal (E)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Tanggal</label>
            <input v-model="form.date" type="date" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
            <FileText class="w-4 h-4 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Isi Surat</h4>
        </div>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Perihal</label>
            <input v-model="form.subject" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Kepada (opsional)</label>
            <textarea v-model="form.recipient" rows="2" placeholder="e.g. Seluruh Karyawan&#10;PT. Jendela Cakra Digital" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">
              Karyawan Terkait <span v-if="!requiresEmployee">(opsional)</span>
            </label>
            <select v-model="form.employee_id" :required="requiresEmployee" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="">Tidak ditujukan ke karyawan tertentu</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.user?.name }} ({{ emp.code }})</option>
            </select>
            <p v-if="requiresEmployee" class="text-xs text-orange-600 mt-1">
              Wajib diisi untuk surat peringatan agar tercatat dalam riwayat karyawan.
            </p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Isi Surat</label>
            <textarea v-model="form.body" rows="10" required placeholder="Dengan hormat,&#10;&#10;..." class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none font-mono"></textarea>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Penandatangan (Pihak Pertama)</label>
              <input v-model="form.signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Jabatan</label>
              <input v-model="form.signatory_title" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useItems" class="w-4 h-4" />
          <span class="text-brand-dark font-bold">Tambahkan Tabel Item</span>
        </label>
        <p class="text-xs text-gray-400 mt-1 mb-4">
          Untuk BAST (barang yang diserahterimakan) atau Surat Penawaran (item/jasa yang ditawarkan). Kosongkan harga jika tidak relevan (misal BAST).
        </p>

        <div v-if="useItems">
          <div v-for="(item, i) in items" :key="i" class="border border-[#DCDEDD] rounded-xl p-4 mb-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input v-model="item.description" type="text" placeholder="Deskripsi" class="md:col-span-2 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <input v-model="item.qty" type="text" placeholder="Qty" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <input v-model.number="item.price" type="number" min="0" placeholder="Harga (Rp, opsional)" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <textarea v-model="item.specification" rows="2" placeholder="Keterangan / spesifikasi" class="md:col-span-4 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm resize-none"></textarea>
            </div>
            <button v-if="items.length > 1" type="button" @click="removeItem(i)" class="mt-2 text-red-500 text-xs font-semibold flex items-center gap-1">
              <Trash2 class="w-3.5 h-3.5" /> Hapus item
            </button>
          </div>
          <button type="button" @click="addItem" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Tambah Item
          </button>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useSecondParty" class="w-4 h-4" />
          <span class="text-brand-dark font-bold">Tanda Tangan Dua Pihak (Pihak Kedua)</span>
        </label>
        <p class="text-xs text-gray-400 mt-1 mb-4">
          Untuk BAST atau NDA yang ditandatangani oleh kedua belah pihak. Jika tidak dicentang, surat hanya memakai tanda tangan perusahaan.
        </p>

        <div v-if="useSecondParty" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Perusahaan/Pihak Kedua</label>
            <input v-model="form.second_party_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Nama Penandatangan</label>
            <input v-model="form.second_party_signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Jabatan</label>
            <input v-model="form.second_party_signatory_title" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
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
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Menyimpan..." : "Simpan Surat" }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.letters.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Batal
        </router-link>
      </div>
    </form>
  </div>
</template>
