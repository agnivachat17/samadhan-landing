/**
 * Shared "sign in to continue" gate for any action a guest can see but not
 * perform (upvoting a challenge today; anything else that needs an account
 * tomorrow). Built on the project's existing Radix-based Dialog primitive
 * (`components/ui/dialog.tsx`) rather than a hand-rolled fixed/backdrop-blur
 * div, so it gets a real focus trap, ESC-to-close, scroll lock, and a portal
 * to `document.body` for free — and so every stacking-context quirk of the
 * page behind it (maps, transformed ancestors, etc.) is a non-issue.
 */
import { ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

export function AuthRequiredDialog({
  open,
  onOpenChange,
  title = "Your voice counts.",
  eyebrow = "Support this challenge",
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  eyebrow?: string;
  description: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[#052a1f]/75 backdrop-blur-sm" />
        <DialogContent
          showCloseButton={false}
          className="w-full max-w-[33rem] gap-0 border-none bg-[#f1eadc] p-7 shadow-2xl sm:p-10"
          style={{
            backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
        >
          <DialogClose className="rounded-full absolute right-4 top-4 grid size-9 place-items-center border border-[#a48c6d]/55 text-[#2b493d] transition-colors hover:bg-[#e6dcc9]">
            <X size={18} />
            <span className="sr-only">Close</span>
          </DialogClose>
          <div className="grid size-12 place-items-center rounded-full bg-[#dbe5d2] text-[#315947]">
            <ShieldCheck size={24} strokeWidth={1.45} />
          </div>
          <p className="mt-7 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#c44b24]">
            {eyebrow}
          </p>
          <DialogTitle className="mt-3 font-display text-[2.6rem] font-medium leading-[0.88] tracking-[-0.03em] text-[#072f22]">
            {title}
          </DialogTitle>
          <DialogDescription className="mt-5 font-body text-[0.9rem] leading-relaxed text-[#4a655b]">
            {description}
          </DialogDescription>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href="/signup"
              className="rounded-full bg-[#cf4a1c] px-5 py-4 text-center font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-white transition hover:bg-[#e05626]"
            >
              Create account
            </a>
            <a
              href="/login"
              className="rounded-full border border-[#5d7467]/70 px-5 py-4 text-center font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.13em] text-[#183d30] transition hover:bg-[#e8dfce]"
            >
              Log in
            </a>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
