/**
 * Style: Live, animated organization verification status — reused wherever an
 * institution/industry account needs to see (and act on) its verification state:
 * right after onboarding, on revisits, and gating the operational dashboard
 * while verification is still pending.
 */
import { motion } from "framer-motion";
import {
  Ban,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export type OrganizationKind = "institution" | "industry";

export function OrganizationStatusLoading() {
  return (
    <section className="grid min-h-[calc(100vh-96px)] place-items-center px-6">
      <div className="flex items-center gap-3 font-body text-[0.85rem] text-[#52675d]">
        <Loader2 className="animate-spin text-[#42684b]" size={20} />
        Loading your application…
      </div>
    </section>
  );
}

type DisplayState =
  "pending" | "verified" | "rejected" | "suspended" | "terminated";

const statusCopy: Record<
  DisplayState,
  { description: string; eyebrow: string }
> = {
  pending: {
    eyebrow: "application",
    description:
      "The Samadhan administration is reviewing the details you submitted. This usually settles within a few working days — check back any time, your dashboard tools unlock automatically once you're verified.",
  },
  verified: {
    eyebrow: "application",
    description:
      "Your organization is verified and fully active in the Samadhan network.",
  },
  rejected: {
    eyebrow: "application",
    description:
      "The administrator has requested changes before this application can be verified.",
  },
  suspended: {
    eyebrow: "account standing",
    description:
      "Your organization's dashboard access has been temporarily suspended by the Samadhan administration. Resolve the concern noted below, then reach out to the administration to be reinstated.",
  },
  terminated: {
    eyebrow: "account standing",
    description:
      "Your organization has been terminated from the Samadhan network and no longer has dashboard access. Contact the Samadhan administration if you believe this is in error.",
  },
};

const stateVisual: Record<
  DisplayState,
  { bg: string; fg: string; icon: typeof CheckCircle2 }
> = {
  pending: { bg: "#f3e6c4", fg: "#a8791f", icon: Clock3 },
  verified: { bg: "#dceedd", fg: "#2f6b42", icon: CheckCircle2 },
  rejected: { bg: "#f6dfd4", fg: "#b4491f", icon: XCircle },
  suspended: { bg: "#f7e6d3", fg: "#a3591c", icon: ShieldOff },
  terminated: { bg: "#f6d9d9", fg: "#9c2f2f", icon: Ban },
};

export function OrganizationStatus({
  kind,
  organizationId,
}: {
  kind: OrganizationKind;
  organizationId: number;
}) {
  const organizationQuery = trpc.workflow.organizationById.useQuery({
    id: organizationId,
  });
  const utils = trpc.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const organization = organizationQuery.data;
  const verificationStatus = (organization?.verificationStatus ?? "pending") as
    "pending" | "verified" | "rejected";
  const standing = organization?.standing ?? "active";
  const displayState: DisplayState =
    standing === "terminated"
      ? "terminated"
      : standing === "suspended"
        ? "suspended"
        : verificationStatus;
  const copy = statusCopy[displayState];
  const visual = stateVisual[displayState];
  const profilePath =
    kind === "institution"
      ? `/institute/profile?organization=${organizationId}`
      : `/industry/profile?organization=${organizationId}`;

  async function refresh() {
    setRefreshing(true);
    await utils.workflow.organizationById.invalidate({ id: organizationId });
    window.setTimeout(() => setRefreshing(false), 500);
  }

  if (organizationQuery.isLoading) return <OrganizationStatusLoading />;

  return (
    <section className="px-6 py-14 sm:px-10 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="mx-auto max-w-[52rem]"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 16,
            delay: 0.1,
          }}
          className="mx-auto flex size-20 items-center justify-center rounded-full"
          style={{ background: visual.bg }}
        >
          <visual.icon
            className="shrink-0"
            style={{ color: visual.fg }}
            size={38}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-7 text-center"
        >
          <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#c64b22]">
            {copy.eyebrow === "account standing"
              ? `${kind === "institution" ? "Institution" : "Industry"} account standing`
              : kind === "institution"
                ? "Institution application"
                : "Industry impact-partner application"}
          </p>
          <h1 className="mt-4 font-display text-[3rem] leading-[0.88] tracking-[-0.03em] sm:text-[3.9rem]">
            {organization?.name ?? "Your application"}
          </h1>
          <p className="mx-auto mt-5 max-w-[38rem] font-body text-[0.92rem] leading-relaxed text-[#4f645a]">
            {copy.description}
          </p>
        </motion.div>

        {(displayState === "pending" ||
          displayState === "verified" ||
          displayState === "rejected") && (
          <StatusTimeline status={verificationStatus} />
        )}

        {(displayState === "suspended" || displayState === "terminated") &&
          organization?.standingNotes && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8 border border-[#c78a4d]/50 bg-[#f7e6d3]/40 p-5"
            >
              <p className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[#8a5215]">
                Administrator notes
              </p>
              <p className="mt-2 font-body text-[0.82rem] leading-relaxed text-[#5a4028]">
                {organization.standingNotes}
              </p>
            </motion.div>
          )}

        {organization?.verificationNotes &&
          displayState !== "suspended" &&
          displayState !== "terminated" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="mt-8 border border-[#a58c6d]/50 bg-[#f8f2e8]/40 p-5"
            >
              <p className="font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[#7a5a2f]">
                Administrator notes
              </p>
              <p className="mt-2 font-body text-[0.82rem] leading-relaxed text-[#4e453a]">
                {organization.verificationNotes}
              </p>
            </motion.div>
          )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <motion.a
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            href={profilePath}
            className="rounded-full inline-flex items-center justify-center gap-2 bg-[#c94a20] px-7 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-white shadow-[0_14px_28px_rgba(124,42,13,0.2)] transition hover:bg-[#dc5729]"
          >
            <Sparkles size={16} />
            Manage {kind === "institution" ? "institute" : "industry"} profile
          </motion.a>
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="rounded-full inline-flex items-center justify-center gap-2 border border-[#718372]/60 px-7 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#214234] transition hover:bg-[#f5ede1] disabled:opacity-70"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh status"}
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function StatusTimeline({
  status,
}: {
  status: "pending" | "verified" | "rejected";
}) {
  const steps = [
    { label: "Submitted", icon: FileCheck2, done: true },
    {
      label: "Under review",
      icon: Clock3,
      done: status !== "pending",
      active: status === "pending",
    },
    {
      label: status === "rejected" ? "Changes requested" : "Verified",
      icon: status === "rejected" ? XCircle : ShieldCheck,
      done: status !== "pending",
      failed: status === "rejected",
    },
  ];
  return (
    <div className="mt-11 grid grid-cols-3 gap-2 sm:gap-4">
      {steps.map((step, index) => (
        <motion.div
          key={step.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + index * 0.12 }}
          className="flex flex-col items-center text-center"
        >
          <div
            className={`flex size-11 items-center justify-center rounded-full border-2 ${step.failed ? "border-[#b4491f] bg-[#f6dfd4] text-[#b4491f]" : step.done ? "border-[#2f6b42] bg-[#dceedd] text-[#2f6b42]" : step.active ? "border-[#a8791f] bg-[#f3e6c4] text-[#a8791f]" : "border-[#a78e6e]/45 bg-transparent text-[#8a9a90]"}`}
          >
            <step.icon
              size={18}
              className={step.active ? "animate-pulse" : ""}
            />
          </div>
          <p
            className={`mt-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] ${step.done || step.active ? "text-[#132e24]" : "text-[#8a9a90]"}`}
          >
            {step.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
