/** Style: Samadhan citizen challenge record — clear ownership sheet for report corrections and evidence. */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { FileText, FileUp, Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function CitizenChallengeRecord() {
  const [, params] = useRoute("/citizen/challenges/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id ?? 0);
  const query = useMemo(() => ({ id: id || 1 }), [id]);
  const evidenceInput = useMemo(() => ({ challengeId: id || 1 }), [id]);
  const challengeQuery = trpc.workflow.challengeById.useQuery(query, {
    enabled: id > 0,
  });
  const evidenceQuery = trpc.workflow.challengeEvidence.useQuery(
    evidenceInput,
    { enabled: id > 0 }
  );
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [district, setDistrict] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const update = trpc.workflow.updateChallenge.useMutation({
    onSuccess: () => void utils.workflow.challengeById.invalidate(),
  });
  const upload = trpc.workflow.uploadChallengeEvidence.useMutation({
    onSuccess: () => {
      void utils.workflow.challengeEvidence.invalidate();
      setFile(null);
    },
  });
  const deleteMutation = trpc.workflow.deleteChallenge.useMutation({
    onSuccess: () => {
      toast.success("Challenge deleted successfully");
      setLocation("/citizen/dashboard");
    },
    onError: error => {
      toast.error("Failed to delete challenge", { description: error.message });
    },
  });
  const challenge = challengeQuery.data;
  useEffect(() => {
    if (challenge) {
      setTitle(challenge.title);
      setDescription(challenge.description);
      setDomain(challenge.domain);
      setDistrict(challenge.district);
    }
  }, [challenge?.id]);
  async function uploadEvidence(event: React.FormEvent) {
    event.preventDefault();
    if (!challenge || !file) return;
    if (file.size > 5_000_000) return;
    const base64 = await toBase64(file);
    upload.mutate({
      challengeId: challenge.id,
      uploaderName: challenge.citizenName,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64,
    });
  }
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      <section className="px-6 py-10 sm:px-10 lg:px-[5rem]">
        <div className="mx-auto max-w-[74rem]">
          <button
            type="button"
            onClick={() => setLocation("/citizen/dashboard")}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to My Submissions
          </button>
          {challengeQuery.isLoading ? (
            <Loading />
          ) : challengeQuery.isError || !challenge ? (
            <Failure
              message={
                challengeQuery.error?.message || "Challenge record not found."
              }
              retry={() => void challengeQuery.refetch()}
            />
          ) : (
            <div className="mt-8 grid gap-9 xl:grid-cols-[minmax(0,1fr)_minmax(21rem,.64fr)]">
              <article>
                <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                  Citizen record · {challenge.status.replaceAll("_", " ")}
                </p>
                <h1 className="mt-4 font-display text-[3.7rem] leading-[0.86] tracking-[-0.04em]">
                  Keep this report accurate.
                </h1>
                <p className="mt-4 font-body text-[0.88rem] leading-relaxed text-[#53675d]">
                  This public-review page uses the report email as a demo
                  identifier. Authentication and ownership enforcement can be
                  enabled after review.
                </p>
                <form
                  onSubmit={event => {
                    event.preventDefault();
                    update.mutate({
                      id: challenge.id,
                      title,
                      description,
                      domain,
                      district,
                    });
                  }}
                  className="mt-7 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                >
                  <label className="block">
                    <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                      Title
                    </span>
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      className="citizen-input mt-2"
                      required
                    />
                  </label>
                  <label className="mt-5 block">
                    <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                      Description
                    </span>
                    <textarea
                      value={description}
                      onChange={event => setDescription(event.target.value)}
                      className="citizen-input mt-2 min-h-[10rem] resize-y"
                      required
                    />
                  </label>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <label>
                      <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                        Domain
                      </span>
                      <input
                        value={domain}
                        onChange={event => setDomain(event.target.value)}
                        className="citizen-input mt-2"
                        required
                      />
                    </label>
                    <label>
                      <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                        District
                      </span>
                      <input
                        value={district}
                        onChange={event => setDistrict(event.target.value)}
                        className="citizen-input mt-2"
                        required
                      />
                    </label>
                  </div>
                  <button
                    disabled={update.isPending}
                    className="rounded-full mt-6 inline-flex items-center gap-2 bg-[#16422f] px-5 py-3 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] text-white"
                  >
                    <Save size={15} />
                    {update.isPending ? "Saving…" : "Save corrections"}
                  </button>
                  {update.isError && (
                    <p
                      role="alert"
                      className="mt-3 font-body text-[0.73rem] text-[#a34b2c]"
                    >
                      {update.error.message}
                    </p>
                  )}
                  {update.isSuccess && (
                    <p className="mt-3 font-body text-[0.73rem] text-[#386548]">
                      Your report changes have been saved.
                    </p>
                  )}
                </form>
              </article>
              <aside className="space-y-6">
                <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                  <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em]">
                    Evidence files
                  </p>
                  {evidenceQuery.isLoading ? (
                    <Loading />
                  ) : evidenceQuery.isError ? (
                    <Failure
                      message={evidenceQuery.error.message}
                      retry={() => void evidenceQuery.refetch()}
                    />
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(evidenceQuery.data ?? []).map(item => (
                        <a
                          key={item.id}
                          href={item.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="group block overflow-hidden border border-[#a58c6d]/45 bg-[#f8f2e8]"
                        >
                          {item.mimeType?.startsWith("image/") &&
                          item.fileUrl ? (
                            <div className="aspect-[4/3] overflow-hidden">
                              <img
                                src={item.fileUrl}
                                alt={item.fileName}
                                loading="lazy"
                                className="size-full object-cover grayscale-[0.1] sepia-[0.08] transition duration-300 group-hover:scale-105 group-hover:grayscale-0 group-hover:sepia-0"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-[4/3] items-center justify-center bg-[#f1eadc]">
                              <FileText size={28} className="text-[#9d876a]" />
                            </div>
                          )}
                          <p className="p-2 font-body text-[0.72rem] font-semibold text-[#334c41]">
                            {item.fileName}
                          </p>
                        </a>
                      ))}
                      {(evidenceQuery.data ?? []).length === 0 && (
                        <p className="col-span-full font-body text-[0.75rem] text-[#61746a]">
                          No evidence files have been uploaded.
                        </p>
                      )}
                    </div>
                  )}
                  <form
                    onSubmit={uploadEvidence}
                    className="mt-5 border-t border-[#a78e6e]/45 pt-5"
                  >
                    <input
                      type="file"
                      onChange={event =>
                        setFile(event.target.files?.[0] ?? null)
                      }
                      className="block w-full font-body text-[0.72rem]"
                    />
                    <button
                      disabled={!file || upload.isPending}
                      className="rounded-full mt-4 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
                    >
                      <FileUp size={15} />
                      {upload.isPending ? "Uploading…" : "Add evidence"}
                    </button>
                    {upload.isError && (
                      <p
                        role="alert"
                        className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                      >
                        {upload.error.message}
                      </p>
                    )}
                  </form>
                </section>

                {/* Delete section */}
                <section className="mt-6 border-t border-[#a58c6d]/40 pt-5">
                  <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#934325]">
                    Danger zone
                  </p>
                  <p className="mt-2 font-body text-[0.75rem] text-[#607168]">
                    Deleting this report will permanently remove it and all
                    associated evidence. This action cannot be undone.
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="rounded-full mt-3 inline-flex items-center gap-2 border border-[#bd5a38]/60 px-4 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#934325] hover:bg-[#f7e2d6]/50"
                    >
                      <Trash2 size={14} />
                      Delete this report
                    </button>
                  ) : (
                    <div className="mt-3 rounded-lg border border-[#bd5a38]/50 bg-[#f7e2d6]/30 p-4">
                      <p className="font-body text-[0.78rem] font-semibold text-[#934325]">
                        Are you sure? This cannot be undone.
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() =>
                            deleteMutation.mutate({ id: challenge.id })
                          }
                          className="rounded-full inline-flex items-center gap-2 bg-[#934325] px-4 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="rounded-full border border-[#a58c6d]/50 px-4 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#52675d] hover:bg-[#f4eadd]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                <a
                  href={`/challenges/${challenge.id}`}
                  className="rounded-full block border border-[#a58c6d]/55 px-5 py-4 font-body text-[0.78rem] font-semibold text-[#bd4a26]"
                >
                  View public workflow and support page →
                </a>
              </aside>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-7 flex items-center gap-3 border border-[#a58c6d]/45 p-6 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading challenge record…
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-7 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.78rem] text-[#934325]">{message}</p>
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
function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
