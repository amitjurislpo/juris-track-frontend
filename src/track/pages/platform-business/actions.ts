import { apiAction } from "@/track/api";
import type { BusinessDetail } from "@/track/api-types";

// One business, for the super admin (API.md, "Businesses"). Paths are relative to the TrackContext's API base path.

const businessPath = (businessId: string) => `/businesses/${encodeURIComponent(businessId)}`;

/** Changes a business's settings (`PATCH /businesses/{businessId}`); send only the changed fields. */
export function updateBusiness(businessId: string, changes: Record<string, unknown>) {
  return apiAction<BusinessDetail>("PATCH", businessPath(businessId), changes);
}

/** Suspends or reactivates a business (`PUT /businesses/{businessId}/status`), with an optional reason for the audit log. */
export function setBusinessStatus(businessId: string, status: { isSuspended: boolean; reason?: string }) {
  return apiAction<BusinessDetail>("PUT", `${businessPath(businessId)}/status`, status);
}
