// Freedom Tracker website Worker. Handles /buy only.
// 302 to the current Lemon Squeezy checkout, passing sanitized utm_* as
// checkout custom data, and recording a privacy-safe click count
// (Analytics Engine: event + utm only; no IP, no user agent).
// All other paths are served as static assets (run_worker_first is only /buy).

const CHECKOUT_URL =
  "https://myfreedomtracker.lemonsqueezy.com/checkout/buy/b5c94c88-7001-4b82-ab40-a8d8d448f067";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
const SAFE = /^[a-z0-9-]{1,40}$/;

function cleanUtm(url) {
  const out = {};
  for (const k of UTM_KEYS) {
    const v = (url.searchParams.get(k) || "").toLowerCase();
    if (SAFE.test(v)) out[k] = v;
  }
  return out;
}

function record(env, utm) {
  if (!env.FT_EVENTS) return;
  env.FT_EVENTS.writeDataPoint({
    blobs: [
      "buy_click",
      utm.utm_source || "",
      utm.utm_medium || "",
      utm.utm_campaign || "",
      utm.utm_content || "",
    ],
    doubles: [1],
    indexes: ["buy_click"],
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/buy") {
      const utm = cleanUtm(url);
      const target = new URL(CHECKOUT_URL);
      for (const [k, v] of Object.entries(utm)) {
        target.searchParams.set(`checkout[custom][${k}]`, v);
      }
      record(env, utm);
      return new Response(null, {
        status: 302,
        headers: {
          Location: target.toString(),
          "Cache-Control": "no-store",
        },
      });
    }

    // Safety net: if any other path reaches the Worker, serve the
    // existing static asset unchanged (no HTML rewriting).
    return env.ASSETS.fetch(request);
  },
};
