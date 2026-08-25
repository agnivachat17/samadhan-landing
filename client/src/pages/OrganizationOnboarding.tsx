/**
 * Style: Samadhan organization onboarding — a public archival-paper application that changes
 * substantively for academic institutions and industry impact partners, followed by a live,
 * animated verification-status experience driven entirely by server state.
 */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { OrganizationStatus, OrganizationStatusLoading, type OrganizationKind } from "@/components/OrganizationStatus";
import { FileCheck2, Landmark, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const value = (data: FormData, name: string) => String(data.get(name) ?? "").trim() || undefined;

export default function OrganizationOnboarding() {
  const [, params] = useRoute("/onboarding/:kind");
  const routeKind: OrganizationKind = params?.kind === "industry" ? "industry" : "institution";
  const me = trpc.auth.me.useQuery();
  // Trust the account's actual role over the URL — an institution account
  // landing on /onboarding/industry (or vice-versa) still sees its own kind.
  const kind: OrganizationKind = me.data?.role === "industry" ? "industry" : routeKind;

  if (me.isLoading) return <OnboardingShell><OrganizationStatusLoading /></OnboardingShell>;

  if (me.data?.organizationId) {
    return (
      <OnboardingShell>
        <OrganizationStatus kind={kind} organizationId={me.data.organizationId} />
      </OnboardingShell>
    );
  }

  return (
    <OnboardingShell>
      <OnboardingForm kind={kind} />
    </OnboardingShell>
  );
}

function OnboardingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f1eadc] text-[#0d3024]" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}>
      <PublicPortalHeader />
      {children}
    </main>
  );
}

function OnboardingForm({ kind }: { kind: OrganizationKind }) {
  const utils = trpc.useUtils();
  const [error, setError] = useState("");
  const mutation = trpc.workflow.organizationOnboard.useMutation({
    onSuccess: async () => { await utils.auth.me.invalidate(); },
    onError: (issue) => setError(issue.message),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    mutation.mutate({
      kind,
      name: value(data, "name") ?? "",
      contactName: value(data, "contactName") ?? "",
      contactEmail: value(data, "contactEmail") ?? "",
      contactPhone: value(data, "contactPhone"),
      website: value(data, "website"),
      institutionType: value(data, "organizationType"),
      sector: value(data, "sector"),
      registrationNumber: value(data, "registrationNumber"),
      location: value(data, "location"),
      overview: value(data, "overview"),
      departments: value(data, "departments"),
      expertise: value(data, "expertise"),
      facilities: value(data, "facilities"),
      impactLeadName: value(data, "impactLeadName"),
      impactLeadEmail: value(data, "impactLeadEmail"),
      supportModes: value(data, "supportModes"),
      priorityDomains: value(data, "priorityDomains"),
      geographyFocus: value(data, "geographyFocus"),
      capacityBand: value(data, "capacityBand"),
      preferredStage: value(data, "preferredStage"),
      csrPolicyUrl: value(data, "csrPolicyUrl"),
      complianceAccepted: data.get("complianceAccepted") === "on",
    });
  }

  const isInstitution = kind === "institution";
  return <section className="px-6 py-10 sm:px-10 lg:py-14"><div className="mx-auto max-w-[58rem]"><div className="text-center"><p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-[#c64b22]">{isInstitution ? "Institution application" : "Industry impact-partner application"}</p><h1 className="mt-5 font-display text-[3.7rem] leading-[0.86] tracking-[-0.04em] sm:text-[5rem]">{isInstitution ? "Build your campus response team." : "Put your capability behind community solutions."}</h1><p className="mx-auto mt-5 max-w-[43rem] font-body text-[0.9rem] leading-relaxed text-[#53675d]">{isInstitution ? "Give Samadhan a complete view of your academic strengths, official contacts, facilities, and collaboration capacity." : "Tell us how your organization can contribute funding, expertise, pilots, equipment, market access, or people to civic innovation."}</p></div><form onSubmit={submit} className="mt-9 border border-[#a58c6d]/55 bg-[#f8f2e8]/25 p-6 sm:p-9"><section><SectionLabel number="01" title="Organization identity" /><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label={isInstitution ? "Official institution name" : "Legal business / organization name"} name="name" required /><SelectField label="Organization type" name="organizationType" required options={isInstitution ? ["University", "Technical institute", "Research center", "College", "Incubation center", "Nonprofit organization"] : ["Private limited company", "Public company", "Social enterprise", "Foundation", "Startup", "Industry association"]} /></div><div className="mt-5 grid gap-5 sm:grid-cols-2">{isInstitution ? <Field label="Affiliation, accreditation, or registration ID" name="registrationNumber" required /> : <><SelectField label="Industry sector" name="sector" required options={["Technology", "Manufacturing", "Mining & metals", "Energy", "Healthcare", "Agriculture", "Financial services", "Infrastructure", "Other"]} /><Field label="Registration / CSR identifier" name="registrationNumber" required /></>}<Field label={isInstitution ? "Campus address and district" : "Registered office and operating geography"} name="location" required /></div></section><section className="mt-9"><SectionLabel number="02" title="Official point of contact" /><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Authorized contact name" name="contactName" required /><Field label="Official email address" name="contactEmail" type="email" required /></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Contact number" name="contactPhone" type="tel" required /><Field label="Organization website" name="website" type="url" placeholder="https://" required /></div>{!isInstitution && <div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="CSR / impact lead name" name="impactLeadName" required /><Field label="CSR / impact lead email" name="impactLeadEmail" type="email" required /></div>}</section><section className="mt-9"><SectionLabel number="03" title={isInstitution ? "Academic capability and readiness" : "Impact capability and commitment"} /><div className="mt-5"><TextArea label="Organization overview" name="overview" required /></div>{isInstitution ? <><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Departments or schools" name="departments" placeholder="Comma-separated" required /><Field label="Expertise and research strengths" name="expertise" placeholder="Comma-separated" required /></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Labs, facilities, or equipment" name="facilities" placeholder="e.g., fabrication lab, field unit" required /><Field label="Ways your campus can collaborate" name="supportModes" placeholder="e.g., faculty mentorship, student teams" required /></div><FieldGroup className="mt-5"><Field label="Preferred challenge domains" name="priorityDomains" placeholder="e.g., water, health, livelihoods" required /></FieldGroup></> : <><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Technical expertise or in-kind capability" name="expertise" placeholder="e.g., GIS, product design, supply chain" required /><Field label="Support modes" name="supportModes" placeholder="e.g., funding, mentoring, pilot deployment" required /></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="Priority social-impact domains" name="priorityDomains" placeholder="e.g., livelihoods, water, education" required /><Field label="Geographic focus" name="geographyFocus" placeholder="e.g., Jharkhand, mining-affected districts" required /></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><SelectField label="Indicative support capacity" name="capacityBand" required options={["Up to ₹1 lakh", "₹1–5 lakh", "₹5–25 lakh", "₹25 lakh+", "In-kind / expert support only"]} /><SelectField label="Preferred engagement stage" name="preferredStage" required options={["Problem validation", "Solution design", "Prototype development", "Pilot deployment", "Market linkage / scale"]} /></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><Field label="CSR or impact policy URL" name="csrPolicyUrl" type="url" placeholder="https:// (optional)" /><Field label="Facilities or resources available" name="facilities" placeholder="e.g., testing, training, equipment" /></div></>}</section><section className="mt-9 border-t border-[#a58c6d]/45 pt-6"><div className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-[#42684b]" size={20} /><label className="font-body text-[0.75rem] leading-relaxed text-[#53675d]"><input required name="complianceAccepted" type="checkbox" className="mr-3 size-4 align-text-top accent-[#c94a20]" />I confirm that I am authorized to submit this information and that it is accurate. I understand that Samadhan may review the organization before matching it with challenges or projects.</label></div></section>{error && <p role="alert" className="mt-5 font-body text-[0.78rem] text-[#b44929]">{error}</p>}<button disabled={mutation.isPending} type="submit" className="mt-7 flex w-full items-center justify-center gap-2 bg-[#c94a20] px-6 py-5 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#dc5729] disabled:cursor-wait disabled:opacity-70"><Landmark size={17} />{mutation.isPending ? "Recording application…" : "Submit for verification"}</button><p className="mt-4 flex items-start gap-2 font-body text-[0.71rem] leading-relaxed text-[#61746a]"><FileCheck2 className="mt-0.5 shrink-0" size={15} />Documents are verified by the administration after submission; no sensitive financial-account details are requested in this public-review stage.</p></form></div></section>;
}

function SectionLabel({ number, title }: { number: string; title: string }) { return <p className="flex items-center gap-3 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#25463a]"><span className="grid size-6 place-items-center bg-[#16422f] text-[0.56rem] text-white">{number}</span>{title}</p>; }
function FieldGroup({ className, children }: { className?: string; children: React.ReactNode }) { return <div className={className}>{children}</div>; }
function Field({ label, name, type = "text", required, placeholder }: { label: string; name: string; type?: string; required?: boolean; placeholder?: string }) { return <label className="block"><span className="font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.12em]">{label}</span><input required={required} name={name} type={type} placeholder={placeholder} className="citizen-input mt-2" /></label>; }
function SelectField({ label, name, options, required }: { label: string; name: string; options: string[]; required?: boolean }) { return <label className="block"><span className="font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.12em]">{label}</span><select required={required} name={name} defaultValue="" className="citizen-input mt-2"><option value="" disabled>Select an option</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></label>; }
function TextArea({ label, name, required }: { label: string; name: string; required?: boolean }) { return <label className="block"><span className="font-mono-ui text-[0.61rem] font-semibold uppercase tracking-[0.12em]">{label}</span><textarea required={required} name={name} className="citizen-input mt-2 min-h-[7rem] resize-y" /></label>; }
