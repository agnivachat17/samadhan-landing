/**
 * Style: Reference-matched civic editorial — waterfall photograph, forest overlay,
 * ivory serif display type, monospaced utility labels, and ember action accents.
 */
import { ArrowDown, ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import AccountMenu from "@/components/AccountMenu";

const navigation = ["Home", "Challenges", "Projects", "Institutions"];

const navigationHref: Record<(typeof navigation)[number], string> = {
  Home: "#top",
  Challenges: "/challenges",
  Projects: "#process",
  Institutions: "/institute/dashboard",
};

const heroImage = "/manus-storage/lodh-waterfalls-ranchi-jharkhand-3-attr-hero_3a3477cd.jpeg";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen overflow-hidden bg-[#f1eadc] text-[#f6f1e5]">
      <section className="relative isolate min-h-[100svh] overflow-hidden bg-[#07271e] md:min-h-[100svh]">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center transform-gpu scale-x-[-1] motion-safe:transition-transform motion-safe:duration-[1600ms]"
          style={{ backgroundImage: `url(${heroImage})`, backgroundPosition: "48% 45%" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(1,30,20,0.93)_0%,rgba(2,37,26,0.77)_34%,rgba(1,20,14,0.26)_75%,rgba(1,15,11,0.50)_100%),linear-gradient(0deg,rgba(0,39,27,0.91)_0%,rgba(0,33,24,0.1)_48%,rgba(1,21,15,0.15)_100%)]"
          aria-hidden="true"
        />

        <header className="relative z-20 px-6 pt-6 md:px-12 lg:px-[3.35rem] lg:pt-6">
          <div className="flex min-h-[68px] items-center justify-between border-b border-[#f7f2e6]/25 pb-[1.2rem]">
            <a href="#top" className="font-display text-[2rem] leading-none tracking-[0.015em] text-[#f7f2e6] transition-opacity duration-200 hover:opacity-75 sm:text-[2.35rem]">
              SAMADHAN
            </a>

            <nav className="hidden items-center gap-10 lg:flex" aria-label="Primary navigation">
              {navigation.map((item) => (
                <a
                  key={item}
                  href={navigationHref[item]}
                  className="group relative font-mono-ui text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#f6f0e4] transition-colors duration-200 hover:text-[#d3ddba]"
                >
                  {item}
                  <span className="absolute -bottom-[0.32rem] left-0 h-px w-0 bg-[#d8dfbc] transition-all duration-200 group-hover:w-full" />
                </a>
              ))}
            </nav>

            <AccountMenu variant="dark" loggedOutLabel="Sign up" loggedOutHref="/signup" className="hidden md:flex" />

            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex size-11 items-center justify-center border border-[#f7f2e6]/35 text-[#f7f2e6] transition duration-200 hover:bg-[#f7f2e6]/10 active:scale-[0.97] lg:hidden"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={21} strokeWidth={1.5} /> : <Menu size={22} strokeWidth={1.5} />}
            </button>
          </div>

          {menuOpen && (
            <nav className="absolute left-6 right-6 top-[5.9rem] border border-[#f7f2e6]/20 bg-[#05251a]/95 p-5 shadow-2xl backdrop-blur-md lg:hidden" aria-label="Mobile navigation">
              <div className="grid gap-3">
                {navigation.map((item) => (
                  <a
                    key={item}
                    href={navigationHref[item]}
                    onClick={() => setMenuOpen(false)}
                    className="border-b border-[#f7f2e6]/15 py-2 font-mono-ui text-xs uppercase tracking-[0.14em] text-[#f7f2e6] last:border-none"
                  >
                    {item}
                  </a>
                ))}
                <AccountMenu variant="dark" loggedOutLabel="Sign up" loggedOutHref="/signup" className="mt-2 [&>a]:w-full [&>a]:text-center" />
              </div>
            </nav>
          )}
        </header>

        <div id="top" className="relative z-10 flex min-h-[calc(100svh-92px)] flex-col justify-end px-6 pb-12 pt-20 md:min-h-[calc(100svh-92px)] md:px-12 md:pb-16 lg:px-[3.45rem] lg:pb-16 xl:pb-[4rem]">
          <div className="max-w-[70rem] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
            <p className="mb-5 font-mono-ui text-[0.65rem] font-medium uppercase tracking-[0.18em] text-[#f1eee6] sm:text-[0.7rem] lg:mb-6 lg:text-[0.78rem]">
              Government of Jharkhand <span className="mx-1.5 text-[#cae0b4]">·</span> Civic Innovation
            </p>
            <h1 className="max-w-[68rem] font-display text-[3.3rem] font-medium leading-[0.86] tracking-[-0.027em] text-[#f6f0e4] sm:text-[4.5rem] lg:text-[5.7rem] xl:text-[6.15rem]">
              Every problem
              <br />
              deserves a place to be seen.
            </h1>
            <p className="mt-6 font-body text-[1.05rem] leading-relaxed text-[#c7d88d] sm:text-[1.25rem] lg:mt-7 lg:text-[1.45rem]">
              Report challenges. Enable solutions. Build a better Jharkhand.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:mt-10 lg:gap-5">
              <a
                href="/citizen/submit"
                className="inline-flex min-h-[3.75rem] items-center justify-center bg-[#cc461c] px-7 font-mono-ui text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_12px_28px_rgba(0,0,0,0.16)] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#e05528] active:translate-y-0 active:scale-[0.97] sm:px-8"
              >
                Report a challenge
              </a>
              <a
                href="/signup?path=institution"
                className="inline-flex min-h-[3.75rem] items-center justify-center border border-[#f6f0e4]/70 px-7 font-mono-ui text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[#f6f0e4] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#d7e1b8] hover:bg-[#f6f0e4]/10 active:translate-y-0 active:scale-[0.97] sm:px-8"
              >
                I&apos;m an institution
              </a>
            </div>
          </div>

          <a href="#metrics" className="absolute bottom-8 right-6 hidden flex-col items-center gap-3 text-[#f5f1e6] transition-opacity duration-200 hover:opacity-70 lg:flex lg:right-[3.55rem]">
            <span className="font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.18em]">Scroll</span>
            <span className="flex h-[3.15rem] items-end justify-center border-l border-[#f7f2e6]/80 pb-0">
              <ArrowDown size={24} strokeWidth={1.35} />
            </span>
          </a>
        </div>
      </section>

      <section id="metrics" className="relative overflow-hidden bg-[#f1eadc] px-6 py-10 text-[#052f21] sm:px-10 sm:py-12 lg:px-16 lg:py-[2.4rem]" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}>
        <div className="mx-auto grid max-w-[94rem] divide-y divide-[#b59770]/60 md:grid-cols-3 md:divide-x md:divide-y-0">
          <Metric value="2,847" label="Challenges submitted" />
          <Metric value="112" label="Institutions engaged" />
          <Metric value="34" label="Districts covered" />
        </div>
      </section>

      <section id="process" className="relative overflow-hidden bg-[#f1eadc] px-6 py-20 text-[#073125] sm:px-10 md:py-28 lg:px-16 lg:py-32" style={{ backgroundImage: "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')", backgroundSize: "cover" }}>
        <div className="mx-auto max-w-[94rem]">
          <p className="font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#c9512d]">How it works</p>
          <h2 className="mt-4 max-w-2xl font-display text-[3.15rem] font-medium leading-[0.88] tracking-[-0.035em] sm:text-[4.15rem] lg:text-[5rem]">From problem to solution.</h2>

          <div className="relative mt-16 grid gap-9 lg:mt-20 lg:min-h-[28rem] lg:grid-cols-12 lg:items-start">
            <ProcessStep number="01" title="Citizens report" description="Citizens submit local challenges from their communities." className="lg:col-span-5 lg:mt-1" />
            <ProcessStep number="02" title="Universities respond" description="Institutions analyze, collaborate, and propose solutions." className="lg:col-start-5 lg:col-span-5 lg:mt-28" />
            <ProcessStep number="03" title="Industry scales" description="Partners implement and scale impact across Jharkhand." className="lg:col-start-9 lg:col-span-4 lg:mt-44" />
          </div>
        </div>
      </section>

      <section id="challenges" className="relative overflow-hidden bg-[#042b20] px-6 py-20 text-[#f5efe3] sm:px-10 md:py-28 lg:px-16 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_36%,rgba(72,114,78,0.16),transparent_36%),radial-gradient(circle_at_80%_72%,rgba(19,75,55,0.35),transparent_36%)]" aria-hidden="true" />
        <div className="relative mx-auto max-w-[94rem]">
          <p className="font-mono-ui text-[0.65rem] font-medium uppercase tracking-[0.16em] text-[#bdc8a5]">Real challenges, real places.</p>
          <div className="mt-4 grid gap-14 lg:grid-cols-[1.22fr_0.78fr] lg:gap-20">
            <div>
              <h2 className="max-w-[39rem] font-display text-[3.4rem] font-medium leading-[0.86] tracking-[-0.035em] sm:text-[4.5rem] lg:text-[5.45rem]">See what&apos;s happening across Jharkhand.</h2>
              <div className="relative mt-12 max-w-[43rem] lg:mt-14">
                <img src="/manus-storage/jharkhand-challenge-map_bf7b2762.png" alt="Illustrated map of Jharkhand with highlighted challenge locations" className="w-full mix-blend-screen opacity-90" />
                <span className="absolute left-[15%] top-[44%] size-2 rounded-full bg-[#e25222] shadow-[0_0_0_4px_rgba(226,82,34,0.14),0_0_16px_rgba(226,82,34,0.9)]" aria-hidden="true" />
                <span className="absolute left-[49%] top-[60%] size-2 rounded-full bg-[#dae2b9] shadow-[0_0_0_4px_rgba(218,226,185,0.12),0_0_15px_rgba(218,226,185,0.7)]" aria-hidden="true" />
                <span className="absolute left-[76%] top-[42%] size-2 rounded-full bg-[#e25222] shadow-[0_0_0_4px_rgba(226,82,34,0.14),0_0_16px_rgba(226,82,34,0.9)]" aria-hidden="true" />
              </div>
            </div>

            <div className="self-center lg:pt-20">
              <ChallengeItem title="Drinking water shortage in rural areas" district="Palamu district" status="Open" tone="ember" />
              <ChallengeItem title="Unreliable power supply in communities" district="Giridih district" status="In progress" tone="sage" />
              <ChallengeItem title="Poor road condition affecting school access" district="Latehar district" status="Open" tone="ember" />
              <a href="#top" className="mt-9 inline-flex items-center gap-2 border-b border-[#df6a43]/60 pb-1 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.13em] text-[#de7047] transition-colors duration-200 hover:text-[#f5efe3]">
                Browse all challenges <ArrowRight size={15} strokeWidth={1.4} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden bg-[#042b20] px-6 pb-8 pt-8 text-[#f4efe3] sm:px-10 lg:px-16 lg:pb-10 lg:pt-10">
        <div className="mx-auto max-w-[94rem] border-t border-[#d9d1bf]/35 pt-12 lg:pt-16">
          <div className="grid gap-12 lg:grid-cols-[1.45fr_3.7fr_1.05fr] lg:gap-12">
            <div>
              <p className="font-display text-[2.55rem] leading-none tracking-[0.01em]">SAMADHAN</p>
              <p className="mt-3 max-w-[14rem] font-mono-ui text-[0.55rem] leading-relaxed uppercase tracking-[0.12em] text-[#b6c2a4]">A platform for solutions. A future for Jharkhand.</p>
            </div>

            <div className="grid grid-cols-2 gap-9 sm:grid-cols-4 lg:gap-6">
              <FooterColumn title="Platform" items={["Home", "Challenges", "Projects", "Institutions", "Dashboard", "Reports", "Notifications"]} />
              <FooterColumn title="For institutions" items={["How it works", "Register", "Submit solutions", "Collaborate", "Resources", "Guidelines"]} />
              <FooterColumn title="For industry" items={["Partner with us", "Identify challenges", "Offer solutions", "Impact & scale", "Resources", "Guidelines"]} />
              <FooterColumn title="Contact" items={["Support", "Help center", "Contact us", "Privacy policy", "Terms of use"]} />
            </div>

            <div className="flex items-start lg:justify-end">
              <div className="text-center">
                <div className="mx-auto grid size-[6.4rem] place-items-center rounded-full border border-[#bdc8a5]/60 bg-[#f6f0e3] p-1.5">
                  <img src="/manus-storage/jharkhand-government-seal_3431be25.svg" alt="Official Government of Jharkhand seal" className="size-full object-contain" />
                </div>
                <p className="mt-3 font-display text-[1.05rem] leading-[0.95] text-[#d7ddbd]">Government of<br />Jharkhand</p>
              </div>
            </div>
          </div>

          <div className="mt-14 border-t border-[#d9d1bf]/25 pt-5 font-mono-ui text-[0.55rem] uppercase tracking-[0.1em] text-[#93aa93] lg:mt-20">© 2024 Government of Jharkhand. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-6 py-7 text-center first:pt-0 last:pb-0 md:px-10 md:py-0 md:first:pt-0 md:last:pb-0">
      <p className="font-body text-[3.6rem] font-extrabold leading-none tracking-[-0.03em] tabular-nums sm:text-[4.2rem] lg:text-[5.1rem]">{value}</p>
      <p className="mt-3 font-mono-ui text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#173a2f] lg:text-[0.75rem]">{label}</p>
    </div>
  );
}

function ProcessStep({ number, title, description, className }: { number: string; title: string; description: string; className?: string }) {
  return (
    <article className={`grid grid-cols-[4.8rem_1fr] items-start gap-4 sm:grid-cols-[6rem_1fr] sm:gap-6 ${className ?? ""}`}>
      <span className="font-body text-[4.2rem] font-extrabold leading-[0.65] tracking-[-0.03em] tabular-nums text-[#d6ceb9]/75 sm:text-[5.9rem]">{number}</span>
      <div className="pt-1.5 sm:pt-3">
        <h3 className="font-display text-[1.7rem] font-medium leading-none sm:text-[2rem]">{title}</h3>
        <p className="mt-2 max-w-[13.5rem] font-body text-[0.74rem] leading-[1.45] text-[#345045] sm:text-[0.78rem]">{description}</p>
      </div>
    </article>
  );
}

function ChallengeItem({ title, district, status, tone }: { title: string; district: string; status: string; tone: "ember" | "sage" }) {
  const chipStyle = tone === "ember" ? "bg-[#d74b1d] text-white" : "bg-[#a5b590] text-[#123125]";

  return (
    <article className="border-t border-[#c6d0b7]/30 py-6 first:pt-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-[1.42rem] leading-[1.04] text-[#f3eee1] sm:text-[1.6rem]">{title}</h3>
          <p className="mt-2 font-mono-ui text-[0.57rem] uppercase tracking-[0.14em] text-[#b4c2a0]">{district}</p>
        </div>
        <span className={`mt-1 px-3 py-1 font-mono-ui text-[0.54rem] font-medium uppercase tracking-[0.12em] ${chipStyle}`}>{status}</span>
      </div>
    </article>
  );
}

function FooterColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="border-b border-[#b8c3aa]/45 pb-2 font-mono-ui text-[0.55rem] font-medium uppercase tracking-[0.13em] text-[#d2dac4]">{title}</h3>
      <ul className="mt-4 space-y-2">
        {items.map((item) => <li key={item}><a href="#top" className="font-body text-[0.65rem] text-[#aebda7] transition-colors duration-200 hover:text-[#f4efe3]">{item}</a></li>)}
      </ul>
    </div>
  );
}
