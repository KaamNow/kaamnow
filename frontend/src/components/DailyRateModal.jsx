import { useState, useEffect } from "react";
import { X, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function DailyRateModal({
  isOpen,
  onClose,
  onSave,
  currentRate,
}) {
  const [rate, setRate] = useState(currentRate || 350);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentRate !== undefined && currentRate !== null) {
      setRate(currentRate);
    } else {
      setRate(350);
    }
  }, [currentRate, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (rate < 100 || rate > 5000) {
      toast.error("Daily rate must be between ₹100 and ₹5000");
      return;
    }

    setSaving(true);
    try {
      await onSave(rate);
    } catch (err) {
      console.error("Error saving daily rate:", err);
      toast.error("Failed to save daily rate. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const isValid = rate >= 100 && rate <= 5000;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl mb-1">💰 What's your daily rate?</h2>
            <p className="text-sm text-gray-600">
              Customers see this when they're booking you
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Rate Input */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">
              Daily Rate
            </label>
            <div className="relative">
              <IndianRupee
                size={18}
                className="absolute left-4 top-1/2 transform -translate-y-1/2"
                style={{ color: "var(--kn-saffron)" }}
              />
              <input
                type="number"
                min="100"
                max="5000"
                value={rate}
                onChange={(e) => setRate(parseInt(e.target.value) || 0)}
                placeholder="e.g. 350"
                className="kn-input pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Recommended range: ₹100 – ₹5000 per day
            </p>
          </div>

          {/* Examples */}
          <div className="flex gap-2 flex-wrap">
            {[250, 350, 500, 750].map((example) => (
              <button
                key={example}
                onClick={() => setRate(example)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition"
                style={{
                  borderColor: rate === example ? "var(--kn-saffron)" : undefined,
                  backgroundColor: rate === example ? "#fff4f0" : undefined,
                }}
              >
                ₹{example}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: "#fff4f0" }}>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            💡 How to set your rate
          </p>
          <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
            <li>Consider your experience and skills</li>
            <li>Compare with local market rates</li>
            <li>You can update this anytime</li>
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
            disabled={saving || !isValid}
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <IndianRupee size={16} /> Set Rate
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
