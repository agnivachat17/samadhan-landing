/**
 * Style: Samadhan public challenge directory — editorial paper ledger, evergreen district rail,
 * serif issue headlines, and ember micro-accents for public civic participation.
 */
import {
  AlertTriangle,
  ArrowUp,
  Briefcase,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  Droplets,
  HeartPulse,
  Leaf,
  Loader2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import PublicPortalHeader from "@/components/PublicPortalHeader";
import { AuthRequiredDialog } from "@/components/AuthRequiredDialog";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  JHARKHAND_CENTER,
  JHARKHAND_DISTRICTS,
} from "@/lib/jharkhandDistricts";

const DOMAINS = [
  "Water",
  "Education",
  "Health",
  "Agriculture",
  "Infrastructure",
  "Livelihoods",
] as const;
type CanonicalDomain = (typeof DOMAINS)[number];

type Challenge = {
  id: number;
  title: string;
  description: string;
  domain: string;
  district: string;
  status: string;
  upvoteCount?: number;
  createdAt?: Date | string | null;
};

const statusStyle: Record<string, string> = {
  submitted: "bg-[#dce6eb] text-[#2d6581]",
  under_review: "bg-[#f3e5bd] text-[#a2731c]",
  assigned: "bg-[#f3e5bd] text-[#a2731c]",
  in_progress: "bg-[#f7e4da] text-[#b05835]",
  resolved: "bg-[#dce6d0] text-[#537246]",
  rejected: "bg-[#ecdcd8] text-[#8a4433]",
};
const domainIcon: Record<CanonicalDomain, React.ReactNode> = {
  Water: <Droplets />,
  Education: <BookOpen />,
  Health: <HeartPulse />,
  Agriculture: <Leaf />,
  Infrastructure: <Building2 />,
  Livelihoods: <Briefcase />,
};
const domainTone: Record<CanonicalDomain, string> = {
  Water: "text-[#2877a4]",
  Education: "text-[#b88119]",
  Health: "text-[#b14e2d]",
  Agriculture: "text-[#5b854a]",
  Infrastructure: "text-[#7a6a4c]",
  Livelihoods: "text-[#6a5a9c]",
};

/**
 * The live challenge dataset carries a different (and inconsistent) domain
 * taxonomy than the six categories shown as filter pills — e.g. "Livelihood"
 * (singular, from older seed data) vs "Livelihoods", and a handful of
 * infrastructure-flavoured values (Mobility/Waste/Accessibility/Safety/
 * "Digital access") that never map to a pill directly. Normalizing here
 * means every challenge still lands in exactly one filterable bucket instead
 * of silently falling out of every category filter except "All". The raw
 * value is still shown as the visible domain label — only the *bucketing*
 * is normalized, not the displayed text.
 */
function normalizeDomain(raw: string): CanonicalDomain {
  const key = raw.trim().toLowerCase();
  if (key === "water") return "Water";
  if (key === "education") return "Education";
  if (key === "health" || key === "healthcare") return "Health";
  if (key === "agriculture" || key === "farming") return "Agriculture";
  if (key === "livelihood" || key === "livelihoods") return "Livelihoods";
  // Mobility, Waste, Accessibility, Safety, "Digital access", and any other
  // civic-infrastructure-flavoured value bucket under Infrastructure rather
  // than being dropped from every specific filter.
  return "Infrastructure";
}

/**
 * Keyed by the *raw* domain value (not the canonical filter bucket), because
 * several raw domains that share a filter bucket (Mobility/Waste/Accessibility/
 * Safety/"Digital access" all normalize into "Infrastructure") each have their
 * own distinct, verified photo rather than inheriting one generic bucket image.
 *
 * Every entry here was confirmed by actually opening the asset, not by
 * trusting its filename:
 * - "…education…" is in fact an aerial farmland/village photo with zero
 *   connection to education — used for Agriculture instead, which it
 *   genuinely depicts. The real education photo below was supplied separately.
 * - "…road…" is a clean, undamaged highway. It fails the bar for a
 *   road-*damage* thumbnail, but is honestly reused for Mobility once the
 *   demo content there is about missing pedestrian/transit infrastructure
 *   rather than pavement damage (see the seeded Mobility copy).
 * - `waste-collection-point.jpg` arrived encoded as AVIF despite its `.jpg`
 *   name and was re-encoded to a real JPEG in place, so it renders reliably
 *   from a static host that sets `Content-Type` from the file extension.
 * Every raw demo domain now has a verified photo — no curated demo challenge
 * should fall back to the icon tile.
 */
const rawDomainPhoto: Record<string, string> = {
  Water: "/images/challenge-water_adcdbde2.jpg",
  Health: "/images/challenge-health_e96d7d9c.jpg",
  Agriculture: "/images/challenge-education_f5e0518c.jpg",
  Mobility: "/images/challenge-road_5a958fd7.jpg",
  Education: "/images/education-school-access.jpg",
  Waste: "/images/waste-collection-point.jpg",
  Livelihood: "/images/livelihood-informal-work.jpg",
  Accessibility: "/images/accessibility-no-ramp.jpg",
  Safety: "/images/safety-unlit-road.jpg",
  "Digital access": "/images/digital-access-connectivity.jpg",
};

/**
 * Per-challenge overrides, keyed by the challenge's numeric `id`. Used where
 * we have enough real, distinct photography to give specific challenges their
 * own image instead of sharing one generic domain photo — currently the five
 * seeded Water challenges, each paired with a genuinely different water-access
 * scene rather than all five reusing the same picture.
 */
const challengePhotoOverride: Record<number, string> = {
  730010: "/images/detail-water-community_46a3bfbe.jpg",
  730020: "/images/detail-water-containers_6a1dee03.jpg",
  730030: "/images/detail-water-tanker_cee68d25.jpg",
  730040: "/images/detail-water-well_1d910e69.jpg",
};

export default function Challenges() {
  const { user, loading: authLoading } = useAuth();
  const [category, setCategory] = useState<"All" | (typeof DOMAINS)[number]>(
    "All"
  );
  const [district, setDistrict] = useState("All Districts");
  const [query, setQuery] = useState("");
  const [districtMenuOpen, setDistrictMenuOpen] = useState(false);
  const [authPromptChallenge, setAuthPromptChallenge] =
    useState<Challenge | null>(null);
  const [optimisticUpvotes, setOptimisticUpvotes] = useState<Set<number>>(
    new Set()
  );
  const [pendingUpvoteId, setPendingUpvoteId] = useState<number | null>(null);

  const [input] = useState({});
  const challengesQuery = trpc.workflow.challenges.useQuery(input);
  const organizationsQuery = trpc.workflow.organizations.useQuery(input);
  const challenges = (challengesQuery.data ?? []) as Challenge[];
  const supportsQuery = trpc.workflow.challengeSupports.useQuery(
    { supporterEmail: user?.email ?? "" },
    { enabled: !!user?.email }
  );
  const utils = trpc.useUtils();
  const upvotedIds = useMemo(
    () =>
      new Set(
        (supportsQuery.data ?? [])
          .filter(support => support.kind === "upvote")
          .map(support => support.challengeId)
      ),
    [supportsQuery.data]
  );
  const corroboratedIds = useMemo(
    () =>
      new Set(
        (supportsQuery.data ?? [])
          .filter(support => support.kind === "corroborate")
          .map(support => support.challengeId)
      ),
    [supportsQuery.data]
  );
  const disputedIds = useMemo(
    () =>
      new Set(
        (supportsQuery.data ?? [])
          .filter(support => support.kind === "dispute")
          .map(support => support.challengeId)
      ),
    [supportsQuery.data]
  );
  const upvoteMutation = trpc.workflow.upvoteChallenge.useMutation({
    onSuccess: (result, variables) => {
      void utils.workflow.challenges.invalidate();
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: variables.supporterEmail,
      });
      if (result.duplicate) return;
    },
    onError: (error, variables) => {
      setOptimisticUpvotes(prev => {
        const next = new Set(prev);
        next.delete(variables.challengeId);
        return next;
      });
      toast.error("Couldn't record your upvote", {
        description: error.message,
      });
    },
    onSettled: () => setPendingUpvoteId(null),
  });

  const unvoteMutation = trpc.workflow.unvoteChallenge.useMutation({
    onSuccess: (result, variables) => {
      void utils.workflow.challenges.invalidate();
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: variables.supporterEmail,
      });
    },
    onError: error => {
      toast.error("Couldn't remove your upvote", {
        description: error.message,
      });
    },
    onSettled: () => setPendingUpvoteId(null),
  });

  const supportMutation = trpc.workflow.supportChallenge.useMutation({
    onSuccess: () => {
      void utils.workflow.challenges.invalidate();
      void utils.workflow.challengeSupports.invalidate({
        supporterEmail: user?.email ?? "",
      });
    },
    onError: error => {
      toast.error("Couldn't record your response", { description: error.message });
    },
  });
  function handleSupport(challengeId: number, kind: "corroborate" | "dispute") {
    if (authLoading || !user?.email) return;
    supportMutation.mutate({
      challengeId,
      supporterEmail: user.email,
      kind,
    });
  }

  function handleUpvote(challenge: Challenge) {
    // Auth state resolves asynchronously on load — treat "still loading" as
    // its own state, never as "guest", or a real session gets bounced into
    // the sign-in prompt for a split second on every page load.
    if (authLoading) return;
    if (!user) {
      setAuthPromptChallenge(challenge);
      return;
    }
    if (!user.email) {
      toast.error("Your account has no email on file.");
      return;
    }
    // If already upvoted, unvote
    if (upvotedIds.has(challenge.id) || optimisticUpvotes.has(challenge.id)) {
      setOptimisticUpvotes(prev => {
        const next = new Set(prev);
        next.delete(challenge.id);
        return next;
      });
      setPendingUpvoteId(challenge.id);
      unvoteMutation.mutate({
        challengeId: challenge.id,
        supporterEmail: user.email,
      });
      return;
    }
    setOptimisticUpvotes(prev => new Set(prev).add(challenge.id));
    setPendingUpvoteId(challenge.id);
    upvoteMutation.mutate({
      challengeId: challenge.id,
      supporterEmail: user.email,
    });
  }

  // Category + search only — this is what the district map's per-district
  // counts are based on, so the map stays a useful "pick a different
  // district" tool instead of always showing zero everywhere except the
  // currently-selected district once that filter is also applied.
  const categoryAndSearchFiltered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return challenges.filter(challenge => {
      const categoryMatches =
        category === "All" || normalizeDomain(challenge.domain) === category;
      const textMatches =
        !term ||
        `${challenge.title} ${challenge.description} ${challenge.district} ${challenge.domain}`
          .toLowerCase()
          .includes(term);
      return categoryMatches && textMatches;
    });
  }, [challenges, category, query]);
  const districtCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const challenge of categoryAndSearchFiltered)
      counts.set(challenge.district, (counts.get(challenge.district) ?? 0) + 1);
    return counts;
  }, [categoryAndSearchFiltered]);
  const districtMarkers: MapMarker[] = useMemo(
    () =>
      JHARKHAND_DISTRICTS.map(item => {
        const count = districtCounts.get(item.name) ?? 0;
        return {
          id: item.name,
          lat: item.lat,
          lng: item.lng,
          label: item.name,
          color: count > 0 ? "#c94a20" : "#8a9a86",
          size: count > 0 ? Math.min(28, 12 + count * 4) : 8,
          active: district === item.name,
          onClick: () => setDistrict(item.name),
        };
      }),
    [districtCounts, district]
  );
  const visibleChallenges = useMemo(
    () =>
      categoryAndSearchFiltered.filter(
        challenge =>
          district === "All Districts" || challenge.district === district
      ),
    [categoryAndSearchFiltered, district]
  );

  const districtsActive = useMemo(
    () => new Set(challenges.map(c => c.district)).size,
    [challenges]
  );
  const verifiedOrganizations = (organizationsQuery.data ?? []).filter(
    org => org.verificationStatus === "verified"
  ).length;

  // Fetch actual evidence images for thumbnails
  const evidenceIds = useMemo(() => challenges.map(c => c.id), [challenges]);
  const evidenceQuery = trpc.workflow.firstEvidencePerChallenge.useQuery(
    { challengeIds: evidenceIds },
    { enabled: evidenceIds.length > 0 }
  );
  const evidenceImages = evidenceQuery.data ?? new Map();

  return (
    <main className="min-h-screen bg-[#f1eadc] text-[#102e24]">
      <PublicPortalHeader />
      <div className="lg:grid lg:min-h-[calc(100vh-98px)] lg:grid-cols-[23.5rem_1fr]">
        <aside className="relative overflow-hidden bg-[#052d21] px-6 py-9 text-[#f4efe3] sm:px-10 lg:min-h-[calc(100vh-98px)] lg:px-8 lg:py-12">
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(68,112,77,0.32),transparent_40%),radial-gradient(circle_at_82%_78%,rgba(16,62,46,0.7),transparent_42%)]"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="font-mono-ui text-[0.65rem] font-medium uppercase tracking-[0.17em] text-[#c5d0aa]">
              Challenges by district
            </p>
            <div className="relative mt-5">
              <button
                type="button"
                onClick={() => setDistrictMenuOpen(open => !open)}
                className="rounded-full flex w-full items-center justify-between border border-[#bdc9a8]/45 bg-[#062f22]/45 px-4 py-4 text-left font-body text-[0.9rem] text-[#f4efe3] transition-colors hover:bg-[#0d3b2d]"
                aria-expanded={districtMenuOpen}
              >
                {district}
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-200 ${districtMenuOpen ? "rotate-180" : ""}`}
                />
              </button>
              {districtMenuOpen && (
                <div className="absolute z-20 mt-2 max-h-[18rem] w-full overflow-y-auto border border-[#bdc9a8]/35 bg-[#0b392a] p-1 shadow-2xl">
                  {[
                    "All Districts",
                    ...JHARKHAND_DISTRICTS.map(d => d.name),
                  ].map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setDistrict(item);
                        setDistrictMenuOpen(false);
                      }}
                      className="block w-full px-3 py-2.5 text-left font-body text-[0.82rem] text-[#d9e0c9] transition-colors hover:bg-[#1a4b39] hover:text-white"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-10 h-[16rem] z-10 w-full overflow-hidden border border-[#bdc9a8]/35 lg:mt-12">
              <InteractiveMap
                center={JHARKHAND_CENTER}
                zoom={6.4}
                markers={districtMarkers}
                minimalControls
                blurred={!!authPromptChallenge}
              />
            </div>
            <div className="mt-10 divide-y divide-[#b7c29e]/25 border-y border-[#b7c29e]/25 lg:mt-12">
              <RailStatistic
                value={challenges.length.toLocaleString()}
                label="Challenges submitted"
              />
              <RailStatistic
                value={String(districtsActive)}
                label="Districts active"
              />
              <RailStatistic
                value={String(verifiedOrganizations)}
                label="Institutions & partners engaged"
              />
            </div>
          </div>
        </aside>

        <section
          className="bg-[#f1eadc] px-6 py-9 sm:px-10 lg:px-[2.7rem] lg:py-8"
          style={{
            backgroundImage: "url('/images/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
        >
          <div className="mx-auto max-w-[78rem]">
            <div className="flex flex-col justify-between gap-5 border-b border-[#af9674]/45 pb-7 xl:flex-row xl:items-center">
              <div className="flex flex-wrap gap-2.5">
                {(["All", ...DOMAINS] as const).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-full border px-5 py-2.5 font-body text-[0.86rem] transition duration-200 ${category === item ? "border-[#cd4a1d] bg-[#cd4a1d] text-white shadow-[0_7px_15px_rgba(142,53,21,0.12)]" : "border-[#8d806b]/60 bg-[#f7f0e5]/45 text-[#233f35] hover:border-[#587364] hover:bg-[#f8f3ea]"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <label className="flex w-full max-w-[20rem] items-center gap-3 border border-[#9d8f78]/60 bg-[#fbf6ec]/45 px-3.5 py-3 text-[#61736a] xl:w-[19.5rem]">
                <Search size={19} strokeWidth={1.45} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Search challenges..."
                  className="min-w-0 flex-1 bg-transparent font-body text-[0.82rem] text-[#1f3c32] outline-none placeholder:text-[#7d8b83]"
                />
              </label>
            </div>

            {!challengesQuery.isLoading && !challengesQuery.isError && (
              <p className="mt-5 font-body text-[0.8rem] text-[#4c6359]">
                Showing {visibleChallenges.length} of {challenges.length}{" "}
                challenges
              </p>
            )}
            <div className="hidden grid-cols-[minmax(23rem,1.8fr)_0.72fr_0.55fr_0.7fr_0.4fr] gap-5 border-b border-[#af9674]/35 py-5 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[#2b4339] lg:grid">
              <span>Challenge</span>
              <span>Domain</span>
              <span>District</span>
              <span>Status</span>
              <span className="text-right">Upvotes</span>
            </div>

            {challengesQuery.isLoading ? (
              <Loading />
            ) : challengesQuery.isError ? (
              <Failure
                message={challengesQuery.error.message}
                retry={() => void challengesQuery.refetch()}
              />
            ) : (
              <div>
                {visibleChallenges.map(challenge => (
                  <ChallengeRow
                    key={challenge.id}
                    challenge={challenge}
                    isUpvoted={
                      upvotedIds.has(challenge.id) ||
                      optimisticUpvotes.has(challenge.id)
                    }
                    isPending={pendingUpvoteId === challenge.id}
                    displayCount={
                      (challenge.upvoteCount ?? 0) +
                      (optimisticUpvotes.has(challenge.id) &&
                      !upvotedIds.has(challenge.id)
                        ? 1
                        : 0)
                    }
                    onUpvote={() => handleUpvote(challenge)}
                    evidenceImages={evidenceImages}
                    isCorroborated={corroboratedIds.has(challenge.id)}
                    isDisputed={disputedIds.has(challenge.id)}
                    onCorroborate={() => handleSupport(challenge.id, "corroborate")}
                    onDispute={() => handleSupport(challenge.id, "dispute")}
                  />
                ))}
                {visibleChallenges.length === 0 && (
                  <div className="py-24 text-center">
                    <p className="font-display text-[2.25rem] leading-none">
                      No challenges found.
                    </p>
                    <p className="mt-3 font-body text-sm text-[#577066]">
                      {category !== "All" ||
                      district !== "All Districts" ||
                      query
                        ? "Try a different category, district, or search term."
                        : "No challenges have been reported yet."}
                    </p>
                    {(category !== "All" ||
                      district !== "All Districts" ||
                      query) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCategory("All");
                          setDistrict("All Districts");
                          setQuery("");
                        }}
                        className="rounded-full mt-5 border border-[#8d806b]/60 px-5 py-2.5 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[#365649] transition hover:bg-[#e5dfd1]"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <AuthRequiredDialog
        open={!!authPromptChallenge}
        onOpenChange={open => !open && setAuthPromptChallenge(null)}
        description={
          <>
            Create an account or log in to upvote{" "}
            <strong className="font-semibold text-[#173d30]">
              "{authPromptChallenge?.title}"
            </strong>{" "}
            and follow its progress.
          </>
        }
      />
    </main>
  );
}

function ChallengeRow({
  challenge,
  isUpvoted,
  isPending,
  displayCount,
  onUpvote,
  evidenceImages,
  isCorroborated,
  isDisputed,
  onCorroborate,
  onDispute,
}: {
  challenge: Challenge;
  isUpvoted: boolean;
  isPending: boolean;
  displayCount: number;
  onUpvote: () => void;
  evidenceImages: Map<number, string>;
  isCorroborated: boolean;
  isDisputed: boolean;
  onCorroborate: () => void;
  onDispute: () => void;
}) {
  const normalized = normalizeDomain(challenge.domain);
  const icon = domainIcon[normalized];
  const iconTone = domainTone[normalized];
  // Use actual uploaded evidence image first, fall back to domain photo
  const photo =
    evidenceImages.get(challenge.id) ??
    challengePhotoOverride[challenge.id] ??
    rawDomainPhoto[challenge.domain];
  const label = challenge.status.replaceAll("_", " ");
  const chipStyle =
    statusStyle[challenge.status] ?? "bg-[#e6ddc9] text-[#5c6a5f]";
  return (
    <article className="grid gap-5 border-b border-[#af9674]/35 py-5 lg:grid-cols-[minmax(23rem,1.8fr)_0.72fr_0.55fr_0.7fr_0.4fr] lg:items-center lg:gap-5">
      <div className="flex gap-4">
        <a
          href={`/challenges/${challenge.id}`}
          className="block aspect-[4/3] w-[6.5rem] shrink-0 overflow-hidden rounded-lg border border-[#a58c6d]/30 shadow-[0_1px_3px_rgba(21,42,33,0.12)] sm:w-[8rem]"
        >
          {photo ? (
            <img
              src={photo}
              alt=""
              loading="lazy"
              className="size-full object-cover object-center grayscale-[0.1] sepia-[0.08] transition duration-300 ease-out hover:scale-[1.04] hover:grayscale-0 hover:sepia-0"
            />
          ) : (
            <span
              className={`grid size-full place-items-center bg-gradient-to-br from-[#eee5d1] to-[#e2d6b8] transition duration-200 hover:brightness-95 [&_svg]:size-6 sm:[&_svg]:size-7 ${iconTone}`}
            >
              {icon}
            </span>
          )}
        </a>
        <div>
          <a href={`/challenges/${challenge.id}`} className="group">
            <h2 className="max-w-[26rem] font-display text-[1.25rem] font-medium leading-none tracking-[-0.02em] transition-colors group-hover:text-[#bd4d26] sm:text-[1.4rem]">
              {challenge.title}
            </h2>
          </a>
          <p className="mt-2 max-w-[25rem] font-body text-[0.76rem] leading-[1.45] text-[#5c6a61] sm:text-[0.8rem]">
            {challenge.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
            <Domain icon={icon} tone={iconTone} category={challenge.domain} />
            <span className="font-body text-sm text-[#274438]">
              {challenge.district}
            </span>
            <StatusChip label={label} className={chipStyle} />
          </div>
        </div>
      </div>
      <div className="hidden lg:block">
        <Domain icon={icon} tone={iconTone} category={challenge.domain} />
      </div>
      <div className="hidden font-body text-[0.87rem] text-[#274438] lg:block">
        {challenge.district}
      </div>
      <div className="hidden lg:block">
        <StatusChip label={label} className={chipStyle} />
      </div>
      <motion.button
        type="button"
        onClick={onUpvote}
        disabled={isPending}
        whileTap={isPending ? undefined : { scale: 0.92 }}
        aria-pressed={isUpvoted}
        className={`ml-auto inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-body text-[1.02rem] font-bold tabular-nums transition-colors duration-200 lg:justify-self-end ${
          isUpvoted
            ? "bg-[#c94a20] text-white"
            : "text-[#1a3329] hover:bg-[#e9dfcb]"
        } ${isPending ? "opacity-70" : ""}`}
      >
        <motion.span
          key={displayCount}
          initial={{ y: -6, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {displayCount}
        </motion.span>
        {isPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <ArrowUp
            size={20}
            strokeWidth={1.75}
            className={isUpvoted ? "text-white" : "text-[#cb5129]"}
          />
        )}
        <span className="sr-only">
          {isUpvoted ? "Unvote" : "Upvote"} {challenge.title}
        </span>
      </motion.button>
      {/* USP-11: Community corroboration — "I've seen this too" / "Already resolved" */}
      <div className="flex items-center gap-2 lg:justify-self-end">
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onCorroborate();
          }}
          title="I've seen this too"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 font-body text-[0.78rem] transition ${isCorroborated ? "border-[#2e6849] bg-[#e6ede3] text-[#1d3a2f] font-semibold" : "border-[#a58c6d]/40 text-[#5e7966] hover:bg-[#e5dfd1]"}`}
        >
          <CheckCircle2 size={15} className={isCorroborated ? "text-[#2e6849]" : ""} />
          {challenge.id in ({} as any) ? null : null}
          {isCorroborated ? "Seen" : "Seen this?"}
        </button>
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDispute();
          }}
          title="This looks already resolved"
          className={`flex items-center gap-1.5 rounded-full border px-3 py-2 font-body text-[0.78rem] transition ${isDisputed ? "border-[#bd5a38] bg-[#f7e2d6] text-[#934325] font-semibold" : "border-[#a58c6d]/40 text-[#5e7966] hover:bg-[#f7e2d6]/40"}`}
        >
          <AlertTriangle size={15} className={isDisputed ? "text-[#bd5a38]" : ""} />
          {isDisputed ? "Flagged" : "Resolved?"}
        </button>
      </div>
    </article>
  );
}

function Domain({
  icon,
  tone,
  category,
}: {
  icon: React.ReactNode;
  tone: string;
  category: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-body text-[0.82rem] text-[#263f35] ${tone}`}
    >
      {icon}
      <span className="text-[#263f35]">{category}</span>
    </span>
  );
}
function StatusChip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex px-3 py-1.5 font-mono-ui text-[0.57rem] font-semibold uppercase tracking-[0.1em] ${className}`}
    >
      {label}
    </span>
  );
}
function RailStatistic({ value, label }: { value: string; label: string }) {
  return (
    <div className="py-5">
      <p className="font-body text-[2.1rem] font-bold leading-none tracking-[-0.02em] tabular-nums text-[#d4dcba]">
        {value}
      </p>
      <p className="mt-2 font-body text-[0.79rem] text-[#c1cdaa]">{label}</p>
    </div>
  );
}
function Loading() {
  return (
    <div className="flex items-center gap-3 py-16 font-body text-[#52675d]">
      <Loader2 className="animate-spin" size={18} />
      Loading challenges…
    </div>
  );
}
function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div
      role="alert"
      className="mt-6 border border-[#bd5a38]/60 bg-[#f7e2d6]/35 p-6"
    >
      <p className="font-body text-[0.76rem] text-[#934325]">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-full mt-3 border border-[#bd5a38]/60 px-3 py-2 font-mono-ui text-[0.54rem] font-semibold uppercase tracking-[0.08em] text-[#a54426]"
      >
        Retry
      </button>
    </div>
  );
}
