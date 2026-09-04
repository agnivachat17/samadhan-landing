/** Style: Samadhan public challenge submission — persisted civic report and optional evidence capture. */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { useAuth } from "@/hooks/useAuth";
import {
  CheckCircle2,
  Loader2,
  Upload,
  WifiOff,
  CloudUpload,
  ScanText,
  Sparkles,
  AlertTriangle,
  Camera,
  FileText,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { LocationPicker } from "@/components/LocationPicker";
import {
  drainQueue,
  queueChallengeDraft,
  queueCount,
} from "@/lib/offlineQueue";
import { VoiceCapture } from "@/components/VoiceCapture";
import { parseBhashaText, type BhashaFill } from "@/lib/bhasha";
import { JHARKHAND_DISTRICTS } from "@/lib/jharkhandDistricts";
import { DistrictAutocomplete } from "@/components/DistrictAutocomplete";
import { analyzeImage } from "@/lib/groqVision";
import {
  checkTitleDuplicate,
  type DuplicateResult,
} from "@/lib/duplicateCheck";

const DOMAIN_OPTIONS = [
  "Water",
  "Education",
  "Health",
  "Agriculture",
  "Infrastructure",
  "Livelihoods",
] as const;
const DISTRICT_NAMES = JHARKHAND_DISTRICTS.map(d => d.name);

async function hashOtp(otp: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(otp)
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function SubmitChallenge(props: any = {}) {
  const { kiosk = false, defaultAssisted = false } = props as {
    kiosk?: boolean;
    defaultAssisted?: boolean;
  };
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [isAssisted, setIsAssisted] = useState(defaultAssisted || kiosk);
  const [visibilityTier, setVisibilityTier] = useState<"public" | "restricted" | "confidential">("public");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("");
  const [beneficiaryConsent, setBeneficiaryConsent] = useState(false);
  const [demoOtpDisplay, setDemoOtpDisplay] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [offlineQueued, setOfflineQueued] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const submitMutation = trpc.workflow.submitChallenge.useMutation();
  const evidenceMutation = trpc.workflow.uploadChallengeEvidence.useMutation();
  const [district, setDistrict] = useState("");
  const [districtEdited, setDistrictEdited] = useState(false);
  const [coords, setCoords] = useState<{
    latitude?: string;
    longitude?: string;
  }>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [scanning, setScanning] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateResult | null>(null);
  const scanInput = useRef<HTMLInputElement>(null);
  const aiScanInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const ocrWorkerRef = useRef<Awaited<
    ReturnType<typeof import("tesseract.js").createWorker>
  > | null>(null);
  const challengesQuery = trpc.workflow.challenges.useQuery({});

  useEffect(() => {
    return () => {
      void ocrWorkerRef.current?.terminate();
    };
  }, []);

  // GPS Camera: capture photo + location simultaneously
  function handleCameraCapture(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    // Add file to evidence
    setFiles(prev => [...prev, file].slice(0, 5));

    // Get GPS location from device
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setCoords({ latitude: lat, longitude: lng });

          // Reverse geocode to get district (approximate)
          // For now, just set coords — district will be set by AI or user
          toast.success(`Photo captured with GPS: ${lat}, ${lng}`);
        },
        () => {
          // GPS denied — still accept the photo
          toast.info("Photo captured — GPS location not available");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    // Trigger AI analysis
    void aiScanImage(file);
  }

  function handleBhashaFill(fill: BhashaFill) {
    // Merge voice transcript with existing AI-filled content
    // Don't replace — merge ideas
    if (fill.title) {
      setTitle(prev => {
        if (!prev) return fill.title;
        // If AI already filled title, merge: keep AI title but add voice context
        const merged = `${prev} — ${fill.title}`;
        return merged.length > 80 ? merged.slice(0, 80) : merged;
      });
    }
    if (fill.description) {
      setDescription(prev => {
        if (!prev) return fill.description;
        // Merge descriptions — append voice transcript to AI description
        return `${prev}\n\n${fill.description}`;
      });
    }
    if (fill.district && !districtEdited) setDistrict(fill.district);
    if (fill.domain && !domain) setDomain(fill.domain);
  }

  async function scanHandwriting(file: File) {
    setScanning(true);
    try {
      if (!ocrWorkerRef.current) {
        const { createWorker } = await import("tesseract.js");
        ocrWorkerRef.current = await createWorker("hin+eng");
      }
      const {
        data: { text },
      } = await ocrWorkerRef.current.recognize(file);
      if (!text.trim()) {
        toast.error(
          "Could not read any text from that image — try a clearer photo."
        );
        return;
      }
      handleBhashaFill(parseBhashaText(text, DISTRICT_NAMES));
      setFiles(prev => [...prev, file].slice(0, 5));
      toast.success(
        "Filled the form from your handwritten note — please review it."
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not read that image. Try a clearer photo or type instead."
      );
    } finally {
      setScanning(false);
    }
  }

  async function aiScanImage(file: File) {
    setAiScanning(true);
    setDuplicateWarning(null);
    try {
      const base64 = await toBase64(file);

      // Run AI categorize and duplicate check in parallel
      const [visionResult] = await Promise.allSettled([
        analyzeImage(base64),
        Promise.resolve().then(() => {
          // Lightweight duplicate check: same district + similar title
          const challenges = (challengesQuery.data ?? []) as Array<{
            district: string;
            title: string;
            id: number;
          }>;
          if (district && title) {
            return checkTitleDuplicate(district, title, challenges);
          }
          return null;
        }),
      ]);

      // Apply AI results
      if (visionResult.status === "fulfilled") {
        const result = visionResult.value;
        if (result.title && !title) setTitle(result.title);
        if (result.description && !description)
          setDescription(result.description);
        if (result.domain && !domain) setDomain(result.domain);
        toast.success(
          "AI analyzed the image — review the suggested fields below."
        );
      } else {
        toast.error(
          visionResult.reason instanceof Error
            ? visionResult.reason.message
            : "AI analysis failed — fill the form manually."
        );
      }

      // File already added by caller (handleCameraCapture / gallery onChange)
      // Do NOT call setFiles here — it would add the file a second time
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not analyze that image. Try a clearer photo."
      );
    } finally {
      setAiScanning(false);
    }
  }

  useEffect(() => {
    const refresh = async () => {
      setIsOnline(navigator.onLine);
      setOfflineQueued(await queueCount());
    };
    const handleOnline = async () => {
      setIsOnline(true);
      const { drained } = await drainQueue();
      setOfflineQueued(await queueCount());
      if (drained > 0) {
        toast.success(
          `Synced ${drained} offline challenge${drained > 1 ? "s" : ""} to Samadhan`
        );
      }
    };
    const handleOffline = () => setIsOnline(false);
    refresh();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    // Try draining on mount if already online + signed-in
    drainQueue()
      .then(() => queueCount())
      .then(setOfflineQueued)
      .catch(() => {});
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function handleLocationPick(value: {
    latitude: string;
    longitude: string;
    district?: string;
  }) {
    setCoords({ latitude: value.latitude, longitude: value.longitude });
    if (value.district && !districtEdited) setDistrict(value.district);
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");

    // Assisted validation
    if (isAssisted) {
      if (!beneficiaryName.trim() || !beneficiaryPhone.trim()) {
        setUploadError(
          "Beneficiary name and phone are required for assisted reports."
        );
        return;
      }
      const digits = beneficiaryPhone.replace(/[^0-9]/g, "");
      if (digits.length < 10) {
        setUploadError("Beneficiary phone must be at least 10 digits.");
        return;
      }
      if (!beneficiaryConsent) {
        setUploadError("Beneficiary consent is required for assisted reports.");
        return;
      }
    }

    // Require at least one photo
    if (files.length === 0) {
      setUploadError(
        "At least one photo is required. Please capture or upload evidence."
      );
      return;
    }

    const data = new FormData(event.currentTarget);
    // Demo OTP for assisted — 6-digit, hash stored, plain shown to operator for demo
    let demoOtp: string | null = null;
    let otpHash: string | null = null;
    let otpExpiresAt: Date | null = null;
    if (isAssisted) {
      demoOtp = String(Math.floor(100000 + Math.random() * 900000));
      otpHash = await hashOtp(demoOtp);
      otpExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    const payload: Record<string, unknown> = {
      citizenName: isAssisted
        ? beneficiaryName.trim()
        : (user?.displayName ?? text(data, "citizenName")!),
      citizenEmail: user?.email ?? text(data, "citizenEmail"),
      citizenPhone: isAssisted
        ? beneficiaryPhone.trim()
        : text(data, "citizenPhone"),
      title: title.trim(),
      description: description.trim(),
      domain,
      district: text(data, "district")!,
      latitude: coords.latitude,
      longitude: coords.longitude,
      visibilityTier,
      submittedVia: isAssisted ? "assisted" : "self",
      submittedByUid: isAssisted ? user?.uid : undefined,
      beneficiaryName: isAssisted ? beneficiaryName.trim() : undefined,
      beneficiaryPhone: isAssisted ? beneficiaryPhone.trim() : undefined,
      beneficiaryOtpHash: otpHash ?? undefined,
      beneficiaryOtpExpiresAt: otpExpiresAt ?? undefined,
      // Store demo plain OTP only for local demo display (not relied on for verification)
      _demoOtp: demoOtp ?? undefined,
    };
    const citizenName = payload.citizenName as string;

    // Offline path — queue locally and show offline confirmation
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        if (!user) {
          setUploadError(
            "You are offline. Please sign in before queuing a challenge — it will sync when you are back online."
          );
          return;
        }
        await queueChallengeDraft(payload as Record<string, unknown>, files);
        setOfflineQueued(await queueCount());
        setOfflineSaved(true);
        setCreatedId(-1);
        if (isAssisted && demoOtp) {
          setDemoOtpDisplay(demoOtp);
          toast.info(
            `Demo OTP for ${beneficiaryName}: ${demoOtp} — in production this would be sent via SMS to ${beneficiaryPhone}`
          );
        } else {
          toast.info("Saved offline — will sync when you are back online");
        }
      } catch (error) {
        setUploadError(
          error instanceof Error ? error.message : "Could not queue offline."
        );
      }
      return;
    }

    try {
      const result = await submitMutation.mutateAsync(payload);
      const email = text(data, "citizenEmail");
      if (email) sessionStorage.setItem("samadhan-citizen-email", email);
      for (const file of files) {
        if (file.size > 5_000_000)
          throw new Error(
            `${file.name} is larger than the 5 MB evidence limit.`
          );
        const base64 = await toBase64(file);
        await evidenceMutation.mutateAsync({
          challengeId: result.id,
          uploaderName: citizenName,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64,
        });
      }
      setCreatedId(result.id);
      if (isAssisted && demoOtp) {
        setDemoOtpDisplay(demoOtp);
        toast.success(`Report filed for ${beneficiaryName}`, {
          description: `Demo OTP: ${demoOtp} (expires in 7 days) — share this with ${beneficiaryName}. In production this would be sent via SMS to ${beneficiaryPhone}. Tracking ID: ${result.id}`,
          duration: 8000,
        });
      }
    } catch (error) {
      // If network fails mid-submit, offer to queue
      const isNetworkError =
        error instanceof Error &&
        /network|Failed to fetch|offline/i.test(error.message);
      if (isNetworkError && user) {
        try {
          await queueChallengeDraft(payload as Record<string, unknown>, files);
          setOfflineQueued(await queueCount());
          setOfflineSaved(true);
          setCreatedId(-1);
          toast.info("Network lost — saved offline, will sync when online");
          return;
        } catch {
          // fall through to normal error
        }
      }
      setUploadError(
        error instanceof Error
          ? error.message
          : "The challenge could not be submitted. Please try again."
      );
    }
  }
  if (createdId)
    return (
      <main
        className="min-h-screen bg-[#f1eadc] text-[#0b3023]"
        style={{
          backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <PublicPortalHeader />
        <section className="grid min-h-[calc(100vh-84px)] place-items-center px-6 text-center">
          <div className="max-w-xl">
            {offlineSaved ? (
              <WifiOff className="mx-auto text-[#8a7a5a]" size={42} />
            ) : (
              <CheckCircle2 className="mx-auto text-[#42684b]" size={42} />
            )}
            <p className="mt-6 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#c74920]">
              {offlineSaved ? "Saved offline" : "Submission recorded"}
            </p>
            <h1 className="mt-5 font-display text-[4.3rem] font-medium leading-[0.86] tracking-[-0.04em]">
              {offlineSaved ? "Queued for sync." : "Thank you for speaking up."}
            </h1>
            <p className="mt-7 font-body text-[1rem] leading-relaxed text-[#496257]">
              {offlineSaved
                ? "You are offline. Your challenge and evidence are queued on this device and will sync automatically when you are back online and signed in."
                : isAssisted && demoOtpDisplay
                  ? `Report filed on behalf of ${beneficiaryName}. Share the tracking ID and demo OTP below with them — in production this would be sent via SMS to ${beneficiaryPhone}.`
                  : "Your challenge and any uploaded evidence are now in the Samadhan review workflow. You can edit the record or follow its handoff from your citizen view."}
            </p>
            {isAssisted && demoOtpDisplay && createdId !== -1 && (
              <div className="mt-6 border border-[#a58c6d]/55 bg-white/60 p-5 text-left">
                <p className="font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                  Assisted report — for {beneficiaryName}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="border border-[#a58c6d]/30 bg-[#f8f2e8]/45 p-3">
                    <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#6b7b72]">
                      Tracking ID
                    </p>
                    <p className="font-body text-[1.1rem] font-semibold">
                      #{createdId}
                    </p>
                  </div>
                  <div className="border border-[#c94a20]/30 bg-[#f7e2d6]/30 p-3">
                    <p className="font-mono-ui text-[0.52rem] uppercase tracking-[0.08em] text-[#9b3e20]">
                      Demo OTP (7 days)
                    </p>
                    <p className="font-mono-ui text-[1.5rem] font-bold tracking-[0.12em]">
                      {demoOtpDisplay}
                    </p>
                  </div>
                </div>
                <p className="mt-3 font-body text-[0.72rem] text-[#5c6a61]">
                  Beneficiary phone:{" "}
                  <span className="font-semibold">{beneficiaryPhone}</span> ·
                  Give them the tracking ID and OTP. They will use it to confirm
                  when the fix is done — without needing their own account.
                </p>
              </div>
            )}
            {offlineSaved ? (
              <div className="mt-10 flex flex-col items-center gap-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#9d876a]/60 bg-[#f7f0e5]/60 px-4 py-2 font-mono-ui text-[0.65rem] uppercase tracking-[0.1em] text-[#5a4a33]">
                  <CloudUpload size={14} />
                  {offlineQueued} queued on this device
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedId(null);
                    setOfflineSaved(false);
                  }}
                  className="font-body text-[0.78rem] text-[#496257] underline decoration-[#a58c6e]/65 underline-offset-4 hover:text-[#c94a20]"
                >
                  Report another challenge
                </button>
              </div>
            ) : (
              <a
                href={`/challenges/${createdId}`}
                className="rounded-full mt-10 inline-flex bg-[#c94a20] px-7 py-4 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white"
              >
                View my report
              </a>
            )}
          </div>
        </section>
      </main>
    );
  return (
    <main
      className="min-h-screen bg-[#f1eadc] text-[#0b3023]"
      style={{
        backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
        backgroundSize: "cover",
      }}
    >
      <PublicPortalHeader />
      {!isOnline && (
        <div className="mx-auto max-w-[43rem] px-6 pt-6 sm:px-10">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#b8956a]/50 bg-[#fdf0d0]/70 px-4 py-3">
            <span className="inline-flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[#7a5a22]">
              <WifiOff size={14} /> Offline — reports will be queued
            </span>
            {offlineQueued > 0 && (
              <span className="rounded-full bg-[#7a5a22] px-3 py-1 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-white">
                {offlineQueued} queued
              </span>
            )}
          </div>
          {!user && (
            <p className="mt-2 font-body text-[0.72rem] text-[#7a5a22]">
              Sign in so queued reports can sync when you are back online.
            </p>
          )}
        </div>
      )}
      {isOnline && offlineQueued > 0 && (
        <div className="mx-auto max-w-[43rem] px-6 pt-6 sm:px-10">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#8fa887]/50 bg-[#e6ede3]/70 px-4 py-3">
            <span className="inline-flex items-center gap-2 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[#2d5a3a]">
              <CloudUpload size={14} /> {offlineQueued} offline report
              {offlineQueued > 1 ? "s" : ""} queued — will sync automatically
            </span>
            <button
              type="button"
              onClick={async () => {
                const { drained } = await drainQueue();
                setOfflineQueued(await queueCount());
                if (drained > 0)
                  toast.success(
                    `Synced ${drained} report${drained > 1 ? "s" : ""}`
                  );
              }}
              className="rounded-full bg-[#2d5a3a] px-3 py-1 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.08em] text-white"
            >
              Sync now
            </button>
          </div>
        </div>
      )}
      <section className="px-6 py-10 sm:px-10 lg:py-9">
        <div className="mx-auto max-w-[43rem]">
          <div className="text-center">
            <h1 className="font-display text-[3.8rem] font-medium leading-[0.88] tracking-[-0.04em] sm:text-[4.6rem]">
              Report a Challenge.
            </h1>
            <span className="mx-auto mt-5 block h-[2px] w-10 bg-[#c94a20]" />
            {!user && (
              <p className="mt-4 font-body text-[0.9rem] text-[#934325]">
                You must be signed in to report a challenge.
              </p>
            )}
          </div>

          {/* Not logged in — show sign-in prompt */}
          {!user ? (
            <div className="mt-8 border border-[#9d876a]/60 bg-[#f7f0e5]/30 p-6 sm:p-9 text-center">
              <p className="font-body text-[1rem] text-[#52675d]">
                Please sign in to report a civic challenge. This helps us track
                your submissions and keep you updated.
              </p>
              <a
                href="/login"
                className="rounded-full mt-6 inline-flex bg-[#c94a20] px-7 py-4 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white"
              >
                Sign in to report
              </a>
            </div>
          ) : (
            <form
              onSubmit={submit}
              className="mt-7 border border-[#9d876a]/60 bg-[#f7f0e5]/30 p-6 sm:p-9"
            >
              {/* Only show name/email fields if NOT logged in (fallback) */}
              {!user && (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Your name">
                      <input
                        required
                        name="citizenName"
                        className="citizen-input"
                        placeholder="Full name"
                      />
                    </FormField>
                    <FormField label="Contact number">
                      <input
                        name="citizenPhone"
                        type="tel"
                        className="citizen-input"
                        placeholder="Optional"
                      />
                    </FormField>
                  </div>
                  <FormField label="Email address">
                    <input
                      required
                      name="citizenEmail"
                      type="email"
                      className="citizen-input"
                      placeholder="you@example.com"
                    />
                  </FormField>
                </>
              )}

              {/* Logged-in user info badge */}
              {user && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-[#8fa887]/50 bg-[#e6ede3]/40 px-4 py-3">
                  <div className="size-8 rounded-full bg-[#16422f] flex items-center justify-center text-white font-body text-[0.75rem] font-semibold">
                    {(user.displayName ?? user.email ?? "?")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body text-[0.82rem] font-semibold text-[#173d30]">
                      {user.displayName ?? "Citizen"}
                    </p>
                    <p className="font-mono-ui text-[0.58rem] text-[#52675d]">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Assisted submission toggle — USP-09 */}
              {kiosk ? (
                <div className="mb-5 border-2 border-[#16422f] bg-[#e6ede3]/50 p-5 text-center">
                  <p className="font-mono-ui text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#16422f]">
                    Assisted Intake — CSC / Panchayat Kiosk
                  </p>
                  <p className="mt-2 font-body text-[0.82rem] text-[#3d544b]">
                    Large touch targets · Voice & handwriting first · No
                    re-login between reports
                  </p>
                  <div className="mt-4 space-y-4 text-left">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                          Beneficiary name{" "}
                          <span className="text-[#c94a20]">*</span>
                        </span>
                        <input
                          required
                          value={beneficiaryName}
                          onChange={e => setBeneficiaryName(e.target.value)}
                          className="citizen-input mt-2 text-[1rem] py-4"
                          placeholder="Full name"
                        />
                      </label>
                      <label className="block">
                        <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                          Beneficiary phone{" "}
                          <span className="text-[#c94a20]">*</span>
                        </span>
                        <input
                          required
                          value={beneficiaryPhone}
                          onChange={e =>
                            setBeneficiaryPhone(
                              e.target.value
                                .replace(/[^0-9+]/g, "")
                                .slice(0, 15)
                            )
                          }
                          className="citizen-input mt-2 text-[1rem] py-4"
                          placeholder="10-digit mobile"
                          type="tel"
                        />
                      </label>
                    </div>
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={beneficiaryConsent}
                        onChange={e => setBeneficiaryConsent(e.target.checked)}
                        required
                        className="mt-0.5 size-5 accent-[#c94a20]"
                      />
                      <span className="font-body text-[0.78rem] leading-snug text-[#3d544b]">
                        Beneficiary has consented. They will be contacted on
                        this phone to confirm when fixed.
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="mb-5 border border-[#a58c6d]/40 bg-[#f8f2e8]/45 p-4">
                  <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                    Who is this report for?
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsAssisted(false)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${!isAssisted ? "border-[#c94a20] bg-[#c94a20] text-white" : "border-[#a58c6d]/40 bg-white/60 text-[#243f34] hover:bg-white"}`}
                    >
                      <span className="font-body text-[0.84rem] font-semibold">
                        For myself
                      </span>
                      <span
                        className={`mt-1 block font-body text-[0.7rem] ${!isAssisted ? "text-white/80" : "text-[#66766e]"}`}
                      >
                        I am the affected person
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAssisted(true)}
                      className={`rounded-xl border px-4 py-3 text-left transition ${isAssisted ? "border-[#16422f] bg-[#16422f] text-white" : "border-[#a58c6d]/40 bg-white/60 text-[#243f34] hover:bg-white"}`}
                    >
                      <span className="font-body text-[0.84rem] font-semibold">
                        On behalf of someone
                      </span>
                      <span
                        className={`mt-1 block font-body text-[0.7rem] ${isAssisted ? "text-white/80" : "text-[#66766e]"}`}
                      >
                        CSC / Panchayat assisted
                      </span>
                    </button>
                  </div>
                  {isAssisted && (
                    <div className="mt-4 space-y-4 border-t border-[#a58c6d]/30 pt-4">
                      <p className="font-body text-[0.76rem] leading-relaxed text-[#5c6a61]">
                        You are filing as an assistant. The beneficiary remains
                        the decision-maker for closeout confirmation via OTP to
                        their phone.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                            Beneficiary name{" "}
                            <span className="text-[#c94a20]">*</span>
                          </span>
                          <input
                            required={isAssisted}
                            value={beneficiaryName}
                            onChange={e => setBeneficiaryName(e.target.value)}
                            className="citizen-input mt-2"
                            placeholder="Full name of affected person"
                          />
                        </label>
                        <label className="block">
                          <span className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#243f34]">
                            Beneficiary phone{" "}
                            <span className="text-[#c94a20]">*</span>
                          </span>
                          <input
                            required={isAssisted}
                            value={beneficiaryPhone}
                            onChange={e =>
                              setBeneficiaryPhone(
                                e.target.value
                                  .replace(/[^0-9+]/g, "")
                                  .slice(0, 15)
                              )
                            }
                            className="citizen-input mt-2"
                            placeholder="10-digit mobile"
                            type="tel"
                          />
                        </label>
                      </div>
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={beneficiaryConsent}
                          onChange={e =>
                            setBeneficiaryConsent(e.target.checked)
                          }
                          required={isAssisted}
                          className="mt-0.5 size-4 accent-[#c94a20]"
                        />
                        <span className="font-body text-[0.74rem] leading-snug text-[#3d544b]">
                          Beneficiary has consented to this report on their
                          behalf. I have explained that they will be contacted
                          on this phone to confirm when the issue is resolved.
                        </span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* GPS Camera — capture photo + location simultaneously */}
              <div className="mb-5">
                <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#243f34]">
                  Capture evidence{" "}
                  <span className="font-normal text-[#c94a20]">(required)</span>
                </p>
                <p className="mt-1 font-body text-[0.72rem] text-[#66766e]">
                  Take a photo with GPS location — AI will analyze it
                </p>
                <input
                  ref={cameraInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleCameraCapture}
                />
                <button
                  type="button"
                  disabled={aiScanning}
                  onClick={() => cameraInput.current?.click()}
                  className="mt-2 flex min-h-[10rem] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#c94a20]/50 bg-[#f7e2d6]/20 px-5 text-center transition hover:bg-[#f7e2d6]/40 hover:border-[#c94a20]/70"
                >
                  {aiScanning ? (
                    <Loader2
                      className="animate-spin text-[#c94a20]"
                      size={28}
                    />
                  ) : (
                    <Camera size={28} className="text-[#c94a20]" />
                  )}
                  <span className="mt-3 font-body text-[0.88rem] font-semibold text-[#243f34]">
                    {aiScanning
                      ? "AI is analyzing your photo…"
                      : "Tap to take photo"}
                  </span>
                  <span className="mt-1 font-body text-[0.72rem] text-[#66766e]">
                    Opens camera with GPS location · AI auto-fills the form
                  </span>
                </button>
              </div>

              {/* Show uploaded files with previews */}
              {files.length > 0 && (
                <div className="mb-5">
                  <p className="font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#3a6b4a]">
                    {files.length} photo{files.length > 1 ? "s" : ""} attached
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {files.map((file, i) => (
                      <div
                        key={i}
                        className="group relative aspect-square overflow-hidden rounded-lg border border-[#a58c6d]/40 bg-[#f8f2e8]"
                      >
                        {file.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="size-full object-cover transition duration-200 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-[#f1eadc]">
                            <FileText size={24} className="text-[#9d876a]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setFiles(prev => prev.filter((_, j) => j !== i))
                          }
                          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-[#934325] text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          ×
                        </button>
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#c94a20] px-1.5 py-0.5 font-mono-ui text-[0.5rem] font-semibold text-white">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {files.length === 0 && (
                <p className="mb-5 font-body text-[0.78rem] text-[#c94a20] font-semibold">
                  At least one photo is required
                </p>
              )}

              {/* Also allow file picker as fallback */}
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={event => {
                  const newFiles = Array.from(event.target.files ?? []).slice(
                    0,
                    5
                  );
                  setFiles(prev => [...prev, ...newFiles].slice(0, 5));
                  // Trigger AI scan on first image
                  if (newFiles.length > 0) {
                    void aiScanImage(newFiles[0]!);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mb-5 inline-flex items-center gap-2 font-body text-[0.75rem] text-[#496257] underline decoration-[#a58c6e]/65 underline-offset-4 hover:text-[#c94a20]"
              >
                <Upload size={14} />
                Or upload from gallery
              </button>

              <VoiceCapture
                districts={DISTRICT_NAMES}
                onFill={handleBhashaFill}
              />
              <FormField label="Title">
                <input
                  required
                  name="title"
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  className="citizen-input"
                  placeholder="AI will fill this from your photo"
                />
              </FormField>
              <FormField label="Description">
                <div className="flex items-start gap-2">
                  <textarea
                    required
                    name="description"
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    className="citizen-input min-h-[7.5rem] resize-y flex-1"
                    placeholder="AI will describe the problem from your photo"
                  />
                  {description && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!('speechSynthesis' in window)) {
                          toast.error('Speech not supported in this browser');
                          return;
                        }
                        window.speechSynthesis.cancel();
                        const { translateText } = await import('@/lib/liveTranslate');
                        const hindi = await translateText(description.slice(0, 500), 'en', 'hi');
                        const utter = new SpeechSynthesisUtterance(hindi);
                        utter.lang = 'hi-IN';
                        utter.rate = 0.85;
                        utter.pitch = 1.05;
                        // Pick best available Hindi voice
                        const voices = window.speechSynthesis.getVoices();
                        const hindiVoices = voices.filter(v => v.lang.startsWith('hi'));
                        const preferred = hindiVoices.find(v => /google|neural|natural/i.test(v.name))
                          || hindiVoices.find(v => v.lang === 'hi-IN')
                          || hindiVoices[0];
                        if (preferred) utter.voice = preferred;
                        window.speechSynthesis.speak(utter);
                      }}
                      className="mt-1 shrink-0 rounded-full border border-[#9a876c]/55 bg-[#f8f2e8] p-2 text-[#16422f] transition hover:bg-[#e5dfd1]"
                      title="Read description in Hindi"
                    >
                      <Volume2 size={16} />
                    </button>
                  )}
                </div>
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Domain">
                  <select
                    required
                    name="domain"
                    value={domain}
                    onChange={event => setDomain(event.target.value)}
                    className="citizen-input"
                  >
                    <option value="" disabled>
                      AI will suggest from photo
                    </option>
                    {DOMAIN_OPTIONS.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="District">
                  <DistrictAutocomplete
                    required
                    name="district"
                    value={district}
                    onChange={value => {
                      setDistrict(value);
                      setDistrictEdited(true);
                    }}
                    className="citizen-input"
                    placeholder="e.g., Ranchi"
                  />
                </FormField>
              </div>
              <div>
                <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#243f34]">
                  Pin the location{" "}
                  <span className="font-normal text-[#68776f]">
                    (optional — GPS from photo is used if available)
                  </span>
                </p>
                <LocationPicker
                  className="mt-2"
                  onChange={handleLocationPick}
                />
              </div>

              {/* USP-10: Visibility tier selector — who can see this report */}
              <div className="mb-5">
                <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#243f34]">
                  Who can see this report?
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisibilityTier("public")}
                    className={`rounded-xl border px-3 py-3 text-left transition ${visibilityTier === "public" ? "border-[#16422f] bg-[#16422f] text-white" : "border-[#a58c6d]/40 bg-white/60 text-[#243f34] hover:bg-white"}`}
                  >
                    <span className="font-body text-[0.84rem] font-semibold">Everyone</span>
                    <span className={`mt-1 block font-body text-[0.68rem] ${visibilityTier === "public" ? "text-white/80" : "text-[#66766e]"}`}>
                      Public — name and location visible
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibilityTier("restricted")}
                    className={`rounded-xl border px-3 py-3 text-left transition ${visibilityTier === "restricted" ? "border-[#16422f] bg-[#16422f] text-white" : "border-[#a58c6d]/40 bg-white/60 text-[#243f34] hover:bg-white"}`}
                  >
                    <span className="font-body text-[0.84rem] font-semibold">Restricted</span>
                    <span className={`mt-1 block font-body text-[0.68rem] ${visibilityTier === "restricted" ? "text-white/80" : "text-[#66766e]"}`}>
                      Your name hidden from public page
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibilityTier("confidential")}
                    className={`rounded-xl border px-3 py-3 text-left transition ${visibilityTier === "confidential" ? "border-[#a84626] bg-[#a84626] text-white" : "border-[#a58c6d]/40 bg-white/60 text-[#243f34] hover:bg-white"}`}
                  >
                    <span className="font-body text-[0.84rem] font-semibold">Confidential</span>
                    <span className={`mt-1 block font-body text-[0.68rem] ${visibilityTier === "confidential" ? "text-white/80" : "text-[#66766e]"}`}>
                      Only Samadhan admins see this
                    </span>
                  </button>
                </div>
                {visibilityTier === "restricted" && (
                  <p className="mt-2 font-body text-[0.72rem] text-[#5c6a61]">
                    Your name and exact location will be hidden on the public page. Institutions and admins can still see them internally to resolve the issue.
                  </p>
                )}
                {visibilityTier === "confidential" && (
                  <p className="mt-2 font-body text-[0.72rem] text-[#7a3a3a]">
                    This report will not appear in any public list or institution view. Only Samadhan administrators can access it. Use for sensitive or safety-related reports only.
                  </p>
                )}
              </div>
              {/* Duplicate Warning */}
              {duplicateWarning?.isDuplicate && (
                <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#bd5a38]/50 bg-[#f7e2d6]/40 p-4">
                  <AlertTriangle
                    size={18}
                    className="mt-0.5 shrink-0 text-[#934325]"
                  />
                  <div>
                    <p className="font-body text-[0.82rem] font-semibold text-[#934325]">
                      Possible duplicate detected
                    </p>
                    <p className="mt-1 font-body text-[0.76rem] text-[#934325]">
                      A similar report exists in {district}: "
                      {duplicateWarning.matchTitle}"
                      {duplicateWarning.matchId && (
                        <>
                          {" "}
                          —{" "}
                          <a
                            href={`/challenges/${duplicateWarning.matchId}`}
                            className="underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            view it
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {uploadError && (
                <p
                  role="alert"
                  className="mt-5 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-4 font-body text-[0.75rem] text-[#934325]"
                >
                  {uploadError}
                </p>
              )}
              <div className="mt-6 flex justify-end border-t border-[#a58c6e]/45 pt-5">
                <button
                  disabled={
                    submitMutation.isPending || evidenceMutation.isPending
                  }
                  type="submit"
                  className="rounded-full inline-flex items-center gap-2 bg-[#c94a20] px-7 py-4 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60"
                >
                  {submitMutation.isPending || evidenceMutation.isPending ? (
                    <Loader2 className="animate-spin" size={15} />
                  ) : null}
                  Submit challenge
                </button>
              </div>
            </form>
          )}
          <button
            type="button"
            onClick={() => setLocation("/citizen/dashboard")}
            className="mt-5 font-body text-[0.78rem] text-[#496257] underline decoration-[#a58c6e]/65 underline-offset-4 hover:text-[#c94a20]"
          >
            Back to my submissions
          </button>
        </div>
      </section>
    </main>
  );
}
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-5 block">
      <span className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#243f34]">
        {label}
      </span>
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
function text(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || undefined;
}
function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error("The selected file could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
