export const PROJECT_TYPES = [
  "Website",
  "Web Application",
  "Mobile Application",
  "E-commerce",
  "SaaS",
  "AI Application",
  "Other",
];

export const FEATURE_OPTIONS = [
  "Authentication",
  "Admin Dashboard",
  "Payment Gateway",
  "Search",
  "Notifications",
  "Real-time Chat",
  "File Upload",
  "Maps",
  "AI Integration",
  "Analytics",
  "Third-party APIs",
];

export const USER_SCALES = [
  "Less than 100",
  "100–1,000",
  "1,000–10,000",
  "10,000+",
];

export const PLATFORMS = ["Web", "Android", "iOS"];

export function formatINR(value) {
  return "₹" + value.toLocaleString("en-IN");
}

export function formatRange(min, max) {
  return `${formatINR(min)} – ${formatINR(max)}`;
}

export function formatCompact(value) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${Math.round(value / 1000)}k`;
}

export const POPULAR_TECHS = [
  "Next.js",
  "Python / FastAPI",
  "Node.js",
  "React Native",
  "Flutter",
  "PostgreSQL",
  "MongoDB",
  "Supabase",
  "Firebase",
  "AWS",
  "Stripe",
  "OpenAI / LLM",
];

export const SUGGESTED_FEATURES = [
  "User Authentication",
  "Payment Processing",
  "Admin Dashboard",
  "Real-time Chat",
  "AI Integration",
  "Analytics & Reports",
  "Push Notifications",
  "File Upload",
  "Search & Filters",
];

/* ------------------------------------------------------------------ */
/* Backend API calls (replaces old localStorage logic)                */
/* ------------------------------------------------------------------ */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Calls backend to generate + save an estimate */
export async function generateEstimate(input) {
  const res = await fetch(`${API_URL}/api/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let detail = "Failed to generate estimate";
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // Keep the generic message when the backend did not return JSON.
    }
    throw new Error(detail);
  }
  return res.json();
}

/** Fetches all saved estimates from backend */
export async function listEstimates() {
  const res = await fetch(`${API_URL}/api/estimates`);
  if (!res.ok) throw new Error("Failed to fetch estimates");
  return res.json();
}

/** Fetches a single estimate by id */
export async function getEstimate(id) {
  const res = await fetch(`${API_URL}/api/estimates/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/** Clears all estimates in backend */
export async function clearEstimates() {
  const res = await fetch(`${API_URL}/api/estimates`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to clear estimates");
  return res.json();
}

/** Fetches currently active market rates */
export async function fetchMarketRates() {
  const res = await fetch(`${API_URL}/api/market-rates`);
  if (!res.ok) return null;
  return res.json();
}

/** Fetches market rate update status (source count, last update, etc.) */
export async function fetchMarketRateStatus() {
  const res = await fetch(`${API_URL}/api/market-rates/status`);
  if (!res.ok) return null;
  return res.json();
}