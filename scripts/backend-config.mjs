// What the end-to-end tests need to know about the backend: where its checkout is and its development settings
// (database, seeded super admin login), read from backend/src/main/resources/application.properties + application-dev.properties.
// BACKEND_REPO defaults to ../juris-track-backend (a checkout next to this repository).
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const backendRepo = path.resolve(process.env.BACKEND_REPO || path.join(import.meta.dirname, "..", "..", "juris-track-backend"));
const resources = path.join(backendRepo, "backend", "src", "main", "resources");

/** key=value lines of a .properties file (# comments). */
function parseProperties(file) {
  const out = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const eq = line.indexOf("=");
    if (eq > 0) out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

/** application.properties + application-dev.properties with ${other.key:default} and ${user.home} placeholders filled in. */
function devProperties() {
  const props = { ...parseProperties(path.join(resources, "application.properties")), ...parseProperties(path.join(resources, "application-dev.properties")) };
  const fill = (value, depth = 0) =>
    depth > 5 ? value : value.replace(/\$\{([^}:]+)(?::([^}]*))?\}/g, (_, key, dflt) => {
      if (props[key] !== undefined) return fill(props[key], depth + 1);
      if (key === "user.home") return os.homedir();
      return process.env[key] ?? dflt ?? "";
    });
  return Object.fromEntries(Object.entries(props).map(([k, v]) => [k, fill(v)]));
}

/** The development database as postgresql://user:password@host:port/db, and the seeded super admin login. */
export function devSettings() {
  const p = devProperties();
  const m = /^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/.exec(p["spring.datasource.url"] ?? "");
  if (!m) throw new Error("application-dev.properties has no usable spring.datasource.url");
  const user = encodeURIComponent(p["spring.datasource.username"] ?? "");
  const password = encodeURIComponent(p["spring.datasource.password"] ?? "");
  return {
    databaseUrl: `postgresql://${user}:${password}@${m[1]}:${m[2] ?? "5432"}/${m[3]}?schema=public`,
    superAdminEmail: p["juristrack.seed.super-admin-email"] ?? "",
  };
}
