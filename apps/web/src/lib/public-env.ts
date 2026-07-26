export const PUBLIC_API_BASE_URL = (import.meta.env.PUBLIC_API_URL || "http://localhost:8787/api").replace(/\/$/, "");
export const PUBLIC_SITE_URL = (import.meta.env.PUBLIC_SITE_URL || "https://funsona.com").replace(/\/$/, "");

// The api Worker also serves R2-backed media at /media/*, alongside the
// /api/* routes — same origin, different path prefix.
export const PUBLIC_API_ORIGIN = PUBLIC_API_BASE_URL.replace(/\/api$/, "");
