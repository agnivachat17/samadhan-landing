/**
 * Style: Shared Samadhan public-portal masthead — archival paper, serif wordmark,
 * precise monospaced navigation, and a restrained ember sign-in action.
 */
import AccountMenu from "./AccountMenu";

const publicLinks = [
  { label: "Challenges", href: "/challenges" },
  { label: "Report a challenge", href: "/citizen/submit" },
  { label: "Following", href: "/citizen/following" },
];

export default function PublicPortalHeader() {
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
          className="hidden items-center gap-9 xl:flex"
          aria-label="Public navigation"
        >
          {publicLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="font-mono-ui text-[0.65rem] font-medium uppercase tracking-[0.09em] text-[#132e24] transition-colors hover:text-[#c44720]"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <AccountMenu variant="light" />
      </div>
    </header>
  );
}
