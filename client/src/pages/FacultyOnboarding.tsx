import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { auth } from "@/lib/firebase";
import InstituteHeader from "@/components/InstituteHeader";

export default function FacultyOnboarding() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const me = trpc.auth.me.useQuery();
  const profile = me.data as any;
  const [saving, setSaving] = useState(false);

  // On mount: read invite from localStorage and link user to org
  useEffect(() => {
    const raw = localStorage.getItem("samadhan-invite");
    if (!raw || !auth.currentUser) return;
    try {
      const inv = JSON.parse(raw);
      if (inv.role !== "faculty") return;
      (async () => {
        const { loadOrCreateProfile, updateUserProfile } = await import("@/lib/userProfile");
        await loadOrCreateProfile(auth.currentUser!);
        await updateUserProfile(auth.currentUser!, {
          role: "institution" as any,
          memberRole: "faculty" as any,
          organizationId: inv.orgId,
          name: inv.name,
        } as any);
        try {
          const { consumeInvite } = await import("@/lib/db");
          await consumeInvite(inv.token, auth.currentUser!.uid);
        } catch {}
        localStorage.removeItem("samadhan-invite");
        window.location.reload();
      })();
    } catch {}
  }, []);

  const [form, setForm] = useState({
    department: profile?.facultyProfile?.department ?? "",
    designation: profile?.facultyProfile?.designation ?? "",
    expertise: profile?.facultyProfile?.expertise ?? "",
    mentorAvailable: profile?.facultyProfile?.mentorAvailable ?? false,
    bio: profile?.facultyProfile?.bio ?? "",
  });

  useEffect(() => {
    if (profile?.facultyProfile) {
      setForm({
        department: profile.facultyProfile.department ?? "",
        designation: profile.facultyProfile.designation ?? "",
        expertise: profile.facultyProfile.expertise ?? "",
        mentorAvailable: profile.facultyProfile.mentorAvailable ?? false,
        bio: profile.facultyProfile.bio ?? "",
      });
    }
  }, [profile?.facultyProfile?.department]);

  if (me.isLoading) return <div className="p-10 font-body text-[#52675d]">Loading…</div>;
  // Never block on orgId — linking runs in background, form should always show on onboarding

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.department.trim() || !form.designation.trim()) {
      toast.error("Department and designation are required"); return;
    }
    setSaving(true);
    try {
      const { updateUserProfile } = await import("@/lib/userProfile");
      const fp: Record<string, any> = {
        department: form.department.trim(),
        designation: form.designation.trim(),
        mentorAvailable: form.mentorAvailable,
        onboardingCompleted: true,
      };
      if (form.expertise.trim()) fp.expertise = form.expertise.trim();
      if (form.bio.trim()) fp.bio = form.bio.trim();
      await updateUserProfile(auth.currentUser!, { facultyProfile: fp as any } as any);
      // Sync to organizationMembers
      try {
        const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = await import("firebase/firestore");
        const { firebaseApp } = await import("@/lib/firebase");
        const db = getFirestore(firebaseApp);
        const orgId = profile?.organizationId;
        const email = auth.currentUser?.email;
        if (orgId && email) {
          const q = query(collection(db, "organizationMembers"), where("organizationId", "==", orgId), where("email", "==", email));
          const snap = await getDocs(q);
          for (const d of snap.docs) {
            await updateDoc(doc(db, "organizationMembers", d.id), {
              department: fp.department,
              designation: fp.designation,
              expertise: fp.expertise ?? null,
              mentorAvailable: fp.mentorAvailable,
              updatedAt: new Date(),
            });
          }
        }
      } catch {}
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
        <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">Faculty onboarding</p>
        <h1 className="mt-2 font-display text-[2.6rem] leading-none">Complete your profile.</h1>
        <p className="mt-2 font-body text-[0.84rem] text-[#52675d]">Added by <span className="font-semibold">{profile?.email}</span> as faculty. Your institute admin invited you — fill the rest so students and admin can see your expertise.</p>
        {!profile?.facultyProfile?.onboardingCompleted && <p className="mt-2 font-mono-ui text-[0.62rem] text-amber-700">This is required once — you can edit later from the dashboard.</p>}
        <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-[#a58c6d]/40 bg-white/60 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Department *" value={form.department} onChange={v => setForm(s => ({ ...s, department: v }))} placeholder="CSE / Civil / ECE" />
            <Field label="Designation *" value={form.designation} onChange={v => setForm(s => ({ ...s, designation: v }))} placeholder="Assistant Professor / HOD" />
          </div>
          <Field label="Expertise" value={form.expertise} onChange={v => setForm(s => ({ ...s, expertise: v }))} placeholder="water systems, GIS, survey design — comma separated" />
          <label className="flex items-center gap-3 border border-[#9a876c]/55 px-4 py-3 font-body text-[0.8rem] text-[#365649]">
            <input type="checkbox" checked={form.mentorAvailable} onChange={e => setForm(s => ({ ...s, mentorAvailable: e.target.checked }))} className="size-4 accent-[#c94a20]" />
            Available to mentor Samadhan teams
          </label>
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

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em]">{label}</span><input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="citizen-input mt-3" /></label>;
}
