/**
 * Style: Samadhan institute workspace masthead — archival paper, serif wordmark,
 * compact technical navigation, and ember active-state treatment.
 */
const navItems = [
  { label: "Dashboard", href: "/institute/dashboard" },
  { label: "Challenges", href: "/institute/challenges" },
  { label: "Active projects", href: "/institute/projects" },
  { label: "Mentors", href: "#top" },
  { label: "Reports", href: "#top" },
  { label: "Profile", href: "/institute/profile" },
];

export default function InstituteHeader({ active }: { active: "Dashboard" | "Challenges" | "Active projects" | "Projects" | "Profile" }) {
  return <header className="border-b border-[#a78e6e]/55 bg-[#f1eadc] px-6 py-5 sm:px-10 lg:px-8" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}><div className="mx-auto flex max-w-[96rem] items-center justify-between gap-5"><a href="/" className="font-display text-[2rem] leading-none tracking-[0.01em] sm:text-[2.65rem]">SAMADHAN</a><nav className="hidden items-center gap-7 xl:flex" aria-label="Institute navigation">{navItems.map((item) => <a key={item.label} href={item.href} className={`border-b-2 py-2 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.09em] transition-colors ${(active === item.label || (active === "Projects" && item.label === "Active projects")) ? "border-[#c64b22] text-[#c04a27]" : "border-transparent text-[#162f25] hover:border-[#ad9679] hover:text-[#c04a27]"}`}>{item.label}</a>)}</nav><a href="/login" className="bg-[#c44920] px-5 py-3 font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-[#dc5829] sm:px-7">Sign in</a></div></header>;
}
