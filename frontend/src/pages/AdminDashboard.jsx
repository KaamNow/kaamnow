import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Users, Briefcase, CheckCircle, TrendingUp, AlertTriangle,
  ShieldCheck, ShieldAlert, ShieldOff, Loader2, Search,
  MessageSquare, Star, MapPin, RefreshCw, X, IndianRupee,
} from "lucide-react";

const TIER_LABEL = { 1: "Basic", 2: "Verified", 3: "Pro", 4: "Elite" };
const TIER_COLOR = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-green-100 text-green-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-amber-100 text-amber-700",
};
const AVAIL_COLOR = {
  available: "text-green-600",
  restricted: "text-amber-600",
  suspended: "text-red-600",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Workers tab state
  const [workers, setWorkers] = useState([]);
  const [workersTotal, setWorkersTotal] = useState(0);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerTierFilter, setWorkerTierFilter] = useState("");
  const [workerAvailFilter, setWorkerAvailFilter] = useState("");
  const [workerPage, setWorkerPage] = useState(0);

  // WhatsApp modal
  const [waModal, setWaModal] = useState(null); // { phone, name }
  const [waMsg, setWaMsg] = useState("");
  const [waSending, setWaSending] = useState(false);

  const LIMIT = 20;

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch {
      toast.error("Failed to load stats");
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchWorkers = useCallback(async (page = 0) => {
    try {
      setWorkersLoading(true);
      const params = new URLSearchParams({
        limit: LIMIT,
        skip: page * LIMIT,
        ...(workerSearch && { search: workerSearch }),
        ...(workerTierFilter && { tier: workerTierFilter }),
        ...(workerAvailFilter && { availability: workerAvailFilter }),
      });
      const res = await api.get(`/admin/workers?${params}`);
      setWorkers(res.data.items);
      setWorkersTotal(res.data.total);
    } catch {
      toast.error("Failed to load workers");
    } finally {
      setWorkersLoading(false);
    }
  }, [workerSearch, workerTierFilter, workerAvailFilter]);

  useEffect(() => {
    if (user?.role === "admin") fetchStats();
  }, [user, fetchStats]);

  useEffect(() => {
    if (activeTab === "workers") {
      setWorkerPage(0);
      fetchWorkers(0);
    }
  }, [activeTab, workerSearch, workerTierFilter, workerAvailFilter]);

  // --- Worker actions ---
  const setTier = async (workerId, tier) => {
    try {
      await api.patch(`/admin/workers/${workerId}/tier`, { tier });
      toast.success(`Tier set to ${TIER_LABEL[tier]}`);
      fetchWorkers(workerPage);
    } catch {
      toast.error("Failed to update tier");
    }
  };

  const liftRestriction = async (workerId) => {
    try {
      await api.patch(`/admin/workers/${workerId}/lift-restriction`);
      toast.success("Restriction lifted");
      fetchWorkers(workerPage);
    } catch {
      toast.error("Failed to lift restriction");
    }
  };

  const suspendWorker = async (workerId, currentStatus) => {
    const suspend = currentStatus !== "suspended";
    try {
      await api.patch(`/admin/workers/${workerId}/suspend`, { suspend });
      toast.success(suspend ? "Worker suspended" : "Worker reactivated");
      fetchWorkers(workerPage);
    } catch {
      toast.error("Failed to update worker");
    }
  };

  const sendWhatsApp = async () => {
    if (!waMsg.trim()) return;
    setWaSending(true);
    try {
      await api.post("/admin/whatsapp/send", { phone: waModal.phone, message: waMsg });
      toast.success(`WhatsApp sent to ${waModal.name}`);
      setWaModal(null);
      setWaMsg("");
    } catch {
      toast.error("Failed to send WhatsApp");
    } finally {
      setWaSending(false);
    }
  };

  if (!user || user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "workers", label: "Workers" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="kn-overline">Platform Control</div>
          <h1 className="font-display text-3xl tracking-tight mt-1">Admin Dashboard</h1>
        </div>
        <button
          onClick={() => { fetchStats(); if (activeTab === "workers") fetchWorkers(workerPage); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors -mb-px border border-transparent ${
              activeTab === t.id
                ? "border-gray-200 border-b-white bg-white text-[#ff6b35]"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <>
          {statsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#ff6b35]" size={28} /></div>
          ) : (
            <>
              {/* Primary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <StatCard icon={<Users size={20} className="text-blue-600" />} label="Workers" value={stats?.workers ?? 0} />
                <StatCard icon={<Users size={20} className="text-[#3f37c9]" />} label="Customers" value={stats?.customers ?? 0} />
                <StatCard icon={<Briefcase size={20} className="text-[#ff6b35]" />} label="Active Jobs" value={stats?.jobs?.active ?? 0} />
                <StatCard
                  icon={<IndianRupee size={20} className="text-green-600" />}
                  label="GMV (₹)"
                  value={`₹${((stats?.gmv ?? 0) / 1000).toFixed(1)}k`}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard icon={<TrendingUp size={20} className="text-green-600" />} label="Completed Jobs" value={stats?.engagements?.completed ?? 0} />
                <StatCard icon={<CheckCircle size={20} className="text-indigo-600" />} label="Active Engagements" value={stats?.engagements?.active ?? 0} />
                <StatCard icon={<AlertTriangle size={20} className="text-amber-600" />} label="Restricted Workers" value={stats?.restricted_workers ?? 0} />
                <StatCard icon={<Briefcase size={20} className="text-gray-400" />} label="Total Jobs Posted" value={stats?.jobs?.total ?? 0} />
              </div>

              {/* Tier breakdown */}
              <div className="kn-card p-6">
                <h2 className="font-bold text-base mb-4">Workers by Trust Tier</h2>
                <div className="grid grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(t => (
                    <div key={t} className={`rounded-xl p-4 text-center ${TIER_COLOR[t]}`}>
                      <div className="text-2xl font-display">{stats?.tier_breakdown?.[String(t)] ?? 0}</div>
                      <div className="text-xs font-bold mt-1">{TIER_LABEL[t]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── WORKERS ── */}
      {activeTab === "workers" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={workerSearch}
                onChange={e => setWorkerSearch(e.target.value)}
                placeholder="Search name or phone…"
                className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30"
              />
            </div>
            <select
              value={workerTierFilter}
              onChange={e => setWorkerTierFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">All Tiers</option>
              {[1, 2, 3, 4].map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
            </select>
            <select
              value={workerAvailFilter}
              onChange={e => setWorkerAvailFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="available">Available</option>
              <option value="restricted">Restricted</option>
              <option value="suspended">Suspended</option>
            </select>
            {(workerSearch || workerTierFilter || workerAvailFilter) && (
              <button
                onClick={() => { setWorkerSearch(""); setWorkerTierFilter(""); setWorkerAvailFilter(""); }}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2"
              >
                <X size={14} /> Clear
              </button>
            )}
            <span className="text-sm text-gray-400 self-center ml-auto">{workersTotal} workers</span>
          </div>

          {/* Table */}
          <div className="kn-card overflow-hidden">
            {workersLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#ff6b35]" size={24} /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                      <th className="p-4 font-bold">Worker</th>
                      <th className="p-4 font-bold">Skills</th>
                      <th className="p-4 font-bold">Location</th>
                      <th className="p-4 font-bold">Rating / Jobs</th>
                      <th className="p-4 font-bold">Tier</th>
                      <th className="p-4 font-bold">Status</th>
                      <th className="p-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workers.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{w.name}</div>
                          <div className="text-gray-400 text-xs">{w.phone || "—"}</div>
                          <div className="text-gray-400 text-xs">₹{w.daily_rate}/day</div>
                        </td>
                        <td className="p-4 text-gray-600 max-w-[160px]">
                          <div className="truncate text-xs">{(w.skills || []).slice(0, 3).join(", ") || "—"}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin size={10} />
                            {[w.village, w.state].filter(Boolean).join(", ") || "—"}
                          </div>
                          {w.pincode && <div className="text-xs text-gray-400">{w.pincode}</div>}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                            <span className="font-bold text-xs">{(w.avg_rating || 0).toFixed(1)}</span>
                            <span className="text-gray-400 text-xs">· {w.total_jobs} jobs</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={w.trust_tier || 1}
                            onChange={e => setTier(w.id, Number(e.target.value))}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${TIER_COLOR[w.trust_tier || 1]}`}
                          >
                            {[1, 2, 3, 4].map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold capitalize ${AVAIL_COLOR[w.availability_status] || "text-gray-500"}`}>
                            {w.availability_status || "available"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {w.availability_status === "restricted" && (
                              <button
                                onClick={() => liftRestriction(w.id)}
                                title="Lift restriction"
                                className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors"
                              >
                                <ShieldCheck size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => suspendWorker(w.id, w.availability_status)}
                              title={w.availability_status === "suspended" ? "Reactivate" : "Suspend"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                w.availability_status === "suspended"
                                  ? "bg-green-100 hover:bg-green-200 text-green-700"
                                  : "bg-red-100 hover:bg-red-200 text-red-700"
                              }`}
                            >
                              {w.availability_status === "suspended" ? <ShieldCheck size={13} /> : <ShieldOff size={13} />}
                            </button>
                            {w.phone && (
                              <button
                                onClick={() => setWaModal({ phone: w.phone, name: w.name })}
                                title="Send WhatsApp"
                                className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors"
                              >
                                <MessageSquare size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {workers.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-gray-400">No workers found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {workersTotal > LIMIT && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
                <span>Showing {workerPage * LIMIT + 1}–{Math.min((workerPage + 1) * LIMIT, workersTotal)} of {workersTotal}</span>
                <div className="flex gap-2">
                  <button
                    disabled={workerPage === 0}
                    onClick={() => { setWorkerPage(p => p - 1); fetchWorkers(workerPage - 1); }}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >← Prev</button>
                  <button
                    disabled={(workerPage + 1) * LIMIT >= workersTotal}
                    onClick={() => { setWorkerPage(p => p + 1); fetchWorkers(workerPage + 1); }}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* WhatsApp Modal */}
      {waModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Send WhatsApp to {waModal.name}</h3>
              <button onClick={() => setWaModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="text-xs text-gray-400 mb-3">{waModal.phone}</div>
            <textarea
              value={waMsg}
              onChange={e => setWaMsg(e.target.value)}
              placeholder="Type your message…"
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setWaModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={sendWhatsApp}
                disabled={waSending || !waMsg.trim()}
                className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-colors"
              >
                {waSending ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="kn-card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</div>
      </div>
      <div className="text-2xl font-display text-gray-900">{value}</div>
    </div>
  );
}
