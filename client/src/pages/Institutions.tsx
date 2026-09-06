/**
 * Public institutions directory — lists all verified institutions on the platform.
 */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { trpc } from "@/lib/trpc";
import { Building2, MapPin, ExternalLink } from "lucide-react";

export default function Institutions() {
  const orgsQuery = trpc.workflow.organizations.useQuery({ kind: "institution" });
  const orgs = (orgsQuery.data ?? []).filter(
    (o: any) => o.verificationStatus === "verified"
  );

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
        <div className="mx-auto max-w-[85rem]">
          <div className="border-b border-[#a78e6e]/45 pb-8">
            <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">
              Partner network
            </p>
            <h1 className="mt-3 font-display text-[4rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5.5rem]">
              Institutions.
            </h1>
            <p className="mt-5 max-w-[47rem] font-body text-[0.94rem] leading-relaxed text-[#4d645a]">
              Verified academic institutions contributing expertise, faculty, and
              students to solve civic challenges across Jharkhand.
            </p>
          </div>

          {orgsQuery.isLoading ? (
            <div className="mt-8 flex items-center gap-3 font-body text-[#52675d]">
              Loading institutions…
            </div>
          ) : orgs.length === 0 ? (
            <div className="mt-8 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 p-10 text-center">
              <Building2 className="mx-auto text-[#5e7966]" size={32} />
              <p className="mt-4 font-display text-[1.7rem]">
                No institutions yet
              </p>
              <p className="mt-2 font-body text-[0.84rem] text-[#5e7966]">
                Institutions will appear here once verified by the admin.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((org: any) => (
                <article
                  key={org.id}
                  className="group border border-[#a58c6d]/45 bg-[#f8f2e8]/25 p-6 transition hover:shadow-[0_8px_20px_rgba(19,46,36,0.08)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-[#16422f] font-display text-[1.1rem] text-white">
                      {org.name?.charAt(0) ?? "I"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-[1.35rem] leading-none line-clamp-1">
                        {org.name}
                      </h2>
                      {org.location && (
                        <p className="mt-1.5 flex items-center gap-1 font-body text-[0.72rem] text-[#5d7067]">
                          <MapPin size={12} />
                          {org.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {org.overview && (
                    <p className="mt-3 line-clamp-2 font-body text-[0.76rem] leading-relaxed text-[#52675d]">
                      {org.overview}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {org.institutionType && (
                      <span className="rounded-full border border-[#80977f]/70 bg-[#e9f0e4] px-2.5 py-1 font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#3a5c41]">
                        {org.institutionType}
                      </span>
                    )}
                    {org.sector && (
                      <span className="rounded-full border border-[#80977f]/70 bg-[#e9f0e4] px-2.5 py-1 font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#3a5c41]">
                        {org.sector}
                      </span>
                    )}
                  </div>
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1 font-body text-[0.72rem] font-semibold text-[#c64b22] hover:underline"
                    >
                      Visit website <ExternalLink size={12} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
