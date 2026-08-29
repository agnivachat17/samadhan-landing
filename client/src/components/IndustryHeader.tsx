/**
 * Style: Samadhan industry workspace masthead — archive-paper field, serif wordmark,
 * compact partner navigation, and a clear ember project-state highlight.
 */
import AccountMenu from "./AccountMenu";

const navItems = [
  { label: "Dashboard", href: "/industry/dashboard" },
  { label: "Challenges", href: "#top" },
  { label: "Projects", href: "/industry/dashboard" },
  { label: "Commitments", href: "/industry/profile" },
  { label: "Institutions", href: "/institute/dashboard" },
  { label: "Profile", href: "/industry/profile" },
];

export default function IndustryHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b border-[#a78e6e]/55 bg-[#f1eadc] px-6 py-5 sm:px-10 lg:px-8"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
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
          className="hidden items-center gap-8 xl:flex"
          aria-label="Industry navigation"
        >
          {navItems.map(item => (
            <a
              key={item.label}
              href={item.href}
              className={`border-b-2 py-2 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.09em] transition-colors ${item.label === "Projects" ? "border-[#c64b22] text-[#c04a27]" : "border-transparent text-[#162f25] hover:border-[#ad9679] hover:text-[#c04a27]"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <AccountMenu variant="light" />
      </div>
    </header>
  );
}
