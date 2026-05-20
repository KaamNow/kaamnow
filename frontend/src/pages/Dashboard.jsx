import { useEffect, useState, useCallback } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import api, { BACKEND_URL } from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Briefcase,
  Star,
  Calendar,
  ShieldCheck,
  User,
  History,
  CreditCard,
  MapPin,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Settings,
  Bell,
  Camera,
} from "lucide-react";

/* ─── Status Badge ─────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    pending: { label: "Waiting", bg: "#fef9c3", color: "#854d0e" },
    confirmed: { label: "Confirmed", bg: "#dcfce7", color: "#166534" },
    completed: { label: "Done", bg: "#f0fdf4", color: "#15803d" },
    cancelled: { label: "Cancelled", bg: "#fee2e2", color: "#991b1b" },
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
function ProfileSection({ user, onUpdate }) {
  const { refreshUser, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    village: user?.village || "",
    pincode: user?.address?.pincode || "",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useState(null);

  const photoUrl = user.photo_url
    ? (user.photo_url.startsWith("http") ? user.photo_url : `${BACKEND_URL}${user.photo_url}`)
    : null;

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/auth/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshUser();
      toast.success("Profile photo updated!");
    } catch {
      toast.error("Failed to upload photo. Try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove your profile photo?")) return;
    try {
      await api.patch("/auth/me", { photo_url: null });
      await refreshUser();
      toast.success("Photo removed.");
    } catch {
      toast.error("Could not remove photo.");
    }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/auth/me", form);
      await refreshUser();
      toast.success("Profile updated");
      setEditing(false);
      onUpdate();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="kn-card overflow-hidden">
      {/* Hero strip */}
      <div className="p-6 pb-0" style={{ background: "linear-gradient(135deg, #f8f7ff 0%, #fff4f0 100%)" }}>
        <div className="flex items-center gap-4 pb-5">
          {/* Avatar + upload */}
            <label className="relative cursor-pointer group shrink-0">
              <input type="file" accept="image/*" capture="user" className="hidden"
                onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              {photoUrl ? (
                <img src={photoUrl} alt={user.name}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border-2 border-white" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center text-[#3f37c9] text-3xl font-display shadow-md border-2 border-white">
                  {uploadingPhoto ? <span className="text-base animate-pulse">...</span> : user.name?.[0]}
                </div>
              )}
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-[#ff6b35] rounded-full flex items-center justify-center border-2 border-white shadow">
                <Camera size={11} className="text-white" />
              </div>
            </label>
            <div>
              <div className="font-display text-2xl text-gray-900">{user.name}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                  style={{ background: "#f0f0ff", color: "#3f37c9" }}>Customer</span>
                <span className="text-xs text-gray-400">{user.phone_primary || user.phone}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <label className="text-xs text-[#ff6b35] font-semibold hover:underline cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                  {photoUrl ? "Change photo" : "Add photo"}
                </label>
                {photoUrl && (
                  <button onClick={handleRemovePhoto} className="text-xs text-gray-400 hover:text-red-500 font-semibold hover:underline transition">
                    Remove photo
                  </button>
                )}
              </div>
            </div>
        </div>
        {/* Edit button — full width below avatar row */}
        <button onClick={() => setEditing(!editing)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold border-t border-white/50 transition"
          style={{ color: editing ? "#6b7280" : "#3f37c9" }}>
          <Settings size={13} /> {editing ? "Cancel editing" : "Edit Profile"}
        </button>
      </div>

      <div className="p-6">
        {editing ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Full Name</label>
                <input className="kn-input" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Phone (verified)</label>
                <input className="kn-input bg-gray-50 text-gray-400 cursor-not-allowed"
                  value={user?.phone_primary || user?.phone || ""} readOnly />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Village</label>
                <input className="kn-input" value={form.village}
                  onChange={(e) => setForm({ ...form, village: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wider">Pincode</label>
                <input className="kn-input" value={form.pincode} maxLength={6}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>
            <button type="submit" className="btn-saffron w-full">Save Changes</button>
          </form>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone</div>
              <div className="font-semibold">{user.phone_primary || user.phone || "Not set"}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Location</div>
              <div className="font-semibold">{user.village || "Not set"}{user.address?.pincode ? `, ${user.address.pincode}` : ""}</div>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="kn-card p-5 border border-red-100">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Danger Zone</div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm text-gray-700">Deactivate Account</div>
            <div className="text-xs text-gray-400 mt-0.5">Your profile will be hidden. You can reactivate within 30 days by logging in.</div>
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Deactivate your account? You can reactivate within 30 days by logging in again.")) return;
              try {
                await api.delete("/auth/me");
                await logout();
                toast.success("Account deactivated.");
              } catch (err) { toast.error(formatApiError(err)); }
            }}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold border-2 border-red-200 text-red-500 hover:bg-red-50 transition"
          >
            Deactivate
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────── */
function OverviewTab({ user, jobs, bookings, openJobs, activeBookings, directHirePending, completedUnrated, pendingEngagements, reload, setTab, onRate, onCancelDirectHire }) {

  // Profile completion (4 steps × 25%)
  const steps = [
    { label: "Phone verified", done: !!(user?.phone_primary || user?.phone_verified) },
    { label: "Village & Pincode", done: !!(user?.address?.pincode || user?.village) },
    { label: "Profile photo", done: !!user?.photo_url },
    { label: "First job posted", done: jobs.length > 0 },
  ];
  const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);
  const nextStep = steps.find(s => !s.done);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Suprabhat" : hour < 17 ? "Namaste" : "Shubh Sandhya";

  // Re-post last job
  const lastJob = jobs[0];
  const repost = async () => {
    if (!lastJob) return;
    try {
      const payload = {
        title: lastJob.title,
        category: lastJob.category,
        description: lastJob.description,
        workers_needed: lastJob.workers_needed,
        daily_rate: lastJob.daily_rate,
        job_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        village: lastJob.village,
        lat: lastJob.lat || 22.9734,
        lng: lastJob.lng || 78.6569,
        address: lastJob.address,
        required_skills: lastJob.required_skills,
      };
      const r = await api.post("/jobs", payload);
      toast.success("Job re-posted!");
      reload();
    } catch { toast.error("Could not re-post. Try again."); }
  };

  // Worker count nearby
  const [nearbyCount, setNearbyCount] = useState(null);
  useEffect(() => {
    const pc = user?.address?.pincode;
    const url = pc ? `/workers/search?available_only=true` : `/workers/search?available_only=true`;
    api.get(url).then(r => setNearbyCount(r.data.length)).catch(() => {});
  }, []);

  return (
    <div className="space-y-5">

      {/* ── Hero ── */}
      <div className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #3f37c9 0%, #2f28a8 100%)" }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: "#fff", transform: "translate(20%, -30%)" }} />
        <div className="text-white/70 text-sm font-semibold mb-1">{greeting} 🙏</div>
        <div className="font-display text-2xl mb-1">{user?.name?.split(" ")[0]},</div>
        <div className="text-white/80 text-sm mb-4">What work do you need help with today?</div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/post-job"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition active:scale-95"
            style={{ background: "#ff6b35", color: "white", boxShadow: "0 4px 12px rgba(255,107,53,0.4)" }}>
            <Plus size={16} /> Post a Job
          </Link>
          <Link to="/marketplace"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>
            Find Workers →
          </Link>
        </div>
        {nearbyCount !== null && (
          <div className="mt-4 text-xs text-white/60 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {nearbyCount} verified workers available near you
          </div>
        )}
      </div>

      {/* ── Profile completion ── */}
      {pct < 100 && (
        <div className="kn-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-gray-800">Complete your profile</div>
              <div className="text-xs text-gray-400 mt-0.5">Workers trust profiles more when they're complete</div>
            </div>
            <div className="text-2xl font-display" style={{ color: pct >= 75 ? "#16a34a" : pct >= 50 ? "#ff6b35" : "#3f37c9" }}>
              {pct}%
            </div>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: pct >= 75 ? "#16a34a" : pct >= 50 ? "#ff6b35" : "#3f37c9" }} />
          </div>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: s.done ? "#dcfce7" : "#f3f4f6" }}>
                  {s.done
                    ? <CheckCircle2 size={13} style={{ color: "#16a34a" }} />
                    : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                <span style={{ color: s.done ? "#6b7280" : "#111827", fontWeight: s.done ? 400 : 600,
                  textDecoration: s.done ? "line-through" : "none" }}>{s.label}</span>
                {!s.done && i === steps.indexOf(nextStep) && (
                  <button onClick={() => setTab("profile")}
                    className="ml-auto text-xs font-bold text-[#3f37c9] hover:underline">Add →</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active jobs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-bold text-gray-800 text-base">Your Jobs</div>
          {pendingEngagements.length > 0 && (
            <button onClick={() => setTab("pending")}
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "#fff4f0", color: "#ff6b35" }}>
              {pendingEngagements.length} response{pendingEngagements.length > 1 ? "s" : ""} waiting
            </button>
          )}
        </div>

        {openJobs.length === 0 && activeBookings.length === 0 && (directHirePending?.length || 0) === 0 ? (
          /* Empty state */
          <div className="kn-card p-8 text-center">
            <div className="text-4xl mb-3">👷</div>
            <div className="font-display text-xl mb-1">Post your first job</div>
            <div className="text-sm text-gray-500 mb-5">Connect with verified workers near you in minutes.</div>
            <Link to="/post-job" className="btn-saffron inline-flex items-center gap-2">
              <Plus size={16} /> Post a Job
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Direct hire requests awaiting worker acceptance */}
            {directHirePending?.map(e => (
              <div key={e.id} className="kn-card overflow-hidden border-l-4" style={{ borderLeftColor: "#f59e0b" }}>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate">{e.job_title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Sent to 👷 {e.worker_name} · {e.job_date} · ₹{e.daily_rate}/day
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ background: "#fef9c3", color: "#854d0e" }}>
                      🟡 Awaiting Worker
                    </span>
                    <button
                      onClick={() => onCancelDirectHire(e.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline whitespace-nowrap"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Active bookings */}
            {activeBookings.map(b => (
              <div key={b.id} className="kn-card overflow-hidden">
                <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 text-base leading-tight">{b.job_title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider font-semibold">{b.category || "General"}</div>
                    </div>
                    <JobStatusChip status="confirmed" />
                  </div>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-3 bg-gray-50/50">
                  <div><div className="text-[10px] font-bold text-gray-400 uppercase">Worker</div><div className="text-sm font-semibold mt-0.5 truncate">👷 {b.worker_name}</div></div>
                  <div><div className="text-[10px] font-bold text-gray-400 uppercase">Date</div><div className="text-sm font-semibold mt-0.5">{b.job_date}</div></div>
                  <div><div className="text-[10px] font-bold text-gray-400 uppercase">Rate</div><div className="text-sm font-semibold mt-0.5">₹{b.daily_rate}/day</div></div>
                </div>
                <div className="px-4 pb-4 pt-3 flex gap-2">
                  {b.worker_phone && (
                    <a href={`tel:${b.worker_phone}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "#dcfce7", color: "#15803d" }}>
                      📞 Call Worker
                    </a>
                  )}
                </div>
              </div>
            ))}

            {/* Open jobs */}
            {openJobs.map(j => {
              const responses = pendingEngagements.filter(e => e.job_id === j.id).length;
              const catIcons = { construction:"🏗️", farm:"🌾", electrical:"⚡", cleaning:"✨", transport:"🚛", mechanical:"🔧", tailoring:"✂️", home:"🏠", other:"📦" };
              return (
                <div key={j.id} className="kn-card overflow-hidden">
                  {responses > 0 && (
                    <div className="px-4 py-2 text-xs font-bold flex items-center gap-1.5" style={{ background: "#fff4f0", color: "#ff6b35" }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b35] animate-pulse" />
                      {responses} worker{responses > 1 ? "s" : ""} interested — tap to review
                    </div>
                  )}
                  <div className="px-4 pt-4 pb-3 border-b border-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base">{catIcons[j.category] || "📦"}</span>
                          <div className="font-bold text-gray-900 text-base leading-tight truncate">{j.title}</div>
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{j.category || "General"}</div>
                      </div>
                      <JobStatusChip status="waiting" />
                    </div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-4 gap-2 bg-gray-50/50">
                    <div><div className="text-[10px] font-bold text-gray-400 uppercase">Workers</div><div className="text-sm font-bold mt-0.5">{j.workers_needed}</div></div>
                    <div><div className="text-[10px] font-bold text-gray-400 uppercase">Rate</div><div className="text-sm font-bold mt-0.5">₹{j.daily_rate}</div></div>
                    <div><div className="text-[10px] font-bold text-gray-400 uppercase">Date</div><div className="text-sm font-semibold mt-0.5">{j.job_date}</div></div>
                    <div><div className="text-[10px] font-bold text-gray-400 uppercase">Area</div><div className="text-sm font-semibold mt-0.5 truncate">{j.village || j.address?.pincode || "—"}</div></div>
                  </div>
                  <div className="px-4 pb-4 pt-3 flex gap-2">
                    {responses > 0 && (
                      <button onClick={() => setTab("pending")}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                        style={{ background: "#ff6b35", color: "white" }}>
                        See {responses} Response{responses > 1 ? "s" : ""}
                      </button>
                    )}
                    <Link to={`/marketplace?job=${j.id}`}
                      className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-bold"
                      style={{ background: "#f0f0ff", color: "#3f37c9" }}>
                      Find Workers →
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Re-post last job */}
            {lastJob && (
              <button onClick={repost}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-bold text-gray-500 hover:border-[#ff6b35] hover:text-[#ff6b35] transition">
                🔁 Re-post: {lastJob.title?.slice(0, 30)}{lastJob.title?.length > 30 ? "…" : ""}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Completed jobs awaiting rating ── */}
      {completedUnrated?.length > 0 && (
        <div>
          <div className="font-bold text-gray-800 text-base mb-3 flex items-center gap-2">
            ⭐ Rate Your Experience
            <span className="text-xs font-normal text-gray-400">({completedUnrated.length} completed)</span>
          </div>
          <div className="space-y-3">
            {completedUnrated.map(b => (
              <div key={b.id} className="kn-card overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#f0fdf4" }}>
                  <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 truncate">{b.job_title}</div>
                    <div className="text-xs text-gray-500">
                      {b.worker_name} · {b.job_date} · ₹{b.daily_rate}/day
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">✅ Done</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-600">How was the work?</div>
                  <button
                    onClick={() => onRate(b)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{ background: "#ff6b35", color: "white" }}
                  >
                    <Star size={14} /> Rate Worker
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobStatusChip({ status }) {
  const map = {
    waiting:   { label: "🟡 Waiting",      bg: "#fef9c3", color: "#854d0e" },
    confirmed: { label: "🟢 Worker Found",  bg: "#dcfce7", color: "#166534" },
    completed: { label: "✅ Done",          bg: "#f0fdf4", color: "#15803d" },
    cancelled: { label: "🔴 Cancelled",     bg: "#fee2e2", color: "#991b1b" },
  };
  const s = map[status] || map.waiting;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="kn-card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${color}15`, color }}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-2xl font-display">{value}</div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function ReviewBlock({ label, rating, comment, imageUrls = [], emptyText, onImageClick }) {
  const ratingValue = typeof rating === "object" ? rating?.stars : rating;
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</div>
      {ratingValue ? (
        <>
          <div className="flex items-center gap-1 text-sm font-bold text-[#ff6b35]">
            <Star size={13} className="fill-[#ff6b35]" />
            {ratingValue}/5
          </div>
          {comment && <p className="mt-1 text-xs text-gray-600 italic">"{comment}"</p>}
          {imageUrls?.length > 0 && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {imageUrls.map(url => (
                <img key={url} src={url} alt="Review" className="w-12 h-12 rounded-lg object-cover border border-gray-200 cursor-pointer" onClick={() => onImageClick && onImageClick(url)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-400">{emptyText}</p>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
import StarRating from "@/components/StarRating";

export default function Dashboard() {
  const { user, refreshUser, logout } = useAuth();
  const location = useLocation();
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).get("tab") || "overview"
  );

  // Sync tab when URL changes (e.g. bell icon click from same page)
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t) setTab(t);
  }, [location.search]);
  const [loading, setLoading] = useState(true);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingImages, setRatingImages] = useState([]);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const [pendingEngagements, setPendingEngagements] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, bRes, eRes, nRes] = await Promise.all([
        api.get("/jobs/mine"),
        api.get("/bookings/mine"),
        api.get("/engagements/mine"),
        api.get("/notifications/mine"),
      ]);
      setJobs(jRes.data || []);
      setBookings(bRes.data || []);
      setPendingEngagements((eRes.data || []).filter(e => e.status === "requested"));
      setNotifications(nRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) reload();
  }, [user, reload]);

  const [recentlyViewed, setRecentlyViewed] = useState([]);
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recently_viewed_workers") || "[]");
    setRecentlyViewed(saved);
  }, []);

  if (user && user.role === "admin") return <Navigate to="/admin" replace />;
  // Workers have their own dedicated dashboard
  if (user && user?.is_worker === true) return <Navigate to="/worker/dashboard" replace />;
  if (!user) return null;

  const approveEngagement = async (engId, workerName) => {
    try {
      await api.post(`/engagements/${engId}/accept`);
      toast.success(`${workerName} approved! Contact details are now shared.`);
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const rejectEngagement = async (engId, workerName) => {
    try {
      await api.post(`/engagements/${engId}/reject`);
      toast.success(`${workerName} rejected. Job is back open.`);
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const cancelEngagement = async (engId) => {
    try {
      await api.post(`/engagements/${engId}/cancel`);
      toast.success("Booking request withdrawn.");
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const markNotifRead = async (id) => {
    await api.post(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const submitRating = async () => {
    if (!ratingBooking) return;
    setSubmittingRating(true);
    try {
      const imageUrls = [];
      for (const image of ratingImages) {
        if (image.url) {
          imageUrls.push(image.url);
          continue;
        }
        const fd = new FormData();
        fd.append("file", image.file);
        const res = await api.post(`/engagements/${ratingBooking.id}/rating-photo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.photo_url) imageUrls.push(res.data.photo_url);
      }
      await api.post(`/engagements/${ratingBooking.id}/rate`, {
        rating: ratingValue,
        comment: ratingComment,
        image_urls: imageUrls
      });
      toast.success("Thanks for your feedback!");
      setRatingBooking(null);
      setRatingValue(5);
      setRatingComment("");
      ratingImages.forEach(image => {
        if (!image.url) URL.revokeObjectURL(image.preview);
      });
      setRatingImages([]);
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmittingRating(false);
    }
  };

  const stageRatingPhoto = (file) => {
    if (!ratingBooking || !file) return;
    if (ratingImages.length >= 3) {
      toast.error("You can add up to 3 review photos.");
      return;
    }
    setRatingImages(prev => [...prev, { file, preview: URL.createObjectURL(file) }].slice(0, 3));
  };

  const closeRatingModal = () => {
    setRatingBooking(null);
    setRatingValue(5);
    setRatingComment("");
    ratingImages.forEach(image => {
      if (!image.url) URL.revokeObjectURL(image.preview);
    });
    setRatingImages([]);
  };

  const startRating = (booking) => {
    const existingRating = booking.rating;
    const existingComment = booking.comment || "";
    const existingImages = booking.rating_image_urls || [];
    if (existingRating && !window.confirm("You already submitted this review. Updating it will replace your previous rating and review. Continue?")) {
      return;
    }
    ratingImages.forEach(image => {
      if (!image.url) URL.revokeObjectURL(image.preview);
    });
    setRatingBooking(booking);
    setRatingValue(typeof existingRating === "object" ? existingRating?.stars || 5 : existingRating || 5);
    setRatingComment(existingComment);
    setRatingImages(existingImages.map(url => ({ url, preview: url })));
  };

  const activeBookings = bookings.filter(b => b.status === "confirmed");
  const pastBookings = bookings.filter(b => b.status === "completed" || b.status === "cancelled");

  // Workers who applied to customer's jobs (customer must approve/reject)
  const workerApplied = pendingEngagements.filter(e => e.source === "worker_interest");
  // Direct hires customer sent — waiting for worker to accept
  const directHirePending = pendingEngagements.filter(e => e.source === "customer_booking");
  const openJobs = jobs.filter(j => j.status === "open");
  
  const monthlySpend = bookings
    .filter(b => b.status === "completed")
    .reduce((acc, b) => acc + (b.daily_rate || 0), 0);

  const spendByCat = bookings
    .filter(b => b.status === "completed")
    .reduce((acc, b) => {
      const cat = b.category || "Other";
      acc[cat] = (acc[cat] || 0) + (b.daily_rate || 0);
      return acc;
    }, {});

  return (
    <div data-testid="customer-dashboard" className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          {/* Always-visible photo upload + remove */}
          <div className="flex flex-col items-center gap-1">
            <label className="relative cursor-pointer group shrink-0" title="Upload profile photo">
              <input type="file" accept="image/*" capture="user" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const fd = new FormData();
                  fd.append("file", file);
                  try {
                    await api.post("/auth/me/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
                    await refreshUser();
                    toast.success("Profile photo updated!");
                  } catch { toast.error("Failed to upload photo."); }
                }}
              />
              {user.photo_url ? (
                <img src={user.photo_url.startsWith("http") ? user.photo_url : `${BACKEND_URL}${user.photo_url}`} alt={user.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-[#f0f0ff] flex items-center justify-center text-[#3f37c9] text-xl font-display border-2 border-dashed border-[#c7c4f0]">
                  {user.name?.[0]}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera size={16} className="text-white" />
              </div>
            </label>
            {user.photo_url && (
              <button
                onClick={async () => {
                  if (!window.confirm("Remove your profile photo?")) return;
                  try {
                    await api.patch("/auth/me", { photo_url: null });
                    await refreshUser();
                    toast.success("Photo removed.");
                  } catch { toast.error("Could not remove photo."); }
                }}
                className="text-[10px] text-gray-400 hover:text-red-500 font-semibold transition"
              >Remove photo</button>
            )}
          </div>
          <div>
            <div className="kn-overline mb-0.5">Customer Dashboard</div>
            <h1 className="font-display text-3xl tracking-tight">
              Welcome back, <span className="text-[#3f37c9]">{user.name.split(" ")[0]}</span>
            </h1>
            {!user.photo_url && <div className="text-xs text-gray-400 mt-0.5">Tap circle to add photo</div>}
          </div>
        </div>
        <Link to="/post-job" className="btn-saffron flex items-center gap-2">
          <Plus size={18} /> Post a new job
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <StatCard label="Monthly Spend" value={`₹${monthlySpend}`} icon={CreditCard} color="#16a34a" />
        <StatCard label="Active Hires" value={activeBookings.length} icon={User} color="#3f37c9" />
        <StatCard label="Open Jobs" value={openJobs.length} icon={Briefcase} color="#ff6b35" />
      </div>

      {/* Mobile-first tabs — icon+label on mobile, scrollable */}
      <div className="flex mb-6 border-b border-gray-200 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "Overview", icon: Calendar },
          { id: "pending", label: "Pending", badge: workerApplied.length, icon: Clock },
          { id: "jobs", label: "My Jobs", icon: Briefcase },
          { id: "history", label: "History", icon: History },
          { id: "notifications", label: "Alerts", badge: notifications.filter(n=>!n.read).length, icon: Bell },
          { id: "profile", label: "Profile", icon: User },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 transition"
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
        <div className="text-center py-20 text-gray-400 animate-pulse font-display text-xl">Loading your dashboard...</div>
      ) : (
        <div className="fade-up">
          {tab === "overview" && (
            <OverviewTab
              user={user}
              jobs={jobs}
              bookings={bookings}
              openJobs={openJobs}
              activeBookings={activeBookings}
              directHirePending={directHirePending}
              completedUnrated={pastBookings.filter(b => b.status === "completed" && !b.rating)}
              pendingEngagements={workerApplied}
              reload={reload}
              setTab={setTab}
              onRate={startRating}
              onCancelDirectHire={cancelEngagement}
            />
          )}

          {tab === "jobs" && (
            <div className="space-y-4">
              {jobs.filter(j => !["completed", "expired", "booked"].includes(j.status)).length === 0 && (
                <div className="kn-card p-12 text-center text-gray-500">
                  No open jobs.{" "}
                  <Link to="/post-job" className="text-[#3f37c9] font-bold">Post one →</Link>
                  {jobs.some(j => j.status === "booked") && (
                    <p className="text-xs text-gray-400 mt-2">Booked jobs are visible in <button onClick={() => setTab("overview")} className="text-[#3f37c9] font-bold hover:underline">Overview</button> under Active Bookings.</p>
                  )}
                </div>
              )}
              {jobs.filter(j => !["completed", "expired", "booked"].includes(j.status)).map(j => (
                <div key={j.id} className="kn-card p-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-xl">{j.title}</div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{j.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {j.job_date}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> {j.village}</span>
                      <span className="flex items-center gap-1.5">₹{j.daily_rate}/day</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {j.status !== "booked" && (
                      <Link to={`/marketplace?job=${j.id}`} className="btn-indigo !py-2 !px-4 text-sm text-center">Find Workers</Link>
                    )}
                    <div className={`text-center text-[10px] font-bold px-2 py-1 rounded ${
                      j.status === "open" ? "bg-green-100 text-green-700" :
                      j.status === "booked" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"}`}>
                      {j.status === "booked" ? "WORKER BOOKED" : j.status.toUpperCase()}
                    </div>
                    {!["booked"].includes(j.status) && (
                      <button
                        onClick={async () => {
                          if (!window.confirm("Delete this job? This cannot be undone.")) return;
                          try {
                            await api.delete(`/jobs/${j.id}`);
                            toast.success("Job deleted.");
                            reload();
                          } catch (err) { toast.error(formatApiError(err)); }
                        }}
                        className="text-[10px] text-red-400 hover:text-red-600 font-semibold text-center hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "pending" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Workers who expressed interest in your jobs. Approve to book them, or reject to keep the job open.</p>
              {workerApplied.length === 0 && (
                <div className="kn-card p-12 text-center text-gray-500">No pending approvals right now.</div>
              )}
              {workerApplied.map(e => (
                <div key={e.id} className="kn-card p-5 border-l-4 border-[#ff6b35]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="font-display text-lg">{e.job_title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        👷 <strong>{e.worker_name}</strong> is interested · ₹{e.daily_rate}/day · {e.job_date}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Requested {new Date(e.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => approveEngagement(e.id, e.worker_name)}
                        className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-bold transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button
                        onClick={() => rejectEngagement(e.id, e.worker_name)}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-600 text-sm font-bold transition flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              {pastBookings.length === 0 && <div className="kn-card p-12 text-center text-gray-500">No past activity found.</div>}
              {pastBookings.map(b => (
                <div key={b.id} className="kn-card p-5">
                  <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${b.status === "completed" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                      {b.status === "completed" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div>
                      <div className="font-bold">{b.job_title}</div>
                      <div className="text-xs text-gray-500">{b.worker_name} · {b.job_date}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{b.daily_rate}</div>
                    {b.rating && (
                      <div className="flex items-center gap-1 text-xs text-[#ff6b35] font-bold">
                        <Star size={12} className="fill-[#ff6b35]" />
                        {typeof b.rating === "object" ? b.rating?.stars : b.rating}
                      </div>
                    )}
                  </div>
                  </div>
                  {b.status === "completed" && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <ReviewBlock
                        label="Your review for worker"
                        rating={b.rating}
                        comment={b.comment}
                        imageUrls={b.rating_image_urls}
                        emptyText="You have not reviewed this worker yet."
                        onImageClick={setLightboxUrl}
                      />
                      <ReviewBlock
                        label="Worker review for you"
                        rating={b.customer_rating}
                        comment={b.customer_comment}
                        imageUrls={b.customer_rating_image_urls}
                        emptyText="Worker has not reviewed yet."
                        onImageClick={setLightboxUrl}
                      />
                    </div>
                  )}
                  {b.status === "completed" && (
                    <button onClick={() => startRating(b)} className="mt-3 text-xs font-bold text-[#ff6b35] hover:underline flex items-center gap-1">
                      <Star size={12} /> {b.rating ? "Edit your review" : "Rate worker"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === "notifications" && (
            <div className="space-y-3">
              {notifications.length === 0 && (
                <div className="kn-card p-12 text-center text-gray-500">No notifications yet.</div>
              )}
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markNotifRead(n.id)}
                  className={`kn-card p-4 cursor-pointer transition ${n.read ? "opacity-60" : "border-l-4 border-[#3f37c9]"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.read ? "bg-gray-300" : "bg-[#3f37c9]"}`} />
                    <div>
                      <div className="font-bold text-sm">{n.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{n.body}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {notifications.some(n => !n.read) && (
                <button
                  onClick={async () => {
                    await api.post("/notifications/read-all").catch(() => {});
                    reload();
                  }}
                  className="text-sm text-[#3f37c9] font-bold hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
          )}

          {tab === "profile" && (
            <div className="max-w-2xl mx-auto">
              <ProfileSection user={user} onUpdate={reload} />
            </div>
          )}

          {/* Rating Modal */}
          {ratingBooking && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
              <div className="kn-card w-full max-w-md p-8 animate-in fade-in zoom-in duration-200">
                <h3 className="font-display text-2xl mb-2 text-center">Rate {ratingBooking.worker_name}</h3>
                <p className="text-gray-500 text-center text-sm mb-6">How was your experience with this job?</p>
                
                <div className="flex justify-center mb-8">
                  <StarRating rating={ratingValue} setRating={setRatingValue} />
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Your Comment (Optional)</label>
                  <textarea
                    className="kn-input min-h-[100px]"
                    placeholder="Describe your experience..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                  />
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Photos (Optional)</label>
                  <div className="flex items-center gap-3 flex-wrap">
                    {ratingImages.map((image) => (
                      <div key={image.preview} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200">
                        <img src={image.preview} alt="Review" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            if (!image.url) URL.revokeObjectURL(image.preview);
                            setRatingImages(prev => prev.filter(x => x.preview !== image.preview));
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {ratingImages.length < 3 && (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 cursor-pointer hover:border-[#ff6b35] hover:text-[#ff6b35] transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={submittingRating}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            stageRatingPhoto(file);
                          }}
                        />
                        <Camera size={16} />
                        <span className="text-[10px] font-bold">Add</span>
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeRatingModal}
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
        </div>
      )}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="Review" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
