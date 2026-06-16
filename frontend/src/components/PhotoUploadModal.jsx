import { useState } from "react";
import { X, Camera, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export default function PhotoUploadModal({ isOpen, onClose, currentPhoto, userName }) {
  const [preview, setPreview] = useState(currentPhoto);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a photo first");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await api.post("/auth/me/photo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Photo uploaded!");
      if (onSave) onSave(response.data.photo_url);
      onClose();
    } catch (err) {
      toast.error("Failed to upload photo. Try again.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const getInitial = () => {
    if (userName && userName.length > 0) {
      return userName[0].toUpperCase();
    }
    return "?";
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl mb-1">📸 Add Profile Photo</h2>
            <p className="text-sm text-gray-600">
              Boosts your booking rate by 35% with a profile photo
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Photo Preview */}
        <div className="flex flex-col items-center gap-6 mb-6 p-6 rounded-xl bg-gray-50">
          <div className="relative">
            {preview ? (
              <img
                src={preview}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                style={{ borderColor: "var(--kn-saffron)" }}
              />
            ) : (
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold"
                style={{ background: "#f0f0ff", color: "var(--kn-indigo)" }}
              >
                {getInitial()}
              </div>
            )}
            {preview && (
              <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-2 shadow-lg">
                <Check size={16} />
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 text-center max-w-xs">
            Your photo helps customers trust you and book faster.
          </p>
        </div>

        {/* Upload Options */}
        <div className="space-y-3 mb-6">
          {/* Camera Input */}
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <Camera size={20} style={{ color: "var(--kn-indigo)" }} />
            <div>
              <p className="font-semibold text-sm">Take a Photo</p>
              <p className="text-xs text-gray-500">Use your camera</p>
            </div>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>

          {/* File Input */}
          <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
            <Upload size={20} style={{ color: "var(--kn-indigo)" }} />
            <div>
              <p className="font-semibold text-sm">Choose from Gallery</p>
              <p className="text-xs text-gray-500">Select an existing photo</p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </label>
        </div>

        {/* Benefits */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff4f0" }}>
          <p className="text-sm font-semibold text-gray-700 mb-2">📈 Why add a photo?</p>
          <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
            <li>Customers are 35% more likely to book you</li>
            <li>Build trust and credibility</li>
            <li>Stand out from other workers</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-3 sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 btn-outline"
            disabled={uploading}
          >
            Skip for now
          </button>
          <button
            onClick={handleUpload}
            className="flex-1 btn-saffron flex items-center justify-center gap-2"
            disabled={uploading || !file}
          >
            {uploading ? (
              "Uploading…"
            ) : (
              <>
                <Check size={16} /> Upload Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
