import InstituteHeader from "@/components/InstituteHeader";
import { BeforeAfterEvidence } from "@/components/BeforeAfterEvidence";
import { CheckCircle2, ImageOff, Loader2, Send, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function ProjectCloseout() {
  const [, params] = useRoute("/institute/projects/:id/closeout");
  const [, setLocation] = useLocation();
  const projectId = Number(params?.id ?? 0);
  const projectInput = useMemo(() => ({ id: projectId || 1 }), [projectId]);
  const closeoutInput = useMemo(
    () => ({ projectId: projectId || 1 }),
    [projectId]
  );
  const projectQuery = trpc.workflow.projectById.useQuery(projectInput, {
    enabled: projectId > 0,
  });
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(
    closeoutInput,
    { enabled: projectId > 0 }
  );
  const documentsQuery = trpc.workflow.projectDocuments.useQuery(
    closeoutInput,
    { enabled: projectId > 0 }
  );
  const utils = trpc.useUtils();
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const updateProject = trpc.workflow.updateProject.useMutation({
    onSuccess: () => {
      void utils.workflow.projectById.invalidate();
      void utils.workflow.projects.invalidate();
    },
  });
  const addActivity = trpc.workflow.addActivity.useMutation({
    onSuccess: () => void utils.workflow.projectActivities.invalidate(),
  });
  const submit = trpc.workflow.submitCloseout.useMutation({
    onSuccess: () => void utils.workflow.projectCloseouts.invalidate(),
  });
  const project = projectQuery.data;
  const documents = documentsQuery.data ?? [];
  const sortedCloseouts = useMemo(
    () =>
      [...(closeoutsQuery.data ?? [])].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [closeoutsQuery.data]
  );
  const latestCloseout = sortedCloseouts[sortedCloseouts.length - 1];
  const roundNumber = sortedCloseouts.length + 1;
  const alreadyResolved = latestCloseout?.citizenConfirmation === "confirmed";

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!project) return;
    if (!beforeId || !afterId) {
      toast.error("Pick a before photo and an after photo to continue.");
      return;
    }
    if (beforeId === afterId) {
      toast.error("Before and after evidence must be two different files.");
      return;
    }
    const afterDoc = documents.find(doc => String(doc.id) === afterId);
    submit.mutate(
      {
        projectId: project.id,
        submittedBy: project.leadName,
        outcomeSummary,
        evidenceUrl: afterDoc?.fileUrl || undefined,
        beforeEvidenceId: Number(beforeId),
        afterEvidenceId: Number(afterId),
      },
      {
        onSuccess: () => {
          updateProject.mutate({
            id: project.id,
            status: "closeout_pending",
            stage: "closeout",
            progress: 100,
          });
          addActivity.mutate({
            projectId: project.id,
            actorName: project.leadName,
            actorRole: "Institute lead",
            type: "closeout",
            title: "Closeout submitted",
            detail: outcomeSummary,
          });
        },
      }
    );
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
      <section className="px-6 py-9 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[72rem]">
          <button
            type="button"
            onClick={() => setLocation(`/institute/projects/${projectId}`)}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to project workspace
          </button>
          {projectQuery.isLoading ? (
            <Loading label="Loading project…" />
          ) : projectQuery.isError || !project ? (
            <Failure
              message={
                projectQuery.error?.message || "Project record not found."
              }
              retry={() => void projectQuery.refetch()}
            />
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,.6fr)]">
              <article>
                <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                  Project closeout · Round {roundNumber}
                </p>
                <h1 className="mt-4 font-display text-[3.8rem] leading-[0.86] tracking-[-0.04em]">
                  {sortedCloseouts.length === 0
                    ? "Mark the work done."
                    : "Show them it's fixed."}
                </h1>
                <p className="mt-5 font-body text-[0.88rem] leading-relaxed text-[#53675d]">
                  Upload a before/after photo pair and describe what changed.
                  The citizen who reported this will see it directly and decide
                  — no admin sign-off required.
                </p>
                {latestCloseout?.citizenConfirmation === "disputed" && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 border border-[#bd5a38]/55 bg-[#f7e2d6]/40 p-4"
                  >
                    <p className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#934325]">
                      Round {roundNumber - 1} · citizen said it wasn't fixed
                    </p>
                    <p className="mt-2 font-body text-[0.8rem] italic text-[#934325]">
                      “
                      {latestCloseout.citizenNotes ||
                        latestCloseout.outcomeSummary}
                      ”
                    </p>
                    <p className="mt-2 font-body text-[0.74rem] text-[#7a5236]">
                      Address this, then submit a fresh before/after pair below
                      to send it back to them.
                    </p>
                  </motion.div>
                )}
                {alreadyResolved ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-7 flex items-center gap-3 border border-[#8fa887]/60 bg-[#e6ede3]/50 p-6"
                  >
                    <CheckCircle2 className="text-[#3a6b4a]" size={22} />
                    <p className="font-body text-[0.85rem] text-[#3a6b4a]">
                      The citizen confirmed this is fixed. The challenge is
                      resolved — nothing more to submit.
                    </p>
                  </motion.div>
                ) : (
                  <form
                    onSubmit={send}
                    className="mt-7 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                  >
                    <label className="block">
                      <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                        Outcome summary
                      </span>
                      <textarea
                        required
                        minLength={20}
                        value={outcomeSummary}
                        onChange={event =>
                          setOutcomeSummary(event.target.value)
                        }
                        className="citizen-input mt-3 min-h-[12rem] resize-y"
                        placeholder="Describe the intervention, result, beneficiaries, remaining constraints, and recommended next step."
                      />
                    </label>
                    <div className="mt-5">
                      <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                        Before / after evidence
                      </span>
                      <p className="mt-1.5 font-body text-[0.74rem] text-[#607168]">
                        Citizens will see this pair side-by-side to confirm the
                        outcome. Upload files from the project workspace's
                        Documents section first if none appear below.
                      </p>
                      {documentsQuery.isLoading ? (
                        <p className="mt-3 font-body text-[0.75rem] text-[#607168]">
                          Loading project documents…
                        </p>
                      ) : documents.length === 0 ? (
                        <div className="mt-3 flex items-center gap-2 border border-dashed border-[#a58c6d]/55 p-4 font-body text-[0.76rem] text-[#a34b2c]">
                          <ImageOff size={16} />
                          No documents uploaded yet — add before/after photos
                          under Documents in the project workspace.
                        </div>
                      ) : (
                        <div className="mt-3 grid gap-4 sm:grid-cols-2">
                          <EvidencePicker
                            label="Before"
                            value={beforeId}
                            onChange={setBeforeId}
                            documents={documents}
                          />
                          <EvidencePicker
                            label="After"
                            value={afterId}
                            onChange={setAfterId}
                            documents={documents}
                          />
                        </div>
                      )}
                      <AnimatePresence>
                        {beforeId && afterId && beforeId !== afterId && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-4 flex items-center gap-1.5 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#7a6a3f]">
                              <Sparkles size={12} />
                              Preview — what the citizen will see
                            </p>
                            <BeforeAfterEvidence
                              before={documents.find(
                                doc => String(doc.id) === beforeId
                              )}
                              after={documents.find(
                                doc => String(doc.id) === afterId
                              )}
                              className="mt-2 max-w-[24rem]"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={submit.isPending || updateProject.isPending}
                      className="rounded-full mt-6 flex items-center gap-2 bg-[#c94a20] px-5 py-4 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                    >
                      <Send size={15} />
                      {submit.isPending ? "Submitting…" : "Submit closeout"}
                    </motion.button>
                    {submit.isError && (
                      <p
                        role="alert"
                        className="mt-3 font-body text-[0.73rem] text-[#a34b2c]"
                      >
                        {submit.error.message}
                      </p>
                    )}
                    {submit.isSuccess && (
                      <p className="mt-3 flex items-center gap-2 font-body text-[0.73rem] text-[#386548]">
                        <CheckCircle2 size={15} />
                        Sent to the citizen for review.
                      </p>
                    )}
                  </form>
                )}
              </article>
              <aside className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em]">
                  Closeout records
                </p>
                {closeoutsQuery.isLoading ? (
                  <Loading label="Loading closeouts…" />
                ) : closeoutsQuery.isError ? (
                  <Failure
                    message={closeoutsQuery.error.message}
                    retry={() => void closeoutsQuery.refetch()}
                  />
                ) : sortedCloseouts.length === 0 ? (
                  <p className="mt-5 font-body text-[0.78rem] text-[#607168]">
                    No closeout has been submitted.
                  </p>
                ) : (
                  <div className="mt-5 space-y-4">
                    {sortedCloseouts.map((item, index) => (
                      <article
                        key={item.id}
                        className="border border-[#a58c6d]/45 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] text-[#7d8b83]">
                            Round {index + 1}
                          </span>
                          <span
                            className={`font-mono-ui text-[0.5rem] font-semibold uppercase tracking-[0.08em] ${
                              item.citizenConfirmation === "confirmed"
                                ? "text-[#3a6b4a]"
                                : item.citizenConfirmation === "disputed"
                                  ? "text-[#934325]"
                                  : "text-[#64776d]"
                            }`}
                          >
                            {item.citizenConfirmation === "pending"
                              ? "Awaiting citizen"
                              : item.citizenConfirmation}
                          </span>
                        </div>
                        <p className="mt-3 font-body text-[0.77rem] leading-relaxed text-[#51685d]">
                          {item.outcomeSummary}
                        </p>
                        {item.evidenceUrl && (
                          <a
                            href={item.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block font-body text-[0.75rem] font-semibold text-[#bd4a26]"
                          >
                            Open evidence →
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
type CloseoutDocument = {
  id: number;
  name: string;
  documentType: string;
  fileUrl?: string | null;
  mimeType?: string | null;
};
function EvidencePicker({
  label,
  value,
  onChange,
  documents,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  documents: CloseoutDocument[];
}) {
  const selected = documents.find(doc => String(doc.id) === value);
  return (
    <div>
      <span className="font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#64776d]">
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="citizen-input mt-2 w-full"
      >
        <option value="">Select a document…</option>
        {documents.map(doc => (
          <option key={doc.id} value={String(doc.id)}>
            {doc.name} · {doc.documentType}
          </option>
        ))}
      </select>
      <div
        className={`mt-2 aspect-[4/3] overflow-hidden border bg-[#ebe0cc] transition-colors ${
          selected ? "border-[#c94a20]/60" : "border-[#a58c6d]/45"
        }`}
      >
        <AnimatePresence mode="wait">
          {selected?.mimeType?.startsWith("image/") && selected.fileUrl ? (
            <motion.img
              key={selected.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              src={selected.fileUrl}
              alt={selected.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-[#9d876a]">
              <ImageOff size={24} />
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
function Loading({ label }: { label: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      {label}
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-6 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"
    >
      <p className="font-body text-[0.75rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
