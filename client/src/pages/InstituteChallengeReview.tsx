/** Style: Samadhan institute challenge review — persisted assignment, mentor, and student-team handoff. */
import InstituteHeader from "@/components/InstituteHeader";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { ChallengeLocationMap } from "@/components/ChallengeLocationMap";

export default function InstituteChallengeReview() {
  const [, params] = useRoute("/institute/challenges/:id");
  const [, setLocation] = useLocation();
  const challengeId = Number(params?.id ?? 0);
  const challengeInput = useMemo(
    () => ({ id: challengeId || 1 }),
    [challengeId]
  );
  const assignmentInput = useMemo(
    () => ({ challengeId: challengeId || 1 }),
    [challengeId]
  );
  const [institutionsInput] = useState({ kind: "institution" as const });
  const challengeQuery = trpc.workflow.challengeById.useQuery(challengeInput, {
    enabled: challengeId > 0,
  });
  const assignmentsQuery = trpc.workflow.assignments.useQuery(assignmentInput, {
    enabled: challengeId > 0,
  });
  const institutionsQuery =
    trpc.workflow.organizations.useQuery(institutionsInput);
  const [organizationId, setOrganizationId] = useState(0);
  const memberInput = useMemo(
    () => ({ organizationId: organizationId || 1 }),
    [organizationId]
  );
  const membersQuery = trpc.workflow.organizationMembers.useQuery(memberInput, {
    enabled: organizationId > 0,
  });
  const projectInput = useMemo(
    () => ({
      organizationId: organizationId || 1,
      challengeId: challengeId || 1,
    }),
    [organizationId, challengeId]
  );
  const projectsQuery = trpc.workflow.projects.useQuery(projectInput, {
    enabled: organizationId > 0 && challengeId > 0,
  });
  const utils = trpc.useUtils();
  const [mentorId, setMentorId] = useState("");
  const [studentIds, setStudentIds] = useState<number[]>([]);
  const [teamName, setTeamName] = useState("");
  const updateAssignment = trpc.workflow.updateAssignment.useMutation({
    onSuccess: () => void utils.workflow.assignments.invalidate(),
  });
  const createProject = trpc.workflow.createProject.useMutation({
    onSuccess: result => {
      void utils.workflow.projects.invalidate();
      setLocation(`/institute/projects/${result.id}`);
    },
  });
  const challenge = challengeQuery.data;
  const assignments = assignmentsQuery.data ?? [];
  const assignment =
    assignments.find(item => item.organizationId === organizationId) ??
    assignments[0];
  const eligibleInstitutions = (institutionsQuery.data ?? []).filter(item =>
    assignments.some(
      assignmentItem => assignmentItem.organizationId === item.id
    )
  );
  const faculties = (membersQuery.data ?? []).filter(
    member => member.memberRole === "faculty" && member.status === "active"
  );
  const students = (membersQuery.data ?? []).filter(
    member => member.memberRole === "student" && member.status === "active"
  );
  const assignedProject = projectsQuery.data?.[0];

  useEffect(() => {
    if (
      !organizationId &&
      (assignments[0]?.organizationId || eligibleInstitutions[0]?.id)
    )
      setOrganizationId(
        assignments[0]?.organizationId ?? eligibleInstitutions[0]!.id
      );
  }, [organizationId, assignments, eligibleInstitutions]);
  useEffect(() => {
    if (faculties.length && !mentorId) setMentorId(String(faculties[0]!.id));
  }, [faculties, mentorId]);

  function toggleStudent(id: number) {
    setStudentIds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  }
  function createDeliveryProject() {
    if (!challenge || !assignment || !organizationId || !mentorId) return;
    const mentor = faculties.find(member => member.id === Number(mentorId));
    const team = students.filter(member => studentIds.includes(member.id));
    createProject.mutate({
      challengeId: challenge.id,
      organizationId,
      title: teamName.trim() || `${challenge.title} — response project`,
      overview: challenge.description,
      leadName: mentor?.fullName || "Institution mentor",
      teamMembers: [mentor?.fullName, ...team.map(member => member.fullName)]
        .filter(Boolean)
        .join(", "),
    });
  }

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage:
          "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Challenges" />
      <section className="px-6 py-8 sm:px-10 lg:px-[3rem] lg:py-8">
        <button
          type="button"
          onClick={() => setLocation("/institute/dashboard")}
          className="font-body text-[0.78rem] text-[#3c584b] transition hover:text-[#c64b22]"
        >
          ← Back to Challenges
        </button>
        {challengeQuery.isLoading ? (
          <Loading label="Loading assigned challenge…" />
        ) : challengeQuery.isError ? (
          <Failure
            message={challengeQuery.error.message}
            retry={() => void challengeQuery.refetch()}
          />
        ) : !challenge ? (
          <Empty label="Challenge record not found." />
        ) : (
          <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,1.14fr)_minmax(26rem,.86fr)] xl:gap-16">
            <article className="max-w-[47rem]">
              <p className="w-fit bg-[#e2e8d9] px-2 py-1 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#526b50]">
                {challenge.status.replaceAll("_", " ")} ·{" "}
                {challenge.createdAt
                  ? new Date(challenge.createdAt).toLocaleDateString()
                  : "recent"}
              </p>
              <h1 className="mt-5 font-display text-[3.8rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5rem]">
                {challenge.title}
              </h1>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-b border-[#a78e6e]/45 pb-6 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em]">
                <span className="border border-[#78977d] px-2 py-1 text-[#49704f]">
                  {challenge.domain}
                </span>
                <span className="border-l border-[#a78e6e]/55 pl-6">
                  {challenge.district} district
                </span>
                <span className="border-l border-[#a78e6e]/55 pl-6 text-[#9b3e20]">
                  {challenge.priority} priority
                </span>
              </div>
              <section className="mt-6 border-b border-[#a78e6e]/45 pb-7">
                <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                  Description
                </p>
                <p className="mt-4 whitespace-pre-wrap font-body text-[0.9rem] leading-[1.75] text-[#2f483e]">
                  {challenge.description}
                </p>
              </section>
              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <InfoBlock
                  icon={<UserRound size={24} />}
                  label="Submitted by"
                  value={challenge.citizenName}
                  detail={
                    challenge.citizenEmail ||
                    challenge.citizenPhone ||
                    "Contact not provided"
                  }
                />
                <InfoBlock
                  icon={<MapPin size={24} />}
                  label="Location"
                  value={challenge.district}
                  detail={
                    challenge.latitude && challenge.longitude
                      ? `${challenge.latitude}, ${challenge.longitude}`
                      : "Precise pin not provided"
                  }
                />
              </div>
              <div className="mt-6">
                <ChallengeLocationMap
                  latitude={challenge.latitude}
                  longitude={challenge.longitude}
                  district={challenge.district}
                />
              </div>
              <p className="mt-6 font-mono-ui text-[0.58rem] uppercase tracking-[0.12em] text-[#3b5147]">
                Persisted challenge ID · {challenge.id}
              </p>
            </article>
            <aside className="h-fit border border-[#9f896d]/60 bg-[#f7f0e5]/25 p-6 sm:p-7">
              <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                Institution delivery handoff
              </p>
              {assignmentsQuery.isLoading || institutionsQuery.isLoading ? (
                <Loading label="Loading assignment context…" />
              ) : assignmentsQuery.isError || institutionsQuery.isError ? (
                <Failure
                  message={
                    assignmentsQuery.error?.message ||
                    institutionsQuery.error?.message ||
                    "The assignment context could not load."
                  }
                  retry={() => {
                    void assignmentsQuery.refetch();
                    void institutionsQuery.refetch();
                  }}
                />
              ) : eligibleInstitutions.length === 0 ? (
                <Empty label="No institution assignment is available for this challenge." />
              ) : (
                <>
                  <label className="mt-5 block">
                    <span className="font-body text-[0.75rem]">
                      Assigned institution
                    </span>
                    <select
                      value={organizationId}
                      onChange={event => {
                        setOrganizationId(Number(event.target.value));
                        setStudentIds([]);
                        setMentorId("");
                      }}
                      className="citizen-input mt-2"
                    >
                      {eligibleInstitutions.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {assignment?.status === "declined" ? (
                    <p className="mt-5 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-4 font-body text-[0.76rem] text-[#934325]">
                      This assignment was declined. The administrator can assign
                      another institution.
                    </p>
                  ) : assignedProject ? (
                    <div className="mt-5 border border-[#7c9a7b]/60 bg-[#e7eee0]/45 p-5">
                      <p className="font-display text-[1.45rem]">
                        Project already created.
                      </p>
                      <p className="mt-2 font-body text-[0.75rem] text-[#4f675a]">
                        Continue managing its milestones, evidence, and delivery
                        log.
                      </p>
                      <a
                        href={`/institute/projects/${assignedProject.id}`}
                        className="rounded-full mt-4 inline-block bg-[#16422f] px-4 py-3 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-white"
                      >
                        Open project workspace
                      </a>
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={updateAssignment.isPending}
                          onClick={() =>
                            assignment &&
                            updateAssignment.mutate({
                              id: assignment.id,
                              status: "accepted",
                            })
                          }
                          className="rounded-full bg-[#c94a20] px-4 py-3 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60"
                        >
                          <CheckCircle2 className="mr-2 inline" size={15} />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={updateAssignment.isPending}
                          onClick={() =>
                            assignment &&
                            updateAssignment.mutate({
                              id: assignment.id,
                              status: "declined",
                            })
                          }
                          className="rounded-full border border-[#bd5a38]/70 px-4 py-3 font-mono-ui text-[0.59rem] font-semibold uppercase tracking-[0.1em] text-[#a84626] disabled:opacity-60"
                        >
                          <XCircle className="mr-2 inline" size={15} />
                          Decline
                        </button>
                      </div>
                      {updateAssignment.isError && (
                        <p
                          role="alert"
                          className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                        >
                          {updateAssignment.error.message}
                        </p>
                      )}
                      <div className="mt-7 border-t border-[#a78e6e]/45 pt-6">
                        <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
                          Create delivery project
                        </p>
                        <label className="mt-4 block">
                          <span className="font-body text-[0.75rem]">
                            Project title
                          </span>
                          <input
                            value={teamName}
                            onChange={event => setTeamName(event.target.value)}
                            placeholder={`${challenge.title} — response project`}
                            className="citizen-input mt-2"
                          />
                        </label>
                        <label className="mt-4 block">
                          <span className="font-body text-[0.75rem]">
                            Faculty mentor
                          </span>
                          <select
                            value={mentorId}
                            onChange={event => setMentorId(event.target.value)}
                            className="citizen-input mt-2"
                          >
                            <option value="">
                              Select active faculty mentor
                            </option>
                            {faculties.map(member => (
                              <option key={member.id} value={member.id}>
                                {member.fullName}
                                {member.designation
                                  ? ` · ${member.designation}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <p className="mt-5 font-body text-[0.75rem] text-[#576b62]">
                          Select active student participants.
                        </p>
                        <div className="mt-3 max-h-52 space-y-2 overflow-y-auto border border-[#a78e6e]/45 p-3">
                          {students.length === 0 ? (
                            <p className="font-body text-[0.73rem] text-[#6a7c71]">
                              No active students are listed for this
                              institution.
                            </p>
                          ) : (
                            students.map(member => (
                              <label
                                key={member.id}
                                className="flex items-center gap-3 py-1 font-body text-[0.76rem]"
                              >
                                <input
                                  type="checkbox"
                                  checked={studentIds.includes(member.id)}
                                  onChange={() => toggleStudent(member.id)}
                                  className="size-4 accent-[#c94a20]"
                                />
                                {member.fullName}
                                <span className="text-[#6b7b72]">
                                  {member.program || member.department || ""}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={
                            createProject.isPending ||
                            assignment?.status !== "accepted" ||
                            !mentorId
                          }
                          onClick={createDeliveryProject}
                          className="rounded-full mt-5 flex w-full items-center justify-center gap-2 bg-[#16422f] px-4 py-4 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-50"
                        >
                          {createProject.isPending ? (
                            <Loader2 className="animate-spin" size={15} />
                          ) : null}
                          {assignment?.status === "accepted"
                            ? "Create project workspace"
                            : "Accept assignment to continue"}
                        </button>
                        {createProject.isError && (
                          <p
                            role="alert"
                            className="mt-3 font-body text-[0.72rem] text-[#a34b2c]"
                          >
                            {createProject.error.message}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
function InfoBlock({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-b border-[#a78e6e]/45 pb-5">
      <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.13em]">
        {label}
      </p>
      <div className="mt-4 flex gap-4">
        <span className="grid size-12 place-items-center rounded-full bg-[#dce5d2]">
          {icon}
        </span>
        <p className="font-display text-[1.35rem] leading-none">
          {value}
          <br />
          <span className="font-body text-[0.73rem] leading-relaxed text-[#576b62]">
            {detail}
          </span>
        </p>
      </div>
    </div>
  );
}
function Loading({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 border border-[#a58c6d]/45 p-5 font-body text-[0.76rem] text-[#52675d]">
      <Loader2 className="animate-spin" size={17} />
      {label}
    </div>
  );
}
function Empty({ label }: { label: string }) {
  return (
    <div className="mt-5 border border-dashed border-[#a58c6d]/55 p-5 font-body text-[0.76rem] text-[#586d63]">
      {label}
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
