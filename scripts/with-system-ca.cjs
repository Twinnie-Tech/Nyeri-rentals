/**
 * Prefix NODE_OPTIONS with --use-system-ca for child Node processes.
 * Needed on Windows hosts where AV TLS interception breaks Sanity/provider HTTPS.
 *
 * Usage: node scripts/with-system-ca.cjs <command> [...args]
 */
const { spawn } = require("child_process");

const args = process.argv.slice(2);
if (!args.length) {
  console.error("Usage: node scripts/with-system-ca.cjs <command> [...args]");
  process.exit(1);
}

const flag = "--use-system-ca";
const env = { ...process.env };
const existing = env.NODE_OPTIONS || "";
if (!existing.split(/\s+/).includes(flag)) {
  env.NODE_OPTIONS = existing ? `${existing} ${flag}` : flag;
}

const child = spawn(args[0], args.slice(1), {
  stdio: "inherit",
  shell: true,
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
