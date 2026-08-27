<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { storeToRefs } from "pinia";
import { Mail, Settings, Plus, Trash2, Info, Tag, FileText, CheckCircle2 } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useEmployeeStore } from "@/stores/employee";
import { can } from "@/helpers/permissionHelper";
import RichTextEditor from "@/components/common/RichTextEditor.vue";

const store = useLetterStore();
const { letterCodes, divisionCodes } = storeToRefs(store);
const employeeStore = useEmployeeStore();
const { employees } = storeToRefs(employeeStore);
const router = useRouter();
const route = useRoute();

const editingId = computed(() => route.params.id || null);
const isEditMode = computed(() => !!editingId.value);

// Reference templates for structured letter types, so the body & required
// sections don't have to be built from scratch every time. Deliberately
// limited to the letter types actually used often -- the rest of the
// (much longer) Kode Surat list still works fine, it just starts from a
// blank body instead of a pre-filled one.
const TEMPLATES = {
  SPK: {
    body:
      "Dear [name/party],\n\nWe hereby issue this work order to [name/related party] to carry out the work as detailed in the table below.\n\nThe work must be completed in accordance with the agreed terms and timeline.\n\nThis work order is issued to be carried out with full responsibility.",
    useItems: true,
    useSecondParty: true,
    itemsPriced: true,
  },
  BAST: {
    body:
      "On this day, [day], the [date] of [month] [year], the undersigned hereby declare that the FIRST PARTY has handed over and the SECOND PARTY has received the goods/work as detailed in the table below, in good and complete condition.\n\nThis Handover Report is made in good faith to be used as appropriate.",
    useItems: true,
    useSecondParty: true,
    itemsPriced: false,
  },
  SK: {
    body:
      "Considering:\na. that [basis for consideration];\nb. that based on the above consideration, this Decision Letter needs to be issued.\n\nIn view of:\n1. [legal basis/reference];\n\nHEREBY DECIDES\n\nTo determine:\nFIRST\t: [decision content];\nSECOND\t: This decision takes effect from the date it is issued, with the provision that any error found later will be corrected accordingly.\n\nIssued in [city], on [date].",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  ST: {
    body:
      "Dear [name],\n\nIn connection with [reason for assignment], we hereby assign:\n\nName\t: [name]\nPosition\t: [position]\n\nTo carry out [task description] on [date/location].\n\nThis assignment letter is issued to be carried out to the best of one's ability and with full responsibility.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
    requiresEmployee: true,
  },
  SP: {
    body:
      "The undersigned hereby declares that:\n\nName\t: [name]\nPosition\t: [position]\n\nhereby declares [statement content] truthfully and with full responsibility.\n\nThis statement letter is issued to be used as appropriate.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  SW: {
    body:
      "Dear Sir/Madam,\n\nIn response to your needs, we, PT. Jendela Cakra Digital, hereby submit our offer as detailed in the table below.\n\nWe hope this offer can be taken into consideration. We are ready to present or discuss further as needed.\n\nWe look forward to your response and thank you for your attention and cooperation.",
    useItems: true,
    useSecondParty: false,
    itemsPriced: true,
  },
  SPH: {
    body:
      "Dear Sir/Madam,\n\nFollowing up on your price quotation request, we hereby submit our price offer as detailed in the table below.\n\nThe prices listed are valid for [__] days from the date this letter is issued. We are ready to adjust the offer should there be any changes to the required specifications.\n\nThank you for your attention and cooperation.",
    useItems: true,
    useSecondParty: false,
    itemsPriced: true,
  },
  SU: {
    body:
      "Dear Sir/Madam,\n\nIn connection with [purpose of event], we would like to invite you to attend:\n\nDay/Date\t: [day, date]\nTime\t: [time]\nLocation\t: [location/link]\nAgenda\t: [agenda]\n\nGiven the importance of this event, we hope for your presence on time.\n\nThank you for your attention, and we look forward to your presence.",
    useItems: false,
    useSecondParty: false,
    itemsPriced: false,
  },
  MOU: {
    body:
      'This Memorandum of Understanding is made and signed by and between PT. Jendela Cakra Digital ("First Party") and [Second Party Name] ("Second Party"), collectively referred to as the "Parties".\n\nArticle 1 - Scope\nThe Parties agree to establish a cooperation regarding [scope of cooperation].\n\nArticle 2 - Rights and Obligations\nEach party has rights and obligations as regulated in this memorandum.\n\nArticle 3 - Term\nThis memorandum is valid for [__] from the date of signing and may be extended based on the Parties\' agreement.\n\nArticle 4 - Dispute Resolution\nIn the event of a dispute, the Parties agree to resolve it through deliberation to reach consensus.\n\nArticle 5 - Closing\nThis memorandum is made in good faith by the Parties without coercion from any party.',
    useItems: false,
    useSecondParty: true,
    itemsPriced: false,
  },
  MOM: {
    body:
      "Day/Date\t: [day, date]\nTime\t: [time]\nLocation\t: [location/link]\nAttendees\t: [attendee list]\n\nDiscussion Summary:\n1. [discussion point];\n\nDecisions/Follow-up:\n1. [action item] - PIC: [name] - Deadline: [date];\n\nThese meeting notes are made as documentation and a reference for follow-up.",
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
  template: "primary",
});

const TEMPLATE_OPTIONS = [
  { value: "primary", label: "Primary", preview: "/images/template-letter-primary.png" },
  { value: "secondary", label: "Secondary", preview: "/images/template-letter-secondary.png" },
];

const useItems = ref(false);
const useSecondParty = ref(false);
const items = ref([{ description: "", specification: "", qty: "", price: 0 }]);

const submitting = ref(false);
const errorMessage = ref("");
const loadingLetter = ref(false);
const existingLetterNumber = ref("");

onMounted(async () => {
  await Promise.all([
    store.fetchLetterCodes(),
    store.fetchDivisionCodes(),
    employeeStore.fetchEmployees({ limit: 200 }),
  ]);

  if (isEditMode.value) {
    loadingLetter.value = true;
    try {
      const letter = await store.fetchLetter(editingId.value);
      existingLetterNumber.value = letter.letter_number;
      form.value.letter_code_id = letter.letter_code_id;
      form.value.division_code_id = letter.division_code_id;
      form.value.type = letter.type;
      form.value.date = letter.date;
      form.value.subject = letter.subject;
      form.value.recipient = letter.recipient || "";
      form.value.employee_id = letter.employee_id || "";
      form.value.body = letter.body || "";
      form.value.signatory_name = letter.signatory_name || "";
      form.value.signatory_title = letter.signatory_title || "";
      form.value.second_party_name = letter.second_party_name || "";
      form.value.second_party_signatory_name = letter.second_party_signatory_name || "";
      form.value.second_party_signatory_title = letter.second_party_signatory_title || "";
      form.value.template = letter.template || "primary";

      if (letter.items?.length) {
        useItems.value = true;
        items.value = letter.items.map((i) => ({
          description: i.description || "",
          specification: i.specification || "",
          qty: i.qty || "",
          price: i.price || 0,
        }));
      }
      if (letter.second_party_name) {
        useSecondParty.value = true;
      }
    } catch (error) {
      errorMessage.value = "Failed to load letter.";
    } finally {
      loadingLetter.value = false;
    }
  }
});

const selectedCode = computed(() => {
  const code = letterCodes.value.find((c) => c.id === Number(form.value.letter_code_id));
  return code?.code ?? null;
});

const requiresEmployee = computed(() => !!TEMPLATES[selectedCode.value]?.requiresEmployee);

const applyTemplate = () => {
  const template = TEMPLATES[selectedCode.value];
  if (!template) return;

  // Templates are authored as plain text with \n line breaks; the editor
  // is HTML-based (contenteditable), so those need to become real <br>
  // tags or they'd render collapsed onto one line.
  form.value.body = template.body.replace(/\n/g, "<br>");
  useItems.value = template.useItems;
  useSecondParty.value = template.useSecondParty;
};

const addItem = () => items.value.push({ description: "", specification: "", qty: "", price: 0 });
const removeItem = (i) => items.value.splice(i, 1);

// The editor is a contenteditable div, not a real <textarea>, so the
// native `required` attribute doesn't apply to it -- checked manually
// here instead. An empty contenteditable can still hold stray tags
// (e.g. "<br>"), so strip markup before checking for real content.
const isBodyEmpty = () => !form.value.body.replace(/<[^>]*>/g, "").trim();

const handleSubmit = async () => {
  errorMessage.value = "";

  if (isBodyEmpty()) {
    errorMessage.value = "Letter content is required.";
    return;
  }

  submitting.value = true;
  try {
    if (isEditMode.value) {
      // Classification fields (code/division/type/date) are baked into the
      // already-issued letter_number and intentionally not editable -- only
      // content fields go in the update payload.
      const payload = {
        subject: form.value.subject,
        recipient: form.value.recipient,
        employee_id: form.value.employee_id || null,
        body: form.value.body,
        signatory_name: form.value.signatory_name,
        signatory_title: form.value.signatory_title,
        template: form.value.template,
        second_party_name: useSecondParty.value ? form.value.second_party_name : null,
        second_party_signatory_name: useSecondParty.value ? form.value.second_party_signatory_name : null,
        second_party_signatory_title: useSecondParty.value ? form.value.second_party_signatory_title : null,
      };
      if (useItems.value) {
        payload.items = items.value.filter((i) => i.description);
      }
      await store.updateLetter(editingId.value, payload);
      router.push({ name: "admin.letters.dashboard" });
      return;
    }

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
    errorMessage.value = data?.message || (data?.errors ? Object.values(data.errors).flat().join(", ") : `Failed to ${isEditMode.value ? "update" : "create"} Letter.`);
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
          <h3 class="text-brand-dark text-lg font-bold">{{ isEditMode ? "Edit Letter" : "Create Letter" }}</h3>
          <p class="text-brand-light text-sm">
            {{ isEditMode ? existingLetterNumber : "Letter number will be generated automatically when saved" }}
          </p>
        </div>
      </div>
      <router-link
        v-if="can('letter-menu')"
        :to="{ name: 'admin.settings.document-codes' }"
        class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1 hover:underline shrink-0"
      >
        <Settings class="w-4 h-4" /> Manage Letter Codes
      </router-link>
    </div>

    <form @submit.prevent="handleSubmit" class="space-y-6">
      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
            <Tag class="w-4 h-4 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Letter Classification</h4>
        </div>
        <p v-if="isEditMode" class="text-xs text-gray-400 mb-4 -mt-2 flex items-center gap-1">
          <Info class="w-3 h-3 shrink-0" /> Letter Code, Division Code, Type, and Date are locked after creation -- they're baked into the already-issued letter number.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Letter Code</label>
            <select v-model="form.letter_code_id" @change="applyTemplate" required :disabled="isEditMode" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400">
              <option value="" disabled>Select letter code</option>
              <option v-for="code in letterCodes" :key="code.id" :value="code.id">{{ code.code }} - {{ code.name }}</option>
            </select>
            <p v-if="!isEditMode && TEMPLATES[selectedCode]" class="text-xs text-[#0C51D9] mt-1 flex items-center gap-1">
              <Info class="w-3 h-3" /> A reference template has been auto-filled into Letter Content, please adjust as needed.
            </p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Division Code</label>
            <select v-model="form.division_code_id" required :disabled="isEditMode" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400">
              <option value="" disabled>Select division code</option>
              <option v-for="code in divisionCodes" :key="code.id" :value="code.id">{{ code.code }} - {{ code.name }}</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Type</label>
            <select v-model="form.type" :disabled="isEditMode" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400">
              <option value="I">Internal (I)</option>
              <option value="E">External (E)</option>
            </select>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Date</label>
            <input v-model="form.date" type="date" required :disabled="isEditMode" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400" />
          </div>
          <div class="md:col-span-2">
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Letterhead Template</label>
            <div class="grid grid-cols-2 gap-3">
              <label
                v-for="opt in TEMPLATE_OPTIONS"
                :key="opt.value"
                class="cursor-pointer rounded-xl border-2 overflow-hidden transition-all"
                :class="form.template === opt.value ? 'border-[#0C51D9]' : 'border-[#DCDEDD] hover:border-[#0C51D9]/50'"
              >
                <input type="radio" v-model="form.template" :value="opt.value" class="hidden" />
                <div class="h-28 w-full overflow-hidden bg-white">
                  <img :src="opt.preview" alt="" class="w-full h-full object-cover object-top" />
                </div>
                <div class="px-3 py-2 flex items-center justify-between bg-gray-50">
                  <span class="text-sm font-semibold text-brand-dark">{{ opt.label }}</span>
                  <CheckCircle2 v-if="form.template === opt.value" class="w-4 h-4 text-[#0C51D9]" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <div class="flex items-center gap-2 mb-4">
          <div class="w-8 h-8 bg-blue-50 rounded-[9px] flex items-center justify-center shrink-0">
            <FileText class="w-4 h-4 text-blue-600" />
          </div>
          <h4 class="text-brand-dark font-bold">Letter Content</h4>
        </div>
        <div class="space-y-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Subject</label>
            <input v-model="form.subject" type="text" required class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">To (optional)</label>
            <textarea v-model="form.recipient" rows="2" placeholder="e.g. All Employees&#10;PT. Jendela Cakra Digital" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm resize-none"></textarea>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">
              Related Employee <span v-if="!requiresEmployee">(optional)</span>
            </label>
            <select v-model="form.employee_id" :required="requiresEmployee" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm">
              <option value="">Not addressed to a specific employee</option>
              <option v-for="emp in employees" :key="emp.id" :value="emp.id">{{ emp.user?.name }} ({{ emp.code }})</option>
            </select>
            <p v-if="requiresEmployee" class="text-xs text-orange-600 mt-1">
              Required for warning letters so it's recorded in the employee's history.
            </p>
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Letter Content</label>
            <RichTextEditor v-model="form.body" placeholder="Dear Sir/Madam, ..." />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Signatory Name (First Party)</label>
              <input v-model="form.signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
            <div>
              <label class="text-sm font-semibold text-brand-dark mb-1 block">Position</label>
              <input v-model="form.signatory_title" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useItems" class="w-4 h-4" />
          <span class="text-brand-dark font-bold">Add Item Table</span>
        </label>
        <p class="text-xs text-gray-400 mt-1 mb-4">
          For BAST (handed-over goods) or Offer Letters (offered items/services). Leave price blank if not relevant (e.g. BAST).
        </p>

        <div v-if="useItems">
          <div v-for="(item, i) in items" :key="i" class="border border-[#DCDEDD] rounded-xl p-4 mb-3">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input v-model="item.description" type="text" placeholder="Description" class="md:col-span-2 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <input v-model="item.qty" type="text" placeholder="Qty" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <input v-model.number="item.price" type="number" min="0" placeholder="Price (Rp, optional)" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm" />
              <textarea v-model="item.specification" rows="2" placeholder="Notes / specification" class="md:col-span-4 w-full px-3 py-2 border border-[#DCDEDD] rounded-lg text-sm resize-none"></textarea>
            </div>
            <button v-if="items.length > 1" type="button" @click="removeItem(i)" class="mt-2 text-red-500 text-xs font-semibold flex items-center gap-1">
              <Trash2 class="w-3.5 h-3.5" /> Remove item
            </button>
          </div>
          <button type="button" @click="addItem" class="text-[#0C51D9] text-sm font-semibold flex items-center gap-1">
            <Plus class="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      <div class="bg-white border border-[#DCDEDD] rounded-[14px] p-5">
        <label class="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="useSecondParty" class="w-4 h-4" />
          <span class="text-brand-dark font-bold">Two-Party Signature (Second Party)</span>
        </label>
        <p class="text-xs text-gray-400 mt-1 mb-4">
          For BAST or NDA signed by both parties. If unchecked, the letter only uses the company's signature.
        </p>

        <div v-if="useSecondParty" class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Company/Second Party Name</label>
            <input v-model="form.second_party_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Signatory Name</label>
            <input v-model="form.second_party_signatory_name" type="text" class="w-full px-3 py-2 border border-[#DCDEDD] rounded-xl text-sm" />
          </div>
          <div>
            <label class="text-sm font-semibold text-brand-dark mb-1 block">Position</label>
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
          <span class="text-brand-white text-sm font-semibold">{{ submitting ? "Saving..." : (isEditMode ? "Update Letter" : "Save Letter") }}</span>
        </button>
        <router-link
          :to="{ name: 'admin.letters.dashboard' }"
          class="px-6 py-3 rounded-lg border border-[#DCDEDD] text-brand-dark text-sm font-semibold hover:bg-gray-50"
        >
          Cancel
        </router-link>
      </div>
    </form>
  </div>
</template>
