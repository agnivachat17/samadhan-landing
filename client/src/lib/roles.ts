export type Role = "citizen" | "institution" | "industry" | "admin";

export function dashboardPathForRole(
  role: Role,
  organizationId?: number | null
): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "institution":
      return organizationId
        ? "/institute/dashboard"
        : "/onboarding/institution";
    case "industry":
      return organizationId ? "/industry/dashboard" : "/onboarding/industry";
    case "citizen":
    default:
      return "/citizen/dashboard";
  }
}
