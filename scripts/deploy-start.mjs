/**
 * Start script of the deploy folder (copied there as start.mjs by `npm run deploy`; run with `npm start`).
 * Loads .env next to it, listens on every network interface so other machines on the LAN can connect,
 * prints the addresses, then runs the standalone Next.js server.
 */
import { existsSync, readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** KEY=value lines of .env (# comments, optional quotes). Variables already set in the shell win, except HOSTNAME. */
function readEnv(file) {
  if (!existsSync(file)) return {};
  const vars = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    vars[m[1]] = value;
  }
  return vars;
}

const env = readEnv(join(here, ".env"));
if (!Object.keys(env).length) console.warn("! No .env next to start.mjs: MongoDB settings are missing (see .env.example).");
for (const [key, value] of Object.entries(env)) if (process.env[key] === undefined) process.env[key] = value;
// Linux shells set HOSTNAME to the machine name, which would bind the server to one address only.
// Listen on all interfaces unless .env says otherwise.
process.env.HOSTNAME = env.HOSTNAME || "0.0.0.0";
process.env.PORT ||= "3000";
process.env.NODE_ENV = "production";

const port = process.env.PORT;
const lan = Object.values(networkInterfaces())
  .flat()
  .filter((a) => a && a.family === "IPv4" && !a.internal)
  .map((a) => `http://${a.address}:${port}`);
console.log(`Robot Monitoring starting on port ${port}`);
console.log(`  Local: http://localhost:${port}`);
for (const url of lan) console.log(`  LAN:   ${url}`);

await import(new URL("./server.js", import.meta.url).href);
