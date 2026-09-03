import { ArrowRight, Award, BookOpen, Loader2, UsersRound } from "lucide-react";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { timeAgo } from "@/lib/timeago";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/EmptyState";

export default function StudentDashboard() {
  const me = trpc.auth.me.useQuery();
  const orgId = me.data?.organizationId ?? null;
  const orgQuery = trpc.workflow.organizationById.useQuery(
    { id: orgId ?? 1 },
    { enabled: !!orgId }
  );
  const projectsQuery = trpc.workflow.projects.useQuery(
    { organizationId: orgId ?? undefined },
    { enabled: !!orgId }
  );
  const membersQuery = trpc.workflow.organizationMembers.useQuery(
    { organizationId: orgId ?? 1 },
    { enabled: !!orgId }
  );

  const projects = projectsQuery.data ?? [];
  const myProjects = projects.slice(0, 6);
  const members = membersQuery.data ?? [];
  const org = orgQuery.data;

  // Pick first project activities for feed (best-effort)
  const firstProjectId = projects[0]?.id ?? 0;
  const activitiesQuery = trpc.workflow.projectActivities.useQuery(
    { projectId: firstProjectId },
    { enabled: firstProjectId > 0 }
  );
  const activities = (activitiesQuery.data ?? []).slice(0, 6);

  if (me.isLoading || orgQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-body text-[#52675d]">
        <Loader2 size={18} className="animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden border border-[#a58c6d]/55 bg-[#f8f2e8]/35 p-6 sm:p-8">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
          aria-hidden
        />
        <div className="relative">
          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#c64b22]">
            Student workspace
          </p>
          <h1 className="mt-2 font-display text-[2.4rem] leading-none tracking-[-0.03em] sm:text-[2.8rem]">
            Welcome back, {me.data?.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-2 font-body text-[0.84rem] text-[#5c7066]">
            {org?.name ?? "Your institution"} · {members.length} teammates ·{" "}
            {projects.length} project{projects.length === 1 ? "" : "s"} in your
            org
          </p>
        </div>
      </section>

      {/* Your projects */}
      <section>
        <div className="flex items-end justify-between gap-4 border-b border-[#a78e6e]/40 pb-4">
          <h2 className="font-display text-[1.7rem] leading-none">
            Your Projects
          </h2>
          <a
            href="/institute/projects"
            className="hidden sm:inline-flex items-center gap-1 font-body text-[0.78rem] font-semibold text-[#b94b27]"
          >
            All projects <ArrowRight size={16} />
          </a>
        </div>
        {myProjects.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BookOpen size={28} />}
              title="No projects assigned yet"
              description="Talk to your admin to get assigned to a project. Once assigned, it appears here with progress and milestones."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myProjects.map((project: any) => (
              <motion.article
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="group border border-[#a58c6d]/45 bg-[#f8f2e8]/25 p-6 transition hover:shadow-[0_8px_20px_rgba(19,46,36,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.09em] text-[#c64b22]">
                      {String(project.stage).replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-2 font-display text-[1.35rem] leading-none line-clamp-2">
                      {project.title}
                    </h3>
                  </div>
                  <ProgressRing
                    progress={project.progress ?? 0}
                    size={56}
                    strokeWidth={5}
                  />
                </div>
                <p className="mt-3 line-clamp-2 font-body text-[0.74rem] leading-relaxed text-[#5e7966]">
                  {project.overview}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#6b7b72]">
                    {project.status?.replaceAll("_", " ") ?? "active"}
                  </span>
                  <a
                    href={`/institute/projects/${project.id}`}
                    className="inline-flex items-center gap-1 font-body text-[0.74rem] font-semibold text-[#bd4a26] group-hover:underline"
                  >
                    Open <ArrowRight size={14} />
                  </a>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      {/* Team activity */}
      <section>
        <h2 className="font-display text-[1.5rem] leading-none">
          Team Activity
        </h2>
        <p className="mt-2 font-body text-[0.76rem] text-[#5c7066]">
          What your teammates did recently
        </p>
        {activities.length === 0 ? (
          <p className="mt-4 font-body text-[0.78rem] text-[#6b7b72]">
            No recent activity — updates appear here when milestones or notes
            are added.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {activities.map((a: any) => (
              <div
                key={a.id}
                className="flex gap-3 border border-[#a58c6d]/25 bg-white/40 p-4"
              >
                <div className="grid size-8 place-items-center rounded-full bg-[#16422f] font-mono-ui text-[0.6rem] text-white">
                  {String(a.actorName ?? "S")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-body text-[0.8rem] font-medium text-[#132e24]">
                    {a.title}
                  </p>
                  <p className="font-body text-[0.72rem] text-[#6b7b72]">
                    {a.actorName} · {timeAgo(a.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My skills */}
      <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
        <div className="flex items-center gap-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#5e7966]">
          <UsersRound size={14} /> My profile
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#8a9a8e]">
              Name
            </p>
            <p className="font-body text-[0.86rem]">{me.data?.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#8a9a8e]">
              Email
            </p>
            <p className="font-body text-[0.86rem]">{me.data?.email ?? "—"}</p>
          </div>
          <div>
            <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#8a9a8e]">
              Member role
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#dce6d0] px-2.5 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#3a6b4a]">
              Student
            </span>
          </div>
          <div>
            <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#8a9a8e]">
              Organization
            </p>
            <p className="font-body text-[0.86rem]">{org?.name ?? "—"}</p>
          </div>
        </div>
        <a
          href="/institute/profile"
          className="mt-5 inline-flex items-center gap-1 font-body text-[0.76rem] font-semibold text-[#bd4a26] hover:underline"
        >
          View institution profile <ArrowRight size={14} />
        </a>
      </section>
    </div>
  );
}
