/**
 * USP-07: shared before/after closeout evidence viewer.
 *
 * When both sides are images, renders a draggable compare slider
 * (`ui/image-comparison.tsx`) so citizens/admins can drag to reveal the
 * "after" over the "before" instead of eyeballing two static thumbnails.
 * Falls back to a plain two-up grid for non-image documents (PDFs etc.)
 * so nothing breaks for older/legacy closeouts.
 *
 * Shared by CitizenCloseoutConfirm.tsx, AdminCloseoutReview.tsx, and
 * ChallengeDetail.tsx's public ImpactTimeline — one visual language for
 * the evidence pair everywhere it appears.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { ImageOff, MoveHorizontal } from "lucide-react";
import {
  ImageComparison,
  ImageComparisonImage,
  ImageComparisonSlider,
} from "@/components/ui/image-comparison";

export type EvidenceDoc = {
  name: string;
  fileUrl?: string | null;
  mimeType?: string | null;
};

export function BeforeAfterEvidence({
  before,
  after,
  className,
}: {
  before?: EvidenceDoc;
  after?: EvidenceDoc;
  className?: string;
}) {
  const [dragged, setDragged] = useState(false);
  const beforeIsImage =
    !!before?.fileUrl && before.mimeType?.startsWith("image/");
  const afterIsImage = !!after?.fileUrl && after.mimeType?.startsWith("image/");

  if (beforeIsImage && afterIsImage) {
    return (
      <div className={className}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="relative overflow-hidden border border-[#a58c6d]/50"
          onPointerDown={() => setDragged(true)}
        >
          <ImageComparison
            className="aspect-[4/3] w-full"
            enableHover
            springOptions={{ bounce: 0.22, duration: 0.35 }}
          >
            <ImageComparisonImage
              src={before!.fileUrl!}
              alt={before!.name}
              position="left"
            />
            <ImageComparisonImage
              src={after!.fileUrl!}
              alt={after!.name}
              position="right"
            />
            <ImageComparisonSlider className="w-[3px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]">
              <div className="absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#c94a20] bg-white text-[#c94a20] shadow-lg">
                <MoveHorizontal size={16} />
              </div>
            </ImageComparisonSlider>
          </ImageComparison>
          <span className="pointer-events-none absolute left-2.5 top-2.5 border border-white/40 bg-[#0d3024]/70 px-2 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            Before
          </span>
          <span className="pointer-events-none absolute right-2.5 top-2.5 border border-white/40 bg-[#c94a20]/85 px-2 py-1 font-mono-ui text-[0.52rem] font-semibold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
            After
          </span>
        </motion.div>
        <p
          className={`mt-2 text-center font-mono-ui text-[0.55rem] uppercase tracking-[0.08em] text-[#7d8b83] transition-opacity duration-500 ${dragged ? "opacity-0" : "opacity-100"}`}
        >
          ← hover or drag to compare →
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      <EvidenceTile label="Before" document={before} />
      <EvidenceTile label="After" document={after} />
    </div>
  );
}

function EvidenceTile({
  label,
  document,
}: {
  label: string;
  document?: EvidenceDoc;
}) {
  return (
    <a
      href={document?.fileUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
      className="block border border-[#a58c6d]/45 p-2"
    >
      <div className="aspect-[4/3] overflow-hidden bg-[#ebe0cc]">
        {document?.mimeType?.startsWith("image/") && document.fileUrl ? (
          <img
            src={document.fileUrl}
            alt={document.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-[#9d876a]">
            <ImageOff size={22} />
          </div>
        )}
      </div>
      <p className="mt-2 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#64776d]">
        {label}
      </p>
    </a>
  );
}
