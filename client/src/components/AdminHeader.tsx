/**
 * Style: Samadhan administrator masthead — archive-paper canvas, confident serif wordmark,
 * compact data-operations navigation, and a restrained ember active-state line.
 */
import AccountMenu from "./AccountMenu";

const navItems = ["Dashboard", "Challenges", "Projects", "Institutions", "Reports", "Users", "Settings"];

const navHref: Record<string, string> = { Dashboard: "/admin/dashboard", Challenges: "/admin/challenges", Projects: "/admin/projects", Institutions: "/admin/institutions", Reports: "/admin/reports", Users: "/admin/users", Settings: "/admin/settings" };

export default function AdminHeader({ active = "Dashboard" }: { active?: string }) {
  return <header className="border-b border-[#a78e6e]/55 bg-[#f1eadc] px-6 py-5 sm:px-10 lg:px-8" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}><div className="mx-auto flex max-w-[96rem] items-center justify-between gap-5"><a href="/" className="font-display text-[2rem] leading-none tracking-[0.01em] sm:text-[2.65rem]">SAMADHAN</a><nav className="hidden items-center gap-8 xl:flex" aria-label="Admin navigation">{navItems.map((item) => <a key={item} href={navHref[item]} className={`border-b-2 py-2 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.09em] transition-colors ${item === active ? "border-[#c64b22] text-[#c04a27]" : "border-transparent text-[#162f25] hover:border-[#ad9679] hover:text-[#c04a27]"}`}>{item}</a>)}</nav><AccountMenu variant="light" /></div></header>;
}
