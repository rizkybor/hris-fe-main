// WhatsApp share helpers for a Proposal Penawaran.

// "0812-3456-7890" / "+62 812..." / "812..." -> "62812..." (wa.me format).
export const normalizeWhatsAppNumber = (phone) => {
  let digits = String(phone || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  return digits;
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }) : null;

// The prefilled WhatsApp message -- formal Indonesian business tone, with
// *bold* (WhatsApp markup) for the proposal title and client.
export const buildWhatsAppMessage = ({ proposal, url, recipientName }) => {
  const greeting = recipientName?.trim() ? `Yth. ${recipientName.trim()},` : "Yth. Bapak/Ibu,";
  const expires = formatDate(proposal?.share?.expires_at);
  const lines = [
    greeting,
    "",
    `Terima kasih atas waktu dan kesempatan yang telah diberikan kepada kami. Bersama pesan ini, kami sampaikan Proposal Penawaran *${proposal.title}* yang kami susun untuk *${proposal.client_name}*.`,
    "",
    "Proposal dapat dibuka dan diunduh melalui tautan berikut:",
    url,
  ];
  if (expires) lines.push(`(Tautan berlaku hingga ${expires})`);
  lines.push(
    "",
    "Apabila ada pertanyaan atau bagian yang ingin disesuaikan, kami dengan senang hati membantu. Kami juga siap melakukan presentasi singkat untuk menjelaskan penawaran ini secara langsung.",
    "",
    "Hormat kami,"
  );
  if (proposal.signatory_name) lines.push(proposal.signatory_name);
  if (proposal.signatory_title) lines.push(proposal.signatory_title);
  lines.push("PT Jendela Cakra Digital");
  return lines.join("\n");
};
