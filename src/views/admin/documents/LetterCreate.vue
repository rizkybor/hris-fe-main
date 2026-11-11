<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute, RouterLink } from "vue-router";
import { storeToRefs } from "pinia";
import { Settings, Plus, Trash2, Info, CheckCircle2, ArrowLeft, Save } from "lucide-vue-next";
import { useLetterStore } from "@/stores/letter";
import { useEmployeeStore } from "@/stores/employee";
import { can } from "@/helpers/permissionHelper";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import SignatureToggle from "@/components/common/SignatureToggle.vue";
import { UiPageHeader, UiButton, UiCard, UiInput, UiSelect, UiSwitch, UiAlert, UiSpinner } from "@/components/ui";

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
  use_signature: false,
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
      form.value.use_signature = !!letter.use_signature;

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
        use_signature: form.value.use_signature,
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

// Presentation only: select options and the summary panel.
const TYPE_OPTIONS = [
  { value: "I", label: "Internal (I)" },
  { value: "E", label: "External (E)" },
];
const letterCodeOptions = computed(() => letterCodes.value.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })));
const divisionCodeOptions = computed(() => divisionCodes.value.map((c) => ({ value: c.id, label: `${c.code} - ${c.name}` })));
const employeeOptions = computed(() => [
  { value: "", label: "Not addressed to a specific employee" },
  ...employees.value.map((emp) => ({ value: emp.id, label: `${emp.user?.name} (${emp.code})` })),
]);
const summaryRows = computed(() => {
  const division = divisionCodes.value.find((c) => c.id === Number(form.value.division_code_id));
  return [
    { label: "Letter Code", value: selectedCode.value },
    { label: "Division Code", value: division?.code },
    { label: "Type", value: TYPE_OPTIONS.find((t) => t.value === form.value.type)?.label },
    { label: "Date", value: form.value.date },
    { label: "Items", value: useItems.value ? `${items.value.filter((i) => i.description).length}` : "—" },
    { label: "Second Party", value: useSecondParty.value ? form.value.second_party_name || "Yes" : "—" },
  ];
});
const nativeField =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus";
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiPageHeader
      :title="isEditMode ? 'Edit Letter' : 'Create Letter'"
      :subtitle="isEditMode ? existingLetterNumber : 'Letter number will be generated automatically when saved'"
      class="ui-anim-fade-up"
    >
      <template #eyebrow>
        <router-link
          :to="{ name: 'admin.letters.dashboard' }"
          class="ui-press inline-flex items-center gap-1 mb-1.5 text-ui-small font-medium text-ui-accent hover:underline"
          aria-label="Back to Letters"
        >
          <ArrowLeft class="w-4 h-4" />Letters
        </router-link>
      </template>
      <template #actions>
        <UiButton v-if="can('letter-menu')" variant="ghost" :icon="Settings" :to="{ name: 'admin.settings.document-codes' }">Manage Letter Codes</UiButton>
        <div class="hidden sm:flex items-center gap-2">
          <UiButton variant="secondary" :to="{ name: 'admin.letters.dashboard' }">Cancel</UiButton>
          <UiButton type="submit" form="letter-form" :icon="Save" :loading="submitting">{{ submitting ? "Saving..." : (isEditMode ? "Update Letter" : "Save Letter") }}</UiButton>
        </div>
      </template>
    </UiPageHeader>

    <div v-if="loadingLetter" class="bg-ui-surface border border-ui-line rounded-ui-card py-16 flex justify-center">
      <UiSpinner />
    </div>

    <form id="letter-form" v-show="!loadingLetter" class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start" @submit.prevent="handleSubmit">
      <div class="lg:col-span-2 space-y-5 min-w-0 ui-stagger">
        <!-- Classification -->
        <UiCard title="Letter Classification" :subtitle="isEditMode ? 'Letter Code, Division Code, Type, and Date are locked after creation -- they\'re baked into the already-issued letter number.' : ''">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="min-w-0">
              <UiSelect
                v-model="form.letter_code_id"
                label="Letter Code"
                placeholder="Select letter code"
                :options="letterCodeOptions"
                required
                :disabled="isEditMode"
                @change="applyTemplate"
              />
              <p v-if="!isEditMode && TEMPLATES[selectedCode]" class="text-ui-cap text-ui-accent mt-1.5 flex items-start gap-1">
                <Info class="w-3.5 h-3.5 shrink-0 mt-px" /> A reference template has been auto-filled into Letter Content, please adjust as needed.
              </p>
            </div>
            <UiSelect
              v-model="form.division_code_id"
              label="Division Code"
              placeholder="Select division code"
              :options="divisionCodeOptions"
              required
              :disabled="isEditMode"
            />
            <UiSelect v-model="form.type" label="Type" :options="TYPE_OPTIONS" required :disabled="isEditMode" />
            <UiInput v-model="form.date" type="date" label="Date" required :disabled="isEditMode" />
          </div>
        </UiCard>

        <!-- Content -->
        <UiCard title="Letter Content">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UiInput v-model="form.subject" label="Subject" required class="md:col-span-2" />
            <UiInput
              v-if="form.template !== 'secondary'"
              v-model="form.recipient"
              :rows="2"
              label="To (optional)"
              placeholder="e.g. All Employees&#10;PT. Jendela Cakra Digital"
            />
            <p v-else class="text-ui-cap text-ui-muted md:self-center">
              The Secondary template's Surat Keterangan-style layout doesn't address a specific recipient, so this field is hidden.
            </p>
            <div class="min-w-0">
              <UiSelect
                v-model="form.employee_id"
                :label="requiresEmployee ? 'Related Employee' : 'Related Employee (optional)'"
                :options="employeeOptions"
                :required="requiresEmployee"
              />
              <p v-if="requiresEmployee" class="text-ui-cap text-ui-warn mt-1.5">
                Required for warning letters so it's recorded in the employee's history.
              </p>
            </div>
            <div class="md:col-span-2 min-w-0">
              <label class="block text-ui-small font-medium text-ui-ink mb-1.5">Letter Content<span class="text-ui-bad"> *</span></label>
              <RichTextEditor v-model="form.body" placeholder="Dear Sir/Madam, ..." />
            </div>
            <UiInput v-model="form.signatory_name" label="Signatory Name (First Party)" />
            <UiInput v-model="form.signatory_title" label="Position" />
            <SignatureToggle v-model="form.use_signature" hint="Stamps the first party's signature onto the PDF." class="md:col-span-2" />
          </div>
        </UiCard>

        <!-- Item table -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <div class="px-5 sm:px-6 py-[18px]">
            <UiSwitch
              v-model="useItems"
              label="Add Item Table"
              description="For BAST (handed-over goods) or Offer Letters (offered items/services). Leave price blank if not relevant (e.g. BAST)."
            />
          </div>
          <div v-if="useItems" class="border-t border-ui-line px-5 sm:px-6 py-4 space-y-3 ui-anim-fade-up">
            <div v-for="(item, i) in items" :key="i" class="flex items-start gap-3 rounded-ui-control border border-ui-line p-3 sm:p-4">
              <span class="w-5 pt-2.5 text-ui-cap text-ui-faint tabular-nums shrink-0">{{ i + 1 }}</span>
              <div class="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3">
                <UiInput v-model="item.description" placeholder="Description" class="col-span-2" />
                <UiInput v-model="item.qty" placeholder="Qty" />
                <input
                  v-model.number="item.price"
                  type="number"
                  min="0"
                  placeholder="Price (Rp, optional)"
                  aria-label="Price (Rp, optional)"
                  :class="[nativeField, 'text-right tabular-nums']"
                />
                <UiInput v-model="item.specification" :rows="2" placeholder="Notes / specification" class="col-span-2 md:col-span-4" />
              </div>
              <button
                v-if="items.length > 1"
                type="button"
                class="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-bad-soft hover:text-ui-bad focus:outline-none focus-visible:shadow-ui-focus"
                title="Remove item"
                aria-label="Remove item"
                @click="removeItem(i)"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
            <UiButton variant="secondary" :icon="Plus" class="w-full sm:w-auto" @click="addItem">Add Item</UiButton>
          </div>
        </section>

        <!-- Second party -->
        <section class="bg-ui-surface border border-ui-line rounded-ui-card min-w-0">
          <div class="px-5 sm:px-6 py-[18px]">
            <UiSwitch
              v-model="useSecondParty"
              label="Two-Party Signature (Second Party)"
              description="For BAST or NDA signed by both parties. If unchecked, the letter only uses the company's signature."
            />
          </div>
          <div v-if="useSecondParty" class="border-t border-ui-line px-5 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-4 ui-anim-fade-up">
            <UiInput v-model="form.second_party_name" label="Company/Second Party Name" />
            <UiInput v-model="form.second_party_signatory_name" label="Signatory Name" />
            <UiInput v-model="form.second_party_signatory_title" label="Position" />
          </div>
        </section>
      </div>

      <!-- Side panel: letterhead preview, summary, actions -->
      <aside class="space-y-4 lg:sticky lg:top-4 min-w-0">
        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <h3 class="text-ui-h3 text-ui-ink mb-3">Letterhead Template</h3>
          <div class="grid grid-cols-2 gap-3">
            <label
              v-for="opt in TEMPLATE_OPTIONS"
              :key="opt.value"
              class="ui-press cursor-pointer rounded-ui-control border overflow-hidden transition-colors"
              :class="form.template === opt.value ? 'border-ui-accent shadow-ui-focus' : 'border-ui-line hover:border-ui-line-strong'"
            >
              <input type="radio" v-model="form.template" :value="opt.value" class="sr-only" />
              <div class="h-36 w-full overflow-hidden bg-ui-surface border-b border-ui-line">
                <img :src="opt.preview" alt="" class="w-full h-full object-cover object-top" />
              </div>
              <div class="px-3 py-2 flex items-center justify-between bg-ui-subtle">
                <span class="text-ui-small font-medium text-ui-ink">{{ opt.label }}</span>
                <CheckCircle2 v-if="form.template === opt.value" class="w-4 h-4 text-ui-accent" />
              </div>
            </label>
          </div>
        </section>

        <section class="bg-ui-surface border border-ui-line rounded-ui-card p-5">
          <h3 class="text-ui-h3 text-ui-ink">Summary</h3>
          <p class="font-mono text-ui-small text-ui-ink mt-2 break-all">{{ isEditMode ? existingLetterNumber : "—" }}</p>
          <p v-if="!isEditMode" class="text-ui-cap text-ui-muted">Letter number will be generated automatically when saved</p>
          <dl class="mt-3 divide-y divide-ui-line text-ui-small">
            <div v-for="row in summaryRows" :key="row.label" class="flex items-center justify-between gap-3 py-2">
              <dt class="text-ui-muted shrink-0">{{ row.label }}</dt>
              <dd class="text-ui-ink truncate text-right tabular-nums">{{ row.value || "—" }}</dd>
            </div>
          </dl>
        </section>

        <UiAlert v-if="errorMessage" tone="bad" :message="errorMessage" />

        <div class="flex flex-col gap-2">
          <UiButton type="submit" size="lg" block :icon="Save" :loading="submitting">{{ submitting ? "Saving..." : (isEditMode ? "Update Letter" : "Save Letter") }}</UiButton>
          <UiButton variant="secondary" size="lg" block class="sm:hidden" :to="{ name: 'admin.letters.dashboard' }">Cancel</UiButton>
        </div>
      </aside>
    </form>
  </div>
</template>
