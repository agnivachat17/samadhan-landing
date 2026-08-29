/**
 * Style: Samadhan public challenge directory — editorial paper ledger, evergreen district rail,
 * serif issue headlines, and ember micro-accents for public civic participation.
 */
import {
  ArrowUp,
  BookOpen,
  Building2,
  ChevronDown,
  Droplets,
  HeartPulse,
  Leaf,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { InteractiveMap, type MapMarker } from "@/components/InteractiveMap";
import PublicPortalHeader from "@/components/PublicPortalHeader";
import {
  JHARKHAND_CENTER,
  JHARKHAND_DISTRICTS,
} from "@/lib/jharkhandDistricts";

type ChallengeCategory =
  "Water" | "Education" | "Health" | "Agriculture" | "Infrastructure";
type ChallengeStatus = "Submitted" | "Assigned" | "In progress" | "Resolved";

type Challenge = {
  id: number;
  title: string;
  description: string;
  category: ChallengeCategory;
  district: string;
  status: ChallengeStatus;
  votes: number;
  image: string;
};

const challenges: Challenge[] = [
  {
    id: 1,
    title: "Irregular water supply in Kanke locality",
    description:
      "Residents face shortage of drinking water for more than 3 days every week.",
    category: "Water",
    district: "Ranchi",
    status: "Submitted",
    votes: 128,
    image: "/manus-storage/challenge-water_adcdbde2.jpg",
  },
  {
    id: 2,
    title: "Shortage of teachers in Government Middle School",
    description: "High student-teacher ratio affecting learning outcomes.",
    category: "Education",
    district: "Dumka",
    status: "Assigned",
    votes: 96,
    image: "/manus-storage/challenge-education_f5e0518c.jpg",
  },
  {
    id: 3,
    title: "Lack of primary healthcare facility in remote villages",
    description: "Villagers travel long distances for even basic medical care.",
    category: "Health",
    district: "Latehar",
    status: "In progress",
    votes: 74,
    image: "/manus-storage/challenge-health_e96d7d9c.jpg",
  },
  {
    id: 4,
    title: "Need for irrigation support for farmers",
    description: "Insufficient irrigation leads to crop loss during summer.",
    category: "Agriculture",
    district: "Palamu",
    status: "Resolved",
    votes: 210,
    image: "/manus-storage/challenge-agriculture_3ff32416.jpg",
  },
  {
    id: 5,
    title: "Poor road condition in village connecting main road",
    description: "Damaged roads make commuting and transportation difficult.",
    category: "Infrastructure",
    district: "Giridih",
    status: "Submitted",
    votes: 53,
    image: "/manus-storage/challenge-road_5a958fd7.jpg",
  },
];

const categoryLabels = [
  "All",
  "Water",
  "Education",
  "Health",
  "Agriculture",
] as const;
const districts = [
  "All Districts",
  "Ranchi",
  "Dumka",
  "Latehar",
  "Palamu",
  "Giridih",
];

export default function Challenges() {
  const [category, setCategory] =
    useState<(typeof categoryLabels)[number]>("All");
  const [district, setDistrict] = useState("All Districts");
  const [query, setQuery] = useState("");
  const [districtMenuOpen, setDistrictMenuOpen] = useState(false);
  const [upvoteTarget, setUpvoteTarget] = useState<Challenge | null>(null);

  const districtCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const challenge of challenges)
      counts.set(challenge.district, (counts.get(challenge.district) ?? 0) + 1);
    return counts;
  }, []);
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
  const visibleChallenges = useMemo(() => {
    const term = query.trim().toLowerCase();
    return challenges.filter(challenge => {
      const categoryMatches =
        category === "All" || challenge.category === category;
      const districtMatches =
        district === "All Districts" || challenge.district === district;
      const textMatches =
        !term ||
        `${challenge.title} ${challenge.description} ${challenge.district} ${challenge.category}`
          .toLowerCase()
          .includes(term);
      return categoryMatches && districtMatches && textMatches;
    });
  }, [category, district, query]);

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
                <div className="absolute z-20 mt-2 w-full border border-[#bdc9a8]/35 bg-[#0b392a] p-1 shadow-2xl">
                  {districts.map(item => (
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
            <div className="mt-10 h-[16rem] w-full overflow-hidden border border-[#bdc9a8]/35 lg:mt-12">
              <InteractiveMap
                center={JHARKHAND_CENTER}
                zoom={6.4}
                markers={districtMarkers}
                minimalControls
              />
            </div>
            <div className="mt-10 divide-y divide-[#b7c29e]/25 border-y border-[#b7c29e]/25 lg:mt-12">
              <RailStatistic value="2,847" label="Challenges submitted" />
              <RailStatistic value="34" label="Districts active" />
              <RailStatistic value="112" label="Universities engaged" />
            </div>
          </div>
        </aside>

        <section
          className="bg-[#f1eadc] px-6 py-9 sm:px-10 lg:px-[2.7rem] lg:py-8"
          style={{
            backgroundImage:
              "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
            backgroundSize: "cover",
          }}
        >
          <div className="mx-auto max-w-[78rem]">
            <div className="flex flex-col justify-between gap-5 border-b border-[#af9674]/45 pb-7 xl:flex-row xl:items-center">
              <div className="flex flex-wrap gap-2.5">
                {categoryLabels.map(item => (
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

            <div className="hidden grid-cols-[minmax(23rem,1.8fr)_0.72fr_0.55fr_0.7fr_0.4fr] gap-5 border-b border-[#af9674]/35 py-5 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-[#2b4339] lg:grid">
              <span>Challenge</span>
              <span>Domain</span>
              <span>District</span>
              <span>Status</span>
              <span className="text-right">Upvotes</span>
            </div>

            <div>
              {visibleChallenges.map(challenge => (
                <ChallengeRow
                  key={challenge.id}
                  challenge={challenge}
                  onUpvote={() => setUpvoteTarget(challenge)}
                />
              ))}
              {visibleChallenges.length === 0 && (
                <div className="py-24 text-center">
                  <p className="font-display text-[2.25rem] leading-none">
                    No challenges found.
                  </p>
                  <p className="mt-3 font-body text-sm text-[#577066]">
                    Try clearing the search or selecting another district.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {upvoteTarget && (
        <UpvotePrompt
          challenge={upvoteTarget}
          onClose={() => setUpvoteTarget(null)}
        />
      )}
    </main>
  );
}

function ChallengeRow({
  challenge,
  onUpvote,
}: {
  challenge: Challenge;
  onUpvote: () => void;
}) {
  const icon =
    challenge.category === "Water" ? (
      <Droplets />
    ) : challenge.category === "Education" ? (
      <BookOpen />
    ) : challenge.category === "Health" ? (
      <HeartPulse />
    ) : challenge.category === "Agriculture" ? (
      <Leaf />
    ) : (
      <Building2 />
    );
  const iconTone =
    challenge.category === "Water"
      ? "text-[#2877a4]"
      : challenge.category === "Education"
        ? "text-[#b88119]"
        : challenge.category === "Health"
          ? "text-[#b14e2d]"
          : challenge.category === "Agriculture"
            ? "text-[#5b854a]"
            : "text-[#b14e2d]";
  const statusStyle =
    challenge.status === "Submitted"
      ? "bg-[#dce6eb] text-[#2d6581]"
      : challenge.status === "Assigned"
        ? "bg-[#f3e5bd] text-[#a2731c]"
        : challenge.status === "In progress"
          ? "bg-[#f7e4da] text-[#b05835]"
          : "bg-[#dce6d0] text-[#537246]";
  return (
    <article className="grid gap-5 border-b border-[#af9674]/35 py-5 lg:grid-cols-[minmax(23rem,1.8fr)_0.72fr_0.55fr_0.7fr_0.4fr] lg:items-center lg:gap-5">
      <div className="flex gap-4">
        <a href={`/challenges/${challenge.id}`} className="shrink-0">
          <img
            src={challenge.image}
            alt=""
            className="size-[4.5rem] object-cover grayscale-[0.18] sepia-[0.12] transition duration-200 hover:brightness-90 sm:size-[5.5rem]"
          />
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
            <Domain icon={icon} tone={iconTone} category={challenge.category} />
            <span className="font-body text-sm text-[#274438]">
              {challenge.district}
            </span>
            <StatusChip label={challenge.status} className={statusStyle} />
          </div>
        </div>
      </div>
      <div className="hidden lg:block">
        <Domain icon={icon} tone={iconTone} category={challenge.category} />
      </div>
      <div className="hidden font-body text-[0.87rem] text-[#274438] lg:block">
        {challenge.district}
      </div>
      <div className="hidden lg:block">
        <StatusChip label={challenge.status} className={statusStyle} />
      </div>
      <button
        type="button"
        onClick={onUpvote}
        className="ml-auto inline-flex items-center gap-2 font-body text-[1.05rem] font-bold tabular-nums text-[#1a3329] transition-colors hover:text-[#c94a20] lg:justify-self-end"
      >
        <span>{challenge.votes}</span>
        <ArrowUp size={20} strokeWidth={1.45} className="text-[#cb5129]" />
        <span className="sr-only">Upvote {challenge.title}</span>
      </button>
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

function UpvotePrompt({
  challenge,
  onClose,
}: {
  challenge: Challenge;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#052a1f]/75 p-5 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upvote-title"
    >
      <div
        className="relative w-full max-w-[33rem] bg-[#f1eadc] p-7 shadow-2xl sm:p-10"
        style={{
          backgroundImage:
            "url('/manus-storage/samadhan-paper-grain_46302c3f.jpg')",
          backgroundSize: "cover",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="rounded-full absolute right-4 top-4 grid size-9 place-items-center border border-[#a48c6d]/55 text-[#2b493d] transition-colors hover:bg-[#e6dcc9]"
          aria-label="Close account prompt"
        >
          <X size={18} />
        </button>
        <div className="grid size-12 place-items-center rounded-full bg-[#dbe5d2] text-[#315947]">
          <ShieldCheck size={24} strokeWidth={1.45} />
        </div>
        <p className="mt-7 font-mono-ui text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-[#c44b24]">
          Support this challenge
        </p>
        <h2
          id="upvote-title"
          className="mt-3 font-display text-[2.6rem] font-medium leading-[0.88] tracking-[-0.03em] text-[#072f22]"
        >
          Your voice counts.
        </h2>
        <p className="mt-5 font-body text-[0.9rem] leading-relaxed text-[#4a655b]">
          Create an account or log in to upvote{" "}
          <strong className="font-semibold text-[#173d30]">
            “{challenge.title}”
          </strong>{" "}
          and follow its progress.
        </p>
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
      </div>
    </div>
  );
}
