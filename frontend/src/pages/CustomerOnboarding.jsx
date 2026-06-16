import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { usePincodeLookup } from "@/lib/usePincode";
import api from "@/lib/api";
import { toast } from "sonner";

export default function CustomerOnboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { pincode, setPincode, status, result, errorMsg, reset } = usePincodeLookup();
  const [village, setVillage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePincodeChange = (e) => {
    let value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setPincode(value);
  };

  const handleSkip = async () => {
    try {
      await api.patch("/auth/me", { location: "default" });
      toast.success("Let's get started!");
      nav("/marketplace");
    } catch (err) {
      toast.error("Could not save preferences. Try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== "success" || !result) {
      toast.error("Please wait for pincode lookup to complete");
      return;
    }
    if (!pincode || pincode.length !== 6) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }
    const villageName = village.trim();
    if (!villageName) {
      toast.error("Please enter your village or town name");
      return;
    }

    setLoading(true);
    try {
      await api.patch("/auth/me", {
        pincode,
        village: villageName,
        address: {
          village: villageName,
          post: result.name,
          block: result.block || "",
          district: result.district,
          state: result.state,
          pincode,
        },
      });
      toast.success("Location saved!");
      nav("/marketplace");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl">Where are you?</h1>
          <p className="text-gray-600 text-sm mt-2">
            Help us find the right jobs in your area
          </p>
        </div>

        <div className="kn-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pincode Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Postal Code
              </label>
              <input
                type="text"
                placeholder="Enter your 6-digit pincode"
                value={pincode}
                onChange={handlePincodeChange}
                maxLength="6"
                className={`kn-input text-lg tracking-widest ${
                  status === "error" ? "border-red-400" : ""
                } ${status === "success" ? "border-green-400" : ""}`}
                disabled={loading}
                autoFocus
              />
              {errorMsg && (
                <p className="text-red-600 text-sm mt-2">{errorMsg}</p>
              )}
              {status === "loading" && (
                <p className="text-blue-600 text-sm mt-2">Looking up pincode…</p>
              )}
            </div>

            {/* Location Auto-fill */}
            {result && status === "success" && (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg">
                <div>
                  <label className="text-xs font-medium text-gray-600">Village / Town</label>
                  <input
                    type="text"
                    placeholder="Enter your village or town name"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="kn-input mt-1"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Post Office</label>
                  <input
                    type="text"
                    value={result.name}
                    readOnly
                    className="kn-input mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                {result.block && (
                  <div>
                    <label className="text-xs font-medium text-gray-600">Block / Tehsil</label>
                    <input
                      type="text"
                      value={result.block}
                      readOnly
                      className="kn-input mt-1 bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600">District</label>
                  <input
                    type="text"
                    value={result.district}
                    readOnly
                    className="kn-input mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">State</label>
                  <input
                    type="text"
                    value={result.state}
                    readOnly
                    className="kn-input mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                loading || status !== "success" || !pincode || pincode.length !== 6 || !village.trim()
              }
              className="btn-saffron w-full disabled:opacity-60 mt-6"
            >
              {loading ? "Saving…" : "Find Jobs Near Me"}
            </button>
          </form>

          {/* Skip Button */}
          <div className="text-center mt-4">
            <button
              onClick={handleSkip}
              disabled={loading}
              className="text-[#3f37c9] font-medium text-sm hover:text-[#2e2e8f] disabled:text-gray-400"
            >
              Skip for now
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          We'll show you jobs within your location. You can update this anytime.
        </p>
      </div>
    </div>
  );
}
