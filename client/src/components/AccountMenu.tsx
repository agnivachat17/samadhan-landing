import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { dashboardPathForRole } from "@/lib/roles";
import { useLocation } from "wouter";

type Variant = "light" | "dark";

const styles: Record<Variant, { action: string; ghost: string; text: string }> = {
  light: {
    action: "bg-[#c44920] px-5 py-3 font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#dc5829] sm:px-7",
    ghost: "font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[#132e24] transition hover:text-[#c44720]",
    text: "font-mono-ui text-[0.62rem] uppercase tracking-[0.1em] text-[#436056]",
  },
  dark: {
    action: "bg-[#d9491d] px-8 py-[1.08rem] font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#e25527] active:translate-y-0 active:scale-[0.97]",
    ghost: "font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#f6f0e4] transition hover:text-[#d3ddba]",
    text: "font-mono-ui text-[0.62rem] uppercase tracking-[0.1em] text-[#cfd8c6]",
  },
};

export default function AccountMenu({
  variant = "light",
  loggedOutLabel = "Sign in",
  loggedOutHref = "/login",
  className = "",
}: {
  variant?: Variant;
  loggedOutLabel?: string;
  loggedOutHref?: string;
  className?: string;
}) {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const s = styles[variant];

  if (loading || (user && me.isLoading)) {
    return <span className={`${s.text} ${className}`}>…</span>;
  }

  if (!user || !me.data) {
    return (
      <a href={loggedOutHref} className={`${s.action} ${className}`}>
        {loggedOutLabel}
      </a>
    );
  }

  const dashboardPath = dashboardPathForRole(me.data.role, me.data.organizationId ?? null);
  const displayName = me.data.name || me.data.email?.split("@")[0] || "Account";

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className={s.text}>{displayName}</span>
      <a href={dashboardPath} className={s.ghost}>Dashboard</a>
      <button
        type="button"
        onClick={() => { void logout().then(() => setLocation("/login")); }}
        className={s.ghost}
      >
        Sign out
      </button>
    </div>
  );
}
