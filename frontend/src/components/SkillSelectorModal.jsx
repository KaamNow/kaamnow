import { useState } from "react";
import { X, Check, Briefcase } from "lucide-react";
import { toast } from "sonner";

const SKILL_CATEGORIES = [
  {
    category: "Construction",
    color: "#e85a25",
    bg: "#fff4f0",
    skills: ["Mason", "Carpenter", "Painter", "Welder", "Plumber", "Helper"],
  },
  {
    category: "Agriculture",
    color: "#16a34a",
    bg: "#f0fdf4",
    skills: ["Harvesting", "Irrigation", "Pesticide", "Plowing", "Farm helper"],
  },
  {
    category: "Electrical",
    color: "#d97706",
    bg: "#fffbeb",
    skills: ["Wiring", "Motor repair", "Panel work", "Electrician"],
  },
  {
    category: "Cleaning",
    color: "#3f37c9",
    bg: "#f0f0ff",
    skills: ["House cleaning", "Sweeping", "Vessel washing", "Laundry"],
  },
  {
    category: "Transport",
    color: "#0284c7",
    bg: "#f0f9ff",
    skills: ["Driving", "Loading", "Delivery", "Tractor operator"],
  },
  {
    category: "Mechanical",
    color: "#9333ea",
    bg: "#faf0ff",
    skills: ["Pump repair", "Engine work", "Welding", "Tool repair"],
  },
  {
    category: "Tailoring",
    color: "#db2777",
    bg: "#fff0f6",
    skills: ["Stitching", "Embroidery", "Alterations", "Fabric cutting"],
  },
  {
    category: "General",
    color: "#4b5563",
    bg: "#f9fafb",
    skills: ["Daily labour", "Watchman", "Peon", "Loader", "General helper"],
  },
];

function SkillCard({ category, color, bg, skills, selected, onToggle }) {
  const selectedInCat = skills.filter((s) =>
    selected.some((x) => x.skill === s && x.category === category)
  );

  return (
    <div className="kn-card p-4" style={{ borderColor: selectedInCat.length ? color : undefined }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-sm">{category}</span>
        {selectedInCat.length > 0 && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: bg, color }}
          >
            {selectedInCat.length}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => {
          const active = selected.some((x) => x.skill === skill && x.category === category);
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(category, skill)}
              className="text-xs px-3 py-1.5 rounded-full border font-semibold transition-all duration-150"
              style={
                active
                  ? { background: color, color: "#fff", borderColor: color }
                  : { background: bg, color, borderColor: "transparent" }
              }
            >
              {active && <Check size={10} className="inline mr-1" />}
              {skill}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function SkillSelectorModal({ isOpen, onClose, onSave, initialSkills = [] }) {
  const [selectedSkills, setSelectedSkills] = useState(initialSkills);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const toggleSkill = (category, skill) => {
    setSelectedSkills((prev) => {
      const exists = prev.some((x) => x.category === category && x.skill === skill);
      return exists
        ? prev.filter((x) => !(x.category === category && x.skill === skill))
        : [...prev, { category, skill }];
    });
  };

  const handleSave = async () => {
    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill");
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedSkills);
      toast.success("Skills saved!");
      onClose();
    } catch (err) {
      toast.error("Failed to save skills. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl mb-1">🎯 Your Skills</h2>
            <p className="text-sm text-gray-600">
              Jobs will match your skills. Select at least one.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Selected Skills Summary */}
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl" style={{ background: "#f0f0ff" }}>
            {selectedSkills.map((s) => (
              <span
                key={`${s.category}-${s.skill}`}
                className="text-xs px-2 py-1 rounded-full font-bold"
                style={{ background: "var(--kn-indigo)", color: "#fff" }}
              >
                {s.skill}
              </span>
            ))}
          </div>
        )}

        {/* Skill Categories */}
        <div className="space-y-3 mb-6">
          {SKILL_CATEGORIES.map((cat) => (
            <SkillCard
              key={cat.category}
              {...cat}
              selected={selectedSkills}
              onToggle={toggleSkill}
            />
          ))}
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
            disabled={saving || selectedSkills.length === 0}
          >
            {saving ? "Saving…" : (
              <>
                <Check size={16} /> Save Skills
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
