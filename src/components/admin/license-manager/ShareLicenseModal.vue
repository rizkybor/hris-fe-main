<script setup>
// Share a License Certificate: by email (the API attaches the PDF) or via
// WhatsApp (a 7-day download link in a prefilled message). A Mac + iPad
// bundle shares one certificate holding both keys.
import { computed, ref, watch } from "vue";
import { X, Mail, MessageCircle, Loader2, Send, ExternalLink, Info } from "lucide-vue-next";
import { useLicenseManagerStore } from "@/stores/licenseManager";
import { useAlertModalStore } from "@/stores/alertModal";
import { errorMessage } from "@/helpers/errorHelper";
import { normalizeWhatsAppNumber } from "@/utils/proposalShareMessage";
import { planLabel } from "@/components/admin/license-manager/licenseHelpers";

const props = defineProps({
  license: { type: Object, required: true },
  productName: { type: String, default: "" },
  initialTab: { type: String, default: "email" },
});
const emit = defineEmits(["close", "shared"]);

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
const contactName = computed(() => props.license.contact_name || props.license.licensee_name || "");

const email = ref({ to: props.license.licensee_email || "", recipient_name: contactName.value, cc: "", message: "" });
const wa = ref({ phone: props.license.phone || "", recipient_name: contactName.value, message: "" });
let waEdited = false;

const buildMessage = () => {
  const name = wa.value.recipient_name.trim();
  const lines = [name ? `Dear ${name},` : "Dear Sir/Madam,", "", `Thank you for choosing ${product.value}. Here is your ${product.value} ${planLabel(props.license)} license.`, ""];
  if (perDevice.value) {
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
    `To activate, open ${product.value}, open License from the plan chip next to the app name, then paste ${perDevice.value ? "one key per device" : "the key"}. Please keep ${perDevice.value ? "the keys" : "the key"} private.`,
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
    });
    emit("shared", "email");
    await alertModal.alert(`The certificate was sent to ${email.value.to.trim()}.`, { type: "success" });
    emit("close");
  } catch (error) {
    await alertModal.alert(errorMessage(error, "The email could not be sent."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const openWhatsApp = async () => {
  // Opened before the request so the browser doesn't treat it as a popup.
  const win = window.open("", "_blank");
  busy.value = "whatsapp";
  try {
    const { url } = await store.createCertificateShareLink(props.license.id, wa.value.phone.trim() || null);
    const text = wa.value.message.includes(LINK_PLACEHOLDER) ? wa.value.message.replace(LINK_PLACEHOLDER, url) : `${wa.value.message}\n\n${url}`;
    const target = `https://wa.me/${waNumber.value}?text=${encodeURIComponent(text)}`;
    if (win) win.location.href = target;
    else window.open(target, "_blank");
    emit("shared", "whatsapp");
    emit("close");
  } catch (error) {
    win?.close();
    await alertModal.alert(errorMessage(error, "The share link could not be created."), { type: "danger" });
  } finally {
    busy.value = "";
  }
};

const input =
  "w-full px-3.5 py-2.5 border border-[#DCDEDD] rounded-lg text-sm focus:border-[#0C51D9] focus:ring-1 focus:ring-[#0C51D9] outline-none";
</script>

<template>
  <div class="fixed inset-0 z-[99] flex items-center justify-center p-5">
    <div class="absolute inset-0 bg-brand-dark/40 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="relative z-10 bg-white rounded-[16px] w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-3 px-6 pt-5 pb-3">
        <div class="min-w-0">
          <h3 class="text-base font-bold text-brand-dark">Share License Certificate</h3>
          <p class="text-xs text-brand-light mt-0.5 truncate">
            {{ license.licensee_name }} · {{ keys.map((k) => k.key).join(" + ") }}
          </p>
        </div>
        <button type="button" @click="emit('close')" class="text-gray-400 hover:text-gray-600 shrink-0" aria-label="Close"><X class="w-5 h-5" /></button>
      </div>

      <div class="px-6 flex gap-1 border-b border-[#EEF0F2]">
        <button
          v-for="t in [{ key: 'email', label: 'Email', icon: Mail }, { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle }]"
          :key="t.key"
          type="button"
          @click="tab = t.key"
          class="px-3.5 py-2.5 -mb-px border-b-2 text-sm font-semibold inline-flex items-center gap-2"
          :class="tab === t.key ? 'border-[#0C51D9] text-[#0C51D9]' : 'border-transparent text-gray-500 hover:text-brand-dark'"
        >
          <component :is="t.icon" class="w-4 h-4" /> {{ t.label }}
        </button>
      </div>

      <!-- Email: the PDF goes as an attachment -->
      <form v-if="tab === 'email'" class="px-6 py-5 space-y-4" @submit.prevent="sendEmail">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-brand-dark mb-1.5 block">To <span class="text-red-500">*</span></label>
            <input v-model="email.to" type="email" placeholder="name@example.com" :class="input" />
          </div>
          <div>
            <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Recipient name</label>
            <input v-model="email.recipient_name" type="text" placeholder="e.g. Jane" :class="input" />
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-brand-dark mb-1.5 block">CC <span class="text-gray-400 font-normal">(optional, comma separated)</span></label>
          <input v-model="email.cc" type="text" placeholder="finance@example.com" :class="input" />
        </div>
        <div>
          <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Personal message <span class="text-gray-400 font-normal">(optional)</span></label>
          <textarea v-model="email.message" rows="3" placeholder="Added above the license details" :class="[input, 'resize-none']"></textarea>
        </div>
        <p class="text-[11px] text-gray-500 flex items-start gap-1.5">
          <Info class="w-3.5 h-3.5 shrink-0 mt-px" />
          The certificate PDF is attached{{ isBundle ? " (one PDF with the Mac and iPad keys)" : "" }}, with the key{{ isBundle ? "s" : "" }}, plan and validity in the email. Replies go to the company inbox.
        </p>
        <button
          type="submit"
          :disabled="busy === 'email' || !emailValid"
          class="w-full rounded-[12px] bg-[#0C51D9] hover:brightness-110 transition-all px-4 py-3 flex items-center justify-center gap-2 text-white text-sm font-bold disabled:opacity-50"
        >
          <Loader2 v-if="busy === 'email'" class="w-4 h-4 animate-spin" />
          <Send v-else class="w-4 h-4" />
          {{ busy === "email" ? "Sending..." : "Send Email" }}
        </button>
      </form>

      <!-- WhatsApp: a prefilled message with a 7-day download link -->
      <form v-else class="px-6 py-5 space-y-4" @submit.prevent="openWhatsApp">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-semibold text-brand-dark mb-1.5 block">WhatsApp number</label>
            <input v-model="wa.phone" type="tel" placeholder="0812 3456 7890" :class="input" />
          </div>
          <div>
            <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Recipient name</label>
            <input v-model="wa.recipient_name" type="text" placeholder="e.g. Jane" :class="input" />
          </div>
        </div>
        <div>
          <label class="text-xs font-semibold text-brand-dark mb-1.5 block">Message</label>
          <textarea v-model="wa.message" rows="11" :class="[input, 'resize-none text-[13px] leading-relaxed']" @input="waEdited = true"></textarea>
          <p class="text-[11px] text-gray-500 mt-1">
            <span class="font-mono">{link}</span> becomes a download link to the certificate PDF, valid for 7 days.
          </p>
        </div>
        <p v-if="!waNumber" class="text-[11px] text-amber-700">No number: WhatsApp opens so you can choose the chat.</p>
        <button
          type="submit"
          :disabled="busy === 'whatsapp'"
          class="w-full rounded-[12px] bg-[#25D366] hover:brightness-105 transition-all px-4 py-3 flex items-center justify-center gap-2 text-white text-sm font-bold disabled:opacity-50"
        >
          <Loader2 v-if="busy === 'whatsapp'" class="w-4 h-4 animate-spin" />
          <ExternalLink v-else class="w-4 h-4" />
          {{ busy === "whatsapp" ? "Preparing link..." : "Open WhatsApp" }}
        </button>
      </form>
    </div>
  </div>
</template>
