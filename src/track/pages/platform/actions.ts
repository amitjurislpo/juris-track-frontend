import { apiAction } from "@/track/api";

// The super admin's businesses list (API.md, "Businesses"). Paths are relative to the TrackContext's API base path.

export interface NewBusinessInput {
  name: string;
  timeZone: string;
  owner: { firstName: string; lastName: string; email: string; employeeCode?: string };
}

/** Creates a business and its owner (`POST /businesses`); `data` holds the new ids. */
export function createBusiness(input: NewBusinessInput) {
  return apiAction<{ id: string; ownerId: string }>("POST", "/businesses", input);
}
