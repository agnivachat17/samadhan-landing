export type DistrictCentroid = { name: string; lat: number; lng: number };

/** Approximate centroids for Jharkhand's 24 districts, used to place map markers when a
 * challenge only has a district name (no precise latitude/longitude). */
export const JHARKHAND_DISTRICTS: DistrictCentroid[] = [
  { name: "Bokaro", lat: 23.79, lng: 86.15 },
  { name: "Chatra", lat: 24.21, lng: 84.87 },
  { name: "Deoghar", lat: 24.48, lng: 86.7 },
  { name: "Dhanbad", lat: 23.8, lng: 86.43 },
  { name: "Dumka", lat: 24.27, lng: 87.25 },
  { name: "East Singhbhum", lat: 22.8, lng: 86.2 },
  { name: "Garhwa", lat: 24.15, lng: 83.8 },
  { name: "Giridih", lat: 24.19, lng: 86.3 },
  { name: "Godda", lat: 24.83, lng: 87.21 },
  { name: "Gumla", lat: 23.04, lng: 84.54 },
  { name: "Hazaribagh", lat: 23.99, lng: 85.36 },
  { name: "Jamtara", lat: 23.96, lng: 86.8 },
  { name: "Khunti", lat: 23.07, lng: 85.28 },
  { name: "Koderma", lat: 24.47, lng: 85.59 },
  { name: "Latehar", lat: 23.75, lng: 84.5 },
  { name: "Lohardaga", lat: 23.43, lng: 84.68 },
  { name: "Pakur", lat: 24.63, lng: 87.85 },
  { name: "Palamu", lat: 24.03, lng: 84.07 },
  { name: "Ramgarh", lat: 23.63, lng: 85.52 },
  { name: "Ranchi", lat: 23.36, lng: 85.33 },
  { name: "Sahebganj", lat: 25.25, lng: 87.64 },
  { name: "Seraikela Kharsawan", lat: 22.7, lng: 85.93 },
  { name: "Simdega", lat: 22.62, lng: 84.51 },
  { name: "West Singhbhum", lat: 22.56, lng: 85.33 },
];

export const JHARKHAND_CENTER: google.maps.LatLngLiteral = {
  lat: 23.61,
  lng: 85.6,
};

export function findDistrictCentroid(
  district: string | null | undefined
): DistrictCentroid | undefined {
  if (!district) return undefined;
  const term = district.trim().toLowerCase();
  return JHARKHAND_DISTRICTS.find(
    d =>
      d.name.toLowerCase() === term ||
      d.name.toLowerCase().includes(term) ||
      term.includes(d.name.toLowerCase())
  );
}
