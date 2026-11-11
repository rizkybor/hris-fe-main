<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { localeTag } from "@/i18n";
import { Link2, Copy, Check, Mail, MessageCircle, Eye, Ban, ExternalLink } from "lucide-vue-next";
import { UiModal, UiButton, UiBadge, UiInput, UiSelect, UiSpinner } from "@/components/ui";
import { useProposalStore } from "@/stores/proposal";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { buildWhatsAppMessage, normalizeWhatsAppNumber } from "@/utils/proposalShareMessage";

const props = defineProps({
  proposalId: { type: [Number, String], required: true },
});
const emit = defineEmits(["close", "updated"]);

const { t } = useI18n();
const store = useProposalStore();
const alertModal = useAlertModalStore();

const proposal = ref(null);
const loading = ref(true);
const busy = ref("");
const copied = ref(false);
const tab = ref("email");

const EXPIRY_OPTIONS = computed(() => [
  { value: "", label: t("documents.proposal.share.noExpiry") },
  ...[7, 14, 30].map((n) => ({ value: n, label: t("documents.proposal.share.days", { n }) })),
]);
const expiry = ref(30);
// Presentation only: the "create link" select reads "Berlaku 30 hari".
const EXPIRY_OPTIONS_LONG = computed(() => [
  { value: "", label: t("documents.proposal.share.validNoExpiry") },
  ...[7, 14, 30].map((n) => ({ value: n, label: t("documents.proposal.share.validDays", { n }) })),
]);
const tabClass = (active) => [
  "ui-press inline-flex items-center gap-1.5 h-10 px-3 -mb-px border-b-2 text-ui-small font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:shadow-ui-focus",
  active ? "border-ui-accent text-ui-ink" : "border-transparent text-ui-muted hover:text-ui-ink",
];

const share = computed(() => proposal.value?.share ?? { active: false });

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(localeTag(), { dateStyle: "medium", timeStyle: "short" }) : "-";
const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(localeTag(), { day: "numeric", month: "long", year: "numeric" }) : null;

// ----- Email / WhatsApp forms, prefilled from the client record -----
const email = ref({ recipient_name: "", to: "", cc: "", message: "" });
const wa = ref({ recipient_name: "", phone: "", message: "" });
let waMessageEdited = false;

const LINK_PLACEHOLDER = "{link}";

const refreshWaMessage = () => {
  if (waMessageEdited || !proposal.value) return;
  wa.value.message = buildWhatsAppMessage({
    proposal: proposal.value,
    url: share.value.active ? share.value.url : LINK_PLACEHOLDER,
    recipientName: wa.value.recipient_name,
  });
};

const load = async () => {
  loading.value = true;
  try {
    proposal.value = await store.fetchProposal(props.proposalId);
    const client = proposal.value.client ?? {};
    email.value = { recipient_name: client.pic_name ?? "", to: client.email ?? "", cc: "", message: "" };
    wa.value = { recipient_name: client.pic_name ?? "", phone: client.pic_phone ?? "", message: "" };
    waMessageEdited = false;
    refreshWaMessage();
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.share.errors.load")), { type: "danger" });
    emit("close");
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => wa.value.recipient_name, refreshWaMessage);

const applyResult = (updated) => {
  proposal.value = updated;
  emit("updated", updated);
  refreshWaMessage();
};

// ----- Link -----
const createLink = async () => {
  busy.value = "link";
  try {
    applyResult(await store.shareProposal(props.proposalId, expiry.value || null));
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.share.errors.createLink")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const disableLink = async () => {
  const ok = await alertModal.confirm(
    t("documents.proposal.share.disableConfirm"),
    { type: "danger", confirmText: t("documents.proposal.share.disable") }
  );
  if (!ok) return;
  busy.value = "disable";
  try {
    applyResult(await store.unshareProposal(props.proposalId));
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.share.errors.disable")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(share.value.url);
  } catch {
    const input = document.getElementById("proposal-share-url");
    input?.select();
    document.execCommand("copy");
  }
  copied.value = true;
  setTimeout(() => (copied.value = false), 1800);
};

// ----- Email -----
const sendEmail = async () => {
  const cc = email.value.cc
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  busy.value = "email";
  try {
    const updated = await store.shareByEmail(props.proposalId, {
      to: email.value.to.trim(),
      cc,
      recipient_name: email.value.recipient_name.trim() || null,
      message: email.value.message.trim() || null,
      ...(share.value.active ? {} : { expires_in_days: expiry.value || null }),
    });
    applyResult(updated);
    await alertModal.alert(t("documents.proposal.share.emailSent", { to: email.value.to.trim() }), { type: "success" });
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("documents.proposal.share.errors.email")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

// ----- WhatsApp -----
const waNumber = computed(() => normalizeWhatsAppNumber(wa.value.phone));

const openWhatsApp = async () => {
  // Opened right away so the browser treats it as part of the click (not a
  // blocked popup), then pointed at WhatsApp once the link is ready.
  const tabRef = window.open("", "_blank");
  busy.value = "wa";
  try {
    if (!share.value.active) applyResult(await store.shareProposal(props.proposalId, expiry.value || null));
    const text = wa.value.message.replaceAll(LINK_PLACEHOLDER, share.value.url);
    const url = `https://wa.me/${waNumber.value}?text=${encodeURIComponent(text)}`;
    if (tabRef) tabRef.location.href = url;
    else window.open(url, "_blank");
  } catch (error) {
    tabRef?.close();
    await alertModal.alert(errorMessage(error, t("documents.proposal.share.errors.createLink")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const resetWaMessage = () => {
  waMessageEdited = false;
  refreshWaMessage();
};
</script>

<template>
  <UiModal :open="true" size="lg" :title="$t('documents.proposal.share.title')" @close="emit('close')">
    <template #header>
      <div class="min-w-0 flex-1">
        <h2 class="text-ui-h2 text-ui-ink">{{ $t("documents.proposal.share.title") }}</h2>
        <p class="text-ui-small text-ui-muted truncate mt-0.5">{{ proposal?.title }} · {{ proposal?.client_name }}</p>
      </div>
    </template>

    <UiSpinner v-if="loading" />

    <div v-else class="space-y-5">
      <!-- Link -->
      <section class="border border-ui-line rounded-ui-card p-4">
        <div class="flex items-center gap-2 mb-3">
          <Link2 class="w-4 h-4 text-ui-faint" />
          <p class="text-ui-h3 text-ui-ink">{{ $t("documents.proposal.share.linkTitle") }}</p>
          <UiBadge class="ml-auto" :tone="share.active ? 'ok' : 'neutral'" dot>
            {{ share.active ? $t("common.labels.active") : $t("documents.proposal.share.notShared") }}
          </UiBadge>
        </div>

        <template v-if="share.active">
          <div class="flex gap-2">
            <UiInput
              id="proposal-share-url"
              :model-value="share.url"
              readonly
              mono
              class="flex-1 min-w-0"
              @focusin="$event.target.select()"
            />
            <UiButton variant="secondary" :icon="copied ? Check : Copy" @click="copyLink">
              <span class="hidden sm:inline">{{ copied ? $t("common.actions.copied") : $t("common.actions.copy") }}</span>
            </UiButton>
            <UiButton variant="secondary" :icon="ExternalLink" :href="share.url" target="_blank" rel="noopener" :title="$t('documents.proposal.share.openLink')" :aria-label="$t('documents.proposal.share.openLink')" />
          </div>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-ui-cap text-ui-muted">
            <span>{{ $t("documents.proposal.share.validLabel") }} <strong class="font-medium text-ui-ink">{{ share.expires_at ? $t("documents.proposal.share.until", { date: formatDate(share.expires_at) }) : $t("documents.proposal.share.noExpiryLower") }}</strong></span>
            <span class="inline-flex items-center gap-1 tabular-nums">
              <Eye class="w-3.5 h-3.5" /> {{ $t("documents.proposal.share.viewed", { n: share.view_count }) }}<template v-if="share.last_viewed_at"> · {{ $t("documents.proposal.share.lastViewed", { at: formatDateTime(share.last_viewed_at) }) }}</template>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-2 mt-3">
            <UiSelect v-model="expiry" :options="EXPIRY_OPTIONS" class="w-full sm:w-48" />
            <UiButton variant="secondary" :loading="busy === 'link'" @click="createLink">{{ $t("documents.proposal.share.renew") }}</UiButton>
            <UiButton variant="danger" :icon="Ban" :loading="busy === 'disable'" class="sm:ml-auto" @click="disableLink">{{ $t("documents.proposal.share.disable") }}</UiButton>
          </div>
        </template>

        <template v-else>
          <p class="text-ui-small text-ui-muted mb-3">
            {{ $t("documents.proposal.share.linkIntro") }}
          </p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-2">
            <UiSelect v-model="expiry" :options="EXPIRY_OPTIONS_LONG" class="w-full sm:w-56" />
            <UiButton :icon="Link2" :loading="busy === 'link'" @click="createLink">{{ $t("documents.proposal.share.createLink") }}</UiButton>
          </div>
        </template>
      </section>

      <!-- Send via -->
      <section>
        <div class="flex gap-1 border-b border-ui-line mb-4 overflow-x-auto [scrollbar-width:none]" role="tablist">
          <button type="button" role="tab" :aria-selected="tab === 'email'" :class="tabClass(tab === 'email')" @click="tab = 'email'">
            <Mail class="w-4 h-4" /> {{ $t("documents.proposal.share.viaEmail") }}
          </button>
          <button type="button" role="tab" :aria-selected="tab === 'wa'" :class="tabClass(tab === 'wa')" @click="tab = 'wa'">
            <MessageCircle class="w-4 h-4" /> {{ $t("documents.proposal.share.viaWhatsApp") }}
          </button>
        </div>

        <form v-if="tab === 'email'" class="space-y-4" @submit.prevent="sendEmail">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="email.recipient_name" :label="$t('documents.proposal.share.recipientName')" :placeholder="$t('documents.proposal.create.recipientPlaceholder')" />
            <UiInput v-model="email.to" type="email" required :label="$t('documents.proposal.share.recipientEmail')" :placeholder="$t('documents.proposal.share.emailPlaceholder')" />
          </div>
          <UiInput v-model="email.cc" :label="$t('documents.proposal.share.cc')" :placeholder="$t('documents.proposal.share.ccPlaceholder')" />
          <div class="min-w-0">
            <label for="proposal-share-email-message" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("documents.proposal.share.extraMessage") }}</label>
            <textarea
              id="proposal-share-email-message"
              v-model="email.message"
              rows="3"
              maxlength="2000"
              class="w-full px-3 py-2.5 bg-ui-surface text-ui-body text-ui-ink placeholder:text-ui-faint border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
              :placeholder="$t('documents.proposal.share.extraMessagePlaceholder')"
            ></textarea>
          </div>
          <p class="text-ui-cap text-ui-muted">
            {{ $t("documents.proposal.share.emailNote", { email: "contact@jcdigital.co.id" }) }}
            <template v-if="!share.active"> {{ $t("documents.proposal.share.emailAutoLink") }}</template>
            <template v-if="proposal?.status === 'draft'"> {{ $t("documents.proposal.share.emailStatusNote") }}</template>
          </p>
          <div class="flex justify-end">
            <UiButton type="submit" :icon="Mail" :loading="busy === 'email'" :disabled="!email.to.trim()" class="w-full sm:w-auto">{{ $t("documents.proposal.share.sendEmail") }}</UiButton>
          </div>
        </form>

        <form v-else class="space-y-4" @submit.prevent="openWhatsApp">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiInput v-model="wa.recipient_name" :label="$t('documents.proposal.share.recipientName')" :placeholder="$t('documents.proposal.create.recipientPlaceholder')" />
            <UiInput
              v-model="wa.phone"
              :label="$t('documents.proposal.share.waNumber')"
              :placeholder="$t('documents.proposal.share.waPlaceholder')"
              :hint="$t('documents.proposal.share.waHint')"
            />
          </div>
          <div class="min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <label for="proposal-share-wa-message" class="block text-ui-small font-medium text-ui-ink">{{ $t("documents.proposal.share.message") }}</label>
              <button type="button" class="text-ui-cap text-ui-accent hover:underline" @click="resetWaMessage">{{ $t("documents.proposal.share.resetTemplate") }}</button>
            </div>
            <textarea
              id="proposal-share-wa-message"
              v-model="wa.message"
              rows="9"
              class="w-full px-3 py-2.5 bg-ui-surface text-ui-small text-ui-ink border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus transition-shadow"
              @input="waMessageEdited = true"
            ></textarea>
            <p v-if="!share.active" class="text-ui-cap text-ui-muted mt-1.5">{{ $t("documents.proposal.share.linkPlaceholderNote", { token: "{link}" }) }}</p>
          </div>
          <div class="flex justify-end">
            <UiButton type="submit" :icon="MessageCircle" :loading="busy === 'wa'" :disabled="!wa.message.trim()" class="w-full sm:w-auto">{{ $t("documents.proposal.share.openWhatsApp") }}</UiButton>
          </div>
        </form>
      </section>
    </div>
  </UiModal>
</template>
