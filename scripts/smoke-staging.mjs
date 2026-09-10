#!/usr/bin/env node
/**
 * Smoke-check a deployed GreenKey API (staging or prod).
 *
 * Usage:
 *   set SMOKE_API_URL=https://api-staging.example.com/v1
 *   node scripts/smoke-staging.mjs
 *
 * Or:
 *   node scripts/smoke-staging.mjs https://api-staging.example.com/v1
 */

const base = (process.argv[2] || process.env.SMOKE_API_URL || "")
  .trim()
  .replace(/\/$/, "");

if (!base) {
  console.error(
    "Usage: node scripts/smoke-staging.mjs <API_BASE_URL>\n" +
      "  e.g. node scripts/smoke-staging.mjs https://xxx.up.railway.app/v1",
  );
  process.exit(1);
}

const healthUrl = `${base}/health`;

async function main() {
  console.log(`GET ${healthUrl}`);
  const res = await fetch(healthUrl, {
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  console.log(`status: ${res.status}`);
  console.log(JSON.stringify(body, null, 2));

  const ok =
    res.ok &&
    body &&
    body.ok === true &&
    body.db === true &&
    body.redis === true;

  if (!ok) {
    console.error("\nFAIL — expected { ok: true, db: true, redis: true }");
    process.exit(1);
  }

  console.log("\nPASS — API health OK (db + redis)");
  console.log(`Swagger: ${base.replace(/\/v1$/, "")}/docs`);
}

main().catch((err) => {
  console.error("FAIL — request error:", err.message || err);
  process.exit(1);
});
