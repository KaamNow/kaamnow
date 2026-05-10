import { useState, useEffect } from "react";
import { X, MapPin } from "lucide-react";
import { toast } from "sonner";
import LocationPicker from "./LocationPicker";

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSave,
  currentLat,
  currentLng,
}) {
  const [selectedLat, setSelectedLat] = useState(currentLat);
  const [selectedLng, setSelectedLng] = useState(currentLng);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentLat !== undefined) setSelectedLat(currentLat);
    if (currentLng !== undefined) setSelectedLng(currentLng);
  }, [currentLat, currentLng, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (selectedLat === null || selectedLng === null) {
      toast.error("Please pin your location on the map");
      return;
    }

    setSaving(true);
    try {
      await onSave({ lat: selectedLat, lng: selectedLng });
    } catch (err) {
      console.error("Error saving location:", err);
      toast.error("Failed to save location. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCoordinatesChange = ({ lat, lng }) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl mb-1">📍 Where are you located?</h2>
            <p className="text-sm text-gray-600">
              Pin your location to see nearby jobs first
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Map Container */}
        <div className="mb-6 rounded-xl overflow-hidden border-2 border-gray-200">
          <LocationPicker
            lat={selectedLat}
            lng={selectedLng}
            onChange={handleCoordinatesChange}
            height="260px"
          />
        </div>

        {/* Benefits */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: "#f0f8ff" }}>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            🎯 Why set your location?
          </p>
          <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
            <li>See jobs closest to you first</li>
            <li>Get matched with jobs within 25 km</li>
            <li>Help customers find reliable workers nearby</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 btn-outline"
            disabled={saving}
          >
            Skip for now
          </button>
          <button
            onClick={handleSave}
            className="flex-1 btn-saffron flex items-center justify-center gap-2"
            disabled={saving || selectedLat === null || selectedLng === null}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <MapPin size={16} /> Set Location
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
