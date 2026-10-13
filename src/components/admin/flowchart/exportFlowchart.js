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

/**
 * Draws the whole diagram (not just the visible part of the canvas) onto one
 * A4 page with the flowchart's name as a heading, scaled to fit. Returns the
 * page as a canvas.
 */
async function renderA4Page(vueFlowEl, nodes, { name, description, orientation }) {
  if (!nodes.length) throw new Error("The flowchart is empty -- add a shape before exporting.");

  const pageMm = pageSizeMm(orientation);
  const pageW = Math.round(pageMm.width * MM_TO_PX);
  const pageH = Math.round(pageMm.height * MM_TO_PX);
  const margin = Math.round(PAGE_MARGIN_MM * MM_TO_PX);

  const page = document.createElement("canvas");
  page.width = pageW;
  page.height = pageH;
  const ctx = page.getContext("2d");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, pageW, pageH);

  // Heading
  const font = "Helvetica, Arial, sans-serif";
  let y = margin;
  ctx.fillStyle = "#0F172A";
  ctx.font = `bold 30px ${font}`;
  ctx.textBaseline = "top";
  ctx.fillText(name || "Flowchart", margin, y, pageW - margin * 2);
  y += 40;

  if (description) {
    ctx.fillStyle = "#64748B";
    ctx.font = `20px ${font}`;
    for (const line of wrapText(ctx, description, pageW - margin * 2, 2)) {
      ctx.fillText(line, margin, y);
      y += 26;
    }
  }

  y += 6;
  ctx.strokeStyle = "#DCDEDD";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(margin, y);
  ctx.lineTo(pageW - margin, y);
  ctx.stroke();
  y += 20;

  // Footer
  const footerH = 30;
  ctx.fillStyle = "#94A3B8";
  ctx.font = `16px ${font}`;
  ctx.textBaseline = "bottom";
  const exportedAt = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  ctx.fillText(`Exported ${exportedAt}`, margin, pageH - margin + 10);

  // Diagram, captured at just the resolution the page needs (never more,
  // which is what keeps the file small) and centered in the space left.
  const areaW = pageW - margin * 2;
  const areaH = pageH - y - margin - footerH;
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
  ctx.drawImage(diagram, margin + (areaW - drawW) / 2, y + (areaH - drawH) / 2, drawW, drawH);

  return { page, pageMm };
}

export async function exportFlowchartJpg(vueFlowEl, nodes, { name, description, orientation }) {
  const { page } = await renderA4Page(vueFlowEl, nodes, { name, description, orientation });
  const link = document.createElement("a");
  link.download = `${slugify(name)}.jpg`;
  link.href = page.toDataURL("image/jpeg", JPEG_QUALITY);
  link.click();
}

export async function exportFlowchartPdf(vueFlowEl, nodes, { name, description, orientation }) {
  const { page, pageMm } = await renderA4Page(vueFlowEl, nodes, { name, description, orientation });
  // Loaded on demand: jsPDF is large and only needed at the moment of export.
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true });
  pdf.addImage(page.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", 0, 0, pageMm.width, pageMm.height, undefined, "FAST");
  pdf.save(`${slugify(name)}.pdf`);
}
