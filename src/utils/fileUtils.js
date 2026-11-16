import { localeTag } from "@/i18n";

// "2,4 MB" / "2.4 MB" (the active language's decimal mark); "-" when unknown.
export const formatFileSize = (bytes) => {
  const value = Number(bytes);
  if (!bytes || !Number.isFinite(value) || value <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  const digits = unit === 0 ? 0 : size < 10 ? 1 : 0;
  return `${new Intl.NumberFormat(localeTag(), { maximumFractionDigits: digits }).format(size)} ${units[unit]}`;
};

// A small, compressed preview of a Cloudinary image (WebP/AVIF when the
// browser supports it), so a card cover never downloads the full upload.
// Anything that isn't a Cloudinary image URL is returned unchanged.
export const cloudinaryThumb = (url, { width = 640, height = 400 } = {}) => {
  if (!url || !/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/c_fill,g_auto,w_${width},h_${height},q_auto,f_auto/`);
};
