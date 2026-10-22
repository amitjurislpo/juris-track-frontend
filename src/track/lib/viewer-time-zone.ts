/**
 * The time zone dates are shown in: the business's time zone for its users, the browser's for the super admin (who has no business).
 */
export function viewerTimeZone(user: { businessTimeZone: string | null }): string {
  return user.businessTimeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
}
