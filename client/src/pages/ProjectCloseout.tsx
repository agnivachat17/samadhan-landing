import InstituteHeader from "@/components/InstituteHeader";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function ProjectCloseout() {
  const [, params] = useRoute("/institute/projects/:id/closeout");
  const [, setLocation] = useLocation();
  const projectId = Number(params?.id ?? 0);
  const projectInput = useMemo(() => ({ id: projectId || 1 }), [projectId]);
  const closeoutInput = useMemo(() => ({ projectId: projectId || 1 }), [projectId]);
  const projectQuery = trpc.workflow.projectById.useQuery(projectInput, { enabled: projectId > 0 });
  const closeoutsQuery = trpc.workflow.projectCloseouts.useQuery(closeoutInput, { enabled: projectId > 0 });
  const utils = trpc.useUtils();
  const [outcomeSummary, setOutcomeSummary] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const updateProject = trpc.workflow.updateProject.useMutation({ onSuccess: () => { void utils.workflow.projectById.invalidate(); void utils.workflow.projects.invalidate(); } });
  const submit = trpc.workflow.submitCloseout.useMutation({ onSuccess: () => void utils.workflow.projectCloseouts.invalidate() });
  const project = projectQuery.data;

  function send(event: React.FormEvent) {
    event.preventDefault();
    if (!project) return;
    submit.mutate({ projectId: project.id, submittedBy: project.leadName, outcomeSummary, evidenceUrl: evidenceUrl || undefined }, { onSuccess: () => updateProject.mutate({ id: project.id, status: "closeout_pending", stage: "closeout", progress: 100 }) });
  }

  return <main className="min-h-screen bg-[#f1eadc] text-[#0d3024]" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}><InstituteHeader active="Projects" /><section className="px-6 py-9 sm:px-10 lg:px-[5rem]"><div className="mx-auto max-w-[72rem]"><button type="button" onClick={() => setLocation(`/institute/projects/${projectId}`)} className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]">← Back to project workspace</button>{projectQuery.isLoading ? <Loading label="Loading project…" /> : projectQuery.isError || !project ? <Failure message={projectQuery.error?.message || "Project record not found."} retry={() => void projectQuery.refetch()} /> : <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,.6fr)]"><article><p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">Project closeout</p><h1 className="mt-4 font-display text-[3.8rem] leading-[0.86] tracking-[-0.04em]">Record the outcome.</h1><p className="mt-5 font-body text-[0.88rem] leading-relaxed text-[#53675d]">Submit the intervention outcome and its primary evidence link. The closeout will move to citizen confirmation and administrative resolution.</p><form onSubmit={send} className="mt-7 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"><label className="block"><span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">Outcome summary</span><textarea required minLength={20} value={outcomeSummary} onChange={event => setOutcomeSummary(event.target.value)} className="citizen-input mt-3 min-h-[12rem] resize-y" placeholder="Describe the intervention, result, beneficiaries, remaining constraints, and recommended next step." /></label><label className="mt-5 block"><span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">Primary evidence URL</span><input type="url" value={evidenceUrl} onChange={event => setEvidenceUrl(event.target.value)} className="citizen-input mt-3" placeholder="Optional link to a project document" /></label><button disabled={submit.isPending || updateProject.isPending} className="mt-6 flex items-center gap-2 bg-[#c94a20] px-5 py-4 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-white"><Send size={15} />{submit.isPending ? "Submitting…" : "Submit closeout"}</button>{submit.isError && <p role="alert" className="mt-3 font-body text-[0.73rem] text-[#a34b2c]">{submit.error.message}</p>}{submit.isSuccess && <p className="mt-3 flex items-center gap-2 font-body text-[0.73rem] text-[#386548]"><CheckCircle2 size={15} />Closeout submitted for review.</p>}</form></article><aside className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"><p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em]">Closeout records</p>{closeoutsQuery.isLoading ? <Loading label="Loading closeouts…" /> : closeoutsQuery.isError ? <Failure message={closeoutsQuery.error.message} retry={() => void closeoutsQuery.refetch()} /> : (closeoutsQuery.data ?? []).length === 0 ? <p className="mt-5 font-body text-[0.78rem] text-[#607168]">No closeout has been submitted.</p> : <div className="mt-5 space-y-4">{closeoutsQuery.data?.map(item => <article key={item.id} className="border border-[#a58c6d]/45 p-4"><p className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#64776d]">Citizen: {item.citizenConfirmation} · Admin: {item.adminStatus}</p><p className="mt-3 font-body text-[0.77rem] leading-relaxed text-[#51685d]">{item.outcomeSummary}</p>{item.evidenceUrl && <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block font-body text-[0.75rem] font-semibold text-[#bd4a26]">Open evidence →</a>}</article>)}</div>}</aside></div>}</div></section></main>;
}
function Loading({ label }: { label: string }) { return <div className="mt-6 flex items-center gap-3 font-body text-[#52675d]"><Loader2 className="animate-spin" size={18} />{label}</div>; }
function Failure({ message, retry }: { message: string; retry: () => void }) { return <div role="alert" className="mt-6 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-5"><p className="font-body text-[0.75rem] text-[#934325]">{message}</p><button type="button" onClick={retry} className="mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]">Retry</button></div>; }
