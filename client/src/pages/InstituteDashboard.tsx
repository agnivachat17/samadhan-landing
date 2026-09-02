/** Style: Samadhan institute dashboard — institution-specific overview with project progress and assignment queue. */
import InstituteHeader from "@/components/InstituteHeader";
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock3,
  FileStack,
  GraduationCap,
  Loader2,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function InstituteDashboard() {
  const [input] = useState({});
  const meQuery = trpc.auth.me.useQuery();
  const organizationId = meQuery.data?.organizationId ?? null;

  // Org identity
  const organizationQuery = trpc.workflow.organizationById.useQuery(
    { id: organizationId ?? 1 },
    { enabled: !!organizationId }
  );
  const organization = organizationQuery.data;

  // Assignments scoped to this org
  const assignmentsQuery = trpc.workflow.assignments.useQuery(
    { organizationId: organizationId ?? undefined },
    { enabled: !!organizationId }
  );
  const assignments = assignmentsQuery.data ?? [];

  // Projects scoped to this org
  const projectsQuery = trpc.workflow.projects.useQuery(
    { organizationId: organizationId ?? undefined },
    { enabled: !!organizationId }
  );
  const projects = projectsQuery.data ?? [];

  // Members
  const membersQuery = trpc.workflow.organizationMembers.useQuery(
    { organizationId: organizationId ?? 1 },
    { enabled: !!organizationId }
  );
  const members = membersQuery.data ?? [];

  // Challenges for enrichment (title lookup for assignments)
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const challenges = challengesQuery.data ?? [];

  const challengeById = useMemo(() => {
    const map = new Map<number, (typeof challenges)[number]>();
    for (const c of challenges) map.set(c.id, c);
    return map;
  }, [challenges]);

  // Derived counts
  const totalAssignments = assignments.length;
  const pendingAssignments = assignments.filter(
    a => a.status === "pending"
  ).length;
  const acceptedAssignments = assignments.filter(
    a => a.status === "accepted"
  ).length;
  const activeProjects = projects.filter(
    p =>
      p.status === "active" ||
      p.status === "at_risk" ||
      p.status === "closeout_pending"
  ).length;
  const resolvedProjects = projects.filter(p => p.status === "resolved").length;
  const totalProjects = projects.length;
  const totalMembers = members.length;
  const students = members.filter(m => m.memberRole === "student").length;
  const faculty = members.filter(m => m.memberRole === "faculty").length;

  // Recent assignments (last 5, newest first from listCollection which is desc)
  const recentAssignments = assignments.slice(0, 5);
  // Active projects (first 4)
  const recentProjects = projects.slice(0, 4);

  const isLoading =
    meQuery.isLoading ||
    organizationQuery.isLoading ||
    assignmentsQuery.isLoading ||
    projectsQuery.isLoading ||
    membersQuery.isLoading;
  const error =
    meQuery.error ||
    organizationQuery.error ||
    assignmentsQuery.error ||
    projectsQuery.error ||
    membersQuery.error;

  if (isLoading) return <DashboardLoading />;

  if (error)
    return (
      <main
        className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <InstituteHeader active="Dashboard" />
        <section className="px-6 py-12 sm:px-10 lg:px-[3rem] lg:py-12">
          <div className="mx-auto max-w-[94rem]">
            <Failure
              message={error.message}
              retry={() => {
                void meQuery.refetch();
                void assignmentsQuery.refetch();
                void projectsQuery.refetch();
                void membersQuery.refetch();
                void organizationQuery.refetch();
              }}
            />
          </div>
        </section>
      </main>
    );

  if (!organizationId || !organization)
    return (
      <main
        className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <InstituteHeader active="Dashboard" />
        <section className="px-6 py-12 sm:px-10 lg:px-[3rem] lg:py-12">
          <div className="mx-auto max-w-[94rem]">
            <div className="border border-dashed border-[#a58c6d]/55 p-10 text-center">
              <Building2 className="mx-auto text-[#5e7966]" size={32} />
              <p className="mt-4 font-display text-[1.7rem]">
                No institution linked.
              </p>
              <p className="mt-2 font-body text-[0.84rem] text-[#5e7966]">
                Complete your institution onboarding to see your dashboard.
              </p>
              <a
                href="/onboarding/institution"
                className="rounded-full mt-6 inline-block bg-[#c94a20] px-6 py-3 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white"
              >
                Go to onboarding
              </a>
            </div>
          </div>
        </section>
      </main>
    );

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Dashboard" />
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem] lg:py-10">
        <div className="mx-auto max-w-[94rem]">
          {/* Welcome header — institution-specific */}
          <div className="border-b border-[#a78e6e]/45 pb-8">
            <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#c64b22]">
              Institution workspace
            </p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="font-display text-[2.6rem] font-medium leading-none tracking-[-0.03em] sm:text-[3.1rem]">
                  {organization.name}
                </h1>
                <p className="mt-3 max-w-[48rem] font-body text-[0.82rem] leading-relaxed text-[#5d7067]">
                  {organization.overview ||
                    "Track assignments, project delivery, and team activity for your institution."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.09em]">
                  <span
                    className={`px-3 py-1.5 ${organization.verificationStatus === "verified" ? "border border-[#7ea68a] bg-[#e2ede3] text-[#2e5a3a]" : "border border-[#c79e7a]/60 bg-[#fef3e2]/60 text-[#9b3e20]"}`}
                  >
                    {organization.verificationStatus}
                  </span>
                  <span className="border border-[#80977f]/60 bg-[#f8f2e8]/45 px-3 py-1.5 text-[#3a5a3c]">
                    {organization.institutionType || organization.kind}
                  </span>
                  {organization.location && (
                    <span className="text-[#6b7b72]">
                      {organization.location}
                    </span>
                  )}
                </div>
              </div>
              <a
                href="/institute/profile"
                className="rounded-full shrink-0 border border-[#16422f]/70 px-5 py-3 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-[#16422f] transition hover:bg-[#16422f] hover:text-white"
              >
                Manage profile
              </a>
            </div>
          </div>

          {/* Stat cards — 4 columns */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<FileStack size={18} />}
              label="Assignments"
              value={String(totalAssignments)}
              sub={`${pendingAssignments} pending · ${acceptedAssignments} accepted`}
            />
            <StatCard
              icon={<CheckCircle2 size={18} />}
              label="Projects"
              value={String(totalProjects)}
              sub={`${activeProjects} active · ${resolvedProjects} resolved`}
            />
            <StatCard
              icon={<UsersRound size={18} />}
              label="Team"
              value={String(totalMembers)}
              sub={`${students} students · ${faculty} faculty`}
            />
            <StatCard
              icon={<Award size={18} />}
              label="Progress"
              value={
                totalProjects
                  ? `${Math.round(projects.reduce((a, p) => a + (p.progress ?? 0), 0) / totalProjects)}%`
                  : "—"
              }
              sub="Avg. project progress"
            />
          </div>

          {/* Assignments table — org-filtered */}
          <section className="mt-10">
            <div className="flex items-end justify-between gap-4 border-b border-[#a78e6e]/40 pb-4">
              <div>
                <h2 className="font-display text-[1.9rem] leading-none">
                  My assignments.
                </h2>
                <p className="mt-2 font-body text-[0.78rem] text-[#5d7067]">
                  Challenges assigned or self-enrolled for {organization.name} —
                  accept to create a delivery project.
                </p>
              </div>
              <a
                href="/institute/challenges"
                className="hidden shrink-0 items-center gap-2 font-body text-[0.78rem] font-semibold text-[#bd4a26] sm:inline-flex"
              >
                View all <ArrowRight size={16} />
              </a>
            </div>

            {totalAssignments === 0 ? (
              <div className="mt-6 border border-dashed border-[#a58c6d]/55 p-8 text-center">
                <Clock3 className="mx-auto text-[#5e7966]" size={26} />
                <p className="mt-3 font-display text-[1.45rem]">
                  No assignments yet.
                </p>
                <p className="mt-2 mx-auto max-w-[32rem] font-body text-[0.78rem] text-[#5d7067]">
                  Browse the challenge directory and enroll for open challenges.
                  Enrolled assignments appear here — accept one to begin.
                </p>
                <a
                  href="/institute/challenges"
                  className="rounded-full mt-5 inline-block bg-[#c94a20] px-6 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white"
                >
                  Browse challenges
                </a>
              </div>
            ) : (
              <>
                <div className="mt-6 hidden grid-cols-[minmax(18rem,1.5fr)_.7fr_.6fr_9rem] gap-5 border-b border-[#a78e6e]/40 pb-4 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#314b40] lg:grid">
                  <span>Challenge</span>
                  <span>Status</span>
                  <span>Enrolled</span>
                  <span>Action</span>
                </div>
                <div>
                  {recentAssignments.map(assignment => {
                    const ch = challengeById.get(assignment.challengeId);
                    return (
                      <article
                        key={assignment.id}
                        className="grid gap-3 border-b border-[#a78e6e]/40 py-5 lg:grid-cols-[minmax(18rem,1.5fr)_.7fr_.6fr_9rem] lg:items-center lg:gap-5 lg:px-3"
                      >
                        <div>
                          <h3 className="font-display text-[1.3rem] leading-none">
                            {ch?.title ??
                              `Challenge #${assignment.challengeId}`}
                          </h3>
                          <p className="mt-1 font-body text-[0.7rem] text-[#5d7067]">
                            {ch?.district ?? "—"} · {ch?.domain ?? "—"}
                            {(assignment as { selfEnrolled?: boolean })
                              .selfEnrolled
                              ? " · self-enrolled"
                              : " · admin assigned"}
                          </p>
                        </div>
                        <span
                          className={`w-fit border px-2 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] ${assignment.status === "accepted" ? "border-[#7ea68a] bg-[#e2ede3] text-[#2e5a3a]" : assignment.status === "pending" ? "border-[#c79e7a]/60 bg-[#fef3e2]/60 text-[#9b3e20]" : "border-[#a58c6d]/40 bg-[#f8f2e8]/30 text-[#6b7b72]"}`}
                        >
                          {assignment.status}
                        </span>
                        <span className="font-body text-[0.74rem] text-[#5d7067]">
                          {assignment.createdAt
                            ? new Date(
                                assignment.createdAt as string | Date
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                        <a
                          href={`/institute/challenges/${assignment.challengeId}`}
                          className="rounded-full w-fit border border-[#bd5a38]/70 px-5 py-2.5 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#ab4826] transition hover:bg-[#c94a20] hover:text-white"
                        >
                          Review
                        </a>
                      </article>
                    );
                  })}
                </div>
                {totalAssignments > 5 && (
                  <div className="mt-4 text-right">
                    <a
                      href="/institute/challenges"
                      className="font-body text-[0.78rem] font-semibold text-[#bd4a26]"
                    >
                      View all {totalAssignments} →
                    </a>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Active projects — org-filtered with progress */}
          <section className="mt-12">
            <div className="flex items-end justify-between gap-4 border-b border-[#a78e6e]/40 pb-4">
              <div>
                <h2 className="font-display text-[1.9rem] leading-none">
                  Active projects.
                </h2>
                <p className="mt-2 font-body text-[0.78rem] text-[#5d7067]">
                  Delivery workspaces for {organization.name} — track progress,
                  milestones, and evidence.
                </p>
              </div>
              <a
                href="/institute/projects"
                className="hidden shrink-0 items-center gap-2 font-body text-[0.78rem] font-semibold text-[#bd4a26] sm:inline-flex"
              >
                View all <ArrowRight size={16} />
              </a>
            </div>

            {totalProjects === 0 ? (
              <div className="mt-6 border border-dashed border-[#a58c6d]/55 p-8 text-center">
                <GraduationCap className="mx-auto text-[#5e7966]" size={26} />
                <p className="mt-3 font-display text-[1.45rem]">
                  No projects yet.
                </p>
                <p className="mt-2 mx-auto max-w-[32rem] font-body text-[0.78rem] text-[#5d7067]">
                  Accept an assigned challenge to create your first delivery
                  project. The workspace tracks milestones, documents, and
                  activity.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 lg:grid-cols-2">
                {recentProjects.map(project => (
                  <article
                    key={project.id}
                    className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6"
                  >
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#c64b22]">
                          {project.stage.replaceAll("_", " ")}
                        </p>
                        <h3 className="mt-3 font-display text-[1.85rem] leading-none">
                          {project.title}
                        </h3>
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
                        Open workspace <ArrowRight size={16} />
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="mt-12 border-t border-[#a78e6e]/45 pt-8">
            <h2 className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#314b40]">
              Quick actions
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <a
                href="/institute/challenges"
                className="group flex items-center justify-between border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-5 transition hover:bg-[#f8f2e8]/45"
              >
                <div>
                  <p className="font-display text-[1.25rem] leading-none">
                    Browse challenges
                  </p>
                  <p className="mt-1 font-body text-[0.72rem] text-[#5d7067]">
                    Enroll for open challenges
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-[#bd4a26] transition group-hover:translate-x-1"
                />
              </a>
              <a
                href="/institute/profile"
                className="group flex items-center justify-between border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-5 transition hover:bg-[#f8f2e8]/45"
              >
                <div>
                  <p className="font-display text-[1.25rem] leading-none">
                    Team & profile
                  </p>
                  <p className="mt-1 font-body text-[0.72rem] text-[#5d7067]">
                    {totalMembers} members · Manage
                  </p>
                </div>
                <UsersRound
                  size={18}
                  className="text-[#5e7966] transition group-hover:translate-x-1"
                />
              </a>
              <a
                href="/notifications"
                className="group flex items-center justify-between border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-5 transition hover:bg-[#f8f2e8]/45"
              >
                <div>
                  <p className="font-display text-[1.25rem] leading-none">
                    Notifications
                  </p>
                  <p className="mt-1 font-body text-[0.72rem] text-[#5d7067]">
                    Assignment & project updates
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-[#bd4a26] transition group-hover:translate-x-1"
                />
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-[#a58c6d]/45 bg-[#f8f2e8]/30 p-5">
      <div className="flex items-center gap-2 font-mono-ui text-[0.56rem] font-semibold uppercase tracking-[0.1em] text-[#6b7b72]">
        <span className="text-[#5e7966]">{icon}</span>
        {label}
      </div>
      <p className="mt-3 font-body text-[2.2rem] font-bold leading-none tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <p className="mt-1 font-body text-[0.68rem] text-[#5d7067]">{sub}</p>
    </div>
  );
}

function DashboardLoading() {
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0c3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Dashboard" />
      <section className="px-6 py-12 sm:px-10 lg:px-[3rem] lg:py-12">
        <div className="mx-auto max-w-[94rem]">
          <div className="flex items-center gap-3 font-body text-[#52675d]">
            <Loader2 className="animate-spin" size={18} />
            Loading institution dashboard…
          </div>
        </div>
      </section>
    </main>
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
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
