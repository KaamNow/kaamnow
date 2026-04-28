import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  Clock,
  XCircle,
  ChevronRight,
  Edit3,
  BadgeCheck,
} from "lucide-react";
import StarRating from "@/components/StarRating";

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
function ProfileSection({ profile, worker, onAvailToggle, toggling }) {
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
          {worker.photo_url ? (
            <img
              src={worker.photo_url}
              alt={worker.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-display">
              {worker.name?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <div className="text-white font-display text-2xl">{worker.name}</div>
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
        <div className="mt-4 flex items-center justify-between">
          <span className="text-white/80 text-sm font-semibold">
            {worker.availability_status === "available" || worker.available
              ? "🟢 Available for work"
              : "🔴 Not available"}
          </span>
          <button
            onClick={onAvailToggle}
            disabled={toggling}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-lg text-white text-sm font-bold disabled:opacity-60"
          >
            {worker.availability_status === "available" || worker.available ? (
              <ToggleRight size={18} />
            ) : (
              <ToggleLeft size={18} />
            )}
            Toggle
          </button>
        </div>
      </div>

      {/* Skills */}
      <div className="kn-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-sm">Your Skills</span>
          <Link
            to="/worker/onboarding"
            className="text-xs flex items-center gap-1 text-[#3f37c9] font-bold hover:underline"
          >
            <Edit3 size={11} /> Edit
          </Link>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jobs", value: worker.total_jobs || 0 },
          { label: "Rating", value: worker.avg_rating ? worker.avg_rating.toFixed(1) + "★" : "—" },
          { label: "Earnings", value: "₹" + totalEarnings },
          { label: "Trust Tier", value: worker.trust_tier || 1 },
        ].map((s) => (
          <div key={s.label} className="kn-card p-4 text-center">
            <div className="font-display text-2xl text-[#3f37c9] truncate">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Engagement Card ──────────────────────────────────────────────────── */
function EngagementCard({ eng, onCancel, isCancelling, onRate }) {
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
                    <Star size={10} className="fill-[#ff6b35]" /> {eng.rating}
                  </div>
                ) : <span className="text-gray-400 italic">No rating yet</span>}
              </div>
              <div className="text-xs">
                <span className="text-gray-400 uppercase font-bold text-[9px] block mb-0.5">Your Rating</span>
                {eng.customer_rating ? (
                  <div className="flex items-center gap-1 font-bold text-[#3f37c9]">
                    <Star size={10} className="fill-[#3f37c9]" /> {eng.customer_rating}
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
        <button
          onClick={() => onCancel(eng.id)}
          disabled={isCancelling}
          className="mt-3 text-xs text-red-500 hover:underline font-semibold disabled:opacity-50"
        >
          Cancel request
        </button>
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
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("profile");
  const [worker, setWorker] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const [ratingEng, setRatingEng] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, eRes] = await Promise.all([
        api.get("/workers/me/profile").catch(() => ({ data: null })),
        api.get("/engagements/mine").catch(() => ({ data: [] })),
      ]);
      setWorker(wRes.data);
      setEngagements(eRes.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <TabBtn active={tab === "profile"} onClick={() => setTab("profile")} icon={User} label="Profile" />
        <TabBtn
          active={tab === "active"}
          onClick={() => setTab("active")}
          icon={Clock}
          label="Active"
          count={activeEngagements.length}
        />
        <TabBtn
          active={tab === "past"}
          onClick={() => setTab("past")}
          icon={History}
          label="Past Jobs"
          count={pastEngagements.length}
        />
        <TabBtn active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings} label="Settings" />
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
              onAvailToggle={handleAvailToggle}
              toggling={toggling}
            />
          )}

          {/* ── Active Requests Tab ── */}
          {tab === "active" && (
            <div>
              {activeEngagements.length === 0 ? (
                <div className="kn-card p-10 text-center">
                  <Clock size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No active requests.</p>
                  <Link to="/worker/job-feed" className="btn-saffron inline-flex items-center gap-2 mt-4 text-sm">
                    <Briefcase size={14} /> Browse job feed
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeEngagements.map((e) => (
                    <EngagementCard
                      key={e.id}
                      eng={e}
                      onCancel={handleCancel}
                      isCancelling={cancelling === e.id}
                      onRate={setRatingEng}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Past Jobs Tab ── */}
          {tab === "past" && (
            <div>
              {pastEngagements.length === 0 ? (
                <div className="kn-card p-10 text-center">
                  <History size={36} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No past jobs yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastEngagements.map((e) => (
                    <EngagementCard
                      key={e.id}
                      eng={e}
                      onCancel={() => {}}
                      isCancelling={false}
                      onRate={setRatingEng}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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
    </div>
  );
}
