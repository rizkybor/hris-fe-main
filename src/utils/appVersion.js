// The app version, from package.json (vite.config.js defines __APP_VERSION__).
// APP_VERSION_SHORT is what the UI shows, e.g. "3.3" -> "v3.3".
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0";
export const APP_VERSION_SHORT = APP_VERSION.split(".").slice(0, 2).join(".");
