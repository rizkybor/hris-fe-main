const hasFile = (value) => {
  if (value instanceof Blob) return true;
  if (Array.isArray(value)) return value.some(hasFile);
  if (value && typeof value === "object") return Object.values(value).some(hasFile);
  return false;
};

const append = (formData, key, value) => {
  if (value === undefined) return;

  if (value instanceof Blob) {
    formData.append(key, value);
  } else if (value === null || (Array.isArray(value) && value.length === 0)) {
    formData.append(key, "");
  } else if (typeof value === "boolean") {
    formData.append(key, value ? "1" : "0");
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => append(formData, `${key}[${index}]`, item));
  } else if (typeof value === "object") {
    Object.entries(value).forEach(([childKey, child]) => append(formData, `${key}[${childKey}]`, child));
  } else {
    formData.append(key, value);
  }
};

export function toRequestBody(payload) {
  if (payload instanceof FormData || !hasFile(payload)) return payload;

  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => append(formData, key, value));
  return formData;
}
