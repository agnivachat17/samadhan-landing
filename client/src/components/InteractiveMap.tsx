import { useEffect } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import { JHARKHAND_CENTER } from "@/lib/jharkhandDistricts";

export type MapMarker = {
  id: string | number;
  lat: number;
  lng: number;
  label?: string;
  detail?: string;
  color?: string;
  size?: number;
  active?: boolean;
  pulse?: boolean;
  onClick?: () => void;
};

function dotIcon(marker: MapMarker) {
  const size = marker.size ?? 16;
  const color = marker.color ?? "#c94a20";
  return L.divIcon({
    className: "samadhan-marker",
    html: `<span class="${marker.pulse ? "samadhan-marker-pulse" : ""}" style="position:relative;display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:${color};border:2px solid #f7f1e7;box-shadow:${marker.active ? `0 0 0 6px ${color}33,` : ""}0 2px 6px rgba(13,48,36,0.35);"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pinIcon(color = "#c94a20") {
  return L.divIcon({
    className: "samadhan-pin",
    html: `<span style="display:block;width:22px;height:22px;border-radius:9999px 9999px 9999px 2px;background:${color};transform:rotate(-45deg);border:2px solid #f7f1e7;box-shadow:0 3px 8px rgba(13,48,36,0.4);"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 20],
  });
}

function FitToMarkers({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(
      markers.map(m => [m.lat, m.lng] as [number, number])
    );
    map.flyToBounds(bounds, { padding: [48, 48], duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers.length]);
  return null;
}

function ClickToPick({
  onPick,
}: {
  onPick: (location: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });
  return null;
}

interface InteractiveMapProps {
  className?: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  fitToMarkers?: boolean;
  pickable?: boolean;
  pickedLocation?: { lat: number; lng: number } | null;
  onPick?: (location: { lat: number; lng: number }) => void;
  minimalControls?: boolean;
}

export function InteractiveMap({
  className,
  center = JHARKHAND_CENTER,
  zoom = 7,
  markers = [],
  fitToMarkers = false,
  pickable = false,
  pickedLocation,
  onPick,
  minimalControls = false,
}: InteractiveMapProps) {
  return (
    <div
      className={cn(
        "samadhan-map relative h-full w-full overflow-hidden",
        className
      )}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={!minimalControls}
        scrollWheelZoom={!minimalControls}
        dragging={!minimalControls || pickable}
        attributionControl={!minimalControls}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map(marker => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={dotIcon(marker)}
            eventHandlers={
              marker.onClick ? { click: marker.onClick } : undefined
            }
          />
        ))}
        {pickable && pickedLocation && (
          <Marker
            position={[pickedLocation.lat, pickedLocation.lng]}
            icon={pinIcon()}
            draggable
            eventHandlers={{
              dragend: event => {
                const position = (event.target as L.Marker).getLatLng();
                onPick?.({ lat: position.lat, lng: position.lng });
              },
            }}
          />
        )}
        {pickable && <ClickToPick onPick={location => onPick?.(location)} />}
        {fitToMarkers && <FitToMarkers markers={markers} />}
      </MapContainer>
    </div>
  );
}
