/**
 * Generic template for the ~15 lightweight footer destinations (how it works,
 * guidelines, resources, support, legal, ...). One shared shell keeps all of
 * them visually consistent with each other and with the rest of the public
 * site, per infoContent.ts.
 */
import { useRoute } from "wouter";
import PublicPortalHeader from "@/components/PublicPortalHeader";
import Footer from "@/components/Footer";
import NotFound from "@/pages/NotFound";
import { infoContent } from "@/lib/infoContent";
import { siteContact } from "@/lib/siteContact";
import { ArrowRight, Mail, Phone } from "lucide-react";

export default function InfoPage() {
  const [, params] = useRoute("/info/:slug");
  const content = params?.slug ? infoContent[params.slug] : undefined;

  if (!content) return <NotFound />;

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />

      <section className="px-6 py-14 sm:px-10 lg:px-[5.4rem] lg:py-16">
        <div className="mx-auto max-w-[62rem]">
          <div className="border-b border-[#a78e6e]/45 pb-8">
            <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">
              {content.eyebrow}
            </p>
            <h1 className="mt-3 font-display text-[3rem] font-medium leading-[0.95] tracking-[-0.03em] sm:text-[3.8rem]">
              {content.title}
            </h1>
            <p className="mt-5 max-w-[42rem] font-body text-[0.95rem] leading-relaxed text-[#4d645a]">
              {content.intro}
            </p>
          </div>

          <div className="mt-10 space-y-10">
            {content.sections.map(section => (
              <article key={section.heading}>
                <h2 className="font-display text-[1.5rem] leading-tight text-[#0d3024]">
                  {section.heading}
                </h2>
                {section.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="mt-2.5 max-w-[46rem] font-body text-[0.86rem] leading-relaxed text-[#3f574c]"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {section.bullets.map(bullet => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 font-body text-[0.86rem] leading-relaxed text-[#3f574c]"
                      >
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#c64b22]" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          {content.showContactChannels &&
            (siteContact.supportEmail || siteContact.phone) && (
              <div className="mt-10 border border-[#a78e6e]/45 bg-[#f8f2e8]/40 p-6">
                <h2 className="font-display text-[1.3rem] leading-tight text-[#0d3024]">
                  Reach us directly
                </h2>
                <div className="mt-3 space-y-2">
                  {siteContact.supportEmail && (
                    <a
                      href={`mailto:${siteContact.supportEmail}`}
                      className="flex items-center gap-2 font-body text-[0.86rem] text-[#c64b22] hover:underline"
                    >
                      <Mail size={15} strokeWidth={1.6} />
                      {siteContact.supportEmail}
                    </a>
                  )}
                  {siteContact.phone && (
                    <a
                      href={`tel:${siteContact.phone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-2 font-body text-[0.86rem] text-[#c64b22] hover:underline"
                    >
                      <Phone size={15} strokeWidth={1.6} />
                      {siteContact.phone}
                    </a>
                  )}
                </div>
              </div>
            )}

          {content.cta && (
            <a
              href={content.cta.href}
              className="mt-12 inline-flex items-center gap-2 rounded-full bg-[#c44920] px-7 py-3.5 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white transition duration-200 hover:-translate-y-0.5 hover:bg-[#dc5829] active:translate-y-0 active:scale-[0.97]"
            >
              {content.cta.label}
              <ArrowRight size={14} strokeWidth={1.6} />
            </a>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
