/** Style: Samadhan industry partner profile — capability ledger and commitment pipeline. */
import IndustryHeader from "@/components/IndustryHeader";
import { Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function IndustryProfile() {
  const me = trpc.auth.me.useQuery();
  const isAdmin = me.data?.role === "admin";
  const [input] = useState({ kind: "industry" as const });
  const organizationsQuery = trpc.workflow.organizations.useQuery(input, {
    enabled: isAdmin,
  });
  const [organizationId, setOrganizationId] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("organization")) ||
      0
  );
  const ownOrganizationQuery = trpc.workflow.organizationById.useQuery(
    { id: me.data?.organizationId ?? 1 },
    { enabled: !isAdmin && !!me.data?.organizationId }
  );
  const interestInput = useMemo(
    () => ({ organizationId: organizationId || 1 }),
    [organizationId]
  );
  const interestsQuery = trpc.workflow.industryInterests.useQuery(
    interestInput,
    { enabled: organizationId > 0 }
  );
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    sector: "",
    location: "",
    overview: "",
    expertise: "",
    supportModes: "",
    priorityDomains: "",
    geographyFocus: "",
    capacityBand: "",
    csrPolicyUrl: "",
  });
  const update = trpc.workflow.updateOrganization.useMutation({
    onSuccess: () => {
      void utils.workflow.organizations.invalidate();
      void utils.workflow.organizationById.invalidate();
    },
  });
  const organizations = isAdmin
    ? (organizationsQuery.data ?? [])
    : ownOrganizationQuery.data
      ? [ownOrganizationQuery.data]
      : [];
  const organization = organizations.find(item => item.id === organizationId);
  useEffect(() => {
    if (organizationId) return;
    if (!isAdmin && me.data?.organizationId) {
      setOrganizationId(me.data.organizationId);
      return;
    }
    if (isAdmin && organizations[0]) setOrganizationId(organizations[0].id);
  }, [organizationId, isAdmin, me.data?.organizationId, organizations]);
  useEffect(() => {
    if (!organization) return;
    setForm({
      name: organization.name,
      contactName: organization.contactName,
      contactEmail: organization.contactEmail,
      contactPhone: organization.contactPhone ?? "",
      website: organization.website ?? "",
      sector: organization.sector ?? "",
      location: organization.location ?? "",
      overview: organization.overview ?? "",
      expertise: organization.expertise ?? "",
      supportModes: organization.supportModes ?? "",
      priorityDomains: organization.priorityDomains ?? "",
      geographyFocus: organization.geographyFocus ?? "",
      capacityBand: organization.capacityBand ?? "",
      csrPolicyUrl: organization.csrPolicyUrl ?? "",
    });
  }, [organization?.id]);
  const set =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(current => ({ ...current, [key]: event.target.value }));
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <IndustryHeader active="Profile" />
      <section className="px-6 py-10 sm:px-10 lg:px-[4rem]">
        <div className="mx-auto max-w-[88rem]">
          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
            Industry partner profile
          </p>
          <h1 className="mt-3 font-display text-[4.1rem] leading-[0.86] tracking-[-0.04em] sm:text-[5rem]">
            Capability & Commitment Ledger.
          </h1>
          {organizationsQuery.isLoading ? (
            <Loading />
          ) : organizationsQuery.isError ? (
            <Failure
              message={organizationsQuery.error.message}
              retry={() => void organizationsQuery.refetch()}
            />
          ) : organizations.length === 0 ? (
            <div className="mt-8 border border-dashed border-[#a58c6d]/55 p-8">
              <p className="font-body text-[0.8rem] text-[#586d63]">
                No industry onboarding profile exists yet.
              </p>
              <a
                href="/onboarding/industry"
                className="rounded-full mt-4 inline-block bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-white"
              >
                Create industry profile
              </a>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,.56fr)]">
              <div>
                {organizations.length > 1 && (
                  <label className="block max-w-md">
                    <span className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em]">
                      Industry organization
                    </span>
                    <select
                      value={organizationId}
                      onChange={event =>
                        setOrganizationId(Number(event.target.value))
                      }
                      className="citizen-input mt-2"
                    >
                      {organizations.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <form
                  onSubmit={event => {
                    event.preventDefault();
                    if (organization)
                      update.mutate({
                        id: organization.id,
                        details: Object.fromEntries(
                          Object.entries(form).filter(([, value]) =>
                            value.trim()
                          )
                        ),
                      });
                  }}
                  className="mt-6 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                >
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Organization name"
                      value={form.name}
                      onChange={set("name")}
                    />
                    <Field
                      label="Sector"
                      value={form.sector}
                      onChange={set("sector")}
                    />
                    <Field
                      label="Official email"
                      type="email"
                      value={form.contactEmail}
                      onChange={set("contactEmail")}
                    />
                    <Field
                      label="Contact person"
                      value={form.contactName}
                      onChange={set("contactName")}
                    />
                    <Field
                      label="Phone"
                      value={form.contactPhone}
                      onChange={set("contactPhone")}
                    />
                    <Field
                      label="Website"
                      type="url"
                      value={form.website}
                      onChange={set("website")}
                    />
                    <Field
                      label="Operating geography"
                      value={form.geographyFocus}
                      onChange={set("geographyFocus")}
                    />
                    <Field
                      label="Support capacity band"
                      value={form.capacityBand}
                      onChange={set("capacityBand")}
                    />
                  </div>
                  <Field
                    label="Headquarters / location"
                    value={form.location}
                    onChange={set("location")}
                  />
                  <Area
                    label="Organization overview"
                    value={form.overview}
                    onChange={set("overview")}
                  />
                  <Area
                    label="Technologies or expertise"
                    value={form.expertise}
                    onChange={set("expertise")}
                  />
                  <Area
                    label="Support modes"
                    value={form.supportModes}
                    onChange={set("supportModes")}
                  />
                  <Area
                    label="Priority challenge domains"
                    value={form.priorityDomains}
                    onChange={set("priorityDomains")}
                  />
                  <Field
                    label="CSR / partnership policy URL"
                    type="url"
                    value={form.csrPolicyUrl}
                    onChange={set("csrPolicyUrl")}
                  />
                  <button
                    disabled={update.isPending}
                    className="rounded-full mt-6 inline-flex items-center gap-2 bg-[#16422f] px-5 py-3 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] text-white"
                  >
                    <Save size={15} />
                    {update.isPending ? "Saving…" : "Save profile"}
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
                      Industry profile updated.
                    </p>
                  )}
                </form>
              </div>
              <aside className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em]">
                  Commitment pipeline
                </p>
                {interestsQuery.isLoading ? (
                  <Loading />
                ) : interestsQuery.isError ? (
                  <Failure
                    message={interestsQuery.error.message}
                    retry={() => void interestsQuery.refetch()}
                  />
                ) : (interestsQuery.data ?? []).length === 0 ? (
                  <p className="mt-5 font-body text-[0.78rem] text-[#607168]">
                    No project commitments are recorded yet.
                  </p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {interestsQuery.data?.map(item => (
                      <article
                        key={item.id}
                        className="border border-[#a58c6d]/45 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${
                              item.supportType === "Funding"
                                ? "bg-[#c94a20] text-white"
                                : item.supportType === "Expertise"
                                  ? "bg-[#16422f] text-white"
                                  : "bg-[#f3e5bd] text-[#a2731c]"
                            }`}
                          >
                            {item.supportType}
                          </span>
                          <p className="font-mono-ui text-[0.53rem] uppercase tracking-[0.08em] text-[#61746a]">
                            Project {item.projectId} · {item.status}
                          </p>
                        </div>
                        <p className="mt-3 font-body text-[0.74rem] text-[#5c7066]">
                          {item.commitmentSummary ||
                            item.message ||
                            "No summary provided."}
                        </p>
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
function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
}) {
  return (
    <label className="mt-5 block">
      <span className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="citizen-input mt-2"
      />
    </label>
  );
}
function Area({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}) {
  return (
    <label className="mt-5 block">
      <span className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={onChange}
        className="citizen-input mt-2 min-h-[5rem] resize-y"
      />
    </label>
  );
}
function Loading() {
  return (
    <div className="mt-5 flex items-center gap-3 font-body text-[0.76rem] text-[#52675d]">
      <Loader2 className="animate-spin" size={17} />
      Loading…
    </div>
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
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
