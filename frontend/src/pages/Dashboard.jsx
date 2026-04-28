import { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import api from "@/lib/api";
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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    village: user?.village || "",
    phone: user?.phone || "",
    pincode: user?.address?.pincode || "",
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/auth/me", form);
      toast.success("Profile updated");
      setEditing(false);
      onUpdate();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="kn-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display text-xl">Your Profile</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="text-sm font-bold text-[#3f37c9] hover:underline flex items-center gap-1"
        >
          <Settings size={14} /> {editing ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={save} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Full Name</label>
              <input
                className="kn-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Phone</label>
              <input
                className="kn-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Village</label>
              <input
                className="kn-input"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block">Pincode</label>
              <input
                className="kn-input"
                value={form.pincode}
                maxLength={6}
                onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>
          <button type="submit" className="btn-saffron w-full">Save Changes</button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#f0f0ff] flex items-center justify-center text-[#3f37c9] text-2xl font-display">
              {user.name?.[0]}
            </div>
            <div>
              <div className="font-display text-2xl">{user.name}</div>
              <div className="text-gray-500 text-sm">{user.email}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Phone</div>
              <div className="font-semibold">{user.phone || "Not set"}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-400 uppercase">Location</div>
              <div className="font-semibold">{user.village || "Not set"}{user.address?.pincode ? `, ${user.address.pincode}` : ""}</div>
            </div>
          </div>
        </div>
      )}
    </div>
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

/* ─── Main Component ───────────────────────────────────────────────────── */
import StarRating from "@/components/StarRating";

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [ratingBooking, setRatingBooking] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Workers have their own dedicated dashboard
  if (user && user.role === "worker") return <Navigate to="/worker/dashboard" replace />;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [jRes, bRes] = await Promise.all([
        api.get("/jobs/mine"),
        api.get("/bookings/mine"),
      ]);
      setJobs(jRes.data || []);
      setBookings(bRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) reload();
  }, [user, reload]);

  const complete = async (id) => {
    try {
      await api.post(`/bookings/${id}/complete`);
      toast.success("Marked completed");
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const submitRating = async () => {
    if (!ratingBooking) return;
    setSubmittingRating(true);
    try {
      await api.post(`/engagements/${ratingBooking.id}/rate`, {
        rating: ratingValue,
        comment: ratingComment
      });
      toast.success("Thanks for your feedback!");
      setRatingBooking(null);
      setRatingValue(5);
      setRatingComment("");
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmittingRating(false);
    }
  };

  if (!user) return null;

  const activeBookings = bookings.filter(b => b.status === "confirmed" || b.status === "pending");
  const pastBookings = bookings.filter(b => b.status === "completed" || b.status === "cancelled");
  const openJobs = jobs.filter(j => j.status === "open");
  
  const monthlySpend = bookings
    .filter(b => b.status === "completed")
    .reduce((acc, b) => acc + (b.daily_rate || 0), 0);

  const [recentlyViewed, setRecentlyViewed] = useState([]);
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recently_viewed_workers") || "[]");
    setRecentlyViewed(saved);
  }, []);

  const spendByCat = bookings
    .filter(b => b.status === "completed")
    .reduce((acc, b) => {
      const cat = b.category || "Other";
      acc[cat] = (acc[cat] || 0) + (b.daily_rate || 0);
      return acc;
    }, {});

  return (
    <div data-testid="customer-dashboard" className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
        <div>
          <div className="kn-overline mb-1">Customer Dashboard</div>
          <h1 className="font-display text-4xl tracking-tight">
            Welcome back, <span className="text-[#3f37c9]">{user.name.split(" ")[0]}</span>
          </h1>
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

      <div className="flex gap-2 mb-8 border-b border-gray-200 pb-px">
        {[
          { id: "overview", label: "Overview", icon: Calendar },
          { id: "jobs", label: "My Jobs", icon: Briefcase },
          { id: "history", label: "History", icon: History },
          { id: "profile", label: "Profile", icon: User },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
              tab === t.id
                ? "border-[#3f37c9] text-[#3f37c9]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400 animate-pulse font-display text-xl">Loading your dashboard...</div>
      ) : (
        <div className="fade-up">
          {tab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Active Hires */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-xl">Active Hires</h3>
                    <Link to="/marketplace" className="text-sm font-bold text-[#3f37c9] hover:underline">Find more workers →</Link>
                  </div>
                  {activeBookings.length === 0 ? (
                    <div className="kn-card p-10 text-center text-gray-500 italic">No active bookings yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {activeBookings.map(b => (
                        <div key={b.id} className="kn-card p-5 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <div className="font-display text-lg">{b.job_title}</div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-3">
                              <span className="flex items-center gap-1"><User size={12} /> {b.worker_name}</span>
                              <span className="flex items-center gap-1"><Calendar size={12} /> {b.job_date}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusBadge status={b.status} />
                            {b.status === "confirmed" && (
                              <button onClick={() => complete(b.id)} className="btn-outline !py-2 !px-3 text-sm">Mark Done</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recently Viewed */}
                {recentlyViewed.length > 0 && (
                  <div>
                    <h3 className="font-display text-xl mb-4">Recently Viewed</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {recentlyViewed.map(w => (
                        <Link to={`/worker/${w.id}`} key={w.id} className="kn-card p-4 flex items-center gap-3 hover:border-[#3f37c9] transition">
                          <img src={w.photo_url || "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=100&w=100"} alt={w.name} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <div className="font-bold text-sm">{w.name}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{w.skills?.[0] || "Worker"}</div>
                          </div>
                          <ChevronRight size={14} className="ml-auto text-gray-300" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                {/* Spend Breakdown */}
                {monthlySpend > 0 && (
                  <div className="kn-card p-6">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 mb-4">Spend Breakdown</h3>
                    <div className="space-y-4">
                      {Object.entries(spendByCat).map(([cat, amt]) => {
                        const pct = Math.round((amt / monthlySpend) * 100);
                        return (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-sm mb-1.5">
                              <span className="font-semibold text-gray-700 capitalize">{cat}</span>
                              <span className="font-bold">₹{amt}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#3f37c9] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Jobs */}
                <div>
                  <h3 className="font-display text-xl mb-4">Recent Jobs</h3>
                  <div className="space-y-3">
                    {openJobs.slice(0, 3).map(j => (
                      <Link to={`/marketplace?job=${j.id}`} key={j.id} className="kn-card p-4 block hover:border-[#3f37c9] group transition">
                        <div className="font-bold group-hover:text-[#3f37c9]">{j.title}</div>
                        <div className="text-xs text-gray-500 mt-1">{j.village} · {j.job_date}</div>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-gray-400">{j.workers_needed} workers needed</span>
                          <ChevronRight size={14} className="text-gray-300 group-hover:text-[#3f37c9]" />
                        </div>
                      </Link>
                    ))}
                    {openJobs.length === 0 && (
                      <div className="kn-card p-6 text-center text-sm text-gray-400">No open jobs.</div>
                    )}
                    <Link to="/post-job" className="w-full btn-outline flex items-center justify-center gap-2 text-sm">
                      <Plus size={14} /> Post new job
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "jobs" && (
            <div className="space-y-4">
              {jobs.length === 0 && <div className="kn-card p-12 text-center text-gray-500">You haven&apos;t posted any jobs yet.</div>}
              {jobs.map(j => (
                <div key={j.id} className="kn-card p-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-display text-xl">{j.title}</div>
                    <p className="text-sm text-gray-600 mt-1">{j.description}</p>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> {j.job_date}</span>
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> {j.village}</span>
                      <span className="flex items-center gap-1.5">₹{j.daily_rate}/day</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Link to={`/marketplace?job=${j.id}`} className="btn-indigo !py-2 !px-4 text-sm text-center">Find Workers</Link>
                    <div className={`text-center text-[10px] font-bold px-2 py-1 rounded ${j.status === "open" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {j.status.toUpperCase()}
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
                <div key={b.id} className="kn-card p-5 flex items-center justify-between">
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
                    {b.status === "completed" && !b.rating && (
                      <button onClick={() => setRatingBooking(b)} className="text-xs font-bold text-[#ff6b35] hover:underline flex items-center gap-1 ml-auto">
                        <Star size={12} /> Rate worker
                      </button>
                    )}
                    {b.rating && (
                      <div className="flex items-center gap-1 text-xs text-[#ff6b35] font-bold">
                        <Star size={12} className="fill-[#ff6b35]" /> {b.rating}
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

                <div className="flex gap-3">
                  <button
                    onClick={() => setRatingBooking(null)}
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
    </div>
  );
}
