import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { auth } from "@/lib/firebase";
import InstituteHeader from "@/components/InstituteHeader";
import { toast } from "sonner";

export default function StudentProfile() {
  const me = trpc.auth.me.useQuery();
  const profile = me.data as any;
  const orgId = profile?.organizationId ?? null;
  const orgQuery = trpc.workflow.organizationById.useQuery({ id: orgId ?? 1 }, { enabled: !!orgId });
  const org = orgQuery.data;
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    phone: profile?.phone ?? "",
    department: profile?.studentProfile?.department ?? "",
    programme: profile?.studentProfile?.programme ?? "",
    year: profile?.studentProfile?.year ?? "",
    semester: profile?.studentProfile?.semester ?? "",
    skills: profile?.studentProfile?.skills ?? "",
    githubUrl: profile?.studentProfile?.githubUrl ?? "",
    linkedinUrl: profile?.studentProfile?.linkedinUrl ?? "",
    bio: profile?.studentProfile?.bio ?? "",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (profile) setForm({
      name: profile.name ?? "",
      phone: profile.phone ?? "",
      department: profile.studentProfile?.department ?? "",
      programme: profile.studentProfile?.programme ?? "",
      year: profile.studentProfile?.year ?? "",
      semester: profile.studentProfile?.semester ?? "",
      skills: profile.studentProfile?.skills ?? "",
      githubUrl: profile.studentProfile?.githubUrl ?? "",
      linkedinUrl: profile.studentProfile?.linkedinUrl ?? "",
      bio: profile.studentProfile?.bio ?? "",
    });
  }, [profile?.uid]);

  if (me.isLoading) return <div className="p-10 font-body text-[#52675d]">Loading…</div>;
  if (!profile) return <div className="p-10">Not signed in</div>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { updateUserProfile } = await import("@/lib/userProfile");
      const sp: Record<string, any> = {
        department: form.department.trim(),
        programme: form.programme.trim(),
        year: form.year.trim(),
        onboardingCompleted: true,
      };
      if (form.semester.trim()) sp.semester = form.semester.trim();
      if (form.skills.trim()) sp.skills = form.skills.trim();
      if (form.githubUrl.trim()) sp.githubUrl = form.githubUrl.trim();
      if (form.linkedinUrl.trim()) sp.linkedinUrl = form.linkedinUrl.trim();
      if (form.bio.trim()) sp.bio = form.bio.trim();
      await updateUserProfile(auth.currentUser!, { name: form.name.trim() || undefined, phone: form.phone.trim() || undefined, studentProfile: sp as any } as any);
      toast.success("Profile updated");
      await me.refetch();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#f1eadc] text-[#0d3024]" style={{ backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}>
      <InstituteHeader active="Profile" />
      <section className="mx-auto max-w-[48rem] px-6 py-10 sm:px-10">
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">Student profile</p>
        <h1 className="mt-2 font-display text-[2.4rem] leading-none">Your profile.</h1>
        <p className="mt-2 font-body text-[0.8rem] text-[#5d7067]">{org?.name ?? "—"} · <span className="font-mono-ui text-[0.6rem] uppercase tracking-[0.08em]">{profile.memberRole}</span> · {profile.email}</p>
        <form onSubmit={save} className="mt-8 grid gap-5 rounded-2xl border border-[#a58c6d]/40 bg-white/60 p-6 sm:p-8">
          <Field label="Full name" value={form.name} onChange={v=>setForm(s=>({...s,name:v}))} />
          <Field label="Phone" value={form.phone} onChange={v=>setForm(s=>({...s,phone:v}))} placeholder="Optional" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Department *" value={form.department} onChange={v=>setForm(s=>({...s,department:v}))} placeholder="CSE" />
            <Field label="Programme *" value={form.programme} onChange={v=>setForm(s=>({...s,programme:v}))} placeholder="B.Tech" />
            <Field label="Year *" value={form.year} onChange={v=>setForm(s=>({...s,year:v}))} placeholder="3rd Year" />
            <Field label="Semester" value={form.semester} onChange={v=>setForm(s=>({...s,semester:v}))} placeholder="Sem 6" />
          </div>
          <Field label="Skills" value={form.skills} onChange={v=>setForm(s=>({...s,skills:v}))} placeholder="React, GIS, AutoCAD" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GitHub" value={form.githubUrl} onChange={v=>setForm(s=>({...s,githubUrl:v}))} placeholder="https://github.com/..." type="url" />
            <Field label="LinkedIn" value={form.linkedinUrl} onChange={v=>setForm(s=>({...s,linkedinUrl:v}))} placeholder="https://linkedin.com/in/..." type="url" />
          </div>
          <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">Bio</span><textarea value={form.bio} onChange={e=>setForm(s=>({...s,bio:e.target.value}))} className="citizen-input mt-3 min-h-[5rem]" placeholder="One line about you" /></label>
          <div className="flex justify-end"><button disabled={saving} className="rounded-full bg-[#16422f] px-6 py-3 font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60">{saving?"Saving…":"Save profile"}</button></div>
        </form>
      </section>
    </main>
  );
}
function Field({ label, value, onChange, placeholder, type="text" }: { label: string; value: string; onChange: (v:string)=>void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} className="citizen-input mt-3" /></label>;
}
