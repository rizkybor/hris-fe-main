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

// Shrinks a photo in the browser before it is uploaded: at most `maxSide`
// pixels on the longest side, re-encoded as JPEG. Keeps the original when
// it's not a decodable image or already smaller than the result.
export const compressImage = async (file, { maxSide = 1600, quality = 0.8 } = {}) => {
  if (!file?.type?.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // transparent PNG areas become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return file;
  }
};
