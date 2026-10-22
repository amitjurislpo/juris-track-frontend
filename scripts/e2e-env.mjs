// The end-to-end test environment, separate from development data. Playwright starts both parts (playwright.config.ts):
//   node scripts/e2e-env.mjs backend    the API from the backend checkout (BACKEND_REPO, default ../juris-track-backend): database
//                                       "<db>_e2e" reset + demo seed, API on :8083
//   node scripts/e2e-env.mjs frontend   `vite build` into dist-e2e (rebuilt when src/ changed), served on :3008 with /api
//                                       proxied to :8083
// E2E_BUILD=1 rebuilds the API jar and the SPA first. No email is sent (no SMTP; the API logs it); every sign-in code is 000000.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { backendRepo, devSettings } from "./backend-config.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";
const E2E_PORTS = { api: 8083, web: 3008 };
/** The access token's lifetime in the e2e API (normally 5 minutes): short, so the tests see the silent session refresh. Same value in tests/e2e/helpers.ts. */
const ACCESS_TOKEN_TTL_SECONDS = 15;

function run(command, commandArguments, options) {
  const result = spawnSync(command, commandArguments, { stdio: "inherit", shell: isWindows, ...options });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** The newest modification time of any file under `directory`. */
const newestModification = (directory) => readdirSync(directory, { withFileTypes: true }).reduce((newest, entry) => {
  const entryPath = path.join(directory, entry.name);
  return Math.max(newest, entry.isDirectory() ? newestModification(entryPath) : statSync(entryPath).mtimeMs);
}, 0);

/** postgresql://user:password@host:port/db -> the same server, database "db_e2e". */
function e2eDatabaseUrl(developmentUrl) {
  const url = new URL(developmentUrl);
  url.pathname = `/${url.pathname.replace(/^\//, "")}_e2e`;
  url.search = "";
  return url;
}

async function ensureDatabase(developmentUrl, e2eUrl) {
  const serverUrl = new URL(developmentUrl);
  serverUrl.search = "";
  const client = new pg.Client({ connectionString: serverUrl.toString() });
  await client.connect();
  try {
    const databaseName = e2eUrl.pathname.slice(1);
    const existing = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (!existing.rowCount) await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, "")}"`);
  } finally {
    await client.end();
  }
}

/** The API jar of the backend checkout, built with its Maven Wrapper when missing (or with E2E_BUILD=1). */
function apiJar() {
  const backendFolder = path.join(backendRepo, "backend");
  const findJar = () => readdirSync(path.join(backendFolder, "target")).find((fileName) => /^juristrack-backend-.*\.jar$/.test(fileName) && !fileName.endsWith(".original"));
  if (!existsSync(path.join(backendFolder, "target")) || !findJar() || process.env.E2E_BUILD === "1") {
    const environment = { ...process.env };
    // a stale JAVA_HOME (JDK since upgraded) breaks the wrapper; fall back to the java on PATH
    if (environment.JAVA_HOME && !existsSync(environment.JAVA_HOME)) delete environment.JAVA_HOME;
    run(isWindows ? `"${path.join(backendFolder, "mvnw.cmd")}"` : "./mvnw", ["-q", "-DskipTests", "package"], { cwd: backendFolder, env: environment });
  }
  return path.join(backendFolder, "target", findJar());
}

async function backend() {
  const developmentUrl = devSettings().databaseUrl;
  const url = e2eDatabaseUrl(developmentUrl);
  await ensureDatabase(developmentUrl, url);
  // run a copy: rebuilding the backend while the tests run must not touch the jar in use
  const workFolder = path.join(os.tmpdir(), "juristrack-e2e");
  mkdirSync(workFolder, { recursive: true });
  const jarCopy = path.join(workFolder, "backend.jar");
  copyFileSync(apiJar(), jarCopy);
  // Spring's relaxed binding: juristrack.otp.fixed-code = JURISTRACK_OTP_FIXEDCODE (dots become "_", dashes are dropped)
  const environment = {
    ...process.env,
    SPRING_PROFILES_ACTIVE: "dev",
    SPRING_DATASOURCE_URL: `jdbc:postgresql://${url.host}${url.pathname}?currentSchema=public`,
    SPRING_DATASOURCE_USERNAME: decodeURIComponent(url.username),
    SPRING_DATASOURCE_PASSWORD: decodeURIComponent(url.password),
    SERVER_PORT: String(E2E_PORTS.api),
    JURISTRACK_APPURL: `http://localhost:${E2E_PORTS.web}`,
    JURISTRACK_FRONTENDORIGIN: `http://localhost:${E2E_PORTS.web}`,
    JURISTRACK_SEED_DEMO: "true",
    JURISTRACK_MAIL_HOST: "",
    // sign-in is by emailed code; in the e2e environment every code is 000000 and requests are not throttled
    JURISTRACK_OTP_FIXEDCODE: "000000",
    JURISTRACK_OTP_REQUESTSPERIP: "100000",
    JURISTRACK_OTP_REQUESTSPEREMAIL: "100000",
    JURISTRACK_OTP_FAILEDSIGNINSPERIP: "100000",
    JURISTRACK_SECURITY_ACCESSTOKENTTLSECONDS: String(ACCESS_TOKEN_TTL_SECONDS),
  };
  // the dev-only reset command empties the e2e database, migrates it and seeds the super admin and the demo business
  run("java", ["-jar", jarCopy, "reset"], { cwd: workFolder, env: environment });
  const server = spawn("java", ["-jar", jarCopy], { cwd: workFolder, env: environment, stdio: "inherit", shell: isWindows });
  server.on("exit", (exitCode) => process.exit(exitCode ?? 0));
}

function frontend() {
  const buildFolder = "dist-e2e";
  const environment = { ...process.env, BACKEND_URL: `http://127.0.0.1:${E2E_PORTS.api}`, WEB_PORT: String(E2E_PORTS.web), BUILD_DIR: buildFolder, VITE_DEV_OTP_CODE: "000000" };
  const builtPage = path.join(root, buildFolder, "index.html");
  const sourcesChangedAt = Math.max(newestModification(path.join(root, "src")), statSync(path.join(root, "index.html")).mtimeMs, statSync(path.join(root, "vite.config.ts")).mtimeMs);
  if (!existsSync(builtPage) || statSync(builtPage).mtimeMs < sourcesChangedAt || process.env.E2E_BUILD === "1") run("npx", ["vite", "build"], { cwd: root, env: environment });
  const web = spawn("npx", ["vite", "preview", "--port", String(E2E_PORTS.web), "--strictPort"], { cwd: root, env: environment, stdio: "inherit", shell: isWindows });
  web.on("exit", (exitCode) => process.exit(exitCode ?? 0));
}

const part = process.argv[2];
if (part === "backend") await backend();
else if (part === "frontend") frontend();
else {
  console.error("usage: node scripts/e2e-env.mjs backend|frontend");
  process.exit(2);
}
