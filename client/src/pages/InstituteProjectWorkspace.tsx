/** Style: Samadhan institute project workspace — operational paper ledger for delivery, evidence, and activity. */
import InstituteHeader from "@/components/InstituteHeader";
import { LedgerSeal } from "@/components/LedgerSeal";
import {
  Award,
  FileUp,
  Flag,
  Loader2,
  Plus,
  Save,
  Send,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useLanguage } from "@/contexts/LanguageContext";

export default function InstituteProjectWorkspace() {
  const { t } = useLanguage();
  const [, params] = useRoute("/institute/projects/:id");
  const [, setLocation] = useLocation();
  const projectId = Number(params?.id ?? 0);
  const projectInput = useMemo(() => ({ id: projectId || 1 }), [projectId]);
  const recordsInput = useMemo(
    () => ({ projectId: projectId || 1 }),
    [projectId]
  );
  const projectQuery = trpc.workflow.projectById.useQuery(projectInput, {
    enabled: projectId > 0,
  });
  const milestonesQuery = trpc.workflow.projectMilestones.useQuery(
    recordsInput,
    { enabled: projectId > 0 }
  );
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(recordsInput, {
    enabled: projectId > 0,
  });
  const activitiesQuery = trpc.workflow.projectActivities.useQuery(
    recordsInput,
    { enabled: projectId > 0 }
  );
  const utils = trpc.useUtils();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("problem_identified");
  const [status, setStatus] = useState("active");
  const [riskSummary, setRiskSummary] = useState("");
  const [note, setNote] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("Working paper");
  const refresh = () => {
    void utils.workflow.projectById.invalidate();
    void utils.workflow.projects.invalidate();
    void utils.workflow.projectMilestones.invalidate();
    void utils.workflow.projectDocuments.invalidate();
    void utils.workflow.projectActivities.invalidate();
  };
  const updateProject = trpc.workflow.updateProject.useMutation({
    onSuccess: refresh,
  });
  const addMilestone = trpc.workflow.addMilestone.useMutation({
    onSuccess: () => {
      refresh();
      setMilestoneTitle("");
      setMilestoneDescription("");
    },
  });
  const updateMilestone = trpc.workflow.updateMilestone.useMutation({
    onSuccess: refresh,
  });
  const addActivity = trpc.workflow.addActivity.useMutation({
    onSuccess: () => {
      refresh();
      setNote("");
    },
  });
  const uploadDocument = trpc.workflow.uploadProjectDocument.useMutation({
    onSuccess: () => {
      refresh();
      setDocumentFile(null);
    },
  });
  const awardCredits = trpc.workflow.awardCredits.useMutation({
    onSuccess: refresh,
  });
  const project = projectQuery.data;
  const membersQuery = trpc.workflow.organizationMembers.useQuery(
    { organizationId: project?.organizationId ?? 0 },
    { enabled: (project?.organizationId ?? 0) > 0 }
  );
  useEffect(() => {
    if (!project) return;
    setProgress(project.progress);
    setStage(project.stage);
    setStatus(project.status);
    setRiskSummary(project.riskSummary ?? "");
  }, [project?.id]);
  function saveProject() {
    if (!project) return;
    updateProject.mutate({
      id: project.id,
      progress,
      stage: stage as any,
      status: status as any,
      riskSummary: riskSummary || undefined,
    });
  }
  function submitMilestone(event: React.FormEvent) {
    event.preventDefault();
    if (!project) return;
    addMilestone.mutate({
      projectId: project.id,
      title: milestoneTitle,
      description: milestoneDescription || undefined,
      position: (milestonesQuery.data?.length ?? 0) + 1,
    });
  }
  async function submitDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!project || !documentFile) return;
    const base64 = await toBase64(documentFile);
    uploadDocument.mutate({
      projectId: project.id,
      uploaderName: project.leadName,
      name: documentFile.name,
      documentType,
      mimeType: documentFile.type || "application/octet-stream",
      base64,
    });
  }
  function submitNote(event: React.FormEvent) {
    event.preventDefault();
    if (!project || !note.trim()) return;
    addActivity.mutate({
      projectId: project.id,
      actorName: project.leadName,
      actorRole: "Institute lead",
      type: "note",
      title: "Workspace update",
      detail: note.trim(),
    });
  }

  async function handleAwardCredits() {
    if (!project) return;
    try {
      const { toast } = await import("sonner");
      const result = await awardCredits.mutateAsync({ projectId: project.id });
      toast.success(`${result.credits} ${t("workspace.creditsAwardedToast")}`);
    } catch {
      // error shown by awardCredits.isError
    }
  }

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Projects" />
      <section className="px-6 py-8 sm:px-10 lg:px-[4rem] lg:py-10">
        <div className="mx-auto max-w-[92rem]">
          <button
            type="button"
            onClick={() => setLocation("/institute/projects")}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            {t("workspace.back")}
          </button>
          {projectQuery.isLoading ? (
            <Loading />
          ) : projectQuery.isError ? (
            <Failure
              message={projectQuery.error.message}
              retry={() => void projectQuery.refetch()}
            />
          ) : !project ? (
            <Empty label={t("workspace.notFound")} />
          ) : (
            <>
              <div className="mt-8 flex flex-col justify-between gap-6 border-b border-[#a78e6e]/45 pb-8 lg:flex-row lg:items-end">
                <div>
                  <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                    {t("workspace.projectWorkspace")} ·{" "}
                    {t(`workspace.statusOptions.${project.status}` as any) ??
                      project.status.replaceAll("_", " ")}
                  </p>
                  <h1 className="mt-4 max-w-[56rem] font-display text-[3.5rem] leading-[0.86] tracking-[-0.04em] sm:text-[4.7rem]">
                    {project.title}
                  </h1>
                  <p className="mt-4 max-w-[52rem] font-body text-[0.88rem] leading-relaxed text-[#52675d]">
                    {project.overview}
                  </p>
                </div>
                <p className="font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] text-[#64776c]">
                  {t("workspace.lead")} · {project.leadName}
                </p>
              </div>
              <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(22rem,.72fr)]">
                <div className="space-y-8">
                  <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                    <div className="flex items-center gap-3">
                      <Flag className="text-[#c94a20]" size={20} />
                      <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em]">
                        {t("workspace.deliveryControl")}
                      </p>
                    </div>
                    <div className="mt-5 grid gap-5 sm:grid-cols-2">
                      <WorkspaceSelect
                        label={t("workspace.stage")}
                        value={stage || project.stage}
                        setValue={setStage}
                        options={[
                          "problem_identified",
                          "solution_design",
                          "prototype_development",
                          "pilot_testing",
                          "closeout",
                        ]}
                        translationPrefix="workspace.stageOptions"
                      />
                      <WorkspaceSelect
                        label={t("workspace.status")}
                        value={status || project.status}
                        setValue={setStatus}
                        options={[
                          "active",
                          "at_risk",
                          "on_hold",
                          "closeout_pending",
                          "resolved",
                        ]}
                        translationPrefix="workspace.statusOptions"
                      />
                      <label>
                        <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                          {t("workspace.progress")} ·{" "}
                          {progress || project.progress}%
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={progress || project.progress}
                          onChange={event =>
                            setProgress(Number(event.target.value))
                          }
                          className="mt-4 w-full accent-[#c94a20]"
                        />
                      </label>
                      <label>
                        <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                          {t("workspace.risk")}
                        </span>
                        <input
                          defaultValue={project.riskSummary ?? ""}
                          onChange={event => setRiskSummary(event.target.value)}
                          className="citizen-input mt-3"
                          placeholder={t("workspace.riskPlaceholder")}
                        />
                      </label>
                    </div>
                    <button
                      type="button"
                      disabled={updateProject.isPending}
                      onClick={saveProject}
                      className="rounded-full mt-6 inline-flex items-center gap-2 bg-[#16422f] px-5 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white"
                    >
                      <Save size={15} />
                      {updateProject.isPending
                        ? t("workspace.saving")
                        : t("workspace.save")}
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

                  {/* USP-06: Award Credits button — shown when closeout resolved */}
                  {project.stage === "closeout" &&
                    project.status === "resolved" &&
                    !(project.creditsAwarded ?? 0) && (
                      <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                        <div className="flex items-center gap-3">
                          <Award className="text-[#6a5a9c]" size={20} />
                          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em]">
                            {t("workspace.academicCredits")}
                          </p>
                        </div>
                        <p className="mt-3 font-body text-[0.78rem] text-[#52675d]">
                          {t("workspace.awardDesc")}
                        </p>
                        <button
                          type="button"
                          disabled={awardCredits.isPending}
                          onClick={handleAwardCredits}
                          className="rounded-full mt-4 inline-flex items-center gap-2 bg-[#6a5a9c] px-5 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                        >
                          {awardCredits.isPending ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Award size={15} />
                          )}
                          {awardCredits.isPending
                            ? t("workspace.awarding")
                            : t("workspace.awardButton")}
                        </button>
                        {awardCredits.isError && (
                          <p className="mt-3 font-body text-[0.72rem] text-[#a34b2c]">
                            {awardCredits.error.message}
                          </p>
                        )}
                      </section>
                    )}

                  {/* USP-06: Show awarded credits */}
                  {(project.creditsAwarded ?? 0) > 0 && (
                    <section className="border border-[#8fa887]/55 bg-[#e6ede3]/35 p-6">
                      <div className="flex items-center gap-3">
                        <Award className="text-[#3a6b4a]" size={20} />
                        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#3a6b4a]">
                          {t("workspace.creditsAwarded")}
                        </p>
                      </div>
                      <p className="mt-3 font-body text-[1.5rem] font-bold text-[#3a6b4a]">
                        {project.creditsAwarded} {t("workspace.credits")}
                      </p>
                      <p className="mt-1 font-body text-[0.78rem] text-[#52675d]">
                        {t("workspace.distributedTo")}{" "}
                        {membersQuery.data?.length ?? 0}{" "}
                        {t("workspace.teamMembers")}
                      </p>
                    </section>
                  )}

                  <section>
                    <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                      {t("workspace.milestones")}
                    </p>
                    {milestonesQuery.isLoading ? (
                      <Loading />
                    ) : milestonesQuery.isError ? (
                      <Failure
                        message={milestonesQuery.error.message}
                        retry={() => void milestonesQuery.refetch()}
                      />
                    ) : (
                      <div className="mt-5 space-y-3">
                        {(milestonesQuery.data ?? []).map(milestone => (
                          <div
                            key={milestone.id}
                            className="flex flex-col justify-between gap-3 border border-[#a58c6d]/45 p-4 sm:flex-row sm:items-center"
                          >
                            <div>
                              <p className="font-display text-[1.35rem]">
                                {milestone.title}
                              </p>
                              <p className="mt-1 font-body text-[0.73rem] text-[#5c7066]">
                                {milestone.description ||
                                  t("workspace.noDescription")}
                              </p>
                            </div>
                            <select
                              value={milestone.status}
                              onChange={event =>
                                updateMilestone.mutate({
                                  id: milestone.id,
                                  status: event.target.value as any,
                                })
                              }
                              className="border border-[#9a876c]/55 bg-transparent px-3 py-2 font-mono-ui text-[0.55rem] uppercase tracking-[0.08em]"
                            >
                              {[
                                "upcoming",
                                "in_progress",
                                "complete",
                                "blocked",
                              ].map(option => (
                                <option key={option} value={option}>
                                  {t(
                                    `workspace.milestoneStatus.${option}` as any
                                  ) ?? option.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {(milestonesQuery.data ?? []).length === 0 && (
                          <Empty label={t("workspace.noMilestones")} />
                        )}
                      </div>
                    )}
                    <form
                      onSubmit={submitMilestone}
                      className="mt-5 border border-dashed border-[#a58c6d]/55 p-5"
                    >
                      <p className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                        {t("workspace.addMilestone")}
                      </p>
                      <input
                        required
                        value={milestoneTitle}
                        onChange={event =>
                          setMilestoneTitle(event.target.value)
                        }
                        className="citizen-input mt-3"
                        placeholder={t("workspace.milestoneTitle")}
                      />
                      <textarea
                        value={milestoneDescription}
                        onChange={event =>
                          setMilestoneDescription(event.target.value)
                        }
                        className="citizen-input mt-3 min-h-[5rem] resize-y"
                        placeholder={t("workspace.milestoneDescPlaceholder")}
                      />
                      <button
                        disabled={addMilestone.isPending}
                        className="rounded-full mt-3 inline-flex items-center gap-2 bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-white"
                      >
                        <Plus size={14} />
                        {t("workspace.addMilestoneButton")}
                      </button>
                    </form>
                  </section>
                  <section>
                    <div className="mb-5">
                      <LedgerSeal projectId={projectId || 1} />
                    </div>
                    <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                      {t("workspace.activityRecord")}
                    </p>
                    {activitiesQuery.isError ? (
                      <Failure
                        message={activitiesQuery.error.message}
                        retry={() => void activitiesQuery.refetch()}
                      />
                    ) : (
                      <div className="mt-5 space-y-3">
                        {(activitiesQuery.data ?? []).map(activity => (
                          <div
                            key={activity.id}
                            className="border-l-2 border-[#8fa887] pl-4"
                          >
                            <p className="font-body text-[0.79rem] font-semibold">
                              {activity.title}
                            </p>
                            <p className="mt-1 font-body text-[0.74rem] text-[#596e63]">
                              {activity.detail || ""}
                            </p>
                          </div>
                        ))}
                        {(activitiesQuery.data ?? []).length === 0 && (
                          <Empty label={t("workspace.noActivity")} />
                        )}
                      </div>
                    )}
                    <form onSubmit={submitNote} className="mt-5 flex gap-3">
                      <input
                        value={note}
                        onChange={event => setNote(event.target.value)}
                        className="citizen-input"
                        placeholder={t("workspace.logPlaceholder")}
                      />
                      <button
                        disabled={addActivity.isPending || !note.trim()}
                        className="rounded-full shrink-0 bg-[#16422f] px-4 text-white"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  </section>
                </div>
                <aside className="space-y-8">
                  <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                    <p className="flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                      <FileUp size={17} />
                      {t("workspace.projectDocuments")}
                    </p>
                    {documentsQuery.isLoading ? (
                      <Loading />
                    ) : documentsQuery.isError ? (
                      <Failure
                        message={documentsQuery.error.message}
                        retry={() => void documentsQuery.refetch()}
                      />
                    ) : (
                      <div className="mt-5 space-y-3">
                        {(documentsQuery.data ?? []).map(document => (
                          <a
                            key={document.id}
                            href={document.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block border border-[#a58c6d]/45 p-3 transition hover:bg-[#e7dfcf]"
                          >
                            <p className="font-body text-[0.78rem] font-semibold">
                              {document.name}
                            </p>
                            <p className="mt-1 font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#64776d]">
                              {document.documentType} ·{" "}
                              {document.approvalStatus}
                            </p>
                          </a>
                        ))}
                        {(documentsQuery.data ?? []).length === 0 && (
                          <Empty label={t("workspace.noDocuments")} />
                        )}
                      </div>
                    )}
                    <form
                      onSubmit={submitDocument}
                      className="mt-5 border-t border-[#a78e6e]/45 pt-5"
                    >
                      <label>
                        <span className="font-body text-[0.75rem]">
                          {t("workspace.documentType")}
                        </span>
                        <input
                          value={documentType}
                          onChange={event =>
                            setDocumentType(event.target.value)
                          }
                          className="citizen-input mt-2"
                        />
                      </label>
                      <label className="mt-3 block">
                        <span className="font-body text-[0.75rem]">
                          {t("workspace.fileLabel")}
                        </span>
                        <input
                          type="file"
                          onChange={event =>
                            setDocumentFile(event.target.files?.[0] ?? null)
                          }
                          className="mt-2 block w-full font-body text-[0.72rem]"
                        />
                      </label>
                      <button
                        disabled={!documentFile || uploadDocument.isPending}
                        className="rounded-full mt-4 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
                      >
                        <FileUp size={15} />
                        {uploadDocument.isPending
                          ? t("workspace.uploading")
                          : t("workspace.upload")}
                      </button>
                      {uploadDocument.isError && (
                        <p
                          role="alert"
                          className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                        >
                          {uploadDocument.error.message}
                        </p>
                      )}
                    </form>
                  </section>
                  <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                    <p className="flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                      <Timer size={17} />
                      {t("workspace.teamRecord")}
                    </p>
                    <p className="mt-4 whitespace-pre-wrap font-body text-[0.78rem] leading-relaxed text-[#51685d]">
                      {project.teamMembers || t("workspace.noTeam")}
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
function WorkspaceSelect({
  label,
  value,
  setValue,
  options,
  translationPrefix,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  options: string[];
  translationPrefix?: string;
}) {
  const { t } = useLanguage();
  return (
    <label>
      <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
        {label}
      </span>
      <select
        value={value}
        onChange={event => setValue(event.target.value)}
        className="citizen-input mt-3 capitalize"
      >
        {options.map(option => {
          const key = translationPrefix
            ? `${translationPrefix}.${option}`
            : option;
          const translated = translationPrefix
            ? t(key as any) !== key
              ? t(key as any)
              : option.replaceAll("_", " ")
            : option.replaceAll("_", " ");
          return (
            <option key={option} value={option}>
              {translated}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function Loading() {
  const { t } = useLanguage();
  return (
    <div className="mt-5 flex items-center gap-3 border border-[#a58c6d]/45 p-5 font-body text-[0.76rem] text-[#52675d]">
      <Loader2 className="animate-spin" size={17} />
      {t("workspace.loading")}
    </div>
  );
}
function Empty({ label }: { label?: string }) {
  const { t } = useLanguage();
  return (
    <div className="mt-5 border border-dashed border-[#a58c6d]/55 p-5 font-body text-[0.76rem] text-[#586d63]">
      {label ?? t("workspace.notFound")}
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="mt-5 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"
    >
      <p className="font-body text-[0.75rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        {t("workspace.retry")}
      </button>
    </div>
  );
}
function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
