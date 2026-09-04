/**
 * Style: Samadhan institution profile — editorial paper workspace with a public-review,
 * Firestore-backed management surface for profile data, faculties, and students.
 */
import InstituteHeader from "@/components/InstituteHeader";
import {
  Check,
  Copy,
  GraduationCap,
  Link2,
  Loader2,
  Plus,
  Save,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type ProfileTab = "profile" | "faculties" | "students";

export default function InstituteProfile() {
  const [tab, setTab] = useState<ProfileTab>("profile");
  const [organizationId, setOrganizationId] = useState(
    () =>
      Number(new URLSearchParams(window.location.search).get("organization")) ||
      0
  );
  const me = trpc.auth.me.useQuery();
  const isAdmin = me.data?.role === "admin";
  const [organizationInput] = useState({ kind: "institution" as const });
  const organizationsQuery = trpc.workflow.organizations.useQuery(
    organizationInput,
    { enabled: isAdmin }
  );
  const ownOrganizationQuery = trpc.workflow.organizationById.useQuery(
    { id: me.data?.organizationId ?? 1 },
    { enabled: !isAdmin && !!me.data?.organizationId }
  );
  const organizationQueryInput = useMemo(
    () => ({ organizationId: organizationId || 1 }),
    [organizationId]
  );
  const membersQuery = trpc.workflow.organizationMembers.useQuery(
    organizationQueryInput,
    { enabled: organizationId > 0 }
  );
  const utils = trpc.useUtils();

  useEffect(() => {
    if (organizationId) return;
    if (!isAdmin && me.data?.organizationId) {
      setOrganizationId(me.data.organizationId);
      return;
    }
    if (isAdmin && organizationsQuery.data?.[0])
      setOrganizationId(organizationsQuery.data[0].id);
  }, [
    organizationId,
    isAdmin,
    me.data?.organizationId,
    organizationsQuery.data,
  ]);

  const activeOrganization = isAdmin
    ? organizationsQuery.data?.find(item => item.id === organizationId)
    : (ownOrganizationQuery.data ?? undefined);
  const refresh = () => {
    void utils.workflow.organizations.invalidate();
    void utils.workflow.organizationById.invalidate();
    void utils.workflow.organizationMembers.invalidate();
  };
  const updateOrganization = trpc.workflow.updateOrganization.useMutation({
    onSuccess: refresh,
  });
  const addMember = trpc.workflow.addOrganizationMember.useMutation({
    onSuccess: refresh,
  });
  const updateMember = trpc.workflow.updateOrganizationMember.useMutation({
    onSuccess: refresh,
  });
  const deleteMember = trpc.workflow.deleteOrganizationMember.useMutation({
    onSuccess: refresh,
  });

  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0d3024]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <InstituteHeader active="Profile" />
      <section className="px-6 py-14 sm:px-10 lg:px-[5.4rem] lg:py-16">
        <div className="mx-auto max-w-[85rem]">
          <div className="flex flex-col justify-between gap-8 border-b border-[#a78e6e]/45 pb-8 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">
                Institution workspace · public review
              </p>
              <h1 className="mt-3 font-display text-[4rem] font-medium leading-[0.85] tracking-[-0.04em] sm:text-[5.5rem]">
                Institution Profile.
              </h1>
              <p className="mt-5 max-w-[47rem] font-body text-[0.94rem] leading-relaxed text-[#4d645a]">
                Maintain verified contact details and coordinate the faculty and
                students who contribute to Samadhan projects.
              </p>
            </div>
            {organizationsQuery.data && organizationsQuery.data.length > 1 && (
              <label className="max-w-[22rem] font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.11em] text-[#4a6257]">
                Active institution
                <select
                  value={organizationId}
                  onChange={event =>
                    setOrganizationId(Number(event.target.value))
                  }
                  className="citizen-input mt-2 w-full normal-case tracking-normal"
                >
                  <option value="0">Select your institution</option>
                  {organizationsQuery.data.map(organization => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <TabBar
            tab={tab}
            setTab={setTab}
            counts={{
              faculties:
                membersQuery.data?.filter(
                  member => member.memberRole === "faculty"
                ).length ?? 0,
              students:
                membersQuery.data?.filter(
                  member => member.memberRole === "student"
                ).length ?? 0,
            }}
          />
          {(isAdmin
            ? organizationsQuery.isLoading
            : me.isLoading || ownOrganizationQuery.isLoading) ||
          !organizationId ? (
            <LoadingState />
          ) : !activeOrganization ? (
            <EmptyProfileState />
          ) : tab === "profile" ? (
            <ProfilePanel
              key={activeOrganization.id}
              organization={activeOrganization}
              isSaving={updateOrganization.isPending}
              onSave={details =>
                updateOrganization.mutate({
                  id: activeOrganization.id,
                  details,
                })
              }
            />
          ) : (
            <PeoplePanel
              role={tab === "faculties" ? "faculty" : "student"}
              organizationId={activeOrganization.id}
              organizationName={activeOrganization.name}
              members={(membersQuery.data ?? []).filter(
                member =>
                  member.memberRole ===
                  (tab === "faculties" ? "faculty" : "student")
              )}
              isLoading={membersQuery.isLoading}
              isAdding={addMember.isPending}
              onAdd={input => addMember.mutate(input)}
              onUpdateMember={(id, details) =>
                updateMember.mutate({ id, ...details })
              }
              onDelete={id => deleteMember.mutate({ id })}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function TabBar({
  tab,
  setTab,
  counts,
}: {
  tab: ProfileTab;
  setTab: (tab: ProfileTab) => void;
  counts: { faculties: number; students: number };
}) {
  return (
    <div
      role="tablist"
      aria-label="Institution profile sections"
      className="mt-8 flex flex-wrap gap-2 border-b border-[#a78e6e]/45 pb-4"
    >
      {(
        [
          ["profile", "Overview"],
          ["faculties", `Faculties · ${counts.faculties}`],
          ["students", `Students · ${counts.students}`],
        ] as [ProfileTab, string][]
      ).map(([value, label]) => (
        <button
          key={value}
          role="tab"
          aria-selected={tab === value}
          onClick={() => setTab(value)}
          className={`px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] transition ${tab === value ? "bg-[#16422f] text-white" : "border border-[#9a876c]/60 text-[#365649] hover:bg-[#e5dfd1]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function ProfilePanel({
  organization,
  isSaving,
  onSave,
}: {
  organization: any;
  isSaving: boolean;
  onSave: (details: any) => void;
}) {
  const [saved, setSaved] = useState(false);
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      name: stringValue(data, "name"),
      contactName: stringValue(data, "contactName"),
      contactEmail: stringValue(data, "contactEmail"),
      contactPhone: stringValue(data, "contactPhone"),
      website: stringValue(data, "website"),
      institutionType: stringValue(data, "institutionType"),
      registrationNumber: stringValue(data, "registrationNumber"),
      location: stringValue(data, "location"),
      overview: stringValue(data, "overview"),
      departments: stringValue(data, "departments"),
      expertise: stringValue(data, "expertise"),
      facilities: stringValue(data, "facilities"),
      priorityDomains: stringValue(data, "priorityDomains"),
      supportModes: stringValue(data, "supportModes"),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2600);
  }
  return (
    <form onSubmit={submit} className="mt-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileField
          label="Institution name"
          name="name"
          defaultValue={organization.name}
          required
        />
        <ProfileField
          label="Institution type"
          name="institutionType"
          defaultValue={organization.institutionType}
          required
        />
        <ProfileField
          label="Official email"
          name="contactEmail"
          type="email"
          defaultValue={organization.contactEmail}
          required
        />
        <ProfileField
          label="Website"
          name="website"
          type="url"
          defaultValue={organization.website}
          required
        />
        <ProfileField
          label="Authorized contact"
          name="contactName"
          defaultValue={organization.contactName}
          required
        />
        <ProfileField
          label="Contact number"
          name="contactPhone"
          type="tel"
          defaultValue={organization.contactPhone}
          required
        />
        <ProfileField
          label="Affiliation / accreditation ID"
          name="registrationNumber"
          defaultValue={organization.registrationNumber}
          required
        />
        <ProfileField
          label="Campus address and district"
          name="location"
          defaultValue={organization.location}
          required
        />
      </div>
      <TextProfileField
        label="Institution overview"
        name="overview"
        defaultValue={organization.overview}
        required
      />
      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <ProfileField
          label="Departments or schools"
          name="departments"
          defaultValue={organization.departments}
          required
        />
        <ProfileField
          label="Specializations / expertise"
          name="expertise"
          defaultValue={organization.expertise}
          required
        />
        <ProfileField
          label="Facilities or labs"
          name="facilities"
          defaultValue={organization.facilities}
          required
        />
        <ProfileField
          label="Preferred challenge domains"
          name="priorityDomains"
          defaultValue={organization.priorityDomains}
          required
        />
      </div>
      <TextProfileField
        label="Collaboration capacity"
        name="supportModes"
        defaultValue={organization.supportModes}
      />
      <div className="mt-9 flex flex-col items-end gap-3">
        <span
          className={`inline-flex items-center gap-2 font-body text-[0.74rem] text-[#3c6b4a] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}
        >
          <Check size={15} /> Institution profile saved
        </span>
        <button
          disabled={isSaving}
          type="submit"
          className="rounded-full inline-flex items-center gap-2 bg-[#c94a20] px-8 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:bg-[#dc5729] disabled:opacity-70"
        >
          <Save size={16} />
          {isSaving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function PeoplePanel({
  role,
  organizationId,
  organizationName,
  members,
  isLoading,
  isAdding,
  onAdd,
  onUpdateMember,
  onDelete,
}: {
  role: "faculty" | "student";
  organizationId: number;
  organizationName: string;
  members: any[];
  isLoading: boolean;
  isAdding: boolean;
  onAdd: (input: any) => void;
  onUpdateMember: (id: number, details: any) => void;
  onDelete: (id: number) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const isFaculty = role === "faculty";
  // Simplified: admin only adds name + email, student fills rest via onboarding
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const createSimpleInvite = trpc.workflow.createInvite.useMutation({
    onSuccess: async (data: any) => {
      const link = `${window.location.origin}/signup?invite=${data.token}`;
      void navigator.clipboard.writeText(link);
      toast.success("Invite sent", { description: `${inviteName} <${inviteEmail}> — link copied` });
      // keep existing directory entry for roster visibility
      onAdd({
        organizationId,
        memberRole: role,
        fullName: inviteName,
        email: inviteEmail,
        status: "invited",
      } as any);
      // send email via Worker/Resend
      const isFaculty = role === "faculty";
      const emailBody = `<div style="font-family:sans-serif;color:#132e24"><h2 style="color:#c94a20;">Join ${organizationName} on Samadhan</h2><p>You have been invited as <strong>${isFaculty ? "Faculty" : "Student"}</strong> at <strong>${organizationName}</strong>.</p><p><a href="${link}" style="display:inline-block;background:#c94a20;color:white;padding:12px 20px;text-decoration:none;border-radius:9999px;font-weight:600;">Create Password & Join</a></p><p><code>${link}</code></p><p style="font-size:12px;color:#6b7b72;">After signup you will complete your profile (dept, programme, skills, GitHub etc.). Expires in 7 days.</p></div>`;
      try {
        const r = await fetch("/api/send-invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ to: inviteEmail, subject: `Join ${organizationName} on Samadhan`, html: emailBody, inviteLink: link, organizationName, memberRole: role }) });
        if (r.ok) toast.success("Invite email sent", { description: `Sent to ${inviteEmail}` });
      } catch {}
      setInviteEmail(""); setInviteName(""); setShowForm(false);
    },
    onError: (e: Error) => toast.error("Invite failed", { description: e.message }),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required"); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Invalid email"); return;
    }
    createSimpleInvite.mutate({ organizationId, memberRole: role, email: inviteEmail.trim(), fullName: inviteName.trim() } as any);
  }
  const Icon = isFaculty ? UsersRound : GraduationCap;
  return (
    <section className="mt-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#c64b22]">
            {isFaculty ? "Faculty directory" : "Student team directory"}
          </p>
          <p className="mt-2 max-w-[42rem] font-body text-[0.84rem] leading-relaxed text-[#52675d]">
            {isFaculty
              ? "Add faculty mentors, their discipline, expertise, and mentoring availability."
              : "Maintain student participants, their academic context, skills, and project assignment."}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          type="button"
          className="rounded-full inline-flex items-center justify-center gap-2 bg-[#16422f] px-5 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-white transition hover:bg-[#275d3f]"
        >
          <Plus size={16} />
          Add {isFaculty ? "faculty" : "student"}
        </button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="mt-6 border border-[#a58c6d]/55 bg-[#f8f2e8]/35 p-5 sm:p-7">
          <p className="font-body text-[0.78rem] text-[#5d7067]">Just add name + email — the {isFaculty ? "faculty" : "student"} will complete the rest (dept, programme, skills, GitHub etc.) after they accept the invite.</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">Full name</span><input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder={isFaculty ? "Dr. Priya Sharma" : "Aman Kumar"} className="citizen-input mt-3" required /></label>
            <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">Email</span><input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="name@adamas.edu.in" className="citizen-input mt-3" required /></label>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-[#9a876c]/55 px-5 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em]">Cancel</button>
            <button disabled={createSimpleInvite.isPending} className="rounded-full bg-[#c94a20] px-5 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-70">{createSimpleInvite.isPending ? "Sending…" : `Invite ${isFaculty ? "faculty" : "student"}`}</button>
          </div>
        </form>
      )}
      {isLoading ? (
        <LoadingState />
      ) : members.length === 0 ? (
        <div className="mt-6 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 px-6 py-12 text-center">
          <Icon className="mx-auto text-[#5e7966]" size={28} />
          <p className="mt-4 font-display text-[1.65rem]">
            No {isFaculty ? "faculty members" : "students"} added yet.
          </p>
          <p className="mt-2 font-body text-[0.78rem] text-[#586d63]">
            Use the add button to create the first managed profile.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {members.map(member => (
            <PersonCard
              key={member.id}
              member={member}
              isFaculty={isFaculty}
              organizationId={organizationId}
              organizationName={organizationName}
              onUpdateMember={onUpdateMember}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
      <p className="mt-4 font-body text-[0.7rem] text-[#65786e]">Students fill dept / programme / skills / GitHub after they accept the invite.</p>
    </section>
  );
}

function PersonCard({
  member,
  isFaculty,
  organizationId,
  organizationName,
  onUpdateMember,
  onDelete,
}: {
  member: any;
  isFaculty: boolean;
  organizationId: number;
  organizationName: string;
  onUpdateMember: (id: number, details: any) => void;
  onDelete: (id: number) => void;
}) {
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const createInvite = trpc.workflow.createInvite.useMutation({
    onSuccess: async (data: any) => {
      const link = `${window.location.origin}/signup?invite=${data.token}`;
      setInviteLink(link);
      void navigator.clipboard.writeText(link);
      toast.success("Invite link copied", { description: link });
      // Send invite email via SMTP (Gmail + app password)
      const emailBody = `
        <div style="font-family: sans-serif; color: #132e24; max-width: 560px;">
          <h2 style="color: #c94a20;">You have been invited to join ${organizationName} on Samadhan</h2>
          <p>You have been added as <strong>${isFaculty ? "Faculty" : "Student"}</strong> at <strong>${organizationName}</strong>.</p>
          <p>Click the link below to create your password and activate your account:</p>
          <p><a href="${link}" style="display:inline-block; background:#c94a20; color:white; padding:12px 20px; text-decoration:none; border-radius:9999px; font-weight:600;">Create Password & Join</a></p>
          <p style="font-size: 12px; color: #6b7b72;">Or copy this link: <br/><code>${link}</code></p>
          <p style="font-size: 12px; color: #6b7b72;">This invite expires in 7 days. If you did not expect this, you can ignore this email.</p>
          <p style="font-size: 12px; color: #6b7b72;">— Samadhan, Government of Jharkhand</p>
        </div>
      `;
      // Try Worker + MailChannels first (production). In dev (Vite) /api 404s — fallback to smtpjs.
      // Invite link is already copied + shown in UI, so email is best-effort.
      try {
        const workerRes = await fetch("/api/send-invite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            to: member.email,
            subject: `Invite to join ${organizationName} on Samadhan — create your password`,
            html: emailBody,
            inviteLink: link,
            organizationName,
            memberRole: isFaculty ? "faculty" : "student",
          }),
        });
        if (workerRes.ok) {
          toast.success("Invite email sent", {
            description: `Sent to ${member.email}`,
          });
          return;
        }
        // In dev, Vite has no Worker — /api 404s (SPA fallback returns index.html). Treat any 404 or text/html as dev, not error.
        const ct = workerRes.headers.get("content-type") || "";
        if (workerRes.status === 404 || ct.includes("text/html"))
          throw new Error("Worker not available in dev — use manual copy");
        throw new Error(
          `Worker ${workerRes.status}: ${await workerRes.text()}`
        );
      } catch (workerErr: any) {
        const msg = String(workerErr?.message ?? "");
        if (msg.includes("Worker not available in dev") || msg.includes("Worker 404")) {
          // Dev: Worker not running under Vite — link is already copied + shown in green box below, no error needed
          console.info(
            "Invite link ready (dev) — Worker not running, copy manually:",
            link
          );
          return;
        }
        console.warn(
          "Worker mail failed, falling back to SMTP.js",
          msg.slice(0, 120)
        );
        try {
          const EmailGlobal =
            (typeof window !== "undefined" && (window as any).Email) ||
            (typeof (globalThis as any).Email !== "undefined"
              ? (globalThis as any).Email
              : null);
          if (!EmailGlobal?.send) {
            // Dev without SMTP — link is already shown in UI, no error
            console.info(
              "SMTP not loaded — invite link is shown below for manual share:",
              link
            );
            return;
          }
          const smtpHost =
            (import.meta as any).env?.VITE_SMTP_HOST || "smtp.gmail.com";
          const smtpUser =
            (import.meta as any).env?.VITE_SMTP_USER ||
            "ankanmondal9280@gmail.com";
          const smtpPass =
            (import.meta as any).env?.VITE_SMTP_PASS || "yxrqrsordfckhffs";
          const result = await EmailGlobal.send({
            Host: smtpHost,
            Username: smtpUser,
            Password: smtpPass,
            To: member.email,
            From: smtpUser,
            Subject: `Invite to join ${organizationName} on Samadhan — create your password`,
            Body: emailBody,
          });
          if (String(result).trim() !== "OK") throw new Error(String(result));
          toast.success("Invite email sent (SMTP)", {
            description: `Sent to ${member.email}`,
          });
        } catch (err: any) {
          console.error("SMTP fallback failed", err);
          toast.error("Invite link created but email failed", {
            description: "Copy the link manually and share it.",
          });
        }
      }
    },
    onError: (e: Error) =>
      toast.error("Couldn't create invite", { description: e.message }),
  });
  const [editing, setEditing] = useState(false);
  const active = member.status === "active";
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onUpdateMember(member.id, {
      fullName: stringValue(data, "fullName"),
      email: stringValue(data, "email"),
      phone: stringValue(data, "phone"),
      department: stringValue(data, "department"),
      designation: stringValue(data, "designation"),
      expertise: stringValue(data, "expertise"),
      mentorAvailable: data.get("mentorAvailable") === "on",
      program: stringValue(data, "program"),
      academicYear: stringValue(data, "academicYear"),
      skills: stringValue(data, "skills"),
      assignedProject: stringValue(data, "assignedProject"),
    });
    setEditing(false);
  }
  return (
    <article className="border border-[#a58c6d]/50 bg-[#f8f2e8]/25 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[1.65rem] leading-none">
            {member.fullName}
          </h2>
          <p className="mt-2 font-body text-[0.74rem] text-[#546a5f]">
            {member.email}
            {member.phone ? ` · ${member.phone}` : ""}
          </p>
          {/* USP-06: Credits badge */}
          {(member.creditsEarned ?? 0) > 0 && (
            <span className="mt-2 inline-block rounded-full bg-[#dce6d0] px-3 py-1 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#537246]">
              {member.creditsEarned ?? 0} credits
            </span>
          )}
        </div>
        <span
          className={`border px-2 py-1 font-mono-ui text-[0.53rem] font-semibold uppercase tracking-[0.09em] ${active ? "border-[#769b78] text-[#396546]" : "border-[#cda75f] text-[#a77025]"}`}
        >
          {member.status}
        </span>
      </div>
      {editing ? (
        <form
          onSubmit={submit}
          className="mt-5 grid gap-3 border-t border-[#a78e6e]/40 pt-4"
        >
          <ProfileField
            label="Full name"
            name="fullName"
            defaultValue={member.fullName}
            required
          />
          <ProfileField
            label="Email"
            name="email"
            type="email"
            defaultValue={member.email}
            required
          />
          <ProfileField
            label="Telephone"
            name="phone"
            defaultValue={member.phone}
          />
          <ProfileField
            label="Department"
            name="department"
            defaultValue={member.department}
          />
          {isFaculty ? (
            <>
              <ProfileField
                label="Designation"
                name="designation"
                defaultValue={member.designation}
              />
              <ProfileField
                label="Expertise"
                name="expertise"
                defaultValue={member.expertise}
              />
              <label className="font-body text-[0.76rem]">
                <input
                  defaultChecked={member.mentorAvailable}
                  type="checkbox"
                  name="mentorAvailable"
                  className="mr-2 accent-[#c94a20]"
                />
                Available to mentor
              </label>
            </>
          ) : (
            <>
              <ProfileField
                label="Programme"
                name="program"
                defaultValue={member.program}
              />
              <ProfileField
                label="Year / semester"
                name="academicYear"
                defaultValue={member.academicYear}
              />
              <ProfileField
                label="Skills"
                name="skills"
                defaultValue={member.skills}
              />
              <ProfileField
                label="Assigned project"
                name="assignedProject"
                defaultValue={member.assignedProject}
              />
            </>
          )}
          <div className="flex gap-3">
            <button className="rounded-full bg-[#16422f] px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-white">
              Save changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-[#9a876c]/55 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-5 grid gap-3 border-t border-[#a78e6e]/40 pt-4 text-[0.75rem] sm:grid-cols-2">
            <Meta label="Department" value={member.department} />
            {isFaculty ? (
              <>
                <Meta label="Designation" value={member.designation} />
                <Meta label="Expertise" value={member.expertise} />
                <Meta
                  label="Mentoring"
                  value={member.mentorAvailable ? "Available" : "Not indicated"}
                />
              </>
            ) : (
              <>
                <Meta label="Programme" value={member.program} />
                <Meta label="Year / semester" value={member.academicYear} />
                <Meta label="Skills" value={member.skills} />
                <Meta
                  label="Project"
                  value={member.assignedProject ?? "Unassigned"}
                />
              </>
            )}
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-[#718372]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#365649] transition hover:bg-[#e5dfd1]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={createInvite.isPending}
              onClick={() =>
                createInvite.mutate({
                  organizationId,
                  memberRole: isFaculty ? "faculty" : "student",
                  email: member.email,
                })
              }
              className="rounded-full inline-flex items-center gap-1.5 border border-[#c94a20]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#c94a20] transition hover:bg-[#f7e2d6] disabled:opacity-60"
            >
              {createInvite.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Link2 size={12} />
              )}
              Invite link
            </button>
            <button
              type="button"
              onClick={() => onUpdateMember(member.id, { status: "invited" })}
              className="rounded-full border border-[#718372]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#365649] transition hover:bg-[#e5dfd1]"
            >
              Record invitation
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdateMember(member.id, {
                  status: active ? "inactive" : "active",
                })
              }
              className="rounded-full border border-[#718372]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#365649] transition hover:bg-[#e5dfd1]"
            >
              {active ? "Set inactive" : "Mark active"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(member.id)}
              className="rounded-full border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.1em] text-[#ab4826] transition hover:bg-[#f7e2d6]"
            >
              Remove
            </button>
          </div>
          {inviteLink && (
            <div className="mt-4 flex items-center gap-2 border border-[#7ea68a] bg-[#e2ede3]/40 px-3 py-2">
              <span className="flex-1 truncate font-mono-ui text-[0.58rem] text-[#2e5a3a]">
                {inviteLink}
              </span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(inviteLink);
                  toast.success("Copied invite link");
                }}
                className="shrink-0 rounded-full bg-[#16422f] px-3 py-1.5 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-white"
              >
                <Copy size={12} className="inline mr-1" /> Copy
              </button>
            </div>
          )}
        </>
      )}
    </article>
  );
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.1em] text-[#6c7e74]">
        {label}
      </dt>
      <dd className="mt-1 font-body leading-snug text-[#27463a]">
        {value || "—"}
      </dd>
    </div>
  );
}
function ProfileField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
        {label}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        className="citizen-input mt-3"
      />
    </label>
  );
}
function TextProfileField({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="mt-7 block">
      <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">
        {label}
      </span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="citizen-input mt-3 min-h-[7rem] resize-y"
      />
    </label>
  );
}
function LoadingState() {
  return (
    <div className="mt-8 flex items-center gap-3 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 px-5 py-8 font-body text-[0.82rem] text-[#52675d]">
      <Loader2 className="animate-spin text-[#42684b]" size={19} />
      Loading institution workspace…
    </div>
  );
}
function EmptyProfileState() {
  return (
    <div className="mt-8 border border-dashed border-[#9a876c]/65 bg-[#f8f2e8]/25 p-8 text-center">
      <p className="font-display text-[2rem]">
        No institution profile is available.
      </p>
      <p className="mt-3 font-body text-[0.82rem] text-[#52675d]">
        Begin with the institute pathway to create a verified organization
        record.
      </p>
      <a
        href="/onboarding/institution"
        className="rounded-full mt-6 inline-block bg-[#c94a20] px-5 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-white"
      >
        Start institute onboarding
      </a>
    </div>
  );
}
function stringValue(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || undefined;
}
