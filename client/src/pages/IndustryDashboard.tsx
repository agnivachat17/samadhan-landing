/** Style: Samadhan industry opportunity ledger — persisted projects seeking partner support. */
import IndustryHeader from "@/components/IndustryHeader";
import { ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function IndustryDashboard() {
  const [input] = useState({});
  const projectsQuery = trpc.workflow.projects.useQuery(input);
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const organizations = organizationsQuery.data ?? [];
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <IndustryHeader />
      <section className="px-6 py-12 sm:px-10 lg:px-[2.8rem] lg:py-12">
        <div className="mx-auto max-w-[96rem]">
          <h1 className="font-display text-[3.85rem] font-medium leading-[0.87] tracking-[-0.04em] sm:text-[5rem]">
            Projects Seeking Support<span className="text-[#c64b22]">.</span>
          </h1>
          <p className="mt-5 font-body text-[0.92rem] text-[#4c6359]">
            Explore active institute projects and record a structured support
            commitment.
          </p>
          <div className="mt-7 hidden grid-cols-[minmax(28rem,1.7fr)_0.8fr_1.25fr_10.8rem] gap-5 border-y border-[#a78e6e]/45 py-5 font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.11em] text-[#324b40] lg:grid">
            <span>Project title</span>
            <span>Stage</span>
            <span>Institution</span>
            <span>Action</span>
          </div>
          {projectsQuery.isLoading || organizationsQuery.isLoading ? (
            <Loading />
          ) : projectsQuery.isError || organizationsQuery.isError ? (
            <Failure
              message={
                projectsQuery.error?.message ||
                organizationsQuery.error?.message ||
                "Projects could not load."
              }
              retry={() => {
                void projectsQuery.refetch();
                void organizationsQuery.refetch();
              }}
            />
          ) : (projectsQuery.data ?? []).length === 0 ? (
            <Empty />
          ) : (
            <div>
              {projectsQuery.data?.map(project => (
                <article
                  key={project.id}
                  className="grid gap-4 border-b border-[#a78e6e]/40 py-6 lg:grid-cols-[minmax(28rem,1.7fr)_0.8fr_1.25fr_10.8rem] lg:items-center lg:gap-5"
                >
                  <div>
                    <h2 className="font-display text-[1.35rem] leading-none sm:text-[1.62rem]">
                      {project.title}
                    </h2>
                    <p className="mt-2 max-w-[36rem] font-body text-[0.75rem] leading-relaxed text-[#52675e]">
                      {project.overview}
                    </p>
                  </div>
                  <span className="w-fit border border-[#7f987f] px-2 py-1.5 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.09em] text-[#48684d]">
                    {project.stage.replaceAll("_", " ")}
                  </span>
                  <p className="font-body text-[0.84rem] text-[#243f34]">
                    {organizations.find(
                      org => org.id === project.organizationId
                    )?.name ?? "Institution record"}
                  </p>
                  <a
                    href={`/industry/projects/${project.id}`}
                    className="rounded-full inline-flex w-fit items-center gap-2 border border-[#bd5a38]/70 px-5 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-[#ab4826] hover:bg-[#c94a20] hover:text-white"
                  >
                    Express interest <ArrowRight size={14} />
                  </a>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-7 flex items-center gap-3 p-6 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading partner opportunities…
    </div>
  );
}
function Empty() {
  return (
    <div className="mt-7 border border-dashed border-[#a58c6d]/55 p-8 text-center font-body text-[0.8rem] text-[#586d63]">
      No active institute projects are seeking support yet.
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-7 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
