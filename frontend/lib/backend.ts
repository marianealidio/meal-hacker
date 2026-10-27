/** Django origin for server-side calls and the Next rewrites; one default for both. */
export const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
