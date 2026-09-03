import { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";
import type { MemberRole } from "@/lib/userProfile";

type MemberRoleValue = MemberRole | null;

const MemberRoleContext = createContext<MemberRoleValue | undefined>(undefined);

export function MemberRoleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = trpc.auth.me.useQuery();
  // Only institution role has sub-roles. For other roles, memberRole is null
  // which callers treat as "admin" (full access).
  const value: MemberRoleValue =
    me.data?.role === "institution" ? (me.data.memberRole ?? "admin") : null;
  return (
    <MemberRoleContext.Provider value={value}>
      {children}
    </MemberRoleContext.Provider>
  );
}

export function useMemberRole(): MemberRoleValue {
  const ctx = useContext(MemberRoleContext);
  if (ctx === undefined)
    throw new Error("useMemberRole must be used within MemberRoleProvider");
  return ctx;
}

// Helper booleans for common checks
export function useIsStudent() {
  return useMemberRole() === "student";
}
export function useIsFaculty() {
  return useMemberRole() === "faculty";
}
export function useIsInstitutionAdmin() {
  const role = useMemberRole();
  return role === "admin" || role === null;
}
