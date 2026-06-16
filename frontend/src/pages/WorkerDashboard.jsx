import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  User,
  ToggleLeft,
  ToggleRight,
  Briefcase,
  History,
  Settings,
  Star,
  Calendar,
  MapPin,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Edit3,
  BadgeCheck,
  Phone,
  IndianRupee,
  Camera,
  Bell,
} from "lucide-react";
import StarRating from "@/components/StarRating";
import SkillSelectorModal from "@/components/SkillSelectorModal";

/* ─── Status Badge ─────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    requested: { label: "Pending", bg: "#fef9c3", color: "#854d0e" },
    accepted: { label: "Accepted", bg: "#dcfce7", color: "#166534" },
    completed: { label: "Done", bg: "#f0fdf4", color: "#15803d" },
    rejected: { label: "Rejected", bg: "#fee2e2", color: "#991b1b" },
    cancelled: { label: "Cancelled", bg: "#f3f4f6", color: "#4b5563" },
  };
  const s = map[status] || { label: status, bg: "#f3f4f6", color: "#4b5563" };
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

/* ─── Profile Section ──────────────────────────────────────────────────── */
function ProfileSection({ profile, worker, engagements, onAvailToggle, toggling, onEditSkills, onSaveProfile }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: worker?.name || "",
    village: worker?.address?.village || worker?.village || "",
    pincode: worker?.address?.pincode || "",
    daily_rate: worker?.daily_rate || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveProfile(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (!worker) {
    return (
      <div className="kn-card p-8 text-center">
        <div className="text-4xl mb-3">👷</div>
        <h3 className="font-display text-xl mb-2">No worker profile yet</h3>
        <p className="text-gray-500 text-sm mb-5">
          Set up your profile so customers can find and hire you.
        </p>
        <Link to="/worker/onboarding" className="btn-saffron inline-flex items-center gap-2">
          <Settings size={14} /> Set up profile
        </Link>
      </div>
    );
  }

  const addr = worker.address || {};
  const addrLine = [addr.village, addr.block, addr.district, addr.state, addr.pincode]
    .filter(Boolean)
    .join(", ");

  // Stats
  const totalEarnings = engagements
    .filter(e => e.status === "completed")
    .reduce((acc, e) => acc + (e.daily_rate || 0), 0);

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div
        className="kn-card p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #3f37c9 0%, #2f28a8 100%)", border: "none" }}
      >
        <div
          className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-10"
          style={{ background: "#fff", transform: "translate(30%, -30%)" }}
        />
        <div className="relative flex items-start gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <input
              type="file" accept="image/*" capture="user" className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const fd = new FormData();
                fd.append("file", file);
                try {
                  await api.post("/auth/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
                  await onSaveProfile({ name: worker.name }); // triggers loadData
                  toast.success("Profile photo updated!");
                } catch { toast.error("Failed to upload photo."); }
              }}
            />
            {worker.photo_url ? (
              <img src={worker.photo_url.startsWith("http") ? worker.photo_url : `${process.env.REACT_APP_BACKEND_URL}${worker.photo_url}`}
                alt={worker.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-display border-2 border-dashed border-white/40">
                {worker.name?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#ff6b35] rounded-full flex items-center justify-center border-2 border-white">
              <Camera size={10} className="text-white" />
            </div>
          </label>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-white font-display text-2xl">{worker.name}</div>
                <div className="mt-1">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: "rgba(255,107,53,0.3)", color: "#fff" }}>
                    Worker
                  </span>
                </div>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <Edit3 size={15} />
              </button>
            </div>
            {addrLine && (
              <div className="text-white/70 text-sm flex items-center gap-1 mt-1">
                <MapPin size={12} /> {addrLine}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-white/90 text-sm font-bold">₹{worker.daily_rate}/day</span>
              {worker.avg_rating > 0 && (
                <span className="flex items-center gap-1 text-yellow-300 text-sm">
                  <Star size={12} className="fill-yellow-300" /> {worker.avg_rating.toFixed(1)}
                </span>
              )}
              {worker.trust_tier > 0 && (
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <BadgeCheck size={12} /> Tier {worker.trust_tier}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Availability toggle */}
        {(() => {
          const isAvailable = worker.availability_status === "available" || worker.available;
          return (
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-3">
              <div>
                <div className="text-white/70 text-xs font-bold uppercase tracking-wider mb-0.5">Availability</div>
                <div className={`text-sm font-bold flex items-center gap-1.5 ${isAvailable ? "text-green-300" : "text-white/50"}`}>
                  <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-white/30"}`} />
                  {isAvailable ? "Online – accepting jobs" : "Offline – not shown to customers"}
                </div>
              </div>
              <button
                onClick={onAvailToggle}
                disabled={toggling}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                  isAvailable
                    ? "bg-green-500 hover:bg-green-400 text-white shadow-lg"
                    : "bg-white/15 hover:bg-white/25 text-white/70"
                }`}
              >
                {toggling ? (
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : isAvailable ? (
                  <ToggleRight size={18} />
                ) : (
                  <ToggleLeft size={18} />
                )}
                {isAvailable ? "Go Offline" : "Go Online"}
              </button>
            </div>
          );
        })()}
      </div>

      {/* Edit Profile Form */}
      {editing && (
        <div className="kn-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-xl">Edit Profile</h3>
            <button onClick={() => setEditing(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Full Name</label>
                <input className="kn-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Phone (verified)</label>
                <input className="kn-input bg-gray-50 text-gray-500 cursor-not-allowed" value={profile?.phone_primary || profile?.phone || ""} readOnly />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Village</label>
                <input className="kn-input" value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Pincode</label>
                <input className="kn-input" maxLength={6} value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Daily Rate (₹)</label>
                <input className="kn-input" type="number" min="100" max="5000" value={form.daily_rate} onChange={(e) => setForm({ ...form, daily_rate: parseInt(e.target.value) || "" })} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-saffron w-full disabled:opacity-60">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      )}

      {/* Skills */}
      <div className="kn-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm">Your Skills</span>
          <button
            onClick={onEditSkills}
            className="text-xs flex items-center gap-1 text-[#3f37c9] font-bold hover:underline"
          >
            <Edit3 size={11} /> Edit
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(worker.structured_skills?.length ? worker.structured_skills : (worker.skills || []).map((s) => ({ skill: s, category: "General" }))).map(
            (s, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: "#f0f0ff", color: "#3f37c9" }}
              >
                {s.skill || s}
              </span>
            )
          )}
          {!worker.skills?.length && !worker.structured_skills?.length && (
            <span className="text-gray-400 text-sm">No skills added yet.</span>
          )}
        </div>
      </div>

      {/* Bio */}
      {worker.bio && (
        <div className="kn-card p-5">
          <div className="text-sm font-bold mb-1">About</div>
          <p className="text-gray-600 text-sm leading-relaxed">{worker.bio}</p>
        </div>
      )}

      {/* Performance Card */}
      {(() => {
        const completed = engagements.filter(e => e.status === "completed");
        const customerRequests = engagements.filter(e => e.source === "customer_booking");
        const responded = customerRequests.filter(e => e.status !== "requested");
        const responseRate = customerRequests.length > 0
          ? Math.round((responded.length / customerRequests.length) * 100)
          : null;
        const rating = worker.avg_rating || 0;
        const ratingStars = Math.round(rating);

        return (
          <div className="kn-card p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Performance</div>
            <div className="grid grid-cols-3 gap-3">
              {/* Rating */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                  style={{ background: rating >= 4 ? "#fef9c3" : rating >= 3 ? "#fef3c7" : "#f3f4f6" }}>
                  <Star size={22} style={{ color: rating > 0 ? "#f59e0b" : "#d1d5db" }}
                    className={rating > 0 ? "fill-yellow-400" : ""} />
                </div>
                <div className="font-display text-2xl font-bold leading-none text-gray-900">
                  {rating > 0 ? rating.toFixed(1) : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Rating</div>
                {rating > 0 && (
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={8}
                        style={{ color: i <= ratingStars ? "#f59e0b" : "#e5e7eb" }}
                        className={i <= ratingStars ? "fill-yellow-400" : "fill-gray-200"} />
                    ))}
                  </div>
                )}
              </div>

              {/* Jobs */}
              <div className="flex flex-col items-center text-center border-x border-gray-100">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-2">
                  <Briefcase size={22} style={{ color: "#3f37c9" }} />
                </div>
                <div className="font-display text-2xl font-bold leading-none text-gray-900">
                  {completed.length}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Jobs Done</div>
                {completed.length > 0 && (
                  <div className="text-[10px] text-gray-400 mt-1">₹{totalEarnings.toLocaleString("en-IN")} earned</div>
                )}
              </div>

              {/* Response Rate */}
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2"
                  style={{ background: responseRate === null ? "#f3f4f6" : responseRate >= 80 ? "#dcfce7" : responseRate >= 50 ? "#fef9c3" : "#fee2e2" }}>
                  <CheckCircle size={22} style={{ color: responseRate === null ? "#d1d5db" : responseRate >= 80 ? "#16a34a" : responseRate >= 50 ? "#d97706" : "#dc2626" }} />
                </div>
                <div className="font-display text-2xl font-bold leading-none text-gray-900">
                  {responseRate !== null ? `${responseRate}%` : "—"}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mt-1">Response</div>
                {responseRate !== null && (
                  <div className="text-[10px] mt-1" style={{ color: responseRate >= 80 ? "#16a34a" : responseRate >= 50 ? "#d97706" : "#dc2626" }}>
                    {responseRate >= 80 ? "Excellent" : responseRate >= 50 ? "Good" : "Needs work"}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ─── Engagement Card ──────────────────────────────────────────────────── */
/* ─── Compact Past Engagement Card ─────────────────────────────────────── */
function WorkCalendar({ engagements }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth()); // 0-indexed
  const [selected, setSelected] = useState(null);

  // Build a map: "YYYY-MM-DD" → total ₹ for that day
  const earningsMap = {};
  engagements.forEach(e => {
    if (e.status !== "completed" || !e.completed_at) return;
    const d = e.completed_at.slice(0, 10); // "YYYY-MM-DD"
    earningsMap[d] = (earningsMap[d] || 0) + (e.daily_rate || 0);
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en-IN", { month: "long", year: "numeric" });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelected(null);
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <div className="kn-card p-4">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">‹</button>
        <span className="font-bold text-sm text-gray-800">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const earned = earningsMap[key];
          const isToday = key === todayStr;
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => setSelected(isSelected ? null : key)}
              className="relative flex flex-col items-center py-1 rounded-lg transition"
              style={{
                background: isSelected ? "#3f37c9" : earned ? "#eef2ff" : "transparent",
              }}
            >
              <span
                className="text-xs font-semibold leading-none"
                style={{ color: isSelected ? "#fff" : isToday ? "#ff6b35" : earned ? "#3f37c9" : "#6b7280" }}
              >
                {day}
              </span>
              {earned && (
                <span
                  className="text-[8px] font-bold leading-none mt-0.5"
                  style={{ color: isSelected ? "#c7d2fe" : "#6366f1" }}
                >
                  ₹{earned >= 1000 ? `${(earned/1000).toFixed(1)}k` : earned}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selected && earningsMap[selected] && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {new Date(selected + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </span>
          <span className="text-sm font-bold text-[#3f37c9]">₹{earningsMap[selected].toLocaleString("en-IN")} earned</span>
        </div>
      )}
      {selected && !earningsMap[selected] && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-center text-xs text-gray-400">No work on this day</div>
      )}
    </div>
  );
}

function PastEngagementCard({ eng, onRate }) {
  const [open, setOpen] = useState(false);
  const isCompleted = eng.status === "completed";
  const custRating = typeof eng.customer_rating === "object"
    ? eng.customer_rating?.stars
    : eng.customer_rating;
  const custComment = typeof eng.customer_rating === "object" ? eng.customer_rating?.comment : null;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all cursor-pointer"
      style={{ background: isCompleted ? "#f0fdf4" : "#fafafa", borderColor: isCompleted ? "#bbf7d0" : "#e5e7eb" }}
    >
      {/* Summary row — always visible */}
      <div className="flex items-center gap-3 px-4 py-3" onClick={() => setOpen(o => !o)}>
        <div className="text-lg flex-shrink-0">{isCompleted ? "✅" : "⚠️"}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-800 truncate">{eng.job_title}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {eng.customer_name} · {eng.job_date}{eng.daily_rate ? ` · ₹${eng.daily_rate}/day` : ""}
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <div className="text-xs font-bold" style={{ color: isCompleted ? "#16a34a" : "#6b7280" }}>
            {isCompleted ? "Completed" : eng.status === "cancelled" ? "Cancelled" : "Rejected"}
          </div>
          {isCompleted && custRating && (
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-[#ff6b35] text-[#ff6b35]" />
              <span className="text-[10px] font-bold text-[#ff6b35]">{custRating}</span>
            </div>
          )}
          <ChevronRight size={14} className="text-gray-300 transition-transform" style={{ transform: open ? "rotate(90deg)" : "none" }} />
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: isCompleted ? "#bbf7d0" : "#e5e7eb" }}>
          <div className="pt-3 space-y-2">
            {eng.job_date && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Job Date</span>
                <span className="text-gray-700 font-semibold">{eng.job_date}</span>
              </div>
            )}
            {eng.completed_at && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Completed On</span>
                <span className="text-gray-700 font-semibold">
                  {new Date(eng.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}
            {eng.daily_rate && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Earnings</span>
                <span className="font-bold text-[#3f37c9]">₹{eng.daily_rate.toLocaleString("en-IN")}</span>
              </div>
            )}
            {eng.source && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 font-medium">Hired via</span>
                <span className="text-gray-700">{eng.source === "customer_booking" ? "Direct hire" : "My application"}</span>
              </div>
            )}
            {custComment && (
              <div className="pt-1">
                <div className="text-xs text-gray-400 font-medium mb-1">Customer review</div>
                <p className="text-xs text-gray-600 italic">"{custComment}"</p>
              </div>
            )}
            {isCompleted && !custRating && (
              <button
                onClick={(e) => { e.stopPropagation(); onRate(eng); }}
                className="w-full mt-2 py-2 rounded-lg text-xs font-bold bg-[#3f37c9] text-white hover:bg-[#3530a8] transition"
              >
                Rate this customer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Engagement Card ──────────────────────────────────────────────────── */
function EngagementCard({ eng, onCancel, isCancelling, onAccept, onDecline, onComplete, isActing, onRate }) {
  const initials = (eng.customer_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  // Premium accepted card
  if (eng.status === "accepted") {
    return (
      <div className="rounded-2xl overflow-hidden border border-green-200 shadow-sm">
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#16a34a" }}>
          <div>
            <div className="text-white font-bold text-base flex items-center gap-2">
              <CheckCircle2 size={16} className="text-white" /> Booking Confirmed
            </div>
            <div className="text-green-100 text-xs mt-0.5">Customer contact unlocked</div>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white text-green-700">ACCEPTED</span>
        </div>

        <div className="bg-white p-4 space-y-4">
          {/* Customer + Call */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900">{eng.customer_name}</div>
              <div className="text-xs text-gray-500 mt-0.5">Customer</div>
            </div>
            {eng.customer_phone ? (
              <a href={`tel:${eng.customer_phone}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-green-700 border-2 border-green-300 hover:bg-green-50 transition flex-shrink-0">
                <Phone size={16} /> Call
                <div className="text-xs font-normal text-green-600">{eng.customer_phone}</div>
              </a>
            ) : (
              <div className="text-xs text-gray-400">No phone yet</div>
            )}
          </div>

          {/* Job details grid */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50">
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Briefcase size={14} className="text-orange-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Work</div>
                <div className="text-sm font-semibold text-gray-800 leading-tight">{eng.job_title}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Calendar size={14} className="text-blue-500" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Date</div>
                <div className="text-sm font-semibold text-gray-800">{eng.job_date}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-red-400" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Location</div>
                <div className="text-sm font-semibold text-gray-800">{eng.customer_village || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <IndianRupee size={14} className="text-yellow-600" />
              </div>
              <div>
                <div className="text-[10px] text-gray-400 font-bold uppercase">Daily Rate</div>
                <div className="text-sm font-semibold text-gray-800">₹{eng.daily_rate}/day</div>
              </div>
            </div>
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-100">
            <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
            <span className="text-sm text-green-700 font-medium">You are booked for this date. Please reach on time.</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onCancel(eng.id)}
              disabled={isCancelling}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
            >
              <XCircle size={18} />
              <span className="text-xs font-bold">Cancel Booking</span>
              <span className="text-[10px] text-red-400">Cancel this booking</span>
            </button>
            <button
              onClick={() => onComplete(eng.id)}
              disabled={isActing}
              className="flex flex-col items-center gap-1 py-3 rounded-xl border-2 border-indigo-200 text-[#3f37c9] hover:bg-indigo-50 transition disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              <span className="text-xs font-bold">Mark as Completed</span>
              <span className="text-[10px] text-indigo-400">Work finished? Mark complete</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kn-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-display text-base">{eng.job_title}</div>
          <div className="text-sm text-gray-500 flex flex-wrap gap-3 mt-1">
            {eng.job_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {eng.job_date}
              </span>
            )}
            {eng.daily_rate && <span>₹{eng.daily_rate}/day</span>}
            {eng.customer_name && <span>By: {eng.customer_name}</span>}
          </div>
          <div className="text-xs text-gray-400 mt-1 capitalize">
            via {eng.source === "worker_interest" ? "your interest" : "customer booking"}
          </div>

          {eng.status === "completed" && (
            <div className="mt-3 flex flex-wrap gap-4 items-center border-t border-gray-100 pt-3">
              <div className="text-xs">
                <span className="text-gray-400 uppercase font-bold text-[9px] block mb-0.5">Cust. Rating</span>
                {eng.rating ? (
                  <div className="flex items-center gap-1 font-bold text-[#ff6b35]">
                    <Star size={10} className="fill-[#ff6b35]" />
                    {typeof eng.rating === "object" ? eng.rating?.stars : eng.rating}
                  </div>
                ) : <span className="text-gray-400 italic">No rating yet</span>}
              </div>
              <div className="text-xs">
                <span className="text-gray-400 uppercase font-bold text-[9px] block mb-0.5">Your Rating</span>
                {eng.customer_rating ? (
                  <div className="flex items-center gap-1 font-bold text-[#3f37c9]">
                    <Star size={10} className="fill-[#3f37c9]" />
                    {typeof eng.customer_rating === "object" ? eng.customer_rating?.stars : eng.customer_rating}
                  </div>
                ) : (
                  <button onClick={() => onRate(eng)} className="text-[#3f37c9] font-bold hover:underline">
                    Rate customer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <StatusBadge status={eng.status} />
      </div>

      {eng.status === "requested" && (
        eng.source === "customer_booking" ? (
          /* Customer sent this booking — worker must accept or decline */
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onAccept(eng.id)}
              disabled={isActing}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
              style={{ background: "#16a34a" }}
            >
              {isActing ? "…" : "✓ Accept Job"}
            </button>
            <button
              onClick={() => onDecline(eng.id)}
              disabled={isActing}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 transition disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        ) : (
          /* Worker expressed interest — can withdraw */
          <button
            onClick={() => onCancel(eng.id)}
            disabled={isCancelling}
            className="mt-3 text-xs text-red-500 hover:underline font-semibold disabled:opacity-50"
          >
            Withdraw interest
          </button>
        )
      )}
    </div>
  );
}

/* ─── Tab Button ───────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon: Icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
        active
          ? "bg-[#3f37c9] text-white shadow-md"
          : "bg-white border border-gray-200 text-gray-600 hover:border-[#3f37c9]"
      }`}
    >
      <Icon size={16} />
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-[9px] px-1.5 rounded-full ${
            active ? "bg-white/30" : "bg-gray-100"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ─── Main Dashboard ───────────────────────────────────────────────────── */
export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).get("tab") || "profile"
  );
  const [notifications, setNotifications] = useState([]);

  // Sync tab when URL changes (bell icon click)
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t) setTab(t);
  }, [location.search]);
  const [worker, setWorker] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [acting, setActing] = useState(null); // engId being accepted/declined
  const [showSkillSelector, setShowSkillSelector] = useState(false);

  const [ratingEng, setRatingEng] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, eRes, nRes] = await Promise.all([
        api.get("/workers/me/profile").catch(() => ({ data: null })),
        api.get("/engagements/mine").catch(() => ({ data: [] })),
        api.get("/notifications/mine").catch(() => ({ data: [] })),
      ]);
      setWorker(wRes.data);
      setEngagements(eRes.data || []);
      setNotifications(nRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Auto-mark all notifications read when user opens the tab
  useEffect(() => {
    if (tab !== "notifications") return;
    setNotifications(prev => {
      const hasUnread = prev.some(n => !n.read);
      if (hasUnread) api.post("/notifications/read-all").catch(() => {});
      return hasUnread ? prev.map(n => ({ ...n, read: true })) : prev;
    });
  }, [tab]);

  const handleSaveProfile = async (form) => {
    try {
      await api.patch("/auth/me", { name: form.name, village: form.village, pincode: form.pincode });
      await api.patch("/workers/profile", { daily_rate: form.daily_rate, village: form.village });
      await loadData();
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(formatApiError(err));
      throw err;
    }
  };

  const handleSkillsSave = async (skills) => {
    try {
      await api.patch("/workers/profile", { structured_skills: skills });
      setWorker(prev => ({ ...prev, structured_skills: skills }));
      toast.success("Skills updated!");
      setShowSkillSelector(false);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleAvailToggle = async () => {
    if (!worker) return;
    setToggling(true);
    try {
      const newStatus =
        worker.availability_status === "available" || worker.available
          ? "not_available"
          : "available";
      await api.patch("/workers/me/availability", { availability_status: newStatus });
      toast.success(newStatus === "available" ? "You're now available!" : "Marked as unavailable");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setToggling(false);
    }
  };

  const handleCancel = async (engId) => {
    setCancelling(engId);
    try {
      await api.post(`/engagements/${engId}/cancel`);
      toast.success("Request cancelled");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setCancelling(null);
    }
  };

  const handleAccept = async (engId) => {
    setActing(engId);
    try {
      await api.post(`/engagements/${engId}/accept`);
      toast.success("Job accepted! Customer details are now visible.");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActing(null);
    }
  };

  const handleDecline = async (engId) => {
    setActing(engId);
    try {
      await api.post(`/engagements/${engId}/reject`);
      toast.success("Request declined.");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActing(null);
    }
  };

  const handleComplete = async (engId) => {
    setActing(engId);
    try {
      await api.post(`/engagements/${engId}/complete`);
      toast.success("Work marked as completed! You are available again.");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setActing(null);
    }
  };

  const submitRating = async () => {
    if (!ratingEng) return;
    setSubmittingRating(true);
    try {
      await api.post(`/engagements/${ratingEng.id}/rate`, {
        rating: ratingValue,
        comment: ratingComment
      });
      toast.success("Rating submitted!");
      setRatingEng(null);
      setRatingValue(5);
      setRatingComment("");
      await loadData();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!user || user.role !== "worker") {
    return <div className="p-12 text-center text-gray-500">This page is only for workers.</div>;
  }

  const activeEngagements = engagements.filter((e) =>
    ["requested", "accepted"].includes(e.status)
  );
  const pastEngagements = engagements.filter((e) =>
    ["completed", "rejected", "cancelled"].includes(e.status)
  );

  return (
    <div data-testid="worker-dashboard" className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kn-overline mb-1">Worker Dashboard</div>
          <h1 className="font-display text-3xl tracking-tight">
            Hey, {user.name?.split(" ")[0]} 👷
          </h1>
        </div>
        <Link to="/worker/job-feed" className="btn-saffron flex items-center gap-2 text-sm !py-2.5 !px-4">
          <Briefcase size={14} /> Job Feed
        </Link>
      </div>

      {/* Earnings Summary Card */}
      {(() => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const completedEngagements = engagements.filter(e => e.status === "completed");
        const monthEarnings = completedEngagements
          .filter(e => e.completed_at?.startsWith(currentMonth))
          .reduce((sum, e) => sum + (e.daily_rate || 0), 0);
        const totalEarnings = completedEngagements.reduce((sum, e) => sum + (e.daily_rate || 0), 0);
        const monthJobs = completedEngagements.filter(e => e.completed_at?.startsWith(currentMonth)).length;
        const totalJobs = completedEngagements.length;
        return (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#3f37c9] to-[#6a5acd] p-5 text-white">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">This Month</p>
                <p className="text-3xl font-display font-bold leading-none">
                  ₹{monthEarnings.toLocaleString("en-IN")}
                </p>
                <p className="text-indigo-200 text-xs mt-1">{monthJobs} job{monthJobs !== 1 ? "s" : ""} completed</p>
              </div>
              <div className="border-l border-indigo-400 pl-4">
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wide mb-1">Lifetime</p>
                <p className="text-3xl font-display font-bold leading-none">
                  ₹{totalEarnings.toLocaleString("en-IN")}
                </p>
                <p className="text-indigo-200 text-xs mt-1">{totalJobs} job{totalJobs !== 1 ? "s" : ""} total</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Mobile-first tabs */}
      <div className="flex mb-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {[
          { id: "profile", label: "Profile", icon: User },
          { id: "active", label: "Active", icon: Clock, badge: activeEngagements.length },
          { id: "past", label: "History", icon: History },
          { id: "notifications", label: "Alerts", icon: Bell, badge: notifications.filter(n => !n.read).length },
          { id: "settings", label: "Settings", icon: Settings },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2.5 transition"
            style={{ borderBottom: tab === t.id ? "2.5px solid #3f37c9" : "2.5px solid transparent" }}
          >
            <t.icon size={18} style={{ color: tab === t.id ? "#3f37c9" : "#9ca3af" }} />
            <span className="text-[10px] font-bold whitespace-nowrap" style={{ color: tab === t.id ? "#3f37c9" : "#9ca3af" }}>
              {t.label}
            </span>
            {t.badge > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#ff6b35] text-white text-[9px] font-bold flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading…</div>
      ) : (
        <>
          {/* ── Profile Tab ── */}
          {tab === "profile" && (
            <ProfileSection
              profile={user}
              worker={worker}
              engagements={engagements}
              onAvailToggle={handleAvailToggle}
              toggling={toggling}
              onEditSkills={() => setShowSkillSelector(true)}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {/* ── Active Requests Tab ── */}
          {tab === "active" && (() => {
            const today = new Date().toISOString().slice(0, 10);
            const upcoming = activeEngagements.filter(e =>
              e.status === "accepted" && e.job_date && e.job_date >= today
            ).sort((a, b) => a.job_date.localeCompare(b.job_date));
            const pending = activeEngagements.filter(e =>
              e.status === "requested" || (e.status === "accepted" && (!e.job_date || e.job_date < today))
            );

            if (activeEngagements.length === 0) return (
              <div className="kn-card p-10 text-center">
                <Clock size={36} className="mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No active requests.</p>
                <Link to="/worker/job-feed" className="btn-saffron inline-flex items-center gap-2 mt-4 text-sm">
                  <Briefcase size={14} /> Browse job feed
                </Link>
              </div>
            );

            return (
              <div className="space-y-5">
                {/* Upcoming Bookings */}
                {upcoming.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar size={14} className="text-[#3f37c9]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3f37c9]">Upcoming Bookings</span>
                    </div>
                    <div className="space-y-3">
                      {upcoming.map(e => {
                        const jobDate = new Date(e.job_date + "T00:00:00");
                        const isToday = e.job_date === today;
                        const dayLabel = isToday ? "Today" : jobDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
                        const daysAway = Math.round((jobDate - new Date(today + "T00:00:00")) / 86400000);
                        return (
                          <div key={e.id} className="kn-card p-4 border-l-4" style={{ borderLeftColor: isToday ? "#ff6b35" : "#3f37c9" }}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm truncate">{e.job_title || "Job"}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{e.customer_name || "Customer"}</div>
                                {e.daily_rate && (
                                  <div className="text-xs font-bold text-[#3f37c9] mt-1">₹{e.daily_rate}/day</div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold" style={{ color: isToday ? "#ff6b35" : "#3f37c9" }}>{dayLabel}</div>
                                {!isToday && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">{daysAway === 1 ? "Tomorrow" : `In ${daysAway} days`}</div>
                                )}
                                {isToday && (
                                  <div className="text-[10px] font-bold text-[#ff6b35] mt-0.5">Starting today!</div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              {e.job_date <= today && (
                                <button
                                  onClick={() => handleComplete(e.id)}
                                  disabled={acting === e.id}
                                  className="flex-1 py-2 rounded-lg text-xs font-bold bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-60"
                                >
                                  {acting === e.id ? "…" : "Mark Complete"}
                                </button>
                              )}
                              <button
                                onClick={() => handleCancel(e.id)}
                                disabled={cancelling === e.id}
                                className="px-3 py-2 rounded-lg text-xs font-bold bg-gray-100 text-gray-600 hover:bg-gray-200 transition disabled:opacity-60"
                              >
                                {cancelling === e.id ? "…" : "Cancel"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pending Requests */}
                {pending.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Pending Requests</span>
                    </div>
                    <div className="space-y-3">
                      {pending.map((e) => (
                        <EngagementCard
                          key={e.id}
                          eng={e}
                          onCancel={handleCancel}
                          isCancelling={cancelling === e.id}
                          onAccept={handleAccept}
                          onDecline={handleDecline}
                          onComplete={handleComplete}
                          isActing={acting === e.id}
                          onRate={setRatingEng}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Past Jobs Tab ── */}
          {tab === "past" && (
            <div className="space-y-4">
              <WorkCalendar engagements={engagements} />
              {pastEngagements.length === 0 ? (
                <div className="kn-card p-10 text-center">
                  <History size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No past jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pastEngagements.map((e) => (
                    <PastEngagementCard key={e.id} eng={e} onRate={setRatingEng} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Notifications Tab ── */}
          {tab === "notifications" && (() => {
            const kindMeta = {
              booking_request:   { icon: "📋", color: "#3f37c9", bg: "#eef2ff", label: "Booking Request" },
              booking_accepted:  { icon: "✅", color: "#16a34a", bg: "#dcfce7", label: "Booking Accepted" },
              booking_rejected:  { icon: "❌", color: "#dc2626", bg: "#fee2e2", label: "Booking Rejected" },
              booking_cancelled: { icon: "🚫", color: "#9ca3af", bg: "#f3f4f6", label: "Cancelled" },
              interest_withdrawn:{ icon: "↩️", color: "#9ca3af", bg: "#f3f4f6", label: "Withdrawn" },
              job_completed:     { icon: "🎉", color: "#d97706", bg: "#fef9c3", label: "Completed" },
            };
            const relTime = (iso) => {
              const diff = Date.now() - new Date(iso).getTime();
              const mins = Math.floor(diff / 60000);
              if (mins < 1) return "Just now";
              if (mins < 60) return `${mins}m ago`;
              const hrs = Math.floor(mins / 60);
              if (hrs < 24) return `${hrs}h ago`;
              const days = Math.floor(hrs / 24);
              if (days === 1) return "Yesterday";
              if (days < 7) return `${days}d ago`;
              return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
            };
            const groupLabel = (iso) => {
              const diff = Date.now() - new Date(iso).getTime();
              const days = Math.floor(diff / 86400000);
              if (days === 0) return "Today";
              if (days === 1) return "Yesterday";
              if (days < 7) return "This Week";
              return "Older";
            };
            const markRead = async (id) => {
              await api.post(`/notifications/${id}/read`).catch(() => {});
              setNotifications(prev => prev.map(x => x.id === id ? { ...x, read: true } : x));
            };
            const markAllRead = async () => {
              await api.post("/notifications/read-all").catch(() => {});
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            };

            // Group by day bucket
            const groups = {};
            notifications.forEach(n => {
              const g = groupLabel(n.created_at);
              if (!groups[g]) groups[g] = [];
              groups[g].push(n);
            });
            const groupOrder = ["Today", "Yesterday", "This Week", "Older"];
            const unread = notifications.filter(n => !n.read).length;

            if (notifications.length === 0) return (
              <div className="kn-card p-12 text-center">
                <Bell size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 font-medium">No notifications yet</p>
                <p className="text-gray-400 text-xs mt-1">You'll be notified about bookings and job updates here</p>
              </div>
            );

            return (
              <div className="space-y-5">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-semibold">
                    {unread > 0 ? `${unread} unread` : "All caught up"}
                  </span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-[#3f37c9] font-bold hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>

                {groupOrder.filter(g => groups[g]).map(g => (
                  <div key={g}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">{g}</div>
                    <div className="space-y-2">
                      {groups[g].map(n => {
                        const meta = kindMeta[n.kind] || { icon: "🔔", color: "#6b7280", bg: "#f9fafb" };
                        return (
                          <div
                            key={n.id}
                            onClick={() => !n.read && markRead(n.id)}
                            className={`rounded-xl p-4 flex items-start gap-3 transition cursor-pointer ${
                              n.read ? "bg-white border border-gray-100" : "border border-transparent shadow-sm"
                            }`}
                            style={!n.read ? { background: meta.bg } : {}}
                          >
                            <div className="text-xl flex-shrink-0 mt-0.5 leading-none">{meta.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-sm font-bold leading-snug ${n.read ? "text-gray-600" : "text-gray-900"}`}>
                                  {n.title}
                                </span>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{relTime(n.created_at)}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                              {!n.read && (
                                <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: meta.color, color: "#fff" }}>
                                  {meta.label}
                                </span>
                              )}
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 rounded-full flex-shrink-0 mt-2" style={{ background: meta.color }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Settings Tab ── */}
          {tab === "settings" && (
            <div className="space-y-3">
              <Link
                to="/worker/onboarding"
                className="kn-card p-5 flex items-center justify-between hover:border-[#3f37c9] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#f0f0ff] flex items-center justify-center">
                    <Settings size={16} className="text-[#3f37c9]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Edit Worker Profile</div>
                    <div className="text-xs text-gray-500">Update skills, rate, address</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#3f37c9]" />
              </Link>

              <Link
                to="/worker/job-feed"
                className="kn-card p-5 flex items-center justify-between hover:border-[#ff6b35] group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#fff4f0] flex items-center justify-center">
                    <Briefcase size={16} className="text-[#ff6b35]" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Browse Job Feed</div>
                    <div className="text-xs text-gray-500">Find work near your pincode</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#ff6b35]" />
              </Link>

              {/* Danger zone */}
              <div className="kn-card p-5 border border-red-100 mt-4">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Danger Zone</div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-sm text-gray-700">Deactivate Account</div>
                    <div className="text-xs text-gray-400 mt-0.5">You'll be hidden from customers. Reactivate within 30 days by logging in.</div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Deactivate your account? You can reactivate within 30 days by logging in again.")) return;
                      try {
                        await api.delete("/auth/me");
                        await logout();
                        toast.success("Account deactivated.");
                      } catch { toast.error("Could not deactivate. Try again."); }
                    }}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition"
                  >
                    Deactivate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rating Modal */}
          {ratingEng && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
              <div className="kn-card w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                <h3 className="font-display text-2xl mb-2 text-center">Rate {ratingEng.customer_name}</h3>
                <p className="text-gray-500 text-center text-sm mb-6">How was the customer and the work environment?</p>
                
                <div className="flex justify-center mb-8">
                  <StarRating rating={ratingValue} setRating={setRatingValue} />
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Comment (Optional)</label>
                  <textarea
                    className="kn-input min-h-[100px]"
                    placeholder="Describe your experience working for this customer..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setRatingEng(null)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitRating}
                    disabled={submittingRating}
                    className="flex-1 btn-saffron disabled:opacity-50"
                  >
                    {submittingRating ? "Saving..." : "Submit Rating"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <SkillSelectorModal
        isOpen={showSkillSelector}
        onClose={() => setShowSkillSelector(false)}
        onSave={handleSkillsSave}
        currentSkills={worker?.structured_skills || []}
      />
    </div>
  );
}
