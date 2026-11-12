// v-count-up: the numbers in an element's text count up when they appear
// (from 0) or change (from the previous value), keeping their formatting:
// "Rp 19.404.167", "87%", "26 jam / 30 jam", "3,5". Only the digits in the
// element's text nodes are rewritten, for ~0.7 s, so any icons or buttons
// inside stay untouched. Skipped when the device asks for reduced motion
// or the tab is hidden; anything that isn't clearly a number (dates,
// times with a leading zero) is left as is.
//
//   <p v-count-up>{{ value }}</p>

const DURATION = 700;
const TOKEN = /\d+(?:[.,]\d+)*/g;
const reduceMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const easeOut = (x) => 1 - (1 - x) ** 3;

const group = (n, sep) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);

// A number token, how to read it, and how to write a value back in the
// same style. null: leave it alone.
const parse = (tok) => {
  if (/^0\d/.test(tok)) return null; // 07, 05:30, 01.11.2026 -- not a count
  const grouped = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/.exec(tok);
  if (grouped) return { value: Number(tok.replace(/[.,]/g, "")), write: (v) => group(Math.round(v), grouped[1]) };
  const decimal = /^(\d+)([.,])(\d+)$/.exec(tok);
  if (decimal) {
    const places = decimal[3].length;
    return { value: Number(`${decimal[1]}.${decimal[3]}`), write: (v) => v.toFixed(places).replace(".", decimal[2]) };
  }
  if (/^\d+$/.test(tok)) return { value: Number(tok), write: (v) => String(Math.round(v)) };
  return null;
};

const textNodes = (el) => {
  const nodes = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (/\d/.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
  return nodes;
};

const run = (el) => {
  const state = el.__countUp;
  // Mid-count the text is a half-way number: a re-render then isn't a new
  // value (if Vue did change the digits, the loop notices and stops).
  if (state.animating) return;
  const target = el.textContent;
  if (target === state.target) return;
  state.target = target;
  cancelAnimationFrame(state.raf);
  if (reduceMotion() || document.hidden) {
    state.values = [];
    return;
  }

  // Each text node: its final text and the numbers in it.
  let index = 0;
  const parts = textNodes(el).map((node) => {
    const final = node.nodeValue;
    const tokens = [];
    final.replace(TOKEN, (tok, at) => {
      const parsed = parse(tok);
      if (parsed) tokens.push({ at, length: tok.length, ...parsed, from: state.values[index] ?? 0, i: index });
      index++;
      return tok;
    });
    return { node, final, tokens, written: final };
  });
  const values = [];
  parts.forEach((p) => p.tokens.forEach((tk) => (values[tk.i] = tk.value)));
  state.values = values;
  if (!parts.some((p) => p.tokens.some((tk) => tk.value !== tk.from))) return;

  const start = performance.now();
  state.animating = true;
  const frame = (now) => {
    const k = easeOut(Math.min(1, (now - start) / DURATION));
    let alive = false;
    for (const p of parts) {
      // Vue changed the text meanwhile: that newer value wins, stop here.
      if (p.node.nodeValue !== p.written) continue;
      alive = true;
      let text = p.final;
      for (let t = p.tokens.length - 1; t >= 0; t--) {
        const tk = p.tokens[t];
        const v = k >= 1 ? tk.value : tk.from + (tk.value - tk.from) * k;
        text = text.slice(0, tk.at) + (k >= 1 ? p.final.substr(tk.at, tk.length) : tk.write(v)) + text.slice(tk.at + tk.length);
      }
      p.node.nodeValue = text;
      p.written = text;
    }
    if (alive && k < 1) state.raf = requestAnimationFrame(frame);
    else {
      state.animating = false;
      state.target = el.textContent;
    }
  };
  state.raf = requestAnimationFrame(frame);
};

export default {
  mounted(el) {
    el.__countUp = { target: null, values: [], raf: 0, animating: false };
    run(el);
  },
  updated(el) {
    run(el);
  },
  beforeUnmount(el) {
    cancelAnimationFrame(el.__countUp?.raf);
  },
};
