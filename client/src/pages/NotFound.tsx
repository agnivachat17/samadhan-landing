/**
 * Style: Samadhan reference-matched 404 — textured deep evergreen field, oversized ivory serif
 * error numeral, a slender ember rule, and one decisive home-return action.
 */
export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#06281d] px-6 text-center text-[#f6f0e5]">
      <div
        className="absolute inset-0 opacity-35 [background:radial-gradient(ellipse_at_50%_42%,rgba(32,75,52,0.35),transparent_38%),radial-gradient(ellipse_at_20%_78%,rgba(2,22,15,0.5),transparent_43%),radial-gradient(ellipse_at_90%_10%,rgba(2,22,15,0.4),transparent_42%)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[url('/manus-storage/samadhan-contour-overlay_b1ce99f8.png')] bg-cover bg-center opacity-[0.035] mix-blend-screen"
        aria-hidden="true"
      />
      <section className="relative -mt-6 flex max-w-xl flex-col items-center sm:-mt-10">
        <p className="font-body text-[9.5rem] font-extrabold leading-[0.72] tracking-[-0.04em] tabular-nums text-[#f4eee2] sm:text-[12.3rem] lg:text-[14.2rem]">
          404
        </p>
        <span className="mt-8 h-px w-10 bg-[#c64a21] sm:mt-10" />
        <p className="mt-8 font-body text-[1.05rem] leading-relaxed text-[#bdcb98] sm:text-[1.35rem]">
          This page couldn&apos;t be found.
        </p>
        <a
          href="/"
          className="rounded-full mt-12 bg-[#cf4a1d] px-10 py-4 font-mono-ui text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_14px_30px_rgba(0,0,0,0.16)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e15727] active:translate-y-0 active:scale-[0.97] sm:mt-14 sm:px-14 sm:py-5"
        >
          Back to home
        </a>
      </section>
    </main>
  );
}
