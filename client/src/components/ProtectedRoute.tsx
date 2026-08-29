import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  OrganizationStatus,
  OrganizationStatusLoading,
} from "@/components/OrganizationStatus";
import IndustryHeader from "@/components/IndustryHeader";
import InstituteHeader from "@/components/InstituteHeader";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { dashboardPathForRole, type Role } from "@/lib/roles";

export default function ProtectedRoute({
  children,
  roles,
  requireVerifiedOrganization,
}: {
  children: React.ReactNode;
  roles?: Role[];
  requireVerifiedOrganization?: boolean;
}) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });

  const isOrgRole =
    me.data?.role === "institution" || me.data?.role === "industry";
  const shouldCheckVerification =
    requireVerifiedOrganization && isOrgRole && !!me.data?.organizationId;
  const organizationQuery = trpc.workflow.organizationById.useQuery(
    { id: me.data?.organizationId ?? 1 },
    { enabled: shouldCheckVerification }
  );

  useEffect(() => {
    if (!loading && !user) setLocation("/login");
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (roles && me.data && !roles.includes(me.data.role)) {
      setLocation(
        dashboardPathForRole(me.data.role, me.data.organizationId ?? null)
      );
    }
  }, [roles, me.data, setLocation]);

  const roleMismatch = roles && me.data && !roles.includes(me.data.role);

  if (loading || !user || me.isLoading || roleMismatch) {
    return (
      <div className="grid min-h-[60vh] place-items-center font-body text-sm text-[#50655b]">
        Checking your session…
      </div>
    );
  }

  if (shouldCheckVerification) {
    if (organizationQuery.isLoading) return <OrganizationStatusLoading />;
    if (
      organizationQuery.data &&
      (organizationQuery.data.verificationStatus !== "verified" ||
        organizationQuery.data.standing === "suspended" ||
        organizationQuery.data.standing === "terminated")
    ) {
      const kind = me.data!.role as "institution" | "industry";
      return (
        <main
          className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
          style={{
            backgroundImage:
              "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
        >
          {kind === "institution" ? (
            <InstituteHeader active="Dashboard" />
          ) : (
            <IndustryHeader />
          )}
          <OrganizationStatus
            kind={kind}
            organizationId={me.data!.organizationId!}
          />
        </main>
      );
    }
  }

  return <>{children}</>;
}
