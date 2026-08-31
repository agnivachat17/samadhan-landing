/**
 * Style: Samadhan institute workspace masthead — archival paper, serif wordmark,
 * compact technical navigation, and ember active-state treatment.
 */
import AccountMenu from "./AccountMenu";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

const NAV = [
  {
    key: "Dashboard" as const,
    labelKey: "nav.dashboard" as const,
    href: "/institute/dashboard",
  },
  {
    key: "Challenges" as const,
    labelKey: "nav.challenges" as const,
    href: "/institute/challenges",
  },
  {
    key: "Active projects" as const,
    labelKey: "nav.activeProjects" as const,
    href: "/institute/projects",
  },
  {
    key: "Profile" as const,
    labelKey: "nav.profile" as const,
    href: "/institute/profile",
  },
];

export default function InstituteHeader({
  active,
}: {
  active:
    "Dashboard" | "Challenges" | "Active projects" | "Projects" | "Profile";
}) {
  const { t } = useLanguage();
  return (
    <header
      className="sticky top-0 z-50 border-b border-[#a78e6e]/55 bg-[#f1eadc] px-6 py-5 sm:px-10 lg:px-8"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-5">
        <a
          href="/"
          className="font-display text-[2rem] leading-none tracking-[0.01em] sm:text-[2.65rem]"
        >
          SAMADHAN
        </a>
        <nav
          className="hidden items-center gap-7 xl:flex"
          aria-label="Institute navigation"
        >
          {NAV.map(item => (
            <a
              key={item.key}
              href={item.href}
              className={`border-b-2 py-2 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.09em] transition-colors ${active === item.key || (active === "Projects" && item.key === "Active projects") ? "border-[#c64b22] text-[#c04a27]" : "border-transparent text-[#162f25] hover:border-[#ad9679] hover:text-[#c04a27]"}`}
            >
              {t(item.labelKey)}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageSwitcher variant="light" />
          <AccountMenu variant="light" />
        </div>
      </div>
    </header>
  );
}
