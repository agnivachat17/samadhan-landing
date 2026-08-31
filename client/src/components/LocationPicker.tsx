import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { InteractiveMap } from "@/components/InteractiveMap";
import { JHARKHAND_CENTER } from "@/lib/jharkhandDistricts";

interface LocationPickerProps {
  className?: string;
  onChange: (value: {
    latitude: string;
    longitude: string;
    district?: string;
  }) => void;
}

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | undefined> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!response.ok) return undefined;
    const data = await response.json();
    return (
      data?.address?.county ||
      data?.address?.state_district ||
      data?.address?.city_district ||
      data?.address?.city
    );
  } catch {
    return undefined;
  }
}

/** Click-to-drop-pin location picker that reverse-geocodes the pick into a district name. */
export function LocationPicker({ className, onChange }: LocationPickerProps) {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [resolving, setResolving] = useState(false);

  async function handlePick(picked: { lat: number; lng: number }) {
    setLocation(picked);
    onChange({
      latitude: picked.lat.toFixed(6),
      longitude: picked.lng.toFixed(6),
    });
    setResolving(true);
    const district = await reverseGeocode(picked.lat, picked.lng);
    setResolving(false);
    if (district) {
      onChange({
        latitude: picked.lat.toFixed(6),
        longitude: picked.lng.toFixed(6),
        district: district.replace(/\s*district$/i, ""),
      });
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(position => {
      void handlePick({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }

  return (
    <div className={className}>
      <div className="relative h-[16rem] w-full border border-[#9d876a]/60">
        <InteractiveMap
          center={JHARKHAND_CENTER}
          zoom={7}
          pickable
          pickedLocation={location}
          onPick={location_ => void handlePick(location_)}
        />
        <button
          type="button"
          onClick={useMyLocation}
          className="rounded-full absolute right-3 top-3 z-10 inline-flex items-center gap-2 bg-[#f7f1e7] px-3 py-2 font-mono-ui text-[0.58rem] font-semibold uppercase tracking-[0.1em] text-[#2b493d] shadow"
        >
          <LocateFixed size={14} />
          Use my location
        </button>
      </div>
      <p className="mt-2 font-body text-[0.72rem] text-[#66766e]">
        {location
          ? resolving
            ? "Locating district…"
            : `Pinned at ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
          : "Click the map to pin the challenge's exact location (optional)."}
      </p>
    </div>
  );
}
