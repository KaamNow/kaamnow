import { useState, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Users, Briefcase, CheckCircle, TrendingUp, AlertTriangle,
  ShieldCheck, ShieldOff, Loader2, Search, MessageSquare,
  Star, MapPin, RefreshCw, X, IndianRupee, Flag, Eye,
  Settings, ClipboardList, Trash2, ToggleLeft, ToggleRight, LogOut,
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
const STATUS_PILL = {
  open:      "bg-green-100 text-green-700",
  filled:    "bg-blue-100 text-blue-700",
  expired:   "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
  requested: "bg-amber-100 text-amber-700",
  accepted:  "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  rejected:  "bg-red-100 text-red-600",
};

const LIMIT = 20;

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // Overview
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Workers
  const [workers, setWorkers] = useState([]);
  const [workersTotal, setWorkersTotal] = useState(0);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerTierFilter, setWorkerTierFilter] = useState("");
  const [workerAvailFilter, setWorkerAvailFilter] = useState("");
  const [workerPage, setWorkerPage] = useState(0);

  // Customers
  const [customers, setCustomers] = useState([]);
  const [customersTotal, setCustomersTotal] = useState(0);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerPage, setCustomerPage] = useState(0);

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobStatusFilter, setJobStatusFilter] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [jobPage, setJobPage] = useState(0);

  // Engagements
  const [engagements, setEngagements] = useState([]);
  const [engagementsTotal, setEngagementsTotal] = useState(0);
  const [engagementsLoading, setEngagementsLoading] = useState(false);
  const [engStatusFilter, setEngStatusFilter] = useState("");
  const [engSearch, setEngSearch] = useState("");
  const [engPage, setEngPage] = useState(0);
  const [flagModal, setFlagModal] = useState(null);
  const [flagNote, setFlagNote] = useState("");

  // WhatsApp modal
  const [waModal, setWaModal] = useState(null);
  const [waMsg, setWaMsg] = useState("");
  const [waSending, setWaSending] = useState(false);

  // Broadcast modal
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastAudience, setBroadcastAudience] = useState("workers");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  // Platform Controls
  const [platform, setPlatform] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(false);
  const [wipingSeeds, setWipingSeeds] = useState(false);

  // Audit Log
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);

  // ── Fetch helpers ──

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get("/admin/stats");
      setStats(res.data);
    } catch { toast.error("Failed to load stats"); }
    finally { setStatsLoading(false); }
  }, []);

  const fetchWorkers = useCallback(async (page = 0) => {
    try {
      setWorkersLoading(true);
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT,
        ...(workerSearch && { search: workerSearch }),
        ...(workerTierFilter && { tier: workerTierFilter }),
        ...(workerAvailFilter && { availability: workerAvailFilter }),
      });
      const res = await api.get(`/admin/workers?${p}`);
      setWorkers(res.data.items); setWorkersTotal(res.data.total);
    } catch { toast.error("Failed to load workers"); }
    finally { setWorkersLoading(false); }
  }, [workerSearch, workerTierFilter, workerAvailFilter]);

  const fetchCustomers = useCallback(async (page = 0) => {
    try {
      setCustomersLoading(true);
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT,
        ...(customerSearch && { search: customerSearch }),
      });
      const res = await api.get(`/admin/customers?${p}`);
      setCustomers(res.data.items); setCustomersTotal(res.data.total);
    } catch { toast.error("Failed to load customers"); }
    finally { setCustomersLoading(false); }
  }, [customerSearch]);

  const fetchJobs = useCallback(async (page = 0) => {
    try {
      setJobsLoading(true);
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT,
        ...(jobStatusFilter && { status: jobStatusFilter }),
        ...(jobSearch && { search: jobSearch }),
      });
      const res = await api.get(`/admin/jobs?${p}`);
      setJobs(res.data.items); setJobsTotal(res.data.total);
    } catch { toast.error("Failed to load jobs"); }
    finally { setJobsLoading(false); }
  }, [jobStatusFilter, jobSearch]);

  const fetchEngagements = useCallback(async (page = 0) => {
    try {
      setEngagementsLoading(true);
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT,
        ...(engStatusFilter && { status: engStatusFilter }),
        ...(engSearch && { search: engSearch }),
      });
      const res = await api.get(`/admin/engagements?${p}`);
      setEngagements(res.data.items); setEngagementsTotal(res.data.total);
    } catch { toast.error("Failed to load engagements"); }
    finally { setEngagementsLoading(false); }
  }, [engStatusFilter, engSearch]);

  const fetchPlatform = useCallback(async () => {
    try {
      setPlatformLoading(true);
      const res = await api.get("/admin/platform-info");
      setPlatform(res.data);
    } catch { toast.error("Failed to load platform info"); }
    finally { setPlatformLoading(false); }
  }, []);

  const fetchAuditLog = useCallback(async (page = 0) => {
    try {
      setAuditLoading(true);
      const res = await api.get(`/admin/audit-log?limit=${LIMIT}&skip=${page * LIMIT}`);
      setAuditLogs(res.data.items); setAuditTotal(res.data.total);
    } catch { toast.error("Failed to load audit log"); }
    finally { setAuditLoading(false); }
  }, []);

  const wipeSeedData = async () => {
    if (!window.confirm("Delete ALL dummy +717000* accounts? This cannot be undone.")) return;
    setWipingSeeds(true);
    try {
      const res = await api.delete("/admin/seed-data");
      toast.success(`Deleted: ${res.data.deleted.users} users, ${res.data.deleted.workers} workers, ${res.data.deleted.jobs} jobs`);
      fetchPlatform();
    } catch { toast.error("Failed to wipe seed data"); }
    finally { setWipingSeeds(false); }
  };

  useEffect(() => { if (user?.role === "admin") fetchStats(); }, [user, fetchStats]);

  useEffect(() => {
    if (activeTab === "workers")     { setWorkerPage(0);    fetchWorkers(0); }
    if (activeTab === "customers")   { setCustomerPage(0);  fetchCustomers(0); }
    if (activeTab === "jobs")        { setJobPage(0);       fetchJobs(0); }
    if (activeTab === "engagements") { setEngPage(0);       fetchEngagements(0); }
    if (activeTab === "platform")    { fetchPlatform(); }
    if (activeTab === "audit")       { setAuditPage(0);     fetchAuditLog(0); }
  }, [activeTab, workerSearch, workerTierFilter, workerAvailFilter,
      customerSearch, jobStatusFilter, jobSearch, engStatusFilter, engSearch]);

  // ── Worker actions ──
  const setTier = async (workerId, tier) => {
    try { await api.patch(`/admin/workers/${workerId}/tier`, { tier }); toast.success(`Tier → ${TIER_LABEL[tier]}`); fetchWorkers(workerPage); }
    catch { toast.error("Failed"); }
  };
  const liftRestriction = async (id) => {
    try { await api.patch(`/admin/workers/${id}/lift-restriction`); toast.success("Restriction lifted"); fetchWorkers(workerPage); }
    catch { toast.error("Failed"); }
  };
  const deleteWorker = async (id, name) => {
    if (!window.confirm(`Permanently delete ALL data for "${name}"? This removes their account, worker profile, engagements and history. Cannot be undone.`)) return;
    try { await api.delete(`/admin/workers/${id}`); toast.success("Worker profile deleted"); fetchWorkers(workerPage); }
    catch { toast.error("Failed to delete worker profile"); }
  };

  const suspendWorker = async (id, status) => {
    const suspend = status !== "suspended";
    try { await api.patch(`/admin/workers/${id}/suspend`, { suspend }); toast.success(suspend ? "Suspended" : "Reactivated"); fetchWorkers(workerPage); }
    catch { toast.error("Failed"); }
  };

  // ── Customer actions ──
  const suspendCustomer = async (id, status) => {
    const suspend = status !== "suspended";
    try { await api.patch(`/admin/customers/${id}/suspend`, { suspend }); toast.success(suspend ? "Suspended" : "Reactivated"); fetchCustomers(customerPage); }
    catch { toast.error("Failed"); }
  };

  // ── Job actions ──
  const forceCloseJob = async (id) => {
    try { await api.patch(`/admin/jobs/${id}/close`); toast.success("Job closed"); fetchJobs(jobPage); }
    catch { toast.error("Failed"); }
  };

  // ── Engagement actions ──
  const flagEngagement = async () => {
    try { await api.patch(`/admin/engagements/${flagModal.id}/flag`, { note: flagNote }); toast.success("Flagged"); setFlagModal(null); setFlagNote(""); fetchEngagements(engPage); }
    catch { toast.error("Failed"); }
  };
  const unflagEngagement = async (id) => {
    try { await api.patch(`/admin/engagements/${id}/unflag`); toast.success("Unflagged"); fetchEngagements(engPage); }
    catch { toast.error("Failed"); }
  };

  // ── WhatsApp ──
  const sendWhatsApp = async () => {
    if (!waMsg.trim()) return;
    setWaSending(true);
    try { await api.post("/admin/whatsapp/send", { phone: waModal.phone, message: waMsg }); toast.success("Sent!"); setWaModal(null); setWaMsg(""); }
    catch { toast.error("Failed to send"); }
    finally { setWaSending(false); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSending(true);
    try {
      const res = await api.post("/admin/whatsapp/broadcast", { audience: broadcastAudience, message: broadcastMsg });
      toast.success(`Sent to ${res.data.sent} users`);
      setBroadcastModal(false); setBroadcastMsg("");
    } catch { toast.error("Broadcast failed"); }
    finally { setBroadcastSending(false); }
  };

  if (!user || user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "workers", label: "Workers" },
    { id: "customers", label: "Customers" },
    { id: "jobs", label: "Jobs" },
    { id: "engagements", label: "Engagements" },
    { id: "platform", label: "Platform" },
    { id: "audit", label: "Audit Log" },
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl text-[#ff6b35]">KaamNow</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setBroadcastModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors">
            <MessageSquare size={14} /> Broadcast
          </button>
          <button onClick={() => { fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => { document.cookie = "token=; Max-Age=0; path=/"; window.location.href = "/login"; }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg text-sm font-bold transition-colors">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors -mb-px border border-transparent whitespace-nowrap ${
              activeTab === t.id ? "border-gray-200 border-b-white bg-white text-[#ff6b35]" : "text-gray-500 hover:text-gray-900"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        statsLoading ? <Spinner /> : <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard icon={<Users size={20} className="text-blue-600" />} label="Workers" value={stats?.workers ?? 0} />
            <StatCard icon={<Users size={20} className="text-[#3f37c9]" />} label="Customers" value={stats?.customers ?? 0} />
            <StatCard icon={<Briefcase size={20} className="text-[#ff6b35]" />} label="Active Jobs" value={stats?.jobs?.active ?? 0} />
            <StatCard icon={<IndianRupee size={20} className="text-green-600" />} label="GMV (₹)" value={`₹${((stats?.gmv ?? 0)/1000).toFixed(1)}k`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<TrendingUp size={20} className="text-green-600" />} label="Completed Jobs" value={stats?.engagements?.completed ?? 0} />
            <StatCard icon={<CheckCircle size={20} className="text-indigo-600" />} label="Active Engagements" value={stats?.engagements?.active ?? 0} />
            <StatCard icon={<AlertTriangle size={20} className="text-amber-600" />} label="Restricted Workers" value={stats?.restricted_workers ?? 0} />
            <StatCard icon={<Briefcase size={20} className="text-gray-400" />} label="Total Jobs Posted" value={stats?.jobs?.total ?? 0} />
          </div>
          <div className="kn-card p-6">
            <h2 className="font-bold text-base mb-4">Workers by Trust Tier</h2>
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(t => (
                <div key={t} className={`rounded-xl p-4 text-center ${TIER_COLOR[t]}`}>
                  <div className="text-2xl font-display">{stats?.tier_breakdown?.[String(t)] ?? 0}</div>
                  <div className="text-xs font-bold mt-1">{TIER_LABEL[t]}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── WORKERS ── */}
      {activeTab === "workers" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchBox value={workerSearch} onChange={setWorkerSearch} placeholder="Search name or phone…" />
            <Select value={workerTierFilter} onChange={setWorkerTierFilter} options={[["","All Tiers"],[1,"Basic"],[2,"Verified"],[3,"Pro"],[4,"Elite"]]} />
            <Select value={workerAvailFilter} onChange={setWorkerAvailFilter} options={[["","All Status"],["available","Available"],["restricted","Restricted"],["suspended","Suspended"]]} />
            <ClearBtn show={workerSearch||workerTierFilter||workerAvailFilter} onClear={() => { setWorkerSearch(""); setWorkerTierFilter(""); setWorkerAvailFilter(""); }} />
            <span className="text-sm text-gray-400 self-center ml-auto">{workersTotal} workers</span>
          </div>
          <div className="kn-card overflow-hidden">
            {workersLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="p-4">Worker</th><th className="p-4">Skills</th><th className="p-4">Location</th>
                    <th className="p-4">Rating</th><th className="p-4">Tier</th><th className="p-4">Status</th><th className="p-4">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {workers.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{w.name}</div>
                          <div className="text-gray-400 text-xs">{w.phone || "—"}</div>
                          <div className="text-gray-400 text-xs">₹{w.daily_rate}/day</div>
                        </td>
                        <td className="p-4 text-xs text-gray-500 max-w-[140px]">
                          <div className="truncate">{(w.skills||[]).slice(0,3).join(", ")||"—"}</div>
                        </td>
                        <td className="p-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1"><MapPin size={10}/>{[w.village,w.state].filter(Boolean).join(", ")||"—"}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Star size={11} className="text-amber-400 fill-amber-400"/>
                            <span className="font-bold text-xs">{(w.avg_rating||0).toFixed(1)}</span>
                            <span className="text-gray-400 text-xs">· {w.total_jobs} jobs</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <select value={w.trust_tier||1} onChange={e => setTier(w.id, Number(e.target.value))}
                            className={`text-xs font-bold px-2 py-1 rounded-lg border-0 cursor-pointer ${TIER_COLOR[w.trust_tier||1]}`}>
                            {[1,2,3,4].map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs font-bold capitalize ${AVAIL_COLOR[w.availability_status]||"text-gray-500"}`}>
                            {w.availability_status||"available"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {w.availability_status === "restricted" && (
                              <ActionBtn onClick={() => liftRestriction(w.id)} color="amber" title="Lift restriction"><ShieldCheck size={13}/></ActionBtn>
                            )}
                            <ActionBtn onClick={() => suspendWorker(w.id, w.availability_status)}
                              color={w.availability_status==="suspended" ? "green" : "red"}
                              title={w.availability_status==="suspended" ? "Reactivate" : "Suspend"}>
                              {w.availability_status==="suspended" ? <ShieldCheck size={13}/> : <ShieldOff size={13}/>}
                            </ActionBtn>
                            {w.phone && <ActionBtn onClick={() => setWaModal({phone:w.phone,name:w.name})} color="green" title="WhatsApp"><MessageSquare size={13}/></ActionBtn>}
                            <ActionBtn onClick={() => deleteWorker(w.id, w.name)} color="red" title="Delete worker profile"><Trash2 size={13}/></ActionBtn>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {workers.length===0 && <EmptyRow cols={7} />}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={workersTotal} page={workerPage} onPage={p => { setWorkerPage(p); fetchWorkers(p); }} />
          </div>
        </>
      )}

      {/* ── CUSTOMERS ── */}
      {activeTab === "customers" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="Search name or phone…" />
            <ClearBtn show={customerSearch} onClear={() => setCustomerSearch("")} />
            <span className="text-sm text-gray-400 self-center ml-auto">{customersTotal} customers</span>
          </div>
          <div className="kn-card overflow-hidden">
            {customersLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="p-4">Customer</th><th className="p-4">Location</th><th className="p-4">Jobs Posted</th>
                    <th className="p-4">Status</th><th className="p-4">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{c.name || "—"}</div>
                          <div className="text-gray-400 text-xs">{c.phone_primary}</div>
                        </td>
                        <td className="p-4 text-xs text-gray-500">{c.village || "—"}</td>
                        <td className="p-4 text-sm font-bold text-gray-700">{c.jobs_posted ?? 0}</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold ${c.status==="suspended" ? "text-red-600" : "text-green-600"}`}>
                            {c.status==="suspended" ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <ActionBtn onClick={() => suspendCustomer(c.id, c.status)}
                              color={c.status==="suspended" ? "green" : "red"}
                              title={c.status==="suspended" ? "Reactivate" : "Suspend"}>
                              {c.status==="suspended" ? <ShieldCheck size={13}/> : <ShieldOff size={13}/>}
                            </ActionBtn>
                            {c.phone_primary && <ActionBtn onClick={() => setWaModal({phone:c.phone_primary,name:c.name})} color="green" title="WhatsApp"><MessageSquare size={13}/></ActionBtn>}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {customers.length===0 && <EmptyRow cols={5} />}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={customersTotal} page={customerPage} onPage={p => { setCustomerPage(p); fetchCustomers(p); }} />
          </div>
        </>
      )}

      {/* ── JOBS ── */}
      {activeTab === "jobs" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchBox value={jobSearch} onChange={setJobSearch} placeholder="Search title or customer…" />
            <Select value={jobStatusFilter} onChange={setJobStatusFilter}
              options={[["","All Status"],["open","Open"],["filled","Filled"],["expired","Expired"],["cancelled","Cancelled"]]} />
            <ClearBtn show={jobSearch||jobStatusFilter} onClear={() => { setJobSearch(""); setJobStatusFilter(""); }} />
            <span className="text-sm text-gray-400 self-center ml-auto">{jobsTotal} jobs</span>
          </div>
          <div className="kn-card overflow-hidden">
            {jobsLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="p-4">Job</th><th className="p-4">Customer</th><th className="p-4">Rate</th>
                    <th className="p-4">Date</th><th className="p-4">Interests</th><th className="p-4">Status</th><th className="p-4">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {jobs.map(j => (
                      <tr key={j.id} className="hover:bg-gray-50/50">
                        <td className="p-4">
                          <div className="font-bold text-gray-900 max-w-[180px] truncate">{j.title}</div>
                          <div className="text-gray-400 text-xs">{j.category}</div>
                        </td>
                        <td className="p-4 text-xs text-gray-600">{j.customer_name || "—"}</td>
                        <td className="p-4 text-xs font-bold text-gray-700">₹{j.daily_rate}/day</td>
                        <td className="p-4 text-xs text-gray-500">{j.job_date ? j.job_date.slice(0,10) : "—"}</td>
                        <td className="p-4 text-xs text-gray-700 font-bold">{j.engagement_count ?? 0}</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[j.status]||"bg-gray-100 text-gray-500"}`}>
                            {j.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {j.status === "open" && (
                            <ActionBtn onClick={() => forceCloseJob(j.id)} color="red" title="Force close">
                              <X size={13}/>
                            </ActionBtn>
                          )}
                        </td>
                      </tr>
                    ))}
                    {jobs.length===0 && <EmptyRow cols={7} />}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={jobsTotal} page={jobPage} onPage={p => { setJobPage(p); fetchJobs(p); }} />
          </div>
        </>
      )}

      {/* ── ENGAGEMENTS ── */}
      {activeTab === "engagements" && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <SearchBox value={engSearch} onChange={setEngSearch} placeholder="Search worker, customer, or job…" />
            <Select value={engStatusFilter} onChange={setEngStatusFilter}
              options={[["","All Status"],["requested","Requested"],["accepted","Accepted"],["completed","Completed"],["cancelled","Cancelled"],["rejected","Rejected"]]} />
            <ClearBtn show={engSearch||engStatusFilter} onClear={() => { setEngSearch(""); setEngStatusFilter(""); }} />
            <span className="text-sm text-gray-400 self-center ml-auto">{engagementsTotal} engagements</span>
          </div>
          <div className="kn-card overflow-hidden">
            {engagementsLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="p-4">Job</th><th className="p-4">Worker</th><th className="p-4">Customer</th>
                    <th className="p-4">Rate</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {engagements.map(e => (
                      <tr key={e.id} className={`hover:bg-gray-50/50 ${e.flagged ? "bg-red-50" : ""}`}>
                        <td className="p-4">
                          <div className="font-bold text-gray-900 max-w-[160px] truncate">{e.job_title||"—"}</div>
                          {e.flagged && <span className="text-xs text-red-500 font-bold flex items-center gap-1"><Flag size={10}/> Flagged</span>}
                        </td>
                        <td className="p-4 text-xs text-gray-600">{e.worker_name||"—"}</td>
                        <td className="p-4 text-xs text-gray-600">{e.customer_name||"—"}</td>
                        <td className="p-4 text-xs font-bold text-gray-700">₹{e.daily_rate||0}/day</td>
                        <td className="p-4">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_PILL[e.status]||"bg-gray-100 text-gray-500"}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-gray-500">{(e.created_at||"").slice(0,10)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {e.flagged
                              ? <ActionBtn onClick={() => unflagEngagement(e.id)} color="gray" title="Unflag"><Eye size={13}/></ActionBtn>
                              : <ActionBtn onClick={() => { setFlagModal(e); setFlagNote(""); }} color="red" title="Flag dispute"><Flag size={13}/></ActionBtn>
                            }
                          </div>
                        </td>
                      </tr>
                    ))}
                    {engagements.length===0 && <EmptyRow cols={7} />}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={engagementsTotal} page={engPage} onPage={p => { setEngPage(p); fetchEngagements(p); }} />
          </div>
        </>
      )}

      {/* ── PLATFORM ── */}
      {activeTab === "platform" && (
        platformLoading ? <Spinner /> : platform ? (
          <div className="space-y-6">
            {/* Feature Flags */}
            <div className="kn-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Settings size={18} className="text-[#ff6b35]" />
                <h2 className="font-bold text-base">Feature Flags</h2>
                <span className="text-xs text-gray-400 ml-2">(read-only — change via k8s secrets)</span>
              </div>
              <div className="space-y-3">
                {Object.entries(platform.feature_flags).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm font-mono text-gray-700">{key}</span>
                    <span className={`flex items-center gap-1.5 text-sm font-bold ${val ? "text-green-600" : "text-gray-400"}`}>
                      {val ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>}
                      {val ? "ON" : "OFF"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection counts */}
            <div className="kn-card p-6">
              <h2 className="font-bold text-base mb-4">MongoDB Collections</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(platform.collections).map(([col, count]) => (
                  <div key={col} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xl font-display text-gray-900">{count}</div>
                    <div className="text-xs text-gray-500 font-mono mt-1">{col}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            <div className="kn-card p-6 border-red-100">
              <h2 className="font-bold text-base text-red-600 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-500 mb-4">
                Dummy accounts: <span className="font-bold text-gray-800">{platform.dummy_accounts}</span> (+717000* phones)
              </p>
              <button onClick={wipeSeedData} disabled={wipingSeeds || platform.dummy_accounts === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white rounded-xl text-sm font-bold transition-colors">
                <Trash2 size={14}/> {wipingSeeds ? "Wiping…" : "Wipe Seed Data"}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={fetchPlatform} className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold">Load Platform Info</button>
        )
      )}

      {/* ── AUDIT LOG ── */}
      {activeTab === "audit" && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ClipboardList size={16}/> Last {Math.min(auditTotal, LIMIT)} of {auditTotal} actions
            </div>
            <button onClick={() => fetchAuditLog(auditPage)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold">
              <RefreshCw size={12}/> Refresh
            </button>
          </div>
          <div className="kn-card overflow-hidden">
            {auditLoading ? <Spinner /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                    <th className="p-4">Time</th><th className="p-4">Admin</th><th className="p-4">Action</th>
                    <th className="p-4">Target</th><th className="p-4">Detail</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="p-4 text-xs text-gray-400 whitespace-nowrap">{(log.ts||"").replace("T"," ").slice(0,19)}</td>
                        <td className="p-4 text-xs font-bold text-gray-700">{log.admin_name}</td>
                        <td className="p-4">
                          <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">{log.action}</span>
                        </td>
                        <td className="p-4 text-xs text-gray-500 font-mono max-w-[140px] truncate">{log.target||"—"}</td>
                        <td className="p-4 text-xs text-gray-500 max-w-[200px] truncate">{log.detail||"—"}</td>
                      </tr>
                    ))}
                    {auditLogs.length===0 && <EmptyRow cols={5} />}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination total={auditTotal} page={auditPage} onPage={p => { setAuditPage(p); fetchAuditLog(p); }} />
          </div>
        </>
      )}

      {/* ── WhatsApp Modal ── */}
      {waModal && (
        <Modal title={`WhatsApp → ${waModal.name}`} onClose={() => setWaModal(null)}>
          <div className="text-xs text-gray-400 mb-3">{waModal.phone}</div>
          <textarea value={waMsg} onChange={e => setWaMsg(e.target.value)} placeholder="Type your message…" rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/30 resize-none"/>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setWaModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={sendWhatsApp} disabled={waSending||!waMsg.trim()}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {waSending ? "Sending…" : "Send"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Flag Modal ── */}
      {flagModal && (
        <Modal title="Flag Dispute" onClose={() => setFlagModal(null)}>
          <div className="text-sm text-gray-600 mb-3">{flagModal.job_title} — {flagModal.worker_name} / {flagModal.customer_name}</div>
          <textarea value={flagNote} onChange={e => setFlagNote(e.target.value)} placeholder="Reason for flagging (optional)…" rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"/>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setFlagModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={flagEngagement} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold">Flag</button>
          </div>
        </Modal>
      )}

      {/* ── Broadcast Modal ── */}
      {broadcastModal && (
        <Modal title="Broadcast WhatsApp" onClose={() => setBroadcastModal(false)}>
          <div className="flex gap-2 mb-4">
            {["workers","customers"].map(a => (
              <button key={a} onClick={() => setBroadcastAudience(a)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${broadcastAudience===a ? "bg-[#ff6b35] text-white border-[#ff6b35]" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                {a.charAt(0).toUpperCase()+a.slice(1)}
              </button>
            ))}
          </div>
          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder={`Message to all ${broadcastAudience}…`} rows={4}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"/>
          <div className="text-xs text-amber-600 mt-2">⚠️ Dummy +717000* accounts are excluded automatically.</div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setBroadcastModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={sendBroadcast} disabled={broadcastSending||!broadcastMsg.trim()}
              className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-50">
              {broadcastSending ? "Sending…" : `Send to all ${broadcastAudience}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
    </div>
  );
}

// ── Shared sub-components ──

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

function Spinner() {
  return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#ff6b35]" size={24}/></div>;
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/30"/>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}

function ClearBtn({ show, onClear }) {
  if (!show) return null;
  return (
    <button onClick={onClear} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 px-2">
      <X size={14}/> Clear
    </button>
  );
}

function ActionBtn({ onClick, color, title, children }) {
  const colors = {
    red:   "bg-red-100 hover:bg-red-200 text-red-700",
    green: "bg-green-100 hover:bg-green-200 text-green-700",
    amber: "bg-amber-100 hover:bg-amber-200 text-amber-700",
    gray:  "bg-gray-100 hover:bg-gray-200 text-gray-600",
  };
  return (
    <button onClick={onClick} title={title} className={`p-1.5 rounded-lg transition-colors ${colors[color]||colors.gray}`}>
      {children}
    </button>
  );
}

function EmptyRow({ cols }) {
  return <tr><td colSpan={cols} className="p-10 text-center text-gray-400">Nothing found.</td></tr>;
}

function Pagination({ total, page, onPage }) {
  if (total <= LIMIT) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
      <span>Showing {page*LIMIT+1}–{Math.min((page+1)*LIMIT, total)} of {total}</span>
      <div className="flex gap-2">
        <button disabled={page===0} onClick={() => onPage(page-1)}
          className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">← Prev</button>
        <button disabled={(page+1)*LIMIT>=total} onClick={() => onPage(page+1)}
          className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next →</button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}
