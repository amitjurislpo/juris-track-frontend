// The end-to-end test environment, separate from development data. Playwright starts both parts (playwright.config.ts):
//   node scripts/e2e-env.mjs backend    the API from the backend checkout (BACKEND_REPO, default ../juris-track-backend): database
//                                       "<db>_e2e" reset + demo seed, API on :8083; uploaded files go to a temp folder
//   node scripts/e2e-env.mjs frontend   `vite build` into dist-e2e (rebuilt when src/ changed), served on :3008 with /api
//                                       proxied to :8083
// E2E_BUILD=1 rebuilds the API jar and the SPA first. No email is sent (no SMTP); every sign-in code is 000000.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { backendRepo, devSettings } from "./backend-config.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const win = process.platform === "win32";
const E2E = { api: 8083, web: 3008 };

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: win, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const newest = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((m, e) => {
  const p = path.join(dir, e.name);
  return Math.max(m, e.isDirectory() ? newest(p) : statSync(p).mtimeMs);
}, 0);

/** postgresql://u:p@host:port/db → the same server, database "db_e2e". */
function e2eDatabaseUrl(devUrl) {
  const url = new URL(devUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}_e2e`;
  url.search = "";
  return url;
}

async function ensureDatabase(devUrl, e2eUrl) {
  const admin = new URL(devUrl);
  admin.search = "";
  const c = new pg.Client({ connectionString: admin.toString() });
  await c.connect();
  try {
    const name = e2eUrl.pathname.slice(1);
    const r = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (!r.rowCount) await c.query(`CREATE DATABASE "${name.replace(/"/g, "")}"`);
  } finally {
    await c.end();
  }
}

/** The API jar of the backend checkout, built with its Maven Wrapper when missing (or with E2E_BUILD=1). */
function apiJar() {
  const backend = path.join(backendRepo, "backend");
  const find = () => readdirSync(path.join(backend, "target")).find((f) => /^juristrack-backend-.*\.jar$/.test(f) && !f.endsWith(".original"));
  if (!existsSync(path.join(backend, "target")) || !find() || process.env.E2E_BUILD === "1") {
    const env = { ...process.env };
    // a stale JAVA_HOME (JDK since upgraded) breaks the wrapper; fall back to the java on PATH
    if (env.JAVA_HOME && !existsSync(env.JAVA_HOME)) delete env.JAVA_HOME;
    run(win ? `"${path.join(backend, "mvnw.cmd")}"` : "./mvnw", ["-q", "-DskipTests", "package"], { cwd: backend, env });
  }
  return path.join(backend, "target", find());
}

async function backend() {
  const devUrl = devSettings().databaseUrl;
  const url = e2eDatabaseUrl(devUrl);
  await ensureDatabase(devUrl, url);
  // run a copy: rebuilding the backend while the tests run must not touch the jar in use
  const dir = path.join(os.tmpdir(), "juristrack-e2e");
  mkdirSync(dir, { recursive: true });
  const copy = path.join(dir, "backend.jar");
  copyFileSync(apiJar(), copy);
  const env = {
    ...process.env,
    SPRING_PROFILES_ACTIVE: "dev",
    SPRING_DATASOURCE_URL: `jdbc:postgresql://${url.host}${url.pathname}?currentSchema=public`,
    SPRING_DATASOURCE_USERNAME: decodeURIComponent(url.username),
    SPRING_DATASOURCE_PASSWORD: decodeURIComponent(url.password),
    SERVER_PORT: String(E2E.api),
    JURISTRACK_APP_URL: `http://localhost:${E2E.web}`,
    JURISTRACK_FRONTEND_ORIGIN: `http://localhost:${E2E.web}`,
    JURISTRACK_STORAGE_DIR: path.join(dir, "files"),
    JURISTRACK_SEED_DEMO: "true",
    JURISTRACK_MAIL_HOST: "",
    // sign-in is by emailed code; in the e2e environment every code is 000000 and requests are not throttled
    JURISTRACK_OTP_FIXED_CODE: "000000",
    JURISTRACK_OTP_REQUESTS_PER_IP: "100000",
    JURISTRACK_OTP_REQUESTS_PER_EMAIL: "100000",
  };
  // the dev-only reset command empties the e2e database, migrates it and seeds the demo data
  run("java", ["-jar", copy, "reset"], { cwd: dir, env });
  // run the scheduled jobs once (absences, the monthly lock, accrual) so the demo data is in its settled state
  run("java", ["-jar", copy, "jobs"], { cwd: dir, env });
  const server = spawn("java", ["-jar", copy], { cwd: dir, env, stdio: "inherit", shell: win });
  server.on("exit", (code) => process.exit(code ?? 0));
}

function frontend() {
  const dist = "dist-e2e";
  const env = { ...process.env, BACKEND_URL: `http://127.0.0.1:${E2E.api}`, WEB_PORT: String(E2E.web), BUILD_DIR: dist, VITE_DEV_OTP_CODE: "000000" };
  const built = path.join(root, dist, "index.html");
  const sources = Math.max(newest(path.join(root, "src")), statSync(path.join(root, "index.html")).mtimeMs, statSync(path.join(root, "vite.config.ts")).mtimeMs);
  if (!existsSync(built) || statSync(built).mtimeMs < sources || process.env.E2E_BUILD === "1") run("npx", ["vite", "build"], { cwd: root, env });
  const web = spawn("npx", ["vite", "preview", "--port", String(E2E.web), "--strictPort"], { cwd: root, env, stdio: "inherit", shell: win });
  web.on("exit", (code) => process.exit(code ?? 0));
}

const what = process.argv[2];
if (what === "backend") await backend();
else if (what === "frontend") frontend();
else {
  console.error("usage: node scripts/e2e-env.mjs backend|frontend");
  process.exit(2);
}
