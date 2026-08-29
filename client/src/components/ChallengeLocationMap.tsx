import { InteractiveMap } from "@/components/InteractiveMap";
import { findDistrictCentroid } from "@/lib/jharkhandDistricts";

interface ChallengeLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
  district: string;
  className?: string;
}

/** Read-only map pin for a challenge's location — uses the precise lat/lng when a citizen
 * pinned one, otherwise falls back to the district centroid so older records still render. */
export function ChallengeLocationMap({
  latitude,
  longitude,
  district,
  className,
}: ChallengeLocationMapProps) {
  const precise =
    latitude && longitude
      ? { lat: Number(latitude), lng: Number(longitude) }
      : undefined;
  const fallback = findDistrictCentroid(district);
  const point =
    precise ??
    (fallback ? { lat: fallback.lat, lng: fallback.lng } : undefined);
  if (!point) return null;
  return (
    <div className={className}>
      <p className="font-mono-ui text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[#566a60]">
        {precise
          ? "Reported location"
          : `Approximate location · ${district} district`}
      </p>
      <div className="mt-2 h-[12rem] w-full border border-[#a58c6d]/45">
        <InteractiveMap
          center={point}
          zoom={precise ? 12 : 8}
          markers={[
            { id: "location", lat: point.lat, lng: point.lng, pulse: true },
          ]}
          minimalControls
        />
      </div>
    </div>
  );
}
