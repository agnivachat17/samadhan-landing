/** Style: Samadhan industry expression-of-interest case sheet — persisted project support commitment. */
import IndustryHeader from "@/components/IndustryHeader";
import { Building2, CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function IndustryProjectInterest() {
  const [, params] = useRoute("/industry/projects/:id");
  const projectId = Number(params?.id ?? 0);
  const projectInput = useMemo(() => ({ id: projectId || 1 }), [projectId]);
  const interestInput = useMemo(
    () => ({ projectId: projectId || 1 }),
    [projectId]
  );
  const [allInput] = useState({});
  const projectQuery = trpc.workflow.projectById.useQuery(projectInput, {
    enabled: projectId > 0,
  });
  const organizationsQuery = trpc.workflow.organizations.useQuery(allInput);
  const interestsQuery = trpc.workflow.industryInterests.useQuery(
    interestInput,
    { enabled: projectId > 0 }
  );
  const [organizationId, setOrganizationId] = useState(0);
  const [supportType, setSupportType] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [commitment, setCommitment] = useState("");
  const [message, setMessage] = useState("");
  const express = trpc.workflow.expressInterest.useMutation({
    onSuccess: () => void interestsQuery.refetch(),
  });
  const project = projectQuery.data;
  const industryOrganizations = (organizationsQuery.data ?? []).filter(
    item => item.kind === "industry"
  );
  const institution = organizationsQuery.data?.find(
    item => item.id === project?.organizationId
  );
  const myInterests = (interestsQuery.data ?? []).filter(
    item => item.organizationId === organizationId
  );
  useEffect(() => {
    if (!organizationId && industryOrganizations[0]) {
      const organization = industryOrganizations[0];
      setOrganizationId(organization.id);
      setContactName(organization.contactName);
      setContactEmail(organization.contactEmail);
    }
  }, [organizationId, industryOrganizations]);
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
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem] lg:py-8">
        <a
          href="/industry/dashboard"
          className="font-body text-[0.78rem] text-[#3c584b] hover:text-[#c64b22]"
        >
          ← Back to Projects
        </a>
        {projectQuery.isLoading || organizationsQuery.isLoading ? (
          <Loading />
        ) : projectQuery.isError || organizationsQuery.isError || !project ? (
          <Failure
            message={
              projectQuery.error?.message ||
              organizationsQuery.error?.message ||
              "Project record could not load."
            }
            retry={() => {
              void projectQuery.refetch();
              void organizationsQuery.refetch();
            }}
          />
        ) : (
          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.22fr)_minmax(28rem,.78fr)] xl:gap-16">
            <article className="max-w-[49rem]">
              <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                Active project · {project.stage.replaceAll("_", " ")}
              </p>
              <h1 className="mt-4 font-display text-[3.85rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5.15rem]">
                {project.title}
              </h1>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#a78e6e]/45 pb-6 font-body text-[0.82rem] text-[#4a6257]">
                <span className="border border-[#78977d] px-2 py-1 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.09em] text-[#49704f]">
                  {project.status.replaceAll("_", " ")}
                </span>
                <span className="border-l border-[#a78e6e]/55 pl-6">
                  Project record {project.id}
                </span>
                <span className="border-l border-[#a78e6e]/55 pl-6">
                  {project.progress}% progress
                </span>
              </div>
              <section className="mt-7 border-b border-[#a78e6e]/45 pb-7">
                <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                  Delivery brief
                </p>
                <p className="mt-4 whitespace-pre-wrap font-body text-[0.9rem] leading-[1.75] text-[#2f483e]">
                  {project.overview}
                </p>
              </section>
              <section className="mt-7">
                <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                  Institution information
                </p>
                {institution ? (
                  <div className="mt-5 flex gap-4">
                    <Building2 className="mt-1 text-[#264a38]" size={32} />
                    <div>
                      <h2 className="font-display text-[1.65rem] leading-none">
                        {institution.name}
                      </h2>
                      <p className="mt-2 font-body text-[0.78rem] text-[#5b6e65]">
                        {institution.location || "Jharkhand"}
                      </p>
                      <p className="mt-4 font-body text-[0.76rem] leading-relaxed text-[#485f55]">
                        {institution.expertise ||
                          institution.overview ||
                          "Institution profile details are being completed."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 font-body text-[0.78rem] text-[#5b6e65]">
                    Institution record unavailable.
                  </p>
                )}
              </section>
            </article>
            <aside className="h-fit border border-[#9f896d]/60 bg-[#f7f0e5]/25 p-7 sm:p-9">
              <h2 className="font-display text-[2.8rem] font-medium leading-none">
                Express Interest
              </h2>
              {industryOrganizations.length === 0 ? (
                <div className="mt-7 border border-dashed border-[#a58c6d]/55 p-5">
                  <p className="font-body text-[0.78rem] text-[#586d63]">
                    Create an industry organization profile before recording a
                    support commitment.
                  </p>
                  <a
                    href="/onboarding/industry"
                    className="rounded-full mt-4 inline-block bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-white"
                  >
                    Create industry profile
                  </a>
                </div>
              ) : (
                <form
                  onSubmit={event => {
                    event.preventDefault();
                    express.mutate({
                      projectId: project.id,
                      organizationId,
                      contactName,
                      contactEmail,
                      supportType,
                      commitmentSummary: commitment || undefined,
                      message: message || undefined,
                    });
                  }}
                  className="mt-7 border-t border-[#a78e6e]/45 pt-7"
                >
                  <label className="block">
                    <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                      Industry organization
                    </span>
                    <select
                      value={organizationId}
                      onChange={event => {
                        const item = industryOrganizations.find(
                          org => org.id === Number(event.target.value)
                        );
                        setOrganizationId(Number(event.target.value));
                        if (item) {
                          setContactName(item.contactName);
                          setContactEmail(item.contactEmail);
                        }
                      }}
                      className="citizen-input mt-3"
                    >
                      {industryOrganizations.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                        Contact name
                      </span>
                      <input
                        required
                        value={contactName}
                        onChange={event => setContactName(event.target.value)}
                        className="citizen-input mt-3"
                      />
                    </label>
                    <label>
                      <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                        Contact email
                      </span>
                      <input
                        required
                        type="email"
                        value={contactEmail}
                        onChange={event => setContactEmail(event.target.value)}
                        className="citizen-input mt-3"
                      />
                    </label>
                  </div>
                  <label className="mt-5 block">
                    <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                      Support mode
                    </span>
                    <select
                      required
                      value={supportType}
                      onChange={event => setSupportType(event.target.value)}
                      className="citizen-input mt-3"
                    >
                      <option value="">Select support type</option>
                      <option>Funding</option>
                      <option>Mentorship</option>
                      <option>Technical support</option>
                      <option>Pilot deployment</option>
                      <option>Market linkage</option>
                      <option>Equipment or infrastructure</option>
                    </select>
                  </label>
                  <label className="mt-5 block">
                    <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                      Commitment summary
                    </span>
                    <textarea
                      value={commitment}
                      onChange={event => setCommitment(event.target.value)}
                      className="citizen-input mt-3 min-h-[5rem] resize-y"
                      placeholder="Outline capacity, timing, or the resource you can contribute."
                    />
                  </label>
                  <label className="mt-5 block">
                    <span className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em]">
                      Message
                    </span>
                    <textarea
                      value={message}
                      onChange={event => setMessage(event.target.value)}
                      className="citizen-input mt-3 min-h-[6rem] resize-y"
                      placeholder="A concise note for the institute team."
                    />
                  </label>
                  <button
                    disabled={express.isPending || !supportType}
                    className="rounded-full mt-6 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-6 py-5 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
                  >
                    <Send size={15} />
                    {express.isPending ? "Recording…" : "Send interest"}
                  </button>
                  {express.isError && (
                    <p
                      role="alert"
                      className="mt-3 font-body text-[0.74rem] text-[#a34b2c]"
                    >
                      {express.error.message}
                    </p>
                  )}
                  {express.isSuccess && (
                    <p className="mt-3 flex items-center gap-2 font-body text-[0.74rem] text-[#3d6f4d]">
                      <CheckCircle2 size={15} />
                      Interest recorded in the commitment pipeline.
                    </p>
                  )}
                  <section className="mt-7 border-t border-[#a78e6e]/45 pt-5">
                    <p className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                      My recorded commitments
                    </p>
                    {interestsQuery.isLoading ? (
                      <p className="mt-3 font-body text-[0.73rem] text-[#5e7067]">
                        Loading…
                      </p>
                    ) : interestsQuery.isError ? (
                      <Failure
                        message={interestsQuery.error.message}
                        retry={() => void interestsQuery.refetch()}
                      />
                    ) : myInterests.length === 0 ? (
                      <p className="mt-3 font-body text-[0.73rem] text-[#5e7067]">
                        No commitments recorded for this project.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {myInterests.map(item => (
                          <div
                            key={item.id}
                            className="border border-[#a58c6d]/45 p-3"
                          >
                            <p className="font-body text-[0.78rem] font-semibold">
                              {item.supportType}
                            </p>
                            <p className="mt-1 font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#607168]">
                              {item.status}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </form>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
function Loading() {
  return (
    <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/45 p-6 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading project opportunity…
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-8 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
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
