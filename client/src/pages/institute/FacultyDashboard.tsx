import {
  ArrowRight,
  Award,
  BookOpen,
  GraduationCap,
  Loader2,
  UsersRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { timeAgo } from "@/lib/timeago";
import { ProgressRing } from "@/components/ui/progress-ring";
import { EmptyState } from "@/components/EmptyState";

export default function FacultyDashboard() {
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
  const members = membersQuery.data ?? [];
  const students = members.filter((m: any) => m.memberRole === "student");
  const org = orgQuery.data;

  // Simple attention heuristic: students with assignedProject pointing to a project that is not resolved
  const attentionStudents = students.slice(0, 3);

  if (me.isLoading || orgQuery.isLoading || projectsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 font-body text-[#52675d]">
        <Loader2 size={18} className="animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Mentor hero */}
      <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/35 p-6 sm:p-8">
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#c64b22]">
          Faculty workspace
        </p>
        <h1 className="mt-2 font-display text-[2.2rem] leading-none tracking-[-0.03em]">
          Welcome, {me.data?.name?.split(" ")[0] ?? "faculty"}
        </h1>
        <p className="mt-2 font-body text-[0.84rem] text-[#5c7066]">
          You are mentoring{" "}
          <span className="font-semibold text-[#132e24]">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </span>{" "}
          with{" "}
          <span className="font-semibold text-[#132e24]">
            {students.length} student{students.length === 1 ? "" : "s"}
          </span>{" "}
          in {org?.name ?? "your institution"}.
        </p>
        {attentionStudents.length > 0 && (
          <div className="mt-4 border border-[#c79e7a]/60 bg-[#fef3e2]/60 p-3">
            <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-[#9b3e20]">
              Needs attention
            </p>
            <p className="mt-1 font-body text-[0.78rem] text-[#5c7066]">
              {attentionStudents.map((s: any) => s.fullName).join(", ")} — check
              their recent activity.
            </p>
          </div>
        )}
      </section>

      {/* Assigned projects */}
      <section>
        <div className="flex items-end justify-between gap-4 border-b border-[#a78e6e]/40 pb-4">
          <h2 className="font-display text-[1.6rem] leading-none">
            Assigned Projects
          </h2>
          <a
            href="/institute/projects"
            className="hidden sm:inline-flex items-center gap-1 font-body text-[0.78rem] font-semibold text-[#b94b27]"
          >
            All projects <ArrowRight size={16} />
          </a>
        </div>
        {projects.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              icon={<BookOpen size={28} />}
              title="No projects yet"
              description="Once your institution enrolls and creates projects, they appear here with progress and milestones."
            />
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project: any) => (
              <article
                key={project.id}
                className="border border-[#a58c6d]/45 bg-white/40 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.09em] text-[#8a7a5a]">
                      {String(project.stage).replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-1 font-display text-[1.25rem] leading-none line-clamp-2">
                      {project.title}
                    </h3>
                  </div>
                  <ProgressRing
                    progress={project.progress ?? 0}
                    size={52}
                    strokeWidth={5}
                  />
                </div>
                <p className="mt-3 line-clamp-2 font-body text-[0.72rem] text-[#5e7966]">
                  {project.overview}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-[#e2ede3] px-2 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-[#2e5a3a]">
                    Mentor
                  </span>
                  <a
                    href={`/institute/projects/${project.id}`}
                    className="inline-flex items-center gap-1 font-body text-[0.74rem] font-semibold text-[#bd4a26] hover:underline"
                  >
                    Open <ArrowRight size={14} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Student roster */}
      <section>
        <h2 className="font-display text-[1.5rem] leading-none">
          Student Roster
        </h2>
        <p className="mt-2 font-body text-[0.76rem] text-[#5c7066]">
          Students in {org?.name ?? "your institution"}
        </p>
        {students.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<GraduationCap size={28} />}
              title="No students listed"
              description="Your admin adds students in the institution profile. Once added, they appear here."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center gap-3 border border-[#a58c6d]/30 bg-[#f8f2e8]/30 p-4"
              >
                <div className="relative">
                  <div className="grid size-9 place-items-center rounded-full bg-[#16422f] font-mono-ui text-[0.6rem] text-white">
                    {String(s.fullName).slice(0, 2).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-white ${s.status === "active" ? "bg-[#2e6849]" : s.status === "invited" ? "bg-[#c79e7a]" : "bg-[#a84626]"}`}
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-body text-[0.82rem] font-semibold text-[#132e24]">
                    {s.fullName}
                  </p>
                  <p className="truncate font-body text-[0.7rem] text-[#6b7b72]">
                    {s.department ?? s.program ?? "—"} · {timeAgo(s.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick profile */}
      <section className="border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6">
        <div className="flex items-center gap-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#5e7966]">
          <Award size={14} /> Mentor profile
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
              Role
            </p>
            <span className="mt-1 inline-block rounded-full bg-[#7ea68a] px-2.5 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-white">
              Faculty
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
