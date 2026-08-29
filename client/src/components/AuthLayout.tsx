/**
 * Style: Samadhan civic editorial authentication shell — forest photography, archival paper,
 * serif display typography, and controlled ember-orange action accents.
 */
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

const heroImage =
  "/images/lodh-waterfalls-ranchi-jharkhand-3-attr-hero_3a3477cd.jpeg";

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f1eadc] text-[#062f22] lg:grid lg:grid-cols-[0.94fr_1.06fr]">
      <aside className="relative isolate hidden min-h-screen overflow-hidden p-10 text-[#f6f1e5] lg:flex lg:flex-col xl:p-14">
        <div
          className="absolute inset-0 -z-20 bg-cover bg-center scale-x-[-1]"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundPosition: "48% 50%",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(1,34,24,0.88),rgba(0,34,23,0.44)),linear-gradient(0deg,rgba(0,38,26,0.95),rgba(0,31,21,0.08))]"
          aria-hidden="true"
        />
        <a
          href="/"
          className="w-fit font-display text-[2.25rem] leading-none tracking-[0.01em] transition-opacity duration-200 hover:opacity-75"
        >
          SAMADHAN
        </a>
        <div className="mt-auto max-w-[32rem]">
          <p className="font-mono-ui text-[0.66rem] font-medium uppercase tracking-[0.16em] text-[#d1dcb0]">
            Government of Jharkhand · Civic innovation
          </p>
          <p className="mt-6 font-display text-[4.4rem] font-medium leading-[0.84] tracking-[-0.04em] xl:text-[5.45rem]">
            Every voice can move a solution forward.
          </p>
          <p className="mt-7 max-w-[26rem] font-body text-[1rem] leading-relaxed text-[#d0dcae]">
            Join a statewide network making everyday challenges visible,
            actionable, and solvable.
          </p>
        </div>
      </aside>

      <section
        className="relative flex min-h-screen items-center px-6 py-10 sm:px-10 lg:px-[clamp(3rem,7vw,8rem)] lg:py-12"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[#d84a1b] lg:hidden" />
        <div className="mx-auto w-full max-w-[31rem]">
          <div className="flex items-center justify-between border-b border-[#9e855f]/45 pb-6 lg:hidden">
            <a
              href="/"
              className="font-display text-[2rem] leading-none tracking-[0.01em]"
            >
              SAMADHAN
            </a>
            <a
              href="/"
              className="inline-flex items-center gap-2 font-mono-ui text-[0.6rem] font-medium uppercase tracking-[0.12em] text-[#345045] transition-colors hover:text-[#d84a1b]"
            >
              <ArrowLeft size={14} /> Back home
            </a>
          </div>

          <div className="mt-14 lg:mt-0">
            <p className="font-mono-ui text-[0.64rem] font-semibold uppercase tracking-[0.16em] text-[#c84a22]">
              {eyebrow}
            </p>
            <h1 className="mt-4 font-display text-[3.6rem] font-medium leading-[0.84] tracking-[-0.035em] sm:text-[4.35rem]">
              {title}
            </h1>
            <p className="mt-6 max-w-[28rem] font-body text-[0.96rem] leading-relaxed text-[#436056]">
              {description}
            </p>
            <div className="mt-9">{children}</div>
            <div className="mt-7 border-t border-[#9e855f]/45 pt-5">
              {footer}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
