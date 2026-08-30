/** Style: Samadhan public challenge submission — persisted civic report and optional evidence capture. */
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LocationPicker } from "@/components/LocationPicker";

export default function SubmitChallenge() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [files, setFiles] = useState<File[]>([]);
  const [createdId, setCreatedId] = useState<number | null>(null);
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
    const data = new FormData(event.currentTarget);
    try {
      const result = await submitMutation.mutateAsync({
        citizenName: text(data, "citizenName")!,
        citizenEmail: text(data, "citizenEmail"),
        citizenPhone: text(data, "citizenPhone"),
        title: text(data, "title")!,
        description: text(data, "description")!,
        domain: text(data, "domain")!,
        district: text(data, "district")!,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
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
          uploaderName: text(data, "citizenName")!,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          base64,
        });
      }
      setCreatedId(result.id);
    } catch (error) {
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
            <CheckCircle2 className="mx-auto text-[#42684b]" size={42} />
            <p className="mt-6 font-mono-ui text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#c74920]">
              Submission recorded
            </p>
            <h1 className="mt-5 font-display text-[4.3rem] font-medium leading-[0.86] tracking-[-0.04em]">
              Thank you for speaking up.
            </h1>
            <p className="mt-7 font-body text-[1rem] leading-relaxed text-[#496257]">
              Your challenge and any uploaded evidence are now in the Samadhan
              review workflow. You can edit the record or follow its handoff
              from your citizen view.
            </p>
            <a
              href={`/citizen/challenges/${createdId}`}
              className="rounded-full mt-10 inline-flex bg-[#c94a20] px-7 py-4 font-mono-ui text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-white"
            >
              Open my challenge record
            </a>
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
      <section className="px-6 py-10 sm:px-10 lg:py-9">
        <div className="mx-auto max-w-[43rem]">
          <div className="text-center">
            <h1 className="font-display text-[3.8rem] font-medium leading-[0.88] tracking-[-0.04em] sm:text-[4.6rem]">
              Report a Challenge.
            </h1>
            <span className="mx-auto mt-5 block h-[2px] w-10 bg-[#c94a20]" />
          </div>
          <form
            onSubmit={submit}
            className="mt-7 border border-[#9d876a]/60 bg-[#f7f0e5]/30 p-6 sm:p-9"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Your name">
                <input
                  required
                  name="citizenName"
                  defaultValue={user?.displayName ?? ""}
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
                defaultValue={user?.email ?? ""}
                className="citizen-input"
                placeholder="you@example.com"
              />
            </FormField>
            <FormField label="Title">
              <input
                required
                name="title"
                className="citizen-input"
                placeholder="Enter a short, clear title for the challenge"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                required
                name="description"
                className="citizen-input min-h-[7.5rem] resize-y"
                placeholder="Describe what, when, where, and how the issue affects the community."
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Domain">
                <select
                  required
                  name="domain"
                  defaultValue=""
                  className="citizen-input"
                >
                  <option value="" disabled>
                    Select domain
                  </option>
                  <option>Water</option>
                  <option>Education</option>
                  <option>Health</option>
                  <option>Agriculture</option>
                  <option>Infrastructure</option>
                  <option>Livelihoods</option>
                </select>
              </FormField>
              <FormField label="District">
                <input
                  required
                  name="district"
                  value={district}
                  onChange={event => {
                    setDistrict(event.target.value);
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
                  (optional, helps route your report faster)
                </span>
              </p>
              <LocationPicker className="mt-2" onChange={handleLocationPick} />
            </div>
            <div>
              <p className="font-mono-ui text-[0.63rem] font-semibold uppercase tracking-[0.13em] text-[#243f34]">
                Evidence{" "}
                <span className="font-normal text-[#68776f]">(optional)</span>
              </p>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={event =>
                  setFiles(Array.from(event.target.files ?? []).slice(0, 5))
                }
              />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="mt-2 flex min-h-[8rem] w-full flex-col items-center justify-center border border-dashed border-[#9b856b]/70 bg-[#faf6ee]/35 px-5 text-center transition hover:bg-[#f4eadd]"
              >
                <Upload size={22} strokeWidth={1.35} />
                <span className="mt-3 font-body text-[0.78rem] text-[#334c41]">
                  Attach photographs or documents
                </span>
                <span className="mt-1 font-body text-[0.72rem] text-[#66766e]">
                  Up to five files, 5 MB each
                </span>
              </button>
              {files.length > 0 && (
                <p className="mt-2 font-body text-[0.7rem] text-[#476458]">
                  Selected: {files.map(file => file.name).join(", ")}
                </p>
              )}
            </div>
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
