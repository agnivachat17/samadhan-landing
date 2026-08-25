/**
 * Style: Samadhan administrator verification — archival review record backed by Firestore through tRPC.
 */
import AdminHeader from "@/components/AdminHeader";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  Building2,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Loader2,
  MapPin,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const standingCopy: Record<
  "active" | "warned" | "suspended" | "terminated",
  { label: string; tone: string }
> = {
  active: {
    label: "Active — good standing",
    tone: "border-[#769b78]/60 bg-[#eef2e5]/60 text-[#396546]",
  },
  warned: {
    label: "Warned",
    tone: "border-[#cda75f]/70 bg-[#f6ecd3]/70 text-[#8a6416]",
  },
  suspended: {
    label: "Suspended",
    tone: "border-[#c78a4d]/70 bg-[#f7e6d3]/70 text-[#a3591c]",
  },
  terminated: {
    label: "Terminated",
    tone: "border-[#bd5a38]/70 bg-[#f7e2d6]/70 text-[#ab4826]",
  },
};

export default function AdminInstitutionVerify() {
  const [, params] = useRoute("/admin/institutions/:id/verify");
  const [, setLocation] = useLocation();
  const id = Number(params?.id ?? 0);
  const queryInput = useMemo(() => ({ id: id || 1 }), [id]);
  const organizationQuery = trpc.workflow.organizationById.useQuery(
    queryInput,
    { enabled: id > 0 }
  );
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState("");
  const [standingNotes, setStandingNotes] = useState("");
  const refresh = () => {
    void utils.workflow.organizationById.invalidate();
    void utils.workflow.organizations.invalidate();
  };
  const verifyMutation = trpc.workflow.verifyOrganization.useMutation({
    onSuccess: (_, variables) => {
      refresh();
      if (variables.verificationStatus === "verified")
        toast.success("Verification successful", {
          description: `${organization?.name ?? "The organization"} is now verified and active in the network.`,
          icon: <CheckCircle2 size={18} className="text-[#2f6b42]" />,
        });
      else
        toast("Changes requested", {
          description: `${organization?.name ?? "The organization"} has been notified to revise their application.`,
          icon: <XCircle size={18} className="text-[#a3591c]" />,
        });
    },
    onError: issue =>
      toast.error("Couldn't record decision", { description: issue.message }),
  });
  const standingMutation = trpc.workflow.updateOrganizationStanding.useMutation(
    {
      onSuccess: (_, variables) => {
        refresh();
        setStandingNotes("");
        const label = standingCopy[variables.standing].label;
        if (variables.standing === "active")
          toast.success("Standing restored", {
            description: `${organization?.name ?? "The organization"} is back in good standing.`,
            icon: <RotateCcw size={18} className="text-[#2f6b42]" />,
          });
        else if (variables.standing === "terminated")
          toast.error(`Organization terminated`, {
            description: `${organization?.name ?? "This organization"} has been terminated and can no longer access its dashboard.`,
            icon: <Ban size={18} className="text-[#ab4826]" />,
          });
        else
          toast(`Marked as ${label.toLowerCase()}`, {
            description: `${organization?.name ?? "The organization"} has been notified.`,
            icon: <AlertTriangle size={18} className="text-[#a3591c]" />,
          });
      },
      onError: issue =>
        toast.error("Couldn't update standing", { description: issue.message }),
    }
  );
  const organization = organizationQuery.data;
  const standing = (organization?.standing ?? "active") as
    "active" | "warned" | "suspended" | "terminated";

  const decide = (verificationStatus: "verified" | "rejected") => {
    if (!organization) return;
    verifyMutation.mutate({
      id: organization.id,
      verificationStatus,
      verificationNotes: notes || undefined,
    });
  };

  const setStanding = (
    next: "active" | "warned" | "suspended" | "terminated"
  ) => {
    if (!organization) return;
    standingMutation.mutate({
      id: organization.id,
      standing: next,
      notes: standingNotes || undefined,
    });
  };

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <AdminHeader active="Institutions" />
      <section className="px-6 py-8 sm:px-10 lg:px-[5rem] lg:py-10">
        <div className="mx-auto max-w-[72rem]">
          <button
            type="button"
            onClick={() => setLocation("/admin/institutions")}
            className="font-body text-[0.78rem] text-[#496257] hover:text-[#c64b22]"
          >
            ← Back to Institution Accounts
          </button>
          {organizationQuery.isLoading ? (
            <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 px-5 py-8 font-body text-[#52675d]">
              <Loader2 className="animate-spin text-[#42684b]" size={19} />
              Loading application record…
            </div>
          ) : !organization ? (
            <section className="mt-8 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 p-8 text-center">
              <p className="font-display text-[2rem]">Application not found.</p>
              <p className="mt-3 font-body text-[0.82rem] text-[#52675d]">
                Use an onboarding record from the Institution Accounts register
                to begin a review.
              </p>
            </section>
          ) : (
            <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.2fr)_minmax(23rem,.8fr)]">
              <article>
                <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
                  Verification review · {organization.verificationStatus}
                </p>
                <h1 className="mt-4 font-display text-[3.6rem] leading-[0.86] tracking-[-0.04em] sm:text-[4.6rem]">
                  {organization.name}
                </h1>
                <p className="mt-5 max-w-[46rem] font-body text-[0.9rem] leading-relaxed text-[#52675d]">
                  {organization.overview ||
                    "This institution has submitted an application to participate in the Samadhan challenge and project network."}
                </p>
                <div className="mt-8 grid gap-5 border-y border-[#a78e6e]/45 py-6 sm:grid-cols-2">
                  <ReviewMeta
                    icon={<Building2 size={20} />}
                    label="Institution type"
                    value={organization.institutionType || "Not provided"}
                  />
                  <ReviewMeta
                    icon={<MapPin size={20} />}
                    label="Location"
                    value={organization.location || "Not provided"}
                  />
                  <ReviewMeta
                    icon={<Globe2 size={20} />}
                    label="Official contact"
                    value={organization.contactEmail}
                  />
                  <ReviewMeta
                    icon={<FileCheck2 size={20} />}
                    label="Submitted"
                    value={
                      organization.createdAt
                        ? new Date(organization.createdAt).toLocaleDateString()
                        : "Not available"
                    }
                  />
                </div>
                <section className="mt-8">
                  <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                    Verification details
                  </p>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <ReviewDetail
                      label="Authorized contact"
                      value={organization.contactName}
                    />
                    <ReviewDetail
                      label="Telephone"
                      value={organization.contactPhone}
                    />
                    <ReviewDetail
                      label="Website"
                      value={organization.website}
                      link
                    />
                    <ReviewDetail
                      label="Affiliation / accreditation"
                      value={organization.registrationNumber}
                    />
                    <ReviewDetail
                      label="Departments"
                      value={organization.departments}
                    />
                    <ReviewDetail
                      label="Expertise"
                      value={organization.expertise}
                    />
                    <ReviewDetail
                      label="Facilities"
                      value={organization.facilities}
                    />
                    <ReviewDetail
                      label="Collaboration capacity"
                      value={organization.supportModes}
                    />
                    <ReviewDetail
                      label="Challenge domains"
                      value={organization.priorityDomains}
                    />
                  </div>
                </section>
                <section className="mt-8">
                  <p className="border-b border-[#a78e6e]/45 pb-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                    Application confirmation
                  </p>
                  <div className="mt-5 flex gap-3 border border-[#879c86]/50 bg-[#eef2e5]/45 p-4">
                    <ShieldCheck
                      className="shrink-0 text-[#42684b]"
                      size={20}
                    />
                    <p className="font-body text-[0.78rem] leading-relaxed text-[#405c4d]">
                      The applicant confirmed that the submitted details are
                      authorized and accurate. Administrative verification
                      should check the official domain, contact details,
                      affiliation record, capacity declaration, and any
                      follow-up evidence requested outside this review view.
                    </p>
                  </div>
                </section>
              </article>
              <div className="flex flex-col gap-6">
                <aside className="h-fit border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
                  <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
                    Administrator decision
                  </p>
                  <label className="mt-5 block">
                    <span className="font-body text-[0.8rem]">
                      Review notes
                    </span>
                    <textarea
                      value={notes}
                      onChange={event => setNotes(event.target.value)}
                      className="citizen-input mt-2 min-h-[9rem] resize-y"
                      placeholder="Record the verification rationale or request clarification…"
                    />
                  </label>
                  <div className="mt-6 grid gap-3">
                    <button
                      disabled={verifyMutation.isPending}
                      type="button"
                      onClick={() => decide("verified")}
                      className="flex items-center justify-center gap-2 bg-[#c94a20] px-5 py-4 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#dc5729] disabled:opacity-70"
                    >
                      <CheckCircle2 size={17} />
                      {verifyMutation.isPending
                        ? "Saving decision…"
                        : "Verify institution"}
                    </button>
                    <button
                      disabled={verifyMutation.isPending}
                      type="button"
                      onClick={() => decide("rejected")}
                      className="flex items-center justify-center gap-2 border border-[#bd5a38]/70 px-5 py-4 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#ab4826] transition hover:bg-[#f7e2d6] disabled:opacity-70"
                    >
                      <XCircle size={17} />
                      Request changes
                    </button>
                  </div>
                  {verifyMutation.isError && (
                    <p
                      role="alert"
                      className="mt-4 font-body text-[0.76rem] text-[#b44929]"
                    >
                      {verifyMutation.error.message}
                    </p>
                  )}
                  {verifyMutation.isSuccess && (
                    <p className="mt-4 font-body text-[0.76rem] leading-relaxed text-[#3b694b]">
                      The verification decision and review notes have been
                      recorded in Firestore.
                    </p>
                  )}
                  {organization.verificationNotes && (
                    <div className="mt-6 border-t border-[#a78e6e]/45 pt-5">
                      <p className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#66786e]">
                        Latest recorded notes
                      </p>
                      <p className="mt-2 font-body text-[0.78rem] leading-relaxed text-[#4e655a]">
                        {organization.verificationNotes}
                      </p>
                    </div>
                  )}
                </aside>
                <StandingPanel
                  organization={organization}
                  standing={standing}
                  standingNotes={standingNotes}
                  setStandingNotes={setStandingNotes}
                  isPending={standingMutation.isPending}
                  setStanding={setStanding}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

type Standing = "active" | "warned" | "suspended" | "terminated";

function StandingPanel({
  organization,
  standing,
  standingNotes,
  setStandingNotes,
  isPending,
  setStanding,
}: {
  organization: { name: string; standingNotes?: string | null };
  standing: Standing;
  standingNotes: string;
  setStandingNotes: (value: string) => void;
  isPending: boolean;
  setStanding: (next: Standing) => void;
}) {
  const copy = standingCopy[standing];
  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="h-fit border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
          Standing &amp; moderation
        </p>
        <motion.span
          key={standing}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`border px-3 py-1.5 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.08em] ${copy.tone}`}
        >
          {copy.label}
        </motion.span>
      </div>
      <p className="mt-3 font-body text-[0.76rem] leading-relaxed text-[#5c6f65]">
        Post-verification actions for organizations that have violated
        Samadhan's conduct expectations — separate from the initial
        application decision above.
      </p>
      <label className="mt-5 block">
        <span className="font-body text-[0.8rem]">Moderation notes</span>
        <textarea
          value={standingNotes}
          onChange={event => setStandingNotes(event.target.value)}
          className="citizen-input mt-2 min-h-[6rem] resize-y"
          placeholder="Explain the reason — sent to the organization's contact email…"
        />
      </label>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          disabled={isPending || standing === "warned"}
          type="button"
          onClick={() => setStanding("warned")}
          className="flex items-center justify-center gap-2 border border-[#cda75f]/70 bg-[#f6ecd3]/40 px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#8a6416] transition hover:bg-[#f6ecd3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <AlertTriangle size={15} />
          Issue warning
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          disabled={isPending || standing === "suspended"}
          type="button"
          onClick={() => setStanding("suspended")}
          className="flex items-center justify-center gap-2 border border-[#c78a4d]/70 bg-[#f7e6d3]/40 px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#a3591c] transition hover:bg-[#f7e6d3] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ShieldOff size={15} />
          Suspend account
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          disabled={isPending || standing === "terminated"}
          type="button"
          onClick={() => setStanding("terminated")}
          className="flex items-center justify-center gap-2 border border-[#bd5a38]/70 bg-[#f7e2d6]/40 px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#ab4826] transition hover:bg-[#f7e2d6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Ban size={15} />
          Terminate
        </motion.button>
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          disabled={isPending || standing === "active"}
          type="button"
          onClick={() => setStanding("active")}
          className="flex items-center justify-center gap-2 border border-[#769b78]/60 bg-[#eef2e5]/40 px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#396546] transition hover:bg-[#eef2e5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={15} />
          Restore to active
        </motion.button>
      </div>
      {organization.standingNotes && (
        <div className="mt-6 border-t border-[#a78e6e]/45 pt-5">
          <p className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#66786e]">
            Latest moderation notes
          </p>
          <p className="mt-2 font-body text-[0.78rem] leading-relaxed text-[#4e655a]">
            {organization.standingNotes}
          </p>
        </div>
      )}
    </motion.aside>
  );
}

function ReviewMeta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-[#42684b]">{icon}</span>
      <div>
        <p className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-[#5d7067]">
          {label}
        </p>
        <p className="mt-1 font-body text-[0.8rem]">{value}</p>
      </div>
    </div>
  );
}
function ReviewDetail({
  label,
  value,
  link,
}: {
  label: string;
  value?: string | null;
  link?: boolean;
}) {
  return (
    <div className="border border-[#a78e6e]/40 bg-[#f8f2e8]/20 p-4">
      <p className="font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#687a70]">
        {label}
      </p>
      {link && value ? (
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all font-body text-[0.78rem] leading-relaxed text-[#a34424] underline underline-offset-2"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 font-body text-[0.78rem] leading-relaxed text-[#28463a]">
          {value || "Not provided"}
        </p>
      )}
    </div>
  );
}
