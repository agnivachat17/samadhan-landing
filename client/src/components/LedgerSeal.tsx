/**
 * USP-03: Hash-anchored ledger verification seal.
 *
 * Re-computes the chain locally and shows Verified ✓ (N links) or
 * Tampered at #K ✗. QR links to the admin-anchored Merkle root.
 */
import { useEffect, useState } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  Loader2,
  Anchor,
  QrCode,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

export function LedgerSeal({ projectId }: { projectId: number }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    void user.getIdTokenResult().then(token => {
      if (!cancelled) setIsAdmin(token.claims.admin === true);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);
  const verifyQuery = trpc.workflow.verifyLedger.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  const anchorsQuery = trpc.workflow.ledgerAnchors.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  const anchorMutation = trpc.workflow.anchorLedger.useMutation({
    onSuccess: () => void anchorsQuery.refetch(),
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const result = verifyQuery.data;
  const anchor = anchorsQuery.data?.[0];

  async function generateQr(root: string) {
    const QRCode = await import("qrcode");
    const url = await QRCode.toDataURL(root, { margin: 1, width: 140 });
    setQrDataUrl(url);
  }

  useEffect(() => {
    if (showQr && anchor?.root && !qrDataUrl) {
      void generateQr(anchor.root as string);
    }
  }, [showQr, anchor?.root, qrDataUrl]);

  if (verifyQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 border border-[#a58c6d]/40 bg-[#f8f2e8]/25 px-4 py-3">
        <Loader2 size={16} className="animate-spin text-[#64776c]" />
        <span className="font-mono-ui text-[0.62rem] uppercase tracking-[0.1em] text-[#64776c]">
          Verifying ledger…
        </span>
      </div>
    );
  }

  if (verifyQuery.isError) {
    return (
      <div className="border border-[#bd5a38]/60 bg-[#f7e2d6]/35 px-4 py-3">
        <p className="font-mono-ui text-[0.62rem] uppercase tracking-[0.1em] text-[#934325]">
          Ledger verification failed — {verifyQuery.error.message}
        </p>
      </div>
    );
  }

  if (!result) return null;

  const linkCount = anchorsQuery.data?.[0]?.hashCount ?? 0;
  const isVerified = result.valid;
  const tamperIdx = result.tamperAt;

  return (
    <div
      className={`border px-4 py-3 ${
        isVerified
          ? "border-[#8fa887]/60 bg-[#e6ede3]/50"
          : "border-[#bd5a38]/60 bg-[#f7e2d6]/35"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          {isVerified ? (
            <ShieldCheck size={18} className="text-[#3a6b4a]" />
          ) : (
            <ShieldX size={18} className="text-[#934325]" />
          )}
          <div>
            <p
              className={`font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] ${
                isVerified ? "text-[#3a6b4a]" : "text-[#934325]"
              }`}
            >
              {isVerified
                ? `Verified chain ✓ (${linkCount} link${linkCount !== 1 ? "s" : ""})`
                : `Tampered at #${tamperIdx} ✗`}
            </p>
            {anchor?.root && (
              <p className="mt-0.5 font-mono-ui text-[0.55rem] text-[#64776c]">
                Root: {(anchor.root as string).slice(0, 24)}…
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {anchor?.root && (
            <button
              type="button"
              onClick={() => setShowQr(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#a58c6d]/50 px-3 py-1.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#52675d] transition hover:bg-[#e7dfcf]"
            >
              <QrCode size={13} />
              {showQr ? "Hide QR" : "Show QR"}
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              disabled={anchorMutation.isPending}
              onClick={() => anchorMutation.mutate({ projectId })}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#16422f] px-3 py-1.5 font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              <Anchor size={13} />
              {anchorMutation.isPending ? "Anchoring…" : "Anchor now"}
            </button>
          )}
        </div>
      </div>
      {showQr && qrDataUrl && (
        <div className="mt-3 flex items-center gap-4 border-t border-[#a58c6d]/30 pt-3">
          <img src={qrDataUrl} alt="Ledger root QR" className="size-[5.5rem]" />
          <div>
            <p className="font-mono-ui text-[0.55rem] font-semibold uppercase tracking-[0.08em] text-[#52675d]">
              Scan to verify chain root
            </p>
            <p className="mt-1 max-w-[18rem] break-all font-mono-ui text-[0.52rem] text-[#7d8b83]">
              {anchor?.root as string}
            </p>
          </div>
        </div>
      )}
      {anchorMutation.isError && (
        <p className="mt-2 font-body text-[0.72rem] text-[#a34b2c]">
          Anchor failed — {anchorMutation.error.message}
        </p>
      )}
    </div>
  );
}
