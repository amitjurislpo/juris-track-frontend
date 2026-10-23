// Parallel end-to-end runs (several checkouts at the same time) each use their own slot, set with E2E_SLOT=0..9:
// the ports, the e2e database, the build folder and the temporary jar folder never clash. Slot 0 is the default.
const slot = Number(process.env.E2E_SLOT ?? 0);
if (!Number.isInteger(slot) || slot < 0 || slot > 9) throw new Error("E2E_SLOT must be a whole number from 0 to 9");

export const e2ePorts = { api: 8083 + slot * 10, web: 3008 + slot * 10 };
export const e2eDatabaseSuffix = slot === 0 ? "_e2e" : `_e2e${slot}`;
export const e2eBuildFolder = slot === 0 ? "dist-e2e" : `dist-e2e${slot}`;
export const e2eWorkFolderName = slot === 0 ? "juristrack-e2e" : `juristrack-e2e${slot}`;
