<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Mail, MessageCircle, Send, ExternalLink, Info } from "lucide-vue-next";
import { UiModal, UiSelect, UiInput, UiButton } from "@/components/ui";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { normalizeWhatsAppNumber } from "@/utils/proposalShareMessage";
import { normalizePlan, certificateKeyOptions } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  license: { type: Object, required: true },
  productName: { type: String, default: "" },
  initialTab: { type: String, default: "email" },
  // One key per device: share the certificate of this key only (null = the
  // whole license, every key).
  initialKeyId: { type: Number, default: null },
});
const emit = defineEmits(["close", "shared"]);

const { t } = useI18n();
const store = useLicenseManagerStore();
const alertModal = useAlertModalStore();

const LINK_PLACEHOLDER = "{link}";
const tab = ref(props.initialTab === "whatsapp" ? "whatsapp" : "email");
const busy = ref("");

const product = computed(() => props.productName || props.license.product?.name || "the app");
// The certificate's keys, Mac first (a bundle lists both).
const keys = computed(() =>
  [props.license, ...(props.license.bundle || [])].sort((a, b) => (a.platform === "mac" ? -1 : b.platform === "mac" ? 1 : 0))
);
const isBundle = computed(() => keys.value.length > 1);
const perDevice = computed(() => props.license.key_mode === "per_device");
const MAX_LISTED_KEYS = 10;
// "Certificate for": the licensee (all keys) or one key.
const keyOptions = computed(() => certificateKeyOptions(props.license));
const keyId = ref(keyOptions.value.some((k) => k.id === props.initialKeyId) ? props.initialKeyId : null);
const selectedKey = computed(() => keyOptions.value.find((k) => k.id === keyId.value) || null);
const keyOptionLabel = (k) =>
  `${isBundle.value ? `${k.platform_label} ` : ""}${t("licenses.share.keyOf", { position: k.position, total: k.total })} · ${k.key}${
    k.status === "in_use" ? ` (${t("licenses.keyStatus.inUse").toLowerCase()})` : ""
  }`;
const contactName = computed(() => props.license.contact_name || props.license.licensee_name || "");

const email = ref({ to: props.license.licensee_email || "", recipient_name: contactName.value, cc: "", message: "" });
const wa = ref({ phone: props.license.phone || "", recipient_name: contactName.value, message: "" });
let waEdited = false;

// The message goes to the licensee, so it stays in English whatever the
// interface language.
const EN_PLAN_NAMES = { trial: "Trial", professional: "Professional", lifetime: "Lifetime", organization: "Organization" };
const buildMessage = () => {
  const name = wa.value.recipient_name.trim();
  const plan = props.license.plan_label || EN_PLAN_NAMES[normalizePlan(props.license.plan)] || props.license.plan || "";
  const lines = [name ? `Dear ${name},` : "Dear Sir/Madam,", "", `Thank you for choosing ${product.value}. Here is your ${product.value} ${plan} license.`, ""];
  if (selectedKey.value) {
    lines.push(`License key (key ${selectedKey.value.position} of ${selectedKey.value.total}): *${selectedKey.value.key}*`);
    lines.push(`This key works on one ${selectedKey.value.platform_label || "Mac"} only; once its device is released, it cannot be used again.`);
  } else if (perDevice.value) {
    // One key per device: list the keys (up to 10 per platform), otherwise
    // point to the certificate's Device Keys page.
    for (const license of keys.value) {
      const list = license.keys || [];
      const title = isBundle.value ? `${license.platform_label} keys` : "License keys";
      if (list.length && list.length <= MAX_LISTED_KEYS) {
        lines.push(`${title} (one per device):`);
        for (const k of list) lines.push(`${k.position}. *${k.key}*${k.status === "available" ? "" : ` (${k.status === "used" ? "used" : "in use"})`}`);
      } else {
        lines.push(`${title}: ${list.length || license.max_devices} keys, one per device, listed on the Device Keys page of the certificate.`);
      }
      lines.push("");
    }
    lines.push("Each key works on one device only; a key whose device was released cannot be used again.");
    if (isBundle.value) lines.push("(Use the Mac keys on a Mac and the iPad keys on an iPad.)");
  } else {
    for (const key of keys.value) lines.push(`${isBundle.value ? `${key.platform_label} key` : "License key"}: *${key.key}*`);
    if (isBundle.value) lines.push("(Use the Mac key on a Mac and the iPad key on an iPad.)");
  }
  lines.push(
    "",
    "Download your license certificate (PDF):",
    LINK_PLACEHOLDER,
    "(The link is valid for 7 days.)",
    "",
    `To activate, open ${product.value}, open License from the plan chip next to the app name, then paste ${perDevice.value && !selectedKey.value ? "one key per device" : "the key"}. Please keep ${perDevice.value && !selectedKey.value ? "the keys" : "the key"} private.`,
    "",
    "Kind regards,",
    "PT Jendela Cakra Digital"
  );
  return lines.join("\n");
};
const refreshMessage = () => {
  if (!waEdited) wa.value.message = buildMessage();
};
refreshMessage();
watch(() => wa.value.recipient_name, refreshMessage);
// Another key (or the whole license): the message is rebuilt.
watch(keyId, () => {
  waEdited = false;
  refreshMessage();
});

const waNumber = computed(() => normalizeWhatsAppNumber(wa.value.phone));
const emailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.to.trim()));

const sendEmail = async () => {
  const cc = email.value.cc
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  busy.value = "email";
  try {
    await store.shareCertificateByEmail(props.license.id, {
      to: email.value.to.trim(),
      cc,
      recipient_name: email.value.recipient_name.trim() || null,
      message: email.value.message.trim() || null,
      key_id: keyId.value || undefined,
    });
    emit("shared", "email");
    await alertModal.alert(t("licenses.share.emailSent", { email: email.value.to.trim() }), { type: "success" });
    emit("close");
  } catch (error) {
    await alertModal.alert(errorMessage(error, t("licenses.share.emailFailed")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const openWhatsApp = async () => {
  // Opened before the request so the browser doesn't treat it as a popup.
  const win = window.open("", "_blank");
  busy.value = "whatsapp";
  try {
    const { url } = await store.createCertificateShareLink(props.license.id, wa.value.phone.trim() || null, keyId.value);
    const text = wa.value.message.includes(LINK_PLACEHOLDER) ? wa.value.message.replace(LINK_PLACEHOLDER, url) : `${wa.value.message}\n\n${url}`;
    const target = `https://wa.me/${waNumber.value}?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = target;
    else window.open(target, "_blank");
    emit("shared", "whatsapp");
    emit("close");
  } catch (error) {
    win?.close();
    await alertModal.alert(errorMessage(error, t("licenses.share.linkFailed")), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const tabs = [
  { key: "email", label: "Email", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
];
const keySelectOptions = computed(() => [
  { value: null, label: t("licenses.share.allKeys", { name: props.license.licensee_name }) },
  ...keyOptions.value.map((k) => ({ value: k.id, label: keyOptionLabel(k) })),
]);
</script>

<template>
  <UiModal
    :open="true"
    :title="$t('licenses.share.title')"
    :description="`${license.licensee_name} · ${selectedKey ? selectedKey.key : keys.map((k) => k.key).join(' + ')}`"
    size="md"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <!-- One key per device: the whole license or one key -->
      <UiSelect
        v-if="keyOptions.length"
        v-model="keyId"
        :label="$t('licenses.share.certificateFor')"
        :options="keySelectOptions"
        :hint="selectedKey ? $t('licenses.share.hintOneKey') : $t('licenses.share.hintAllKeys')"
      />

      <div class="flex p-1 bg-ui-subtle border border-ui-line rounded-ui-card" role="tablist" :aria-label="$t('licenses.share.shareBy')">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tab === t.key"
          @click="tab = t.key"
          class="flex-1 h-8 inline-flex items-center justify-center gap-2 rounded-ui-control text-ui-small font-medium transition-colors"
          :class="tab === t.key ? 'bg-ui-surface text-ui-ink shadow-ui-raised' : 'text-ui-muted hover:text-ui-ink'"
        >
          <component :is="t.icon" class="w-4 h-4" /> {{ t.label }}
        </button>
      </div>

      <!-- Email: the PDF goes as an attachment -->
      <form v-if="tab === 'email'" id="share-email-form" class="space-y-4" @submit.prevent="sendEmail">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiInput v-model="email.to" :label="$t('licenses.share.to')" required type="email" placeholder="name@example.com" autocomplete="email" />
          <UiInput v-model="email.recipient_name" :label="$t('licenses.share.recipientName')" :placeholder="$t('licenses.share.recipientPlaceholder')" />
        </div>
        <UiInput v-model="email.cc" label="CC" :hint="$t('licenses.share.ccHint')" placeholder="finance@example.com" />
        <UiInput v-model="email.message" :label="$t('licenses.share.personalMessage')" :rows="3" :placeholder="$t('licenses.share.personalMessagePlaceholder')" :hint="$t('common.states.optional')" />
        <p class="text-ui-cap text-ui-muted flex items-start gap-1.5">
          <Info class="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            <template v-if="selectedKey">{{ $t("licenses.share.emailInfoOneKey", { n: selectedKey.position }) }}</template>
            <template v-else-if="isBundle">{{ $t("licenses.share.emailInfoBundle") }}</template>
            <template v-else-if="perDevice">{{ $t("licenses.share.emailInfoKeys") }}</template>
            <template v-else>{{ $t("licenses.share.emailInfoKey") }}</template>
            {{ $t("licenses.share.replies") }}
          </span>
        </p>
      </form>

      <!-- WhatsApp: a prefilled message with a 7-day download link -->
      <form v-else id="share-wa-form" class="space-y-4" @submit.prevent="openWhatsApp">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UiInput v-model="wa.phone" :label="$t('licenses.share.whatsappNumber')" type="tel" placeholder="0812 3456 7890" autocomplete="tel" />
          <UiInput v-model="wa.recipient_name" :label="$t('licenses.share.recipientName')" :placeholder="$t('licenses.share.recipientPlaceholder')" />
        </div>
        <div>
          <label for="share-wa-message" class="block text-ui-small font-medium text-ui-ink mb-1.5">{{ $t("licenses.share.message") }}</label>
          <textarea
            id="share-wa-message"
            v-model="wa.message"
            rows="11"
            class="w-full px-3 py-2.5 bg-ui-surface text-ui-small text-ui-ink border border-ui-line-strong rounded-ui-control resize-y focus:outline-none focus:border-ui-accent focus:shadow-ui-focus"
            @input="waEdited = true"
          ></textarea>
          <p class="text-ui-cap text-ui-muted mt-1.5">
            <i18n-t keypath="licenses.share.linkHint" tag="span" scope="global">
              <template #link><span class="font-mono">{link}</span></template>
            </i18n-t>
          </p>
        </div>
        <p v-if="!waNumber" class="text-ui-cap text-ui-warn">{{ $t("licenses.share.noNumber") }}</p>
      </form>
    </div>

    <template #footer>
      <UiButton variant="secondary" @click="emit('close')">{{ $t("common.actions.cancel") }}</UiButton>
      <UiButton
        v-if="tab === 'email'"
        type="submit"
        form="share-email-form"
        :icon="Send"
        :loading="busy === 'email'"
        :disabled="!emailValid"
      >
        {{ busy === "email" ? $t("licenses.share.sending") : $t("licenses.share.sendEmail") }}
      </UiButton>
      <UiButton v-else type="submit" form="share-wa-form" :icon="ExternalLink" :loading="busy === 'whatsapp'">
        {{ busy === "whatsapp" ? $t("licenses.share.preparingLink") : $t("licenses.share.openWhatsapp") }}
      </UiButton>
    </template>
  </UiModal>
</template>
