/** Style: Samadhan institute project ledger backed by persisted delivery projects. */
import InstituteHeader from "@/components/InstituteHeader";
import { ArrowRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function InstituteProjects() {
  const [organizationId, setOrganizationId] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("organization")) ||
      0
  );
  const [institutionInput] = useState({ kind: "institution" as const });
  const institutionsQuery =
    trpc.workflow.organizations.useQuery(institutionInput);
  const projectInput = useMemo(
    () => ({ organizationId: organizationId || 1 }),
    [organizationId]
  );
  const projectsQuery = trpc.workflow.projects.useQuery(projectInput, {
    enabled: organizationId > 0,
  });
  useEffect(() => {
    if (!organizationId && institutionsQuery.data?.[0])
      setOrganizationId(institutionsQuery.data[0].id);
  }, [organizationId, institutionsQuery.data]);
  const selected = institutionsQuery.data?.find(
    item => item.id === organizationId
  );
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Active projects" />
      <section className="px-6 py-10 sm:px-10 lg:px-[4rem] lg:py-12">
        <div className="mx-auto max-w-[92rem]">
          <div className="flex flex-col justify-between gap-6 border-b border-[#a78e6e]/45 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                Delivery portfolio
              </p>
              <h1 className="mt-3 font-display text-[4rem] leading-[0.86] tracking-[-0.04em] sm:text-[5rem]">
                Active Projects.
              </h1>
              <p className="mt-4 max-w-[42rem] font-body text-[0.88rem] text-[#53675d]">
                Open a project workspace to update delivery status, milestones,
                evidence, and activity.
              </p>
            </div>
            {institutionsQuery.data && institutionsQuery.data.length > 1 && (
              <label className="min-w-[18rem] font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                Institution
                <select
                  value={organizationId}
                  onChange={event =>
                    setOrganizationId(Number(event.target.value))
                  }
                  className="citizen-input mt-2 normal-case tracking-normal"
                >
                  <option value="0">Select institution</option>
                  {institutionsQuery.data.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {institutionsQuery.isLoading ||
          !organizationId ||
          projectsQuery.isLoading ? (
            <Loading />
          ) : institutionsQuery.isError || projectsQuery.isError ? (
            <Failure
              message={
                institutionsQuery.error?.message ||
                projectsQuery.error?.message ||
                "Project records could not load."
              }
              retry={() => {
                void institutionsQuery.refetch();
                void projectsQuery.refetch();
              }}
            />
          ) : !selected ? (
            <Empty label="Start institute onboarding before creating a project portfolio." />
          ) : (projectsQuery.data ?? []).length === 0 ? (
            <Empty label="No project workspace has been created for this institution yet. Accept an assigned challenge to begin." />
          ) : (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {projectsQuery.data?.map(project => (
                <article
                  key={project.id}
                  className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#c64b22]">
                        {project.stage.replaceAll("_", " ")}
                      </p>
                      <h2 className="mt-3 font-display text-[2rem] leading-none">
                        {project.title}
                      </h2>
                    </div>
                    <span className="border border-[#8aa084] px-2 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-[#406146]">
                      {project.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="mt-4 line-clamp-2 font-body text-[0.78rem] leading-relaxed text-[#52675d]">
                    {project.overview}
                  </p>
                  <div className="mt-6 h-1.5 bg-[#d6d1c6]">
                    <div
                      className="h-full bg-[#c94a20]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em]">
                      {project.progress}% progress
                    </span>
                    <a
                      href={`/institute/projects/${project.id}`}
                      className="inline-flex items-center gap-2 font-body text-[0.78rem] font-semibold text-[#bd4a26]"
                    >
                      Open workspace
                      <ArrowRight size={16} />
                    </a>
                  </div>
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
    <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/45 p-6 font-body text-[0.78rem] text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading project portfolio…
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="mt-8 border border-dashed border-[#a58c6d]/55 p-8 text-center font-body text-[0.8rem] text-[#586d63]">
      {label}
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.78rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-4 border border-[#bd5a38]/60 px-4 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.09em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
