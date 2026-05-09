/**
 * LocationPicker — Reusable Leaflet map component for selecting a lat/lng
 *
 * Props:
 *   lat        {number|null}  current latitude
 *   lng        {number|null}  current longitude
 *   onChange   {fn}           called with ({ lat, lng }) when user picks a location
 *   height     {string}       CSS height for the map (default "260px")
 *
 * Features:
 *   - Click anywhere on the map to drop a saffron pin
 *   - "Use my location" button via browser Geolocation API
 *   - Graceful fallback if geolocation is denied
 *   - Displays chosen coordinates below the map
 */

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import L from "leaflet";

// Fix default Leaflet marker icon paths broken by Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom saffron pin icon
const SAFFRON_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width: 32px; height: 32px;
    background: #FF6B35;
    border: 3px solid #fff;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(255,107,53,0.5);
    display: flex; align-items: center; justify-content: center;
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

// Default center — India geographic center
const DEFAULT_CENTER = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 13;

export default function LocationPicker({ lat, lng, onChange, height = "260px" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Initialise Leaflet map once
  useEffect(() => {
    if (mapInstanceRef.current) return; // already mounted

    const map = L.map(mapRef.current, {
      center: lat && lng ? [lat, lng] : DEFAULT_CENTER,
      zoom: lat && lng ? SELECTED_ZOOM : DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: false,
    });

    // CartoDB Positron tiles — grayscale, matches design guidelines
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
    }).addTo(map);

    // If we already have a location, drop a marker
    if (lat && lng) {
      markerRef.current = L.marker([lat, lng], { icon: SAFFRON_ICON }).addTo(map);
    }

    // Click to pick location
    map.on("click", (e) => {
      const { lat: newLat, lng: newLng } = e.latlng;
      placeMarker(map, newLat, newLng);
      onChange({ lat: parseFloat(newLat.toFixed(6)), lng: parseFloat(newLng.toFixed(6)) });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external lat/lng changes into the map (e.g. when restored from saved profile)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !lat || !lng) return;
    placeMarker(map, lat, lng);
    map.setView([lat, lng], SELECTED_ZOOM);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  function placeMarker(map, newLat, newLng) {
    if (markerRef.current) markerRef.current.remove();
    markerRef.current = L.marker([newLat, newLng], { icon: SAFFRON_ICON }).addTo(map);
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = parseFloat(pos.coords.latitude.toFixed(6));
        const newLng = parseFloat(pos.coords.longitude.toFixed(6));
        const map = mapInstanceRef.current;
        if (map) {
          placeMarker(map, newLat, newLng);
          map.setView([newLat, newLng], SELECTED_ZOOM);
        }
        onChange({ lat: newLat, lng: newLng });
        setGeoLoading(false);
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === 1) {
          setGeoError("Location access denied. Please click on the map to set your location.");
        } else {
          setGeoError("Could not detect location. Click on the map to set it manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasLocation = lat && lng;

  return (
    <div data-testid="location-picker" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header with GPS button */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
          <MapPin size={14} style={{ color: "var(--kn-saffron)" }} />
          <span>Pin your location on the map</span>
        </div>
        <button
          type="button"
          data-testid="location-picker-gps"
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all"
          style={{
            borderColor: "var(--kn-indigo)",
            color: "var(--kn-indigo)",
            background: "transparent",
            opacity: geoLoading ? 0.6 : 1,
            cursor: geoLoading ? "not-allowed" : "pointer",
          }}
        >
          {geoLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Navigation size={12} />
          )}
          {geoLoading ? "Detecting…" : "Use my location"}
        </button>
      </div>

      {/* Map container */}
      <div
        ref={mapRef}
        style={{
          height,
          width: "100%",
          borderRadius: "10px",
          border: hasLocation ? "2px solid #FF6B35" : "1.5px solid #e5e7eb",
          overflow: "hidden",
          transition: "border-color 0.2s ease",
          cursor: "crosshair",
        }}
      />

      {/* Error message */}
      {geoError && (
        <p className="mt-1.5 text-xs text-orange-600 font-medium">{geoError}</p>
      )}

      {/* Coordinates readout */}
      <div className="mt-2 flex items-center gap-2">
        {hasLocation ? (
          <div
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg w-full"
            style={{ background: "#fff4f0", color: "var(--kn-saffron-dark)" }}
          >
            <MapPin size={12} />
            <span>
              Location set — {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
            </span>
            <span
              className="ml-auto text-green-600 font-bold"
              style={{ fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}
            >
              ✓ Saved
            </span>
          </div>
        ) : (
          <p className="text-xs text-gray-400 font-medium">
            📍 Tap the map or use GPS to set your exact location.
          </p>
        )}
      </div>
    </div>
  );
}
