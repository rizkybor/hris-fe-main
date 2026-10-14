import { toCanvas } from "html-to-image";
import { getRectOfNodes } from "@vue-flow/core";

// Both formats export one A4 page rendered at 150 DPI -- sharp enough to
// print, while keeping files small (a JPEG page is typically a few hundred KB).
const DPI = 150;
const MM_TO_PX = DPI / 25.4;
const A4_MM = { width: 210, height: 297 };
const JPEG_QUALITY = 0.82;

const PAGE_MARGIN_MM = 12;
// px around the shapes when captured -- wide enough for connectors that loop
// outside the shapes (an elbow connector swings ~20px past its shape).
const DIAGRAM_PADDING = 48;

// Editing chrome that shouldn't end up in the exported picture.
const EXCLUDED_CLASSES = [
  "vue-flow__handle",
  "vue-flow__resize-control",
  "vue-flow__nodesselection",
  "vue-flow__edgeupdater",
  // The invisible 20px-wide hit area around each connector.
  "vue-flow__edge-interaction",
];

const slugify = (name) =>
  (name || "flowchart")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "flowchart";

const pageSizeMm = (orientation) =>
  orientation === "landscape" ? { width: A4_MM.height, height: A4_MM.width } : { ...A4_MM };

/** Splits text into lines that fit maxWidth on the given canvas context. */
const wrapText = (ctx, text, maxWidth, maxLines) => {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  return lines;
};

const NAVY = "#0B1D51";
const BLUE = "#0C51D9";
const TEXT = "#1F2937";
const MUTED = "#64748B";
const RULE = "#DFE3EA";
const FONT = "Helvetica, Arial, sans-serif";
const COMPANY = "PT Jendela Cakra Digital";

const loadLogo = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // the page still renders without it
    img.src = "/images/jcd-only-color.png";
  });

const formatDate = (value, withTime = false) =>
  value
    ? new Date(value).toLocaleString("id-ID", withTime ? { dateStyle: "medium", timeStyle: "short" } : { day: "numeric", month: "long", year: "numeric" })
    : "-";

/** Shortens text with an ellipsis until it fits maxWidth. */
const fitText = (ctx, text, maxWidth) => {
  let t = String(text ?? "");
  if (ctx.measureText(t).width <= maxWidth) return t;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t}…`;
};

const line = (ctx, x1, y1, x2, y2, color = RULE, width = 2) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/**
 * One A4 page laid out like JCD's other documents (solid navy/blue, thin
 * rules, no gradients): company header, title, a details row (who made it,
 * when, who it's prepared for, who owns it), the diagram in a light frame,
 * and a copyright/confidentiality footer. Returns the page as a canvas.
 *
 * meta: { id, preparedFor, createdBy, createdAt, updatedAt }
 */
async function renderA4Page(vueFlowEl, nodes, { name, description, orientation, meta = {} }) {
  if (!nodes.length) throw new Error("The flowchart is empty -- add a shape before exporting.");

  const pageMm = pageSizeMm(orientation);
  const pageW = Math.round(pageMm.width * MM_TO_PX);
  const pageH = Math.round(pageMm.height * MM_TO_PX);
  const margin = Math.round(14 * MM_TO_PX);
  const contentW = pageW - margin * 2;

  const page = document.createElement("canvas");
  page.width = pageW;
  page.height = pageH;
  const ctx = page.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, pageW, pageH);
  ctx.textBaseline = "top";
  const spaced = (px) => {
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`;
  };

  // ---------- Header ----------
  let y = margin;
  const logo = await loadLogo();
  let textX = margin;
  if (logo) {
    const h = 48;
    ctx.drawImage(logo, margin, y, (logo.width / logo.height) * h, h);
    textX = margin + (logo.width / logo.height) * h + 14;
  }
  ctx.fillStyle = NAVY;
  ctx.font = `bold 17px ${FONT}`;
  spaced(1.6);
  ctx.fillText("PT JENDELA CAKRA DIGITAL", textX, y + 6);
  spaced(0);
  ctx.fillStyle = MUTED;
  ctx.font = `14px ${FONT}`;
  ctx.fillText("Software House & Digital Agency", textX, y + 29);

  ctx.textAlign = "right";
  ctx.fillStyle = BLUE;
  ctx.font = `bold 14px ${FONT}`;
  spaced(3);
  ctx.fillText("FLOWCHART", pageW - margin, y + 6);
  spaced(0);
  ctx.fillStyle = MUTED;
  ctx.font = `14px ${FONT}`;
  ctx.fillText(meta.id ? `No. FC-${String(meta.id).padStart(4, "0")}` : "Draf (belum disimpan)", pageW - margin, y + 29);
  ctx.textAlign = "left";

  y += 64;
  line(ctx, margin, y, pageW - margin, y);
  y += 30;

  // ---------- Title ----------
  ctx.fillStyle = NAVY;
  ctx.font = `bold 34px ${FONT}`;
  for (const l of wrapText(ctx, name || "Flowchart", contentW, 2)) {
    ctx.fillText(l, margin, y);
    y += 42;
  }
  if (description) {
    y += 2;
    ctx.fillStyle = MUTED;
    ctx.font = `18px ${FONT}`;
    for (const l of wrapText(ctx, description, contentW, 2)) {
      ctx.fillText(l, margin, y);
      y += 26;
    }
  }
  y += 18;

  // ---------- Details ----------
  const details = [
    ["DIBUAT OLEH", meta.createdBy || "-"],
    ["TANGGAL DIBUAT", formatDate(meta.createdAt)],
    ["DISIAPKAN UNTUK", meta.preparedFor || "-"],
    ["PEMEGANG HAK", COMPANY],
  ];
  line(ctx, margin, y, pageW - margin, y);
  const cellW = contentW / details.length;
  details.forEach(([label, value], i) => {
    const x = margin + i * cellW;
    ctx.fillStyle = MUTED;
    ctx.font = `bold 11px ${FONT}`;
    spaced(1.2);
    ctx.fillText(label, x, y + 14);
    spaced(0);
    ctx.fillStyle = TEXT;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(fitText(ctx, value, cellW - 16), x, y + 34);
  });
  y += 64;
  line(ctx, margin, y, pageW - margin, y);
  y += 22;

  // ---------- Footer (drawn first so the diagram knows its space) ----------
  const footerTop = pageH - margin - 56;
  line(ctx, margin, footerTop, pageW - margin, footerTop);
  const year = new Date(meta.createdAt || Date.now()).getFullYear();
  const licence = meta.preparedFor
    ? `© ${year} ${COMPANY}. Dokumen ini disiapkan khusus untuk ${meta.preparedFor} dan bersifat rahasia. Dilarang menggandakan atau menyebarluaskan tanpa izin tertulis dari ${COMPANY}.`
    : `© ${year} ${COMPANY}. Dokumen ini bersifat rahasia. Dilarang menggandakan atau menyebarluaskan tanpa izin tertulis dari ${COMPANY}.`;
  const rightW = 300;
  ctx.fillStyle = MUTED;
  ctx.font = `13px ${FONT}`;
  let fy = footerTop + 14;
  for (const l of wrapText(ctx, licence, contentW - rightW - 24, 3)) {
    ctx.fillText(l, margin, fy);
    fy += 18;
  }
  ctx.textAlign = "right";
  ctx.fillText(`Diekspor ${formatDate(new Date(), true)}`, pageW - margin, footerTop + 14);
  if (meta.updatedAt) ctx.fillText(`Diperbarui ${formatDate(meta.updatedAt, true)}`, pageW - margin, footerTop + 32);
  ctx.textAlign = "left";

  // ---------- Diagram frame ----------
  const frameX = margin;
  const frameY = y;
  const frameW = contentW;
  const frameH = footerTop - 22 - frameY;
  roundRect(ctx, frameX, frameY, frameW, frameH, 10);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = 2;
  ctx.stroke();

  const inner = 24;
  const areaW = frameW - inner * 2;
  const areaH = frameH - inner * 2;

  // Diagram, captured at just the resolution the page needs (never more,
  // which is what keeps the file small) and centered in the frame.
  const bounds = getRectOfNodes(nodes);
  const diagramW = Math.ceil(bounds.width + DIAGRAM_PADDING * 2);
  const diagramH = Math.ceil(bounds.height + DIAGRAM_PADDING * 2);
  const scale = Math.min(areaW / diagramW, areaH / diagramH, 2);

  const pane = vueFlowEl.querySelector(".vue-flow__transformationpane");
  vueFlowEl.classList.add("fc-exporting");
  let diagram;
  try {
    diagram = await toCanvas(pane, {
      backgroundColor: "#FFFFFF",
      width: diagramW,
      height: diagramH,
      pixelRatio: scale,
      style: {
        width: `${diagramW}px`,
        height: `${diagramH}px`,
        transform: `translate(${DIAGRAM_PADDING - bounds.x}px, ${DIAGRAM_PADDING - bounds.y}px) scale(1)`,
      },
      filter: (el) => !EXCLUDED_CLASSES.some((cls) => el.classList?.contains(cls)),
    });
  } finally {
    vueFlowEl.classList.remove("fc-exporting");
  }

  const drawW = diagramW * scale;
  const drawH = diagramH * scale;
  ctx.drawImage(diagram, frameX + inner + (areaW - drawW) / 2, frameY + inner + (areaH - drawH) / 2, drawW, drawH);

  return { page, pageMm };
}

export async function exportFlowchartJpg(vueFlowEl, nodes, { name, description, orientation, meta }) {
  const { page } = await renderA4Page(vueFlowEl, nodes, { name, description, orientation, meta });
  const link = document.createElement("a");
  link.download = `${slugify(name)}.jpg`;
  link.href = page.toDataURL("image/jpeg", JPEG_QUALITY);
  link.click();
}

export async function exportFlowchartPdf(vueFlowEl, nodes, { name, description, orientation, meta }) {
  const { page, pageMm } = await renderA4Page(vueFlowEl, nodes, { name, description, orientation, meta });
  // Loaded on demand: jsPDF is large and only needed at the moment of export.
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  // Shown in the PDF viewer's document properties.
  pdf.setProperties({
    title: name || "Flowchart",
    subject: meta?.preparedFor ? `Flowchart untuk ${meta.preparedFor}` : "Flowchart",
    author: meta?.createdBy ? `${meta.createdBy}, PT Jendela Cakra Digital` : "PT Jendela Cakra Digital",
    creator: "PT Jendela Cakra Digital",
    keywords: "flowchart, PT Jendela Cakra Digital",
  });
  pdf.addImage(page.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", 0, 0, pageMm.width, pageMm.height, undefined, "FAST");
  pdf.save(`${slugify(name)}.pdf`);
}

// Max width of the snapshot embedded in other documents (Proposal
// Penawaran) -- sharp at A4 width without making uploads heavy.
const PREVIEW_MAX_WIDTH = 1600;

/**
 * PNG snapshot of the whole diagram on white, cropped to the shapes (no
 * page, title or margins) -- stored with the flowchart so other documents
 * can show it. Returns null for an empty diagram.
 */
export async function renderFlowchartPreview(vueFlowEl, nodes) {
  if (!vueFlowEl || !nodes.length) return null;

  const bounds = getRectOfNodes(nodes);
  const width = Math.ceil(bounds.width + DIAGRAM_PADDING * 2);
  const height = Math.ceil(bounds.height + DIAGRAM_PADDING * 2);
  const pixelRatio = Math.min(2, PREVIEW_MAX_WIDTH / width);

  const pane = vueFlowEl.querySelector(".vue-flow__transformationpane");
  vueFlowEl.classList.add("fc-exporting");
  try {
    const canvas = await toCanvas(pane, {
      backgroundColor: "#FFFFFF",
      width,
      height,
      pixelRatio,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${DIAGRAM_PADDING - bounds.x}px, ${DIAGRAM_PADDING - bounds.y}px) scale(1)`,
      },
      filter: (el) => !EXCLUDED_CLASSES.some((cls) => el.classList?.contains(cls)),
    });
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  } finally {
    vueFlowEl.classList.remove("fc-exporting");
  }
}
