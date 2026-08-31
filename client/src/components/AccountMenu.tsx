import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { dashboardPathForRole, type Role } from "@/lib/roles";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ChevronDown,
  LayoutDashboard,
  UserRound,
  LogOut,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Variant = "light" | "dark";

const roleLabel: Record<Role, string> = {
  citizen: "Citizen",
  institution: "Institution",
  industry: "Industry partner",
  admin: "Administrator",
};

const secondaryNav: Record<
  Role,
  (organizationId?: number | null) => { label: string; href: string } | null
> = {
  citizen: () => ({ label: "Settings", href: "/citizen/settings" }),
  institution: organizationId =>
    organizationId
      ? { label: "Organization profile", href: "/institute/profile" }
      : null,
  industry: organizationId =>
    organizationId
      ? { label: "Organization profile", href: "/industry/profile" }
      : null,
  admin: () => ({ label: "Settings", href: "/admin/settings" }),
};

const styles: Record<
  Variant,
  {
    trigger: string;
    ring: string;
    fallback: string;
    name: string;
    chevron: string;
  }
> = {
  light: {
    trigger:
      "group flex items-center gap-2 rounded-full border border-[#132e24]/15 bg-white/40 py-1 pl-1 pr-3 transition-all duration-200 ease-out hover:border-[#c44720]/40 hover:bg-white/70 hover:shadow-[0_6px_18px_rgba(19,46,36,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c44720]/50 active:scale-[0.97]",
    ring: "ring-2 ring-white group-hover:ring-[#c44720]/50 transition-all duration-200",
    fallback:
      "bg-[#132e24] font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.02em] text-[#f6efe0]",
    name: "hidden font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[#132e24] transition-colors group-hover:text-[#c44720] sm:inline",
    chevron:
      "hidden h-3.5 w-3.5 text-[#436056] transition-transform duration-200 group-data-[state=open]:rotate-180 sm:inline",
  },
  dark: {
    trigger:
      "group flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1 pl-1 pr-3 backdrop-blur-sm transition-all duration-200 ease-out hover:border-white/35 hover:bg-white/20 hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.97]",
    ring: "ring-2 ring-white/20 group-hover:ring-[#e25527]/60 transition-all duration-200",
    fallback:
      "bg-[#f6f0e4] font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.02em] text-[#132e24]",
    name: "hidden font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-[#f6f0e4] transition-colors group-hover:text-[#d3ddba] sm:inline",
    chevron:
      "hidden h-3.5 w-3.5 text-[#cfd8c6] transition-transform duration-200 group-data-[state=open]:rotate-180 sm:inline",
  },
};

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function AccountMenu({
  variant = "light",
  loggedOutLabel,
  loggedOutHref = "/login",
  className = "",
}: {
  variant?: Variant;
  loggedOutLabel?: string;
  loggedOutHref?: string;
  className?: string;
}) {
  const { user, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const s = styles[variant];
  const resolvedLoggedOutLabel = loggedOutLabel ?? t("account.signIn");

  const actionClass =
    variant === "dark"
      ? "bg-[#d9491d] px-8 py-[1.08rem] font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#e25527] active:translate-y-0 active:scale-[0.97]"
      : "bg-[#c44920] px-5 py-3 font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#dc5829] sm:px-7";

  if (loading || (user && me.isLoading)) {
    return (
      <span
        className={`flex h-9 w-9 animate-pulse items-center justify-center rounded-full bg-current/10 ${className}`}
      >
        <span className="sr-only">Loading account</span>
      </span>
    );
  }

  if (!user || !me.data) {
    return (
      <a href={loggedOutHref} className={`${actionClass} ${className}`}>
        {resolvedLoggedOutLabel}
      </a>
    );
  }

  const dashboardPath = dashboardPathForRole(
    me.data.role,
    me.data.organizationId ?? null
  );
  const displayName = me.data.name || me.data.email?.split("@")[0] || "Account";
  const secondary =
    secondaryNav[me.data.role]?.(me.data.organizationId ?? null) ?? null;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await logout();
      toast.success(t("account.signedOut"), {
        description: t("account.signedOutDesc"),
      });
      setLocation("/login");
    } catch {
      toast.error("Couldn't sign out", { description: "Please try again." });
    } finally {
      setSigningOut(false);
    }
  }

  const initials = initialsFor(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`${s.trigger} ${className}`}
          aria-label="Account menu"
        >
          <Avatar className={`h-8 w-8 ${s.ring}`}>
            {user.photoURL && (
              <AvatarImage
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className={s.fallback}>{initials}</AvatarFallback>
          </Avatar>
          <span className={s.name}>{displayName.split(" ")[0]}</span>
          <ChevronDown className={s.chevron} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="min-w-[16rem] rounded-none border border-[#a78e6e]/55 bg-[#f6efe0] p-0 shadow-[0_20px_45px_rgba(19,46,36,0.2)]"
      >
        <div className="flex items-center gap-3 border-b border-[#a78e6e]/40 px-4 py-3.5">
          <Avatar className="h-11 w-11 shrink-0 ring-2 ring-[#a78e6e]/30">
            {user.photoURL && (
              <AvatarImage
                src={user.photoURL}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
            )}
            <AvatarFallback className="bg-[#132e24] font-mono-ui text-[0.72rem] font-semibold uppercase tracking-[0.02em] text-[#f6efe0]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-display text-[1.05rem] leading-tight text-[#132e24]">
              {displayName}
            </span>
            {me.data.email && (
              <span className="truncate font-mono-ui text-[0.6rem] text-[#697b6f]">
                {me.data.email}
              </span>
            )}
            <span className="mt-0.5 inline-flex w-fit items-center bg-[#132e24] px-2 py-0.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#f6efe0]">
              {roleLabel[me.data.role]}
            </span>
          </div>
        </div>

        <div className="py-1.5">
          <DropdownMenuItem
            asChild
            className="cursor-pointer rounded-none px-4 py-2.5 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-[#132e24] transition-colors focus:bg-[#e7dcc4] focus:text-[#132e24] data-[highlighted]:bg-[#e7dcc4]"
          >
            <a href={dashboardPath}>
              <LayoutDashboard className="h-4 w-4 text-[#697b6f]" />
              {t("account.dashboard")}
            </a>
          </DropdownMenuItem>

          {secondary && (
            <DropdownMenuItem
              asChild
              className="cursor-pointer rounded-none px-4 py-2.5 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-[#132e24] transition-colors focus:bg-[#e7dcc4] focus:text-[#132e24] data-[highlighted]:bg-[#e7dcc4]"
            >
              <a href={secondary.href}>
                <UserRound className="h-4 w-4 text-[#697b6f]" />
                {secondary.label === "Settings"
                  ? t("account.settings")
                  : t("account.orgProfile")}
              </a>
            </DropdownMenuItem>
          )}
        </div>

        <DropdownMenuSeparator className="mx-0 my-0 h-px bg-[#a78e6e]/40" />

        <div className="py-1.5">
          <DropdownMenuItem
            disabled={signingOut}
            onSelect={e => {
              e.preventDefault();
              void handleSignOut();
            }}
            className="cursor-pointer rounded-none px-4 py-2.5 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.09em] text-[#a3391c] transition-colors focus:bg-[#f3ddd2] focus:text-[#8a2c14] data-[highlighted]:bg-[#f3ddd2] data-[highlighted]:text-[#8a2c14]"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {signingOut ? t("account.signingOut") : t("account.signOut")}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
