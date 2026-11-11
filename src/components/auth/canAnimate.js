// The auth panel's WebGL scenes only run on a desktop-size screen with
// WebGL, a capable device, no data saver and no "reduce motion".
export const canAnimate = () => {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia("(min-width: 1024px)").matches) return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if ((navigator.hardwareConcurrency || 4) < 4) return false;
  if (navigator.deviceMemory && navigator.deviceMemory < 4) return false;
  if (navigator.connection?.saveData) return false;
  try {
    const probe = document.createElement("canvas");
    return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
  } catch {
    return false;
  }
};
