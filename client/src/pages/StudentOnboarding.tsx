import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { auth } from "@/lib/firebase";
import InstituteHeader from "@/components/InstituteHeader";

export default function StudentOnboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery();
  const profile = me.data as any;
  const isStudent = profile?.memberRole === "student";
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    department: profile?.studentProfile?.department ?? "",
    programme: profile?.studentProfile?.programme ?? "",
    year: profile?.studentProfile?.year ?? "",
    semester: profile?.studentProfile?.semester ?? "",
    skills: profile?.studentProfile?.skills ?? "",
    githubUrl: profile?.studentProfile?.githubUrl ?? "",
    linkedinUrl: profile?.studentProfile?.linkedinUrl ?? "",
    bio: profile?.studentProfile?.bio ?? "",
  });

  useEffect(() => {
    if (profile?.studentProfile) {
      setForm({
        department: profile.studentProfile.department ?? "",
        programme: profile.studentProfile.programme ?? "",
        year: profile.studentProfile.year ?? "",
        semester: profile.studentProfile.semester ?? "",
        skills: profile.studentProfile.skills ?? "",
        githubUrl: profile.studentProfile.githubUrl ?? "",
        linkedinUrl: profile.studentProfile.linkedinUrl ?? "",
        bio: profile.studentProfile.bio ?? "",
      });
    }
  }, [profile?.studentProfile?.department, profile?.studentProfile?.programme]);

  if (me.isLoading) return <div className="p-10 font-body text-[#52675d]">Loading…</div>;
  if (!profile?.organizationId) return <div className="p-10">No organization linked. Ask your institute admin for a fresh invite.</div>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.department.trim() || !form.programme.trim() || !form.year.trim()) {
      toast.error("Department, programme and year are required"); return;
    }
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
      await updateUserProfile(auth.currentUser!, { studentProfile: sp as any } as any);
      // Sync to organizationMembers so Institute → Students Directory card shows the same data
      try {
        const { getFirestore, collection, query, where, getDocs, doc, setDoc } = await import("firebase/firestore");
        const { firebaseApp } = await import("@/lib/firebase");
        const db2 = getFirestore(firebaseApp);
        const orgId = (profile as any)?.organizationId;
        const email = auth.currentUser?.email?.toLowerCase();
        if (orgId && email) {
          const q = query(collection(db2, "organizationMembers"), where("organizationId", "==", orgId), where("email", "==", email));
          // also try case-sensitive fallback
          let snap = await getDocs(q);
          if (snap.empty) {
            const q2 = query(collection(db2, "organizationMembers"), where("organizationId", "==", orgId), where("email", "==", auth.currentUser?.email));
            snap = await getDocs(q2);
          }
          for (const d of snap.docs) {
            await setDoc(doc(db2, "organizationMembers", d.id), {
              department: sp.department,
              program: sp.programme,
              academicYear: sp.year + (sp.semester ? ` / ${sp.semester}` : ""),
              skills: sp.skills ?? null,
              updatedAt: new Date(),
            } as any, { merge: true });
          }
        }
      } catch (e) { console.warn("orgMembers sync failed", e); }
      toast.success("Profile saved", { description: "Your institute admin can now see your details." });
      setLocation("/institute/dashboard");
    } catch (err: any) {
      toast.error("Save failed", { description: err.message });
    } finally { setSaving(false); }
  }

  return (
    <main className="min-h-screen bg-[#f1eadc] text-[#0d3024]" style={{ backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}>
      <InstituteHeader active="Profile" />
      <section className="mx-auto max-w-[52rem] px-6 py-10 sm:px-10">
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">Student onboarding</p>
        <h1 className="mt-2 font-display text-[2.6rem] leading-none">Complete your profile.</h1>
        <p className="mt-2 font-body text-[0.84rem] text-[#52675d]">Added by <span className="font-semibold">{profile?.email}</span> as {isStudent ? "student" : "member"}. Your institute admin invited you with just email + name — fill the rest so they can assign you to projects.</p>
        {!profile?.studentProfile?.onboardingCompleted && <p className="mt-2 font-mono-ui text-[0.62rem] text-amber-700">This is required once — you can edit later from the dashboard.</p>}
        <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-[#a58c6d]/40 bg-white/60 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Department" value={form.department} onChange={v => setForm(s => ({ ...s, department: v }))} placeholder="CSE / Civil / ECE" required />
            <Field label="Programme" value={form.programme} onChange={v => setForm(s => ({ ...s, programme: v }))} placeholder="B.Tech / M.Tech / Diploma" required />
            <Field label="Year" value={form.year} onChange={v => setForm(s => ({ ...s, year: v }))} placeholder="2nd Year / 3rd Year / Final" required />
            <Field label="Semester" value={form.semester} onChange={v => setForm(s => ({ ...s, semester: v }))} placeholder="Sem 5 / Sem 6" />
          </div>
          <Field label="Skills" value={form.skills} onChange={v => setForm(s => ({ ...s, skills: v }))} placeholder="React, GIS, Survey design, AutoCAD — comma separated" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="GitHub link" value={form.githubUrl} onChange={v => setForm(s => ({ ...s, githubUrl: v }))} placeholder="https://github.com/..." type="url" />
            <Field label="LinkedIn (optional)" value={form.linkedinUrl} onChange={v => setForm(s => ({ ...s, linkedinUrl: v }))} placeholder="https://linkedin.com/in/..." type="url" />
          </div>
          <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">About you (optional)</span><textarea value={form.bio} onChange={e => setForm(s => ({ ...s, bio: e.target.value }))} placeholder="One line about your interests…" className="citizen-input mt-3 min-h-[5rem]" /></label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setLocation("/institute/dashboard")} className="rounded-full border border-[#9a876c]/55 px-5 py-3 font-mono-ui text-[0.61rem] uppercase tracking-[0.1em]">Skip for now</button>
            <button disabled={saving} className="rounded-full bg-[#16422f] px-7 py-3 font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.1em] text-white disabled:opacity-60">{saving ? "Saving…" : "Save and continue"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">{label}{required && " *"}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required} className="citizen-input mt-3" /></label>;
}
