/**
 * Shared site footer — used on Home and every standalone public/info page so the
 * bottom navigation stays visually and functionally identical everywhere.
 *
 * Every link resolves to a real route. Items that only make sense for a signed-in
 * user (Dashboard, Projects, Notifications, Reports) are resolved against the
 * caller's actual role via `dashboardPathForRole`/`ProtectedRoute` — the same
 * source of truth the rest of the app uses — so a citizen clicking "Dashboard"
 * always lands on their own dashboard, never an institution's or admin's, and a
 * signed-out visitor is sent to /login rather than a dead link or someone else's
 * page. This is a UX convenience only: the real access boundary is still
 * `ProtectedRoute` + `firestore.rules`, unchanged by this component.
 */
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { dashboardPathForRole, type Role } from "@/lib/roles";

type FooterLink = { label: string; href: string };

function projectsPathForRole(role: Role, organizationId?: number | null) {
  switch (role) {
    case "admin":
      return "/admin/projects";
    case "institution":
      return organizationId ? "/institute/projects" : "/onboarding/institution";
    case "industry":
      return organizationId ? "/industry/dashboard" : "/onboarding/industry";
    case "citizen":
    default:
      return "/citizen/dashboard";
  }
}

export default function Footer() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery(undefined, { enabled: !!user });
  const role = me.data?.role ?? null;
  const organizationId = me.data?.organizationId ?? null;

  const dashboardHref = role
    ? dashboardPathForRole(role, organizationId)
    : "/login";
  const projectsHref = role
    ? projectsPathForRole(role, organizationId)
    : "/login";
  const notificationsHref = user ? "/notifications" : "/login";

  const platformLinks: FooterLink[] = [
    { label: "Home", href: "/" },
    { label: "Challenges", href: "/challenges" },
    { label: "Projects", href: projectsHref },
    { label: "Institutions", href: "/institutions" },
    { label: "Dashboard", href: dashboardHref },
    { label: "Reports", href: "/admin/reports" },
    { label: "Notifications", href: notificationsHref },
  ];

  const institutionLinks: FooterLink[] = [
    { label: "How it works", href: "/info/how-it-works" },
    { label: "Register", href: "/signup?role=institution" },
    { label: "Submit solutions", href: "/info/submit-solutions" },
    { label: "Collaborate", href: "/info/collaborate" },
    { label: "Resources", href: "/info/resources-institutions" },
    { label: "Guidelines", href: "/info/guidelines-institutions" },
  ];

  const industryLinks: FooterLink[] = [
    { label: "Partner with us", href: "/signup?role=industry" },
    { label: "Identify challenges", href: "/info/identify-challenges" },
    { label: "Offer solutions", href: "/info/offer-solutions" },
    { label: "Impact & scale", href: "/info/impact-scale" },
    { label: "Resources", href: "/info/resources-industry" },
    { label: "Guidelines", href: "/info/guidelines-industry" },
  ];

  const contactLinks: FooterLink[] = [
    { label: "Support", href: "/info/support" },
    { label: "Help center", href: "/info/help-center" },
    { label: "Contact us", href: "/info/contact-us" },
    { label: "Privacy policy", href: "/info/privacy-policy" },
    { label: "Terms of use", href: "/info/terms-of-use" },
  ];

  return (
    <footer className="relative overflow-hidden bg-[#042b20] px-6 pb-8 pt-8 text-[#f4efe3] sm:px-10 lg:px-16 lg:pb-10 lg:pt-10">
      <div className="mx-auto max-w-[94rem] border-t border-[#d9d1bf]/35 pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.45fr_3.7fr_1.05fr] lg:gap-12">
          <div>
            <a href="/" className="block">
              <p className="font-display text-[2.55rem] leading-none tracking-[0.01em]">
                SAMADHAN
              </p>
            </a>
            <p className="mt-3 max-w-[14rem] font-mono-ui text-[0.55rem] leading-relaxed uppercase tracking-[0.12em] text-[#b6c2a4]">
              {t("footer.tagline")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-9 sm:grid-cols-4 lg:gap-6">
            <FooterColumn title={t("footer.platform")} links={platformLinks} />
            <FooterColumn
              title={t("footer.forInstitutions")}
              links={institutionLinks}
            />
            <FooterColumn
              title={t("footer.forIndustry")}
              links={industryLinks}
            />
            <FooterColumn title={t("footer.contact")} links={contactLinks} />
          </div>

          <div className="flex items-start lg:justify-end">
            <div className="text-center">
              <div className="mx-auto grid size-[6.4rem] place-items-center rounded-full border border-[#bdc8a5]/60 bg-[#f6f0e3] p-1.5">
                <img
                  src="/images/jharkhand-government-seal_3431be25.svg"
                  alt="Official Government of Jharkhand seal"
                  className="size-full object-contain"
                />
              </div>
              <p className="mt-3 font-display text-[1.05rem] leading-[0.95] text-[#d7ddbd]">
                Government of
                <br />
                Jharkhand
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 border-t border-[#d9d1bf]/25 pt-5 font-mono-ui text-[0.55rem] uppercase tracking-[0.1em] text-[#93aa93] lg:mt-20">
          {t("footer.copyright")}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h3 className="border-b border-[#b8c3aa]/45 pb-2 font-mono-ui text-[0.55rem] font-medium uppercase tracking-[0.13em] text-[#d2dac4]">
        {title}
      </h3>
      <ul className="mt-4 space-y-2">
        {links.map(link => (
          <li key={link.label}>
            <a
              href={link.href}
              className="font-body text-[0.65rem] text-[#aebda7] transition-colors duration-200 hover:text-[#f4efe3]"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
