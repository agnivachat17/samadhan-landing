/** Style: Samadhan admin project record — live governance case sheet. */
import AdminHeader from "@/components/AdminHeader";
import { CheckCircle2, FileText, Flag, Loader2, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function AdminProjectDetail() {
  const [, params] = useRoute("/admin/projects/:id");
  const id = Number(params?.id ?? 0);
  const projectInput = useMemo(() => ({ id: id || 1 }), [id]);
  const recordInput = useMemo(() => ({ projectId: id || 1 }), [id]);
  const [organizationInput] = useState({});
  const projectQuery = trpc.workflow.projectById.useQuery(projectInput, {
    enabled: id > 0,
  });
  const organizationsQuery =
    trpc.workflow.organizations.useQuery(organizationInput);
  const milestonesQuery = trpc.workflow.projectMilestones.useQuery(
    recordInput,
    { enabled: id > 0 }
  );
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(recordInput, {
    enabled: id > 0,
  });
  const activitiesQuery = trpc.workflow.projectActivities.useQuery(
    recordInput,
    { enabled: id > 0 }
  );
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(recordInput, {
    enabled: id > 0,
  });
  const utils = trpc.useUtils();
  const [note, setNote] = useState("");
  const [risk, setRisk] = useState("");
  const updateProject = trpc.workflow.updateProject.useMutation({
    onSuccess: () => void utils.workflow.projectById.invalidate(),
  });
  const addActivity = trpc.workflow.addActivity.useMutation({
    onSuccess: () => {
      void utils.workflow.projectActivities.invalidate();
      setNote("");
    },
  });
  const project = projectQuery.data;
  const organization = organizationsQuery.data?.find(
    item => item.id === project?.organizationId
  );
  const completed = (milestonesQuery.data ?? []).filter(
    item => item.status === "complete"
  ).length;
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Projects" />
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem]">
        <div className="mx-auto max-w-[94rem]">
          <a
            href="/admin/projects"
            className="font-body text-[0.78rem] text-[#3c584b] hover:text-[#c64b22]"
          >
            ← Back to Project Management
          </a>
          {projectQuery.isLoading ? (
            <Loading />
          ) : projectQuery.isError || !project ? (
            <Failure
              message={
                projectQuery.error?.message || "Project record not found."
              }
              retry={() => void projectQuery.refetch()}
            />
          ) : (
            <div className="mt-7 grid gap-10 xl:grid-cols-[minmax(0,1.28fr)_minmax(23rem,.72fr)] xl:gap-14">
              <article>
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.11em] text-[#c64b22]">
                  Project record · {project.stage.replaceAll("_", " ")}
                </p>
                <h1 className="mt-5 max-w-[50rem] font-display text-[3.8rem] leading-[0.85] tracking-[-0.04em] sm:text-[5.2rem]">
                  {project.title}
                </h1>
                <p className="mt-7 max-w-[52rem] border-b border-[#a78e6e]/45 pb-7 font-body text-[0.95rem] leading-[1.75] text-[#40584e]">
                  {project.overview}
                </p>
                <section className="mt-7 grid gap-5 border-b border-[#a78e6e]/45 pb-7 sm:grid-cols-3">
                  <Meta
                    label="Lead institution"
                    value={organization?.name ?? "Institution record"}
                  />
                  <Meta label="Project lead" value={project.leadName} />
                  <Meta
                    label="Team"
                    value={project.teamMembers || "Not recorded"}
                  />
                  <Meta
                    label="Status"
                    value={project.status.replaceAll("_", " ")}
                  />
                  <Meta
                    label="Target completion"
                    value={
                      project.targetCompletionAt
                        ? new Date(
                            project.targetCompletionAt
                          ).toLocaleDateString()
                        : "Not set"
                    }
                  />
                  <Meta
                    label="Risk"
                    value={project.riskSummary || "No current risk"}
                  />
                </section>
                <section className="mt-8">
                  <Label>Milestones</Label>
                  {milestonesQuery.isLoading ? (
                    <Loading />
                  ) : milestonesQuery.isError ? (
                    <Failure
                      message={milestonesQuery.error.message}
                      retry={() => void milestonesQuery.refetch()}
                    />
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {(milestonesQuery.data ?? []).map(item => (
                        <article
                          key={item.id}
                          className="border border-[#a58c6d]/45 p-4"
                        >
                          <p className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#64776d]">
                            {item.status.replaceAll("_", " ")}
                          </p>
                          <h3 className="mt-2 font-display text-[1.4rem] leading-none">
                            {item.title}
                          </h3>
                          <p className="mt-2 font-body text-[0.74rem] text-[#5c7066]">
                            {item.description || "No description"}
                          </p>
                        </article>
                      ))}
                      {(milestonesQuery.data ?? []).length === 0 && (
                        <Empty label="No milestones recorded." />
                      )}
                    </div>
                  )}
                </section>
                <section className="mt-10">
                  <Label>Uploaded documents</Label>
                  {documentsQuery.isLoading ? (
                    <Loading />
                  ) : documentsQuery.isError ? (
                    <Failure
                      message={documentsQuery.error.message}
                      retry={() => void documentsQuery.refetch()}
                    />
                  ) : (
                    <div className="mt-5 divide-y divide-[#a78e6e]/40 border-y border-[#a78e6e]/40">
                      {(documentsQuery.data ?? []).map(doc => (
                        <a
                          key={doc.id}
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-4 py-4 hover:bg-[#e9dfcd]/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="text-[#46694e]" size={20} />
                            <div>
                              <p className="font-body text-[0.79rem] font-semibold">
                                {doc.name}
                              </p>
                              <p className="mt-1 font-body text-[0.68rem] text-[#5b6d64]">
                                {doc.documentType} · {doc.approvalStatus}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#bc4a27]">
                            Open
                          </span>
                        </a>
                      ))}
                      {(documentsQuery.data ?? []).length === 0 && (
                        <Empty label="No documents uploaded." />
                      )}
                    </div>
                  )}
                </section>
                <section className="mt-10">
                  <Label>Activity log</Label>
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      if (project && note.trim())
                        addActivity.mutate({
                          projectId: project.id,
                          actorName: "Samadhan Administrator",
                          actorRole: "Administrator",
                          type: "note",
                          title: "Administrator note",
                          detail: note.trim(),
                        });
                    }}
                    className="mt-5 flex gap-3"
                  >
                    <input
                      value={note}
                      onChange={event => setNote(event.target.value)}
                      className="citizen-input"
                      placeholder="Add an admin note to this project record…"
                    />
                    <button
                      disabled={!note.trim() || addActivity.isPending}
                      className="rounded-full inline-flex shrink-0 items-center gap-2 bg-[#c94a20] px-5 py-3 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white"
                    >
                      <Plus size={15} />
                      Add note
                    </button>
                  </form>
                  {activitiesQuery.isLoading ? (
                    <Loading />
                  ) : activitiesQuery.isError ? (
                    <Failure
                      message={activitiesQuery.error.message}
                      retry={() => void activitiesQuery.refetch()}
                    />
                  ) : (
                    <div className="mt-6 space-y-4">
                      {(activitiesQuery.data ?? []).map(activity => (
                        <article
                          key={activity.id}
                          className="border-l border-[#a78e6e]/55 pl-5"
                        >
                          <p className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#6a796f]">
                            {activity.type} ·{" "}
                            {activity.createdAt
                              ? new Date(activity.createdAt).toLocaleString()
                              : ""}
                          </p>
                          <h3 className="mt-2 font-display text-[1.24rem] leading-none">
                            {activity.title}
                          </h3>
                          <p className="mt-2 font-body text-[0.75rem] leading-relaxed text-[#53675d]">
                            {activity.detail || ""}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </article>
              <aside className="h-fit space-y-5 xl:sticky xl:top-6">
                <section className="border border-[#9f896d]/60 bg-[#f7f0e5]/28 p-6">
                  <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                    Project status
                  </p>
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="font-body text-[2.75rem] font-bold leading-none tabular-nums">
                        {project.progress}%
                      </p>
                      <p className="mt-2 font-body text-[0.8rem] text-[#52675d]">
                        Overall completion
                      </p>
                    </div>
                    <span className="border border-[#849b83] px-3 py-2 font-mono-ui text-[0.56rem] uppercase tracking-[0.09em] text-[#436649]">
                      {project.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-5 h-2 bg-[#ded4c1]">
                    <div
                      className="h-full bg-[#c64b22]"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="mt-4 font-body text-[0.74rem] text-[#53675d]">
                    {completed} of {(milestonesQuery.data ?? []).length}{" "}
                    milestones completed.
                  </p>
                  <label className="mt-5 block">
                    <span className="font-mono-ui text-[0.54rem] uppercase tracking-[0.08em]">
                      Risk flag
                    </span>
                    <input
                      value={risk}
                      onChange={event => setRisk(event.target.value)}
                      className="citizen-input mt-2"
                      placeholder="Describe risk or blocker"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      updateProject.mutate({
                        id: project.id,
                        status: "at_risk",
                        riskSummary:
                          risk || "Administrator flagged a delivery risk.",
                      })
                    }
                    className="rounded-full mt-4 flex w-full items-center justify-center gap-2 border border-[#bd5a38]/70 px-4 py-3 font-mono-ui text-[0.58rem] uppercase tracking-[0.08em] text-[#ab4826]"
                  >
                    <Flag size={15} />
                    Flag project risk
                  </button>
                  {updateProject.isError && (
                    <p
                      role="alert"
                      className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                    >
                      {updateProject.error.message}
                    </p>
                  )}
                </section>
                <section className="border border-[#9f896d]/60 bg-[#f7f0e5]/28 p-6">
                  <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                    Closeout governance
                  </p>
                  {closeoutsQuery.isLoading ? (
                    <Loading />
                  ) : closeoutsQuery.isError ? (
                    <Failure
                      message={closeoutsQuery.error.message}
                      retry={() => void closeoutsQuery.refetch()}
                    />
                  ) : (closeoutsQuery.data ?? []).length === 0 ? (
                    <p className="mt-4 font-body text-[0.75rem] text-[#5d7067]">
                      No closeout submitted.
                    </p>
                  ) : (
                    <a
                      href={`/admin/projects/${project.id}/closeout`}
                      className="rounded-full mt-4 inline-flex items-center gap-2 bg-[#16422f] px-4 py-3 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-white"
                    >
                      <CheckCircle2 size={15} />
                      View closeout
                    </a>
                  )}
                </section>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
      {children}
    </p>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono-ui text-[0.55rem] uppercase tracking-[0.11em] text-[#5d7067]">
        {label}
      </p>
      <p className="mt-2 font-body text-[0.78rem] leading-snug text-[#29463a]">
        {value}
      </p>
    </div>
  );
}
function Loading() {
  return (
    <div className="mt-5 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={17} />
      Loading…
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="mt-4 font-body text-[0.75rem] text-[#607168]">{label}</div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-5 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"
    >
      <p className="font-body text-[0.75rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
