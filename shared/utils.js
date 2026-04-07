function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function decodeHtmlEntities(value = "") {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function stripHtml(value = "") {
  return decodeHtmlEntities(value)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function normalizeDetailContent(value = "", fallback = "") {
  const normalized = stripHtml(value);

  if (normalized) {
    return normalized;
  }

  return stripHtml(fallback);
}

function formatPrice(value) {
  return Number(value || 0).toFixed(2);
}

function formatDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + " " + [pad(date.getHours()), pad(date.getMinutes())].join(":");
}

function generateId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function requireString(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizePageOptions(options = {}) {
  return {
    page: Math.max(1, Number(options.page || 1)),
    pageSize: Math.min(100, Math.max(1, Number(options.pageSize || 20)))
  };
}

function paginateList(list, options = {}) {
  const { page, pageSize } = normalizePageOptions(options);
  const start = (page - 1) * pageSize;

  return {
    list: list.slice(start, start + pageSize),
    page,
    pageSize,
    total: list.length
  };
}

module.exports = {
  cloneData,
  stripHtml,
  normalizeDetailContent,
  formatPrice,
  formatDateTime,
  generateId,
  requireString,
  normalizePageOptions,
  paginateList
};
