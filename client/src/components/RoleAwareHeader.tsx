import AdminHeader from "./AdminHeader";
import IndustryHeader from "./IndustryHeader";
import InstituteHeader from "./InstituteHeader";
import PublicPortalHeader from "./PublicPortalHeader";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type Props = {
  instituteActive?:
    "Dashboard" | "Challenges" | "Active projects" | "Projects" | "Profile";
  adminActive?: string;
  industryActive?: "Dashboard" | "Public challenges" | "Profile";
};

export default function RoleAwareHeader({
  instituteActive,
  adminActive = "Dashboard",
  industryActive,
}: Props) {
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const role = me.data?.role;

  if (role === "institution")
    return <InstituteHeader active={instituteActive} />;
  if (role === "admin") return <AdminHeader active={adminActive} />;
  if (role === "industry") return <IndustryHeader active={industryActive} />;
  return <PublicPortalHeader />;
}
