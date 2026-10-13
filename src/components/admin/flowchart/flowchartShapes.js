// Standard flowchart symbols. Each shape draws itself at the node's real
// pixel size (rather than a stretched 100x100 viewBox) so rounded ends,
// curves and the cylinder's ellipses never distort when a node is resized.
// `path(w, h)` returns the SVG elements as { tag, attrs } objects; FlowchartNode
// renders them and applies the node's fill/stroke.
const P = 1.5; // half the stroke width, so the outline isn't clipped at the edges

export const SHAPES = {
  terminator: {
    label: "Start / End",
    size: { width: 160, height: 56 },
    colors: { fill: "#DBEAFE", stroke: "#1D4ED8" },
    path: (w, h) => [{ tag: "rect", attrs: { x: P, y: P, width: w - P * 2, height: h - P * 2, rx: (h - P * 2) / 2 } }],
  },
  process: {
    label: "Process",
    size: { width: 160, height: 64 },
    colors: { fill: "#FFFFFF", stroke: "#334155" },
    path: (w, h) => [{ tag: "rect", attrs: { x: P, y: P, width: w - P * 2, height: h - P * 2, rx: 6 } }],
  },
  decision: {
    label: "Decision",
    size: { width: 150, height: 100 },
    colors: { fill: "#FEF3C7", stroke: "#B45309" },
    path: (w, h) => [{ tag: "polygon", attrs: { points: `${w / 2},${P} ${w - P},${h / 2} ${w / 2},${h - P} ${P},${h / 2}` } }],
  },
  io: {
    label: "Input / Output",
    size: { width: 170, height: 64 },
    colors: { fill: "#DCFCE7", stroke: "#15803D" },
    path: (w, h) => {
      const s = Math.min(24, w * 0.15);
      return [{ tag: "polygon", attrs: { points: `${s},${P} ${w - P},${P} ${w - s},${h - P} ${P},${h - P}` } }];
    },
  },
  document: {
    label: "Document",
    size: { width: 160, height: 80 },
    colors: { fill: "#F3E8FF", stroke: "#7E22CE" },
    path: (w, h) => [
      {
        tag: "path",
        attrs: {
          d: `M${P},${P} H${w - P} V${h * 0.8} Q${w * 0.75},${h * 0.6} ${w * 0.5},${h * 0.8} T${P},${h * 0.8} Z`,
        },
      },
    ],
    // Text sits in the flat part above the wavy bottom edge.
    labelBox: { bottom: "22%" },
  },
  database: {
    label: "Database",
    size: { width: 120, height: 96 },
    colors: { fill: "#E0F2FE", stroke: "#0369A1" },
    path: (w, h) => {
      const rx = w / 2 - P;
      const ry = Math.min(12, h * 0.15);
      return [
        {
          tag: "path",
          attrs: {
            d: `M${P},${ry + P} V${h - ry - P} A${rx},${ry} 0 0 0 ${w - P},${h - ry - P} V${ry + P}`,
          },
        },
        { tag: "ellipse", attrs: { cx: w / 2, cy: ry + P, rx, ry } },
      ];
    },
    labelBox: { top: "22%" },
  },
  subprocess: {
    label: "Predefined Process",
    size: { width: 170, height: 64 },
    colors: { fill: "#FFFFFF", stroke: "#334155" },
    path: (w, h) => [
      { tag: "rect", attrs: { x: P, y: P, width: w - P * 2, height: h - P * 2, rx: 4 } },
      { tag: "line", attrs: { x1: 14, y1: P, x2: 14, y2: h - P } },
      { tag: "line", attrs: { x1: w - 14, y1: P, x2: w - 14, y2: h - P } },
    ],
    labelBox: { left: "14px", right: "14px" },
  },
  preparation: {
    label: "Preparation",
    size: { width: 170, height: 64 },
    colors: { fill: "#FFE4E6", stroke: "#BE123C" },
    path: (w, h) => {
      const s = Math.min(22, w * 0.14);
      return [
        {
          tag: "polygon",
          attrs: { points: `${s},${P} ${w - s},${P} ${w - P},${h / 2} ${w - s},${h - P} ${s},${h - P} ${P},${h / 2}` },
        },
      ];
    },
  },
  connector: {
    label: "Connector",
    size: { width: 56, height: 56 },
    colors: { fill: "#F1F5F9", stroke: "#475569" },
    path: (w, h) => [{ tag: "ellipse", attrs: { cx: w / 2, cy: h / 2, rx: w / 2 - P, ry: h / 2 - P } }],
  },
  note: {
    label: "Note",
    size: { width: 170, height: 90 },
    colors: { fill: "#FEF9C3", stroke: "#A16207" },
    path: (w, h) => {
      const f = Math.min(16, w * 0.12, h * 0.2);
      return [
        { tag: "path", attrs: { d: `M${P},${P} H${w - f} L${w - P},${f} V${h - P} H${P} Z` } },
        { tag: "path", attrs: { d: `M${w - f},${P} V${f} H${w - P}`, fill: "none" } },
      ];
    },
  },
  text: {
    label: "Text",
    size: { width: 140, height: 40 },
    colors: { fill: "transparent", stroke: "transparent" },
    path: () => [],
  },
};

export const SHAPE_KEYS = Object.keys(SHAPES);

// Swatches offered in the properties panel, as fill/stroke pairs that read
// well together on both a screen and a print.
export const COLOR_PRESETS = [
  { fill: "#FFFFFF", stroke: "#334155" },
  { fill: "#DBEAFE", stroke: "#1D4ED8" },
  { fill: "#DCFCE7", stroke: "#15803D" },
  { fill: "#FEF3C7", stroke: "#B45309" },
  { fill: "#FFE4E6", stroke: "#BE123C" },
  { fill: "#F3E8FF", stroke: "#7E22CE" },
  { fill: "#E0F2FE", stroke: "#0369A1" },
  { fill: "#F1F5F9", stroke: "#475569" },
  { fill: "#0C51D9", stroke: "#0B1D51" },
  { fill: "#0F172A", stroke: "#0F172A" },
];

export const makeNode = (shape, position, id) => {
  const def = SHAPES[shape];
  return {
    id,
    type: "flowchart",
    position,
    style: { width: `${def.size.width}px`, height: `${def.size.height}px` },
    data: {
      shape,
      label: shape === "text" ? "Text" : def.label,
      fill: def.colors.fill,
      stroke: def.colors.stroke,
      textColor: "#0F172A",
      fontSize: 13,
      bold: false,
    },
  };
};
