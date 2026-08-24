/**
 * Style: Samadhan civic editorial sign-up with distinct, publicly reviewable role pathways.
 */
import AuthLayout from "@/components/AuthLayout";
import { BriefcaseBusiness, Building2, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

type JoinRole = "citizen" | "institution" | "industry";

const roleCopy: Record<JoinRole, { title: string; description: string; next: string }> = {
  citizen: { title: "Citizen", description: "Report and follow local challenges", next: "Continue as citizen" },
  institution: { title: "Institute", description: "Contribute faculty, students, and facilities", next: "Continue to institute application" },
  industry: { title: "Industry", description: "Offer CSR, capability, and deployment support", next: "Continue to industry application" },
};

export default function SignUp() {
  const [, setLocation] = useLocation();
  const [role, setRole] = useState<JoinRole>("citizen");
  const [citizenReady, setCitizenReady] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role === "citizen") {
      setCitizenReady(true);
      return;
    }
    setLocation(`/onboarding/${role}`);
  }

  if (citizenReady) {
    return (
      <AuthLayout
        eyebrow="Citizen pathway prepared"
        title="Start with the issue that matters."
        description="Your citizen pathway is ready for public review. You can now submit a local challenge or explore the current challenge directory."
        footer={<p className="font-body text-[0.82rem] text-[#436056]">Want to join in another capacity? <a href="/signup" className="font-semibold text-[#b4401d] underline decoration-[#b4401d]/45 underline-offset-4">Choose a different pathway</a>.</p>}
      >
        <div className="space-y-4">
          <a href="/citizen/submit" className="block w-full bg-[#d84a1b] px-6 py-4 text-center font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_25px_rgba(124,42,13,0.17)] transition hover:-translate-y-0.5 hover:bg-[#e45627] active:scale-[0.98]">Report a challenge</a>
          <a href="/challenges" className="block w-full border border-[#718372]/60 px-6 py-4 text-center font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[#214234] transition hover:bg-[#f5ede1]">Explore challenges</a>
        </div>
      </AuthLayout>
    );
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
          <FormField label="First name" input={<input required autoComplete="given-name" placeholder="Your first name" className="auth-input" />} />
          <FormField label="Last name" input={<input required autoComplete="family-name" placeholder="Your last name" className="auth-input" />} />
        </div>
        <FormField label="Email address" input={<input required type="email" autoComplete="email" placeholder="you@example.com" className="auth-input" />} />
        {role === "citizen" && <FormField label="District" input={<input required placeholder="e.g., Ranchi" className="auth-input" />} />}
        <FormField label="Password" helper="At least 8 characters" input={<input required type="password" minLength={8} autoComplete="new-password" placeholder="Create a secure password" className="auth-input" />} />

        <label className="flex items-start gap-3 pt-1 font-body text-[0.72rem] leading-relaxed text-[#436056]">
          <input type="checkbox" required className="mt-0.5 size-4 accent-[#d84a1b]" />
          <span>I agree to Samadhan&apos;s <a href="#top" className="underline underline-offset-2">terms of use</a> and <a href="#top" className="underline underline-offset-2">privacy policy</a>.</span>
        </label>
        <button type="submit" className="w-full bg-[#d84a1b] px-6 py-4 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_25px_rgba(124,42,13,0.17)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e45627] active:translate-y-0 active:scale-[0.98]">{roleCopy[role].next}</button>
      </form>
    </AuthLayout>
  );
}

function AccountPathCard({ active, onClick, icon, title, description }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string }) {
  return <button type="button" onClick={onClick} className={`min-h-[8.4rem] border p-4 text-left transition duration-200 ${active ? "border-[#d84a1b] bg-[#f8eee0] shadow-[inset_3px_0_0_#d84a1b]" : "border-[#a88d67]/55 bg-[#f7f0e5]/45 hover:border-[#6a856e] hover:bg-[#f8f2e8]"}`}><span className={active ? "text-[#d84a1b]" : "text-[#355548]"}>{icon}</span><span className="mt-3 block font-display text-[1.45rem] leading-none">{title}</span><span className="mt-1 block font-body text-[0.66rem] leading-snug text-[#4b655b]">{description}</span></button>;
}

function FormField({ label, input, helper }: { label: string; input: React.ReactNode; helper?: string }) {
  return <label className="block"><span className="flex items-baseline justify-between font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]">{label}{helper && <em className="font-body text-[0.66rem] normal-case tracking-normal text-[#6d8177]">{helper}</em>}</span><span className="mt-2 block">{input}</span></label>;
}
