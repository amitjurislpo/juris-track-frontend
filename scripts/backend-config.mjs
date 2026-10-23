// What the end-to-end tests need to know about the backend: where its checkout is and its development settings
// (database, seeded super admin login), read from backend/src/main/resources/application.properties + application-dev.properties.
// BACKEND_REPO defaults to ../juris-track-backend (a checkout next to this repository).
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const backendRepo = path.resolve(process.env.BACKEND_REPO || path.join(import.meta.dirname, "..", "..", "juris-track-backend"));
const resources = path.join(backendRepo, "backend", "src", "main", "resources");

/** key=value lines of a .properties file (# and ! start comments). */
function parseProperties(file) {
  const properties = {};
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex > 0) properties[line.slice(0, equalsIndex).trim()] = line.slice(equalsIndex + 1).trim();
  }
  return properties;
}

/** application.properties + application-dev.properties with ${other.key:default} and ${user.home} placeholders filled in. */
function devProperties() {
  const properties = { ...parseProperties(path.join(resources, "application.properties")), ...parseProperties(path.join(resources, "application-dev.properties")) };
  const fillPlaceholders = (value, depth = 0) =>
    depth > 5 ? value : value.replace(/\$\{([^}:]+)(?::([^}]*))?\}/g, (_, key, defaultValue) => {
      if (properties[key] !== undefined) return fillPlaceholders(properties[key], depth + 1);
      if (key === "user.home") return os.homedir();
      return process.env[key] ?? defaultValue ?? "";
    });
  return Object.fromEntries(Object.entries(properties).map(([key, value]) => [key, fillPlaceholders(value)]));
}

/** The development database as postgresql://user:password@host:port/db, and the seeded super admin login. */
export function devSettings() {
  const properties = devProperties();
  const datasource = /^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/.exec(properties["spring.datasource.url"] ?? "");
  if (!datasource) throw new Error("application-dev.properties has no usable spring.datasource.url");
  const [, host, port, database] = datasource;
  const user = encodeURIComponent(properties["spring.datasource.username"] ?? "");
  const password = encodeURIComponent(properties["spring.datasource.password"] ?? "");
  return {
    databaseUrl: `postgresql://${user}:${password}@${host}:${port ?? "5432"}/${database}?schema=public`,
    superAdminEmail: properties["juristrack.seed.super-admin-email"] ?? "",
  };
}
