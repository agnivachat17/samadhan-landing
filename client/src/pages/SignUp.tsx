/**
 * Style: Samadhan civic editorial sign-up with distinct, publicly reviewable role pathways.
 */
import AuthLayout from "@/components/AuthLayout";
import { signInWithFacebook, signInWithGoogle, signUpWithEmail } from "@/lib/firebase";
import { trpc } from "@/lib/trpc";
import { BriefcaseBusiness, Building2, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type JoinRole = "citizen" | "institution" | "industry";

const roleCopy: Record<JoinRole, { title: string; description: string; next: string }> = {
  citizen: { title: "Citizen", description: "Report and follow local challenges", next: "Create citizen account" },
  institution: { title: "Institute", description: "Contribute faculty, students, and facilities", next: "Continue to institute application" },
  industry: { title: "Industry", description: "Offer CSR, capability, and deployment support", next: "Continue to industry application" },
};

function firebaseErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use") return "An account already exists with this email. Try logging in instead.";
  if (code === "auth/weak-password") return "Please choose a password with at least 8 characters.";
  if (code === "auth/popup-closed-by-user") return "";
  return "Something went wrong while creating your account. Please try again.";
}

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<JoinRole>("citizen");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const bootstrapProfile = trpc.auth.bootstrapProfile.useMutation();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("firstName") ?? "").trim();
    const lastName = String(data.get("lastName") ?? "").trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const district = String(data.get("district") ?? "").trim();

    try {
      await signUpWithEmail(email, password, fullName);
      await bootstrapProfile.mutateAsync({ role, name: fullName, district: role === "citizen" ? district : undefined });
      setLocation(role === "citizen" ? "/citizen/dashboard" : `/onboarding/${role}`);
    } catch (issue) {
      setError(firebaseErrorMessage(issue));
    } finally {
      setPending(false);
    }
  }

  async function withSocial(fn: () => Promise<unknown>) {
    setError("");
    setPending(true);
    try {
      await fn();
      await bootstrapProfile.mutateAsync({ role: "citizen" });
      setLocation("/citizen/dashboard");
    } catch (issue) {
      setError(firebaseErrorMessage(issue));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Create an account"
      title="Be part of the solution."
      description="Choose your role in the Samadhan network. Citizen participation begins with a challenge; institutions and industry partners continue to a verified organization profile."
      footer={<p className="font-body text-[0.82rem] text-[#436056]">Already registered? <a href="/login" className="font-semibold text-[#b4401d] underline decoration-[#b4401d]/45 underline-offset-4 transition-colors hover:text-[#062f22]">Log in to your account</a>.</p>}
    >
      <form onSubmit={submit} className="space-y-6">
        <fieldset>
          <legend className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#25463a]">I&apos;m joining as</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <AccountPathCard active={role === "citizen"} onClick={() => setRole("citizen")} icon={<UserRound size={18} strokeWidth={1.45} />} {...roleCopy.citizen} />
            <AccountPathCard active={role === "institution"} onClick={() => setRole("institution")} icon={<Building2 size={18} strokeWidth={1.45} />} {...roleCopy.institution} />
            <AccountPathCard active={role === "industry"} onClick={() => setRole("industry")} icon={<BriefcaseBusiness size={18} strokeWidth={1.45} />} {...roleCopy.industry} />
          </div>
        </fieldset>

        <div className="border-y border-[#a88d67]/40 py-5 font-body text-[0.79rem] leading-relaxed text-[#496258]">
          {role === "citizen" ? "Use a personal email and your home district so your reports can be routed to the right local context." : role === "institution" ? "Your institute application includes official contacts, academic capabilities, and the team that will manage faculty and students." : "Your industry application records the decision-makers, support modes, impact priorities, and capacity needed to match responsible partnerships."}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="First name" input={<input required name="firstName" autoComplete="given-name" placeholder="Your first name" className="auth-input" />} />
          <FormField label="Last name" input={<input required name="lastName" autoComplete="family-name" placeholder="Your last name" className="auth-input" />} />
        </div>
        <FormField label="Email address" input={<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" className="auth-input" />} />
        {role === "citizen" && <FormField label="District" input={<input required name="district" placeholder="e.g., Ranchi" className="auth-input" />} />}
        <FormField label="Password" helper="At least 8 characters" input={<input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Create a secure password" className="auth-input" />} />

        <label className="flex items-start gap-3 pt-1 font-body text-[0.72rem] leading-relaxed text-[#436056]">
          <input type="checkbox" required className="mt-0.5 size-4 accent-[#d84a1b]" />
          <span>I agree to Samadhan&apos;s <a href="#top" className="underline underline-offset-2">terms of use</a> and <a href="#top" className="underline underline-offset-2">privacy policy</a>.</span>
        </label>
        {error && <p role="alert" className="font-body text-[0.78rem] text-[#b44929]">{error}</p>}
        <button disabled={pending} type="submit" className="w-full bg-[#d84a1b] px-6 py-4 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_25px_rgba(124,42,13,0.17)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e45627] active:translate-y-0 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70">{pending ? "Creating account…" : roleCopy[role].next}</button>
      </form>

      {role === "citizen" && (
        <>
          <div className="mt-6 flex items-center gap-3 font-mono-ui text-[0.6rem] uppercase tracking-[0.14em] text-[#8a9a90]"><span className="h-px flex-1 bg-[#a88d67]/40" />Or continue with<span className="h-px flex-1 bg-[#a88d67]/40" /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" disabled={pending} onClick={() => withSocial(signInWithGoogle)} className="border border-[#a88d67]/55 px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#214234] transition hover:bg-[#f5ede1] disabled:opacity-60">Google</button>
            <button type="button" disabled={pending} onClick={() => withSocial(signInWithFacebook)} className="border border-[#a88d67]/55 px-4 py-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#214234] transition hover:bg-[#f5ede1] disabled:opacity-60">Facebook</button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}

function AccountPathCard({ active, onClick, icon, title, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string }) {
  return <button type="button" onClick={onClick} className={`min-h-[8.4rem] border p-4 text-left transition duration-200 ${active ? "border-[#d84a1b] bg-[#f8eee0] shadow-[inset_3px_0_0_#d84a1b]" : "border-[#a88d67]/55 bg-[#f7f0e5]/45 hover:border-[#6a856e] hover:bg-[#f8f2e8]"}`}><span className={active ? "text-[#d84a1b]" : "text-[#355548]"}>{icon}</span><span className="mt-3 block font-display text-[1.45rem] leading-none">{title}</span><span className="mt-1 block font-body text-[0.66rem] leading-snug text-[#4b655b]">{description}</span></button>;
}

function FormField({ label, input, helper }: { label: string; input: React.ReactNode; helper?: string }) {
  return <label className="block"><span className="flex items-baseline justify-between font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">{label}{helper && <em className="font-body text-[0.66rem] normal-case tracking-normal text-[#6d8177]">{helper}</em>}</span><span className="mt-2 block">{input}</span></label>;
}
