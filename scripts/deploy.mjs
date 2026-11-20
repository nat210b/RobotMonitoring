/**
 * Builds the app and packs everything needed to host it into ./deploy:
 *
 *   deploy/
 *     server.js, node_modules/, .next/   standalone server from `next build` (output: "standalone")
 *     .next/static/, public/             static files the server serves
 *     .env                               copied from the project's .env (MongoDB settings, PORT)
 *     start.mjs, package.json            `npm start` → loads .env, listens on every network interface
 *
 * Copy the deploy folder to the host machine (it needs Node.js, no `npm install`) and run `npm start` inside it.
 * Usage: npm run deploy
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const out = join(root, "deploy");
const standalone = join(root, ".next", "standalone");

const step = (text) => console.log(`\n▶ ${text}`);
const copy = (from, to) => cpSync(from, to, { recursive: true, dereference: true });

step("Building (next build)");
const build = spawnSync(process.execPath, ["--import", "./scripts/load-env.mjs", join("node_modules", "next", "dist", "bin", "next"), "build"], { stdio: "inherit", cwd: root });
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(join(standalone, "server.js"))) {
  console.error('No .next/standalone/server.js: check that next.config.ts has output: "standalone".');
  process.exit(1);
}

step("Writing ./deploy");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
copy(standalone, out);
copy(join(root, ".next", "static"), join(out, ".next", "static"));
if (existsSync(join(root, "public"))) copy(join(root, "public"), join(out, "public"));
copy(join(root, ".env.example"), join(out, ".env.example"));
const hasEnv = existsSync(join(root, ".env"));
if (hasEnv) copy(join(root, ".env"), join(out, ".env"));

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
writeFileSync(
  join(out, "package.json"),
  JSON.stringify({ name: `${pkg.name}-deploy`, version: pkg.version, private: true, scripts: { start: "node start.mjs" } }, null, 2) + "\n",
);
copy(join(root, "scripts", "deploy-start.mjs"), join(out, "start.mjs"));

console.log(`\n✔ Deploy folder ready: ${out}`);
if (!hasEnv) console.log("  ! No .env found: create deploy/.env from deploy/.env.example before starting.");
else console.log("  .env was copied: it holds the MongoDB password, so keep the deploy folder private.");
console.log("  On the host: copy the folder, then run `npm start` inside it (Node.js required, no npm install).");
