import { defineConfig, devices } from "@playwright/test";
import { e2ePorts } from "./scripts/e2e-slot.mjs";

/**
 * End-to-end tests run against their own environment (scripts/e2e-env.mjs): the API from the backend checkout on :8083
 * with the database "<db>_e2e" reset and seeded with the demo data, and the built SPA on :3008 with /api proxied to it.
 * Development data is never touched. `E2E_BUILD=1` rebuilds the API jar and the SPA first. BACKEND_REPO points at the
 * backend checkout (default: ../juris-track-backend).
 */

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${e2ePorts.web}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node scripts/e2e-env.mjs backend", url: `http://127.0.0.1:${e2ePorts.api}/actuator/health`, reuseExistingServer: false, timeout: 600_000 },
    { command: "node scripts/e2e-env.mjs frontend", url: `http://localhost:${e2ePorts.web}/login`, reuseExistingServer: false, timeout: 600_000 },
  ],
});
