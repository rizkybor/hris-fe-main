<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { storeToRefs } from "pinia";
import {
  ArrowLeft,
  Save,
  Eye,
  Download,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Copy,
  ImagePlus,
  X,
  FileText,
  ListTree,
  SeparatorHorizontal,
  Share2,
  ChevronRight,
} from "lucide-vue-next";
import { UiButton, UiBadge, UiInput, UiSelect, UiSpinner } from "@/components/ui";
import ShareProposalModal from "@/components/admin/documents/ShareProposalModal.vue";
import FlowchartPickerModal from "@/components/admin/documents/FlowchartPickerModal.vue";
import RichTextEditor from "@/components/common/RichTextEditor.vue";
import { useProposalStore } from "@/stores/proposal";
import { useLookupStore } from "@/stores/lookups";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { PROPOSAL_STATUSES, proposalStatus } from "@/utils/proposalStatus";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useProposalStore();
const lookups = useLookupStore();
const alertModal = useAlertModalStore();
const { saving } = storeToRefs(store);
// The client picker comes from the shared cache (no request when fresh).
const clients = computed(() => lookups.clients);

const loading = ref(true);
const proposal = ref(null);
const doc = ref(null); // editable copy
const savedState = ref("");
const pdfBusy = ref(false);
const coverUploading = ref(false);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const snapshot = () => JSON.stringify(doc.value);
const isDirty = computed(() => !!doc.value && snapshot() !== savedState.value);

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`);

const fromProposal = (p) => ({
  title: p.title,
  client_id: p.client_id ?? "",
  client_name: p.client_name,
  proposal_date: p.proposal_date,
  letter_number: p.letter_number ?? "",
  status: p.status,
  cover_image: p.cover_image ?? null,
  cover_image_url: p.cover_image_url ?? null,
  signatory_name: p.signatory_name ?? "",
  signatory_title: p.signatory_title ?? "",
  use_signature: !!p.use_signature,
  sections: (p.sections ?? []).map((s) => ({ ...s, page_break_before: !!s.page_break_before })),
});

const load = async () => {
  loading.value = true;
  // Loaded alongside the proposal, not after it.
  lookups.ensure("clients").catch(() => {});
  try {
    const data = await store.fetchProposal(route.params.id);
    proposal.value = data;
    doc.value = fromProposal(data);
    savedState.value = snapshot();
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.editor.errors.open")), { type: "danger" });
    router.push({ name: "admin.proposals.dashboard" });
  } finally {
    loading.value = false;
  }
};

// Untitled sections are free-form blocks: they don't get a number, same as
// in the PDF, so the numbering here always matches the document.
const sectionNumbers = computed(() => {
  let n = 0;
  return (doc.value?.sections ?? []).map((s) => (s.title?.trim() ? ++n : null));
});

// ===== Sections =====
const addSection = async (index) => {
  const section = { id: newId(), title: "Bagian Baru", content: "<p></p>", page_break_before: false };
  doc.value.sections.splice(index, 0, section);
  await nextTick();
  scrollToSection(section.id, true);
};

const duplicateSection = (index) => {
  const source = doc.value.sections[index];
  doc.value.sections.splice(index + 1, 0, { ...source, id: newId(), title: source.title ? `${source.title} (Salinan)` : "" });
};

const moveSection = (index, delta) => {
  const target = index + delta;
  if (target < 0 || target >= doc.value.sections.length) return;
  const [section] = doc.value.sections.splice(index, 1);
  doc.value.sections.splice(target, 0, section);
  nextTick(() => scrollToSection(section.id));
};

const removeSection = async (index) => {
  const section = doc.value.sections[index];
  const ok = await alertModal.confirm(t("documents.proposal.editor.removeSectionConfirm", { title: section.title || t("documents.proposal.editor.untitledLower") }), {
    type: "danger",
    confirmText: t("common.actions.delete"),
  });
  if (ok) doc.value.sections.splice(index, 1);
};

const scrollToSection = (id, focusTitle = false) => {
  const el = document.getElementById(`section-${id}`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  if (focusTitle) el?.querySelector("input")?.select();
};

const flowchartPicker = ref(null);
const pickFlowchart = () => new Promise((resolve) => (flowchartPicker.value = { resolve }));
const closeFlowchartPicker = (picked = null) => {
  flowchartPicker.value?.resolve(picked);
  flowchartPicker.value = null;
};

// ===== Images =====
const uploadEditorImage = async (file) => {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(t("documents.proposal.editor.errors.imageTooLarge"));
  const { url } = await store.uploadImage(file);
  return url;
};

const coverInput = ref(null);
const onCoverSelected = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (file.size > MAX_IMAGE_BYTES) {
    await alertModal.alert(t("documents.proposal.editor.errors.imageTooLarge"), { type: "warning" });
    return;
  }
  coverUploading.value = true;
  try {
    const { public_id, url } = await store.uploadImage(file);
    doc.value.cover_image = public_id;
    doc.value.cover_image_url = url;
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.editor.errors.coverUpload")), { type: "danger" });
  } finally {
    coverUploading.value = false;
  }
};

const removeCover = () => {
  doc.value.cover_image = null;
  doc.value.cover_image_url = null;
};

const onClientPicked = () => {
  const client = clients.value.find((c) => String(c.id) === String(doc.value.client_id));
  if (client) doc.value.client_name = client.name;
};

// ===== Save / PDF =====
const save = async () => {
  if (saving.value || !doc.value) return false;
  const { cover_image_url, ...payload } = doc.value;
  try {
    const updated = await store.updateProposal(route.params.id, { ...payload, client_id: payload.client_id || null });
    proposal.value = updated;
    // Keep the current editing state (and caret positions) -- only mark it saved.
    savedState.value = snapshot();
    return true;
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.editor.errors.save")), { type: "danger" });
    return false;
  }
};

const openPdf = async (download = false) => {
  const tab = download ? null : window.open("", "_blank");
  if (isDirty.value && !(await save())) {
    tab?.close();
    return;
  }
  pdfBusy.value = true;
  try {
    if (download) {
      const name = `Proposal Penawaran - ${doc.value.title} - ${doc.value.client_name}`.replace(/[\\/:*?"<>|]/g, "-");
      await store.downloadPdf(route.params.id, name);
    } else {
      await store.viewPdf(route.params.id, tab);
    }
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.errors.pdf")), { type: "danger" });
  } finally {
    pdfBusy.value = false;
  }
};

// The shared link shows the saved version, so unsaved edits are saved first.
const showShare = ref(false);
const openShare = async () => {
  if (isDirty.value && !(await save())) return;
  showShare.value = true;
};

// Emailing a draft marks it as sent -- mirror that without touching edits.
const onShared = (updated) => {
  const wasClean = !isDirty.value;
  proposal.value = { ...proposal.value, ...updated };
  doc.value.status = updated.status;
  if (wasClean) savedState.value = snapshot();
};

const onKeydown = (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    save();
  }
};

const onBeforeUnload = (event) => {
  if (isDirty.value) {
    event.preventDefault();
    event.returnValue = "";
  }
};

onBeforeRouteLeave(async () => {
  if (!isDirty.value) return true;
  return alertModal.confirm(t("documents.proposal.editor.leaveConfirm"), {
    type: "warning",
    confirmText: t("documents.proposal.editor.leave"),
  });
});

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("beforeunload", onBeforeUnload);
  load();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("beforeunload", onBeforeUnload);
});

// ===== Presentation only =====
const STATUS_TONE = { draft: "neutral", sent: "info", accepted: "ok", rejected: "bad" };
const clientOptions = computed(() => [
  { value: "", label: t("documents.proposal.editor.newClient") },
  ...clients.value.map((c) => ({ value: c.id, label: c.name })),
]);
const fieldClass =
  "w-full h-[38px] px-3 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow";
const iconBtn =
  "w-8 h-8 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:shadow-ui-focus transition-colors";

const lastSaved = computed(() => {
  if (!proposal.value?.updated_at) return null;
  const at = new Date(proposal.value.updated_at).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" });
  return proposal.value.updater?.name
    ? t("documents.proposal.editor.savedAtBy", { at, name: proposal.value.updater.name })
    : t("documents.proposal.editor.savedAt", { at });
});
</script>

<template>
  <div class="p-1 sm:p-3 lg:p-5 space-y-5">
    <UiSpinner v-if="loading" :label="$t('documents.proposal.editor.loading')" />

    <template v-else-if="doc">
      <div class="sticky -top-3 z-20 -mt-3 pt-3 -mx-1 px-1 sm:-mx-3 sm:px-3 lg:-mx-5 lg:px-5 bg-ui-bg">
        <div class="bg-ui-surface border border-ui-line rounded-ui-card px-3 sm:px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <div class="flex items-center gap-2 sm:gap-3 flex-1 min-w-[220px]">
            <button
              type="button"
              class="w-8 h-8 -ml-1 inline-flex items-center justify-center rounded-ui-control text-ui-muted hover:bg-ui-hover hover:text-ui-ink shrink-0 focus:outline-none focus-visible:shadow-ui-focus"
              :title="$t('documents.proposal.editor.backToList')"
              :aria-label="$t('documents.proposal.editor.backToList')"
              @click="router.push({ name: 'admin.proposals.dashboard' })"
            >
              <ArrowLeft class="w-4 h-4" />
            </button>
            <div class="min-w-0 flex-1">
              <h1 class="text-ui-h3 text-ui-ink truncate" :title="doc.title">{{ $t("documents.hub.links.proposal.title") }} — {{ doc.title || $t("documents.proposal.editor.untitled") }}</h1>
              <p class="text-ui-cap text-ui-muted truncate">
                {{ doc.client_name }}<span v-if="!isDirty && lastSaved"> · {{ lastSaved }}</span>
              </p>
            </div>
            <UiBadge v-if="isDirty" tone="warn" dot class="shrink-0">{{ $t("documents.proposal.editor.unsaved") }}</UiBadge>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <UiSelect v-model="doc.status" :options="PROPOSAL_STATUSES" :title="$t('documents.proposal.editor.statusTitle')" class="flex-1 min-w-0 sm:flex-none sm:w-32" />
            <div class="flex items-center gap-1.5 ml-auto shrink-0">
              <UiButton
                variant="ghost"
                :icon="Share2"
                :disabled="saving"
                :title="$t('documents.proposal.editor.shareHint')"
                :aria-label="$t('common.actions.share')"
                @click="openShare"
              ><span class="hidden xl:inline">{{ $t("common.actions.share") }}</span></UiButton>
              <UiButton
                variant="secondary"
                :icon="Eye"
                :loading="pdfBusy"
                :title="$t('documents.proposal.editor.viewPdfHint')"
                :aria-label="$t('documents.shared.viewPdf')"
                @click="openPdf(false)"
              ><span class="hidden xl:inline">{{ $t("documents.shared.viewPdf") }}</span></UiButton>
              <UiButton
                variant="secondary"
                :icon="Download"
                :disabled="pdfBusy"
                :title="$t('common.actions.downloadPdf')"
                :aria-label="$t('common.actions.downloadPdf')"
                @click="openPdf(true)"
              ><span class="hidden xl:inline">{{ $t("common.actions.download") }}</span></UiButton>
              <UiButton :icon="Save" :loading="saving" :disabled="!isDirty" :title="$t('documents.proposal.editor.saveHint')" :aria-label="$t('common.actions.save')" @click="save"><span class="hidden sm:inline">{{ $t("common.actions.save") }}</span></UiButton>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[240px,minmax(0,1fr)] gap-5 items-start">
        <!-- Outline (left panel on desktop, section list card on phones) -->
        <aside class="min-w-0 lg:sticky lg:top-[76px]">
          <div class="bg-ui-surface border border-ui-line rounded-ui-card lg:bg-transparent lg:border-0 lg:rounded-none">
            <div class="flex items-center gap-2 px-4 pt-3.5 pb-2 lg:px-1 lg:pt-1">
              <ListTree class="w-4 h-4 text-ui-faint lg:hidden" />
              <p class="text-ui-h3 lg:text-ui-over lg:uppercase text-ui-ink lg:text-ui-muted flex-1">{{ $t("documents.proposal.editor.outline") }}</p>
            </div>
            <ol class="overflow-y-auto max-h-[60vh] divide-y divide-ui-line lg:divide-y-0 lg:space-y-0.5 border-t border-ui-line lg:border-t-0">
              <li v-for="(section, index) in doc.sections" :key="section.id">
                <button
                  type="button"
                  class="w-full text-left flex items-center gap-2 px-4 lg:px-2.5 h-11 lg:h-9 text-ui-small text-ui-text hover:bg-ui-hover hover:text-ui-ink lg:rounded-ui-control transition-colors"
                  @click="scrollToSection(section.id)"
                >
                  <span class="text-ui-faint shrink-0 tabular-nums min-w-[18px]">{{ sectionNumbers[index] ? `${sectionNumbers[index]}.` : "·" }}</span>
                  <span class="truncate flex-1">{{ section.title || $t("documents.proposal.editor.untitled") }}</span>
                  <ChevronRight class="w-4 h-4 text-ui-faint shrink-0 lg:hidden" />
                </button>
              </li>
            </ol>
            <div class="p-3 lg:px-1 border-t border-ui-line lg:border-t-0">
              <UiButton variant="secondary" size="sm" :icon="Plus" block @click="addSection(doc.sections.length)">{{ $t("documents.proposal.editor.addSectionEnd") }}</UiButton>
              <p class="text-ui-cap text-ui-muted mt-3">
                {{ $t("documents.proposal.editor.bracketHint") }}
              </p>
            </div>
          </div>
        </aside>

        <!-- Document canvas -->
        <div class="min-w-0 w-full max-w-[880px] mx-auto space-y-4">
          <!-- Document info -->
          <section class="bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-raised p-4 sm:p-6">
            <div class="flex items-center gap-2 mb-4">
              <FileText class="w-4 h-4 text-ui-faint" />
              <h2 class="text-ui-h2 text-ui-ink">{{ $t("documents.proposal.editor.docInfo") }}</h2>
            </div>

            <!-- Cover -->
            <div class="mb-4">
              <p class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.proposal.editor.cover") }}</p>
              <div v-if="doc.cover_image_url" class="relative h-40 rounded-ui-control overflow-hidden border border-ui-line">
                <img :src="doc.cover_image_url" class="w-full h-full object-cover" :alt="$t('documents.proposal.editor.cover')" />
                <div class="absolute top-2 right-2 flex gap-1.5">
                  <UiButton variant="secondary" size="sm" @click="coverInput?.click()">{{ $t("documents.proposal.editor.replace") }}</UiButton>
                  <UiButton variant="secondary" size="sm" :icon="X" :aria-label="$t('documents.proposal.editor.removeCover')" :title="$t('documents.proposal.editor.removeCover')" @click="removeCover" />
                </div>
              </div>
              <button
                v-else
                type="button"
                class="w-full h-[110px] rounded-ui-control border border-dashed border-ui-line-strong hover:border-ui-accent hover:text-ui-accent hover:bg-ui-accent-soft/40 transition-colors flex flex-col items-center justify-center gap-1.5 px-4 text-ui-muted disabled:opacity-60"
                :disabled="coverUploading"
                @click="coverInput?.click()"
              >
                <UiSpinner v-if="coverUploading" :center="false" />
                <ImagePlus v-else class="w-5 h-5" />
                <span class="text-ui-cap font-medium text-center">{{ $t("documents.proposal.editor.uploadCover") }}</span>
              </button>
              <input ref="coverInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onCoverSelected" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2 min-w-0">
                <label for="pe-title" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.proposal.create.title") }}</label>
                <input id="pe-title" v-model="doc.title" type="text" maxlength="255" :class="fieldClass" />
              </div>
              <UiSelect v-model="doc.client_id" :label="$t('documents.proposal.create.pickClient')" :options="clientOptions" @change="onClientPicked" />
              <div class="min-w-0">
                <label for="pe-client-name" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.shared.clientName") }}</label>
                <input id="pe-client-name" v-model="doc.client_name" type="text" maxlength="255" :class="fieldClass" />
              </div>
              <UiInput v-model="doc.proposal_date" type="date" :label="$t('common.labels.date')" />
              <div class="min-w-0">
                <label for="pe-letter-number" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.proposal.editor.letterNumber") }}</label>
                <input id="pe-letter-number" v-model="doc.letter_number" type="text" :placeholder="$t('documents.proposal.create.letterNumberPlaceholder')" maxlength="100" :class="fieldClass" />
              </div>
              <div class="min-w-0">
                <label for="pe-signatory-name" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.letter.form.signatoryName") }}</label>
                <input id="pe-signatory-name" v-model="doc.signatory_name" type="text" maxlength="255" :class="fieldClass" />
              </div>
              <div class="min-w-0">
                <label for="pe-signatory-title" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.shared.position") }}</label>
                <input id="pe-signatory-title" v-model="doc.signatory_title" type="text" maxlength="255" :class="fieldClass" />
              </div>
              <label class="md:col-span-2 flex items-center gap-2.5 text-ui-small text-ui-ink">
                <input v-model="doc.use_signature" type="checkbox" class="w-4 h-4 accent-ui-accent" />
                {{ $t("documents.proposal.editor.showSignature") }}
              </label>
            </div>
          </section>

          <!-- Sections -->
          <template v-for="(section, index) in doc.sections" :key="section.id">
            <div v-if="section.page_break_before" class="flex items-center gap-2 text-ui-over uppercase text-ui-accent">
              <span class="flex-1 border-t border-dashed border-ui-accent/40"></span>
              {{ $t("documents.proposal.editor.newPage") }}
              <span class="flex-1 border-t border-dashed border-ui-accent/40"></span>
            </div>

            <section :id="`section-${section.id}`" class="bg-ui-surface border border-ui-line rounded-ui-card shadow-ui-raised p-4 sm:p-6 scroll-mt-24">
              <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-3">
                <span
                  class="w-8 h-8 rounded-ui-control flex items-center justify-center text-ui-small font-semibold tabular-nums shrink-0"
                  :class="sectionNumbers[index] ? 'bg-ui-accent-soft text-ui-accent' : 'bg-ui-subtle text-ui-faint'"
                  :title="sectionNumbers[index] ? $t('documents.proposal.editor.sectionNumberHint') : $t('documents.proposal.editor.unnumberedHint')"
                >
                  {{ sectionNumbers[index] ?? "–" }}
                </span>
                <input
                  v-model="section.title"
                  type="text"
                  maxlength="255"
                  :placeholder="$t('documents.proposal.editor.sectionTitlePlaceholder')"
                  class="flex-1 min-w-0 text-ui-h2 text-ui-ink placeholder:text-ui-faint placeholder:font-normal bg-transparent outline-none border-b border-transparent focus:border-ui-accent py-1"
                />
                <div class="flex items-center gap-0.5 shrink-0 w-full sm:w-auto justify-end">
                  <button type="button" :class="iconBtn" :disabled="index === 0" :title="$t('documents.proposal.editor.moveUp')" :aria-label="$t('documents.proposal.editor.moveUp')" @click="moveSection(index, -1)">
                    <ChevronUp class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :class="iconBtn"
                    :disabled="index === doc.sections.length - 1"
                    :title="$t('documents.proposal.editor.moveDown')"
                    :aria-label="$t('documents.proposal.editor.moveDown')"
                    @click="moveSection(index, 1)"
                  >
                    <ChevronDown class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :class="[iconBtn, section.page_break_before ? '!bg-ui-accent-soft !text-ui-accent' : '']"
                    :aria-pressed="section.page_break_before"
                    :title="$t('documents.proposal.editor.pageBreak')"
                    :aria-label="$t('documents.proposal.editor.pageBreak')"
                    @click="section.page_break_before = !section.page_break_before"
                  >
                    <SeparatorHorizontal class="w-4 h-4" />
                  </button>
                  <button type="button" :class="iconBtn" :title="$t('documents.proposal.editor.duplicateSection')" :aria-label="$t('documents.proposal.editor.duplicateSection')" @click="duplicateSection(index)">
                    <Copy class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    :class="[iconBtn, 'hover:!bg-ui-bad-soft hover:!text-ui-bad']"
                    :title="$t('documents.proposal.editor.removeSection')"
                    :aria-label="$t('documents.proposal.editor.removeSection')"
                    @click="removeSection(index)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <RichTextEditor v-model="section.content" :upload-image="uploadEditorImage" :insert-flowchart="pickFlowchart" :placeholder="$t('documents.proposal.editor.sectionPlaceholder')" />
            </section>

            <div class="flex justify-center">
              <UiButton variant="ghost" size="sm" :icon="Plus" @click="addSection(index + 1)">{{ $t("documents.proposal.editor.addSectionHere") }}</UiButton>
            </div>
          </template>

          <div v-if="doc.sections.length === 0" class="bg-ui-surface border border-dashed border-ui-line-strong rounded-ui-card p-8 text-center">
            <p class="text-ui-body font-medium text-ui-ink mb-3">{{ $t("documents.proposal.editor.noSections") }}</p>
            <UiButton variant="secondary" size="sm" :icon="Plus" @click="addSection(0)">{{ $t("documents.proposal.editor.addFirstSection") }}</UiButton>
          </div>
        </div>
      </div>
    </template>

    <FlowchartPickerModal v-if="flowchartPicker" @select="closeFlowchartPicker" @close="closeFlowchartPicker(null)" />

    <ShareProposalModal v-if="showShare" :proposal-id="route.params.id" @close="showShare = false" @updated="onShared" />
  </div>
</template>
