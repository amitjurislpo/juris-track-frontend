import { apiAction } from "@/track/api";
import type { BusinessSettings } from "@/track/api-types";

// The owner's business settings (API.md, "Business settings"). Paths are relative to the TrackContext's API base path.

/** Changes the owner's business settings (`PATCH /business`); send only the changed fields. */
export function updateBusinessSettings(changes: Record<string, unknown>) {
  return apiAction<BusinessSettings>("PATCH", "/business", changes);
}
