/**
 * Popup shown when a citizen submits a challenge that likely already exists.
 * Follows AuthRequiredDialog paper aesthetic — Radix Dialog, same stacking.
 * Two CTAs: "View & upvote" (navigates to existing challenge) and "Submit anyway".
 */
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
} from "@/components/ui/dialog";
import type { DuplicateResult } from "@/lib/duplicateCheck";

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  match,
  onSubmitAnyway,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: DuplicateResult;
  onSubmitAnyway: () => void;
}) {
  if (!match.matchId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[#052a1f]/75 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[36rem] gap-0 border-none bg-[#f1eadc] p-7 shadow-2xl sm:p-10"
          style={{
            backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
        >
          <DialogClose className="rounded-full absolute right-4 top-4 grid size-9 place-items-center border border-[#a48c6d]/55 text-[#2b493d] transition-colors hover:bg-[#e6dcc9]">
            <span className="sr-only">Close</span>
            ✕
          </DialogClose>

          <div className="grid size-12 place-items-center rounded-full bg-[#f7e2d6] text-[#934325]">
            <AlertTriangle size={24} strokeWidth={1.45} />
          </div>

          <p className="mt-7 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#c44b24]">
            Possible duplicate found
          </p>
          <h2 className="mt-3 font-display text-[2.2rem] font-medium leading-[0.88] tracking-[-0.03em] text-[#072f22]">
            This problem may already be reported
          </h2>

          {/* Match card */}
          <div className="mt-6 border border-[#a58c6d]/45 bg-white/50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              {match.matchDomain && (
                <span className="rounded-full border border-[#80977f]/70 bg-[#e9f0e4] px-2.5 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-[#3a5c41]">
                  {match.matchDomain}
                </span>
              )}
              <span className="rounded-full border border-[#80977f]/70 bg-[#e9f0e4] px-2.5 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-[#3a5c41]">
                {match.matchDistrict}
              </span>
              <span className="font-mono-ui text-[0.55rem] font-semibold text-[#537246]">
                {match.similarity}% match
              </span>
            </div>
            <h3 className="mt-3 font-display text-[1.4rem] leading-[1.15] text-[#0d3024]">
              {match.matchTitle}
            </h3>
            {match.matchDescription && (
              <p className="mt-2 font-body text-[0.78rem] leading-relaxed text-[#52675d]">
                {match.matchDescription}
                {match.matchDescription.length >= 150 ? "…" : ""}
              </p>
            )}
          </div>

          <p className="mt-5 font-body text-[0.82rem] leading-relaxed text-[#4a655b]">
            If this is the same issue, follow it to get updates and add your support.
            Only submit a new report if it&apos;s a different problem.
          </p>

          {/* CTAs */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href={`/challenges/${match.matchId}`}
              className="rounded-full bg-[#16422f] px-5 py-4 text-center font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#275d3f]"
            >
              View & upvote this report →
            </a>
            <button
              type="button"
              onClick={() => {
                onSubmitAnyway();
                onOpenChange(false);
              }}
              className="rounded-full border border-[#5d7467]/70 px-5 py-4 text-center font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#183d30] transition hover:bg-[#e8dfce]"
            >
              Submit anyway
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
