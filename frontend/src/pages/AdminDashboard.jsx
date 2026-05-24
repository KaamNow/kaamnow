import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const TIER_LABELS = { 1: "Self Verified", 2: "Verified", 3: "KaamNow Pro", 4: "Elite Expert" };
const TIER_COLORS = {
  1: "bg-gray-100 text-gray-600",
  2: "bg-green-100 text-green-700",
  3: "bg-blue-100 text-blue-700",
  4: "bg-amber-100 text-amber-700",
};

function StatCard({ label, value, icon, color = "indigo" }) {
  const colors = {
    indigo: "bg-indigo-50 text-indigo-600",
    green:  "bg-green-50 text-green-600",
    amber:  "bg-amber-50 text-amber-600",
    rose:   "bg-rose-50 text-rose-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function Badge({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-bold text-gray-800 mb-3">{children}</h2>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [tab,    setTab]    = useState("experts");
  const [stats,  setStats]  = useState(null);

  const [experts,      setExperts]      = useState([]);
  const [expertTotal,  setExpertTotal]  = useState(0);
  const [expertSearch, setExpertSearch] = useState("");
  const [expertPage,   setExpertPage]   = useState(0);

  const [users,      setUsers]      = useState([]);
  const [userTotal,  setUserTotal]  = useState(0);
  const [userSearch, setUserSearch] = useState("");

  const [jobs,     setJobs]     = useState([]);
  const [jobTotal, setJobTotal] = useState(0);

  const [loading, setLoading] = useState(false);

  const LIMIT = 25;

  const fetchStats = useCallback(async () => {
    try { const r = await api.get("/admin/stats"); setStats(r.data); } catch {}
  }, []);

  const fetchExperts = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT });
      if (expertSearch) p.append("search", expertSearch);
      const r = await api.get(`/admin/experts?${p}`);
      setExperts(r.data.items || []);
      setExpertTotal(r.data.total || 0);
      setExpertPage(page);
    } catch {}
    finally { setLoading(false); }
  }, [expertSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT });
      if (userSearch) p.append("search", userSearch);
      const r = await api.get(`/admin/users?${p}`);
      setUsers(r.data.items || []);
      setUserTotal(r.data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, [userSearch]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/jobs?limit=50");
      setJobs(r.data.items || []);
      setJobTotal(r.data.total || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => {
    if (tab === "experts") fetchExperts(0);
    if (tab === "users")   fetchUsers();
    if (tab === "jobs")    fetchJobs();
  }, [tab]);

  // ── Expert actions ──────────────────────────────────────────────────────────
  const suspendExpert = async (id, status) => {
    const suspend = status !== "suspended";
    if (!window.confirm(suspend ? "Suspend this expert?" : "Reactivate this expert?")) return;
    try {
      await api.patch(`/admin/experts/${id}/suspend`, { suspend });
      fetchExperts(expertPage);
    } catch (e) { alert(e?.response?.data?.detail || "Error"); }
  };

  const deleteExpert = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/experts/${id}`);
      fetchExperts(expertPage);
    } catch (e) { alert(e?.response?.data?.detail || "Error"); }
  };

  const setTrustTier = async (id, tier) => {
    try {
      await api.patch(`/admin/experts/${id}/trust-tier`, { trust_tier: tier });
      fetchExperts(expertPage);
    } catch (e) { alert(e?.response?.data?.detail || "Error"); }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const TABS = [
    { key: "experts", label: "Local Experts" },
    { key: "users",   label: "Users" },
    { key: "jobs",    label: "Jobs" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900">KaamNow Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{user?.name || user?.email || "Admin"}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"         value={stats?.users}    icon="👤" color="indigo" />
          <StatCard label="Local Experts"        value={stats?.experts}  icon="⭐" color="amber"  />
          <StatCard label="Jobs Posted"          value={stats?.jobs?.total ?? stats?.jobs}     icon="📋" color="green"  />
          <StatCard label="Engagements"          value={stats?.work_requests?.total ?? stats?.work_requests ?? stats?.engagements} icon="🤝" color="rose" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── EXPERTS ── */}
        {tab === "experts" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle>Local Experts ({expertTotal})</SectionTitle>
              <div className="flex items-center gap-2">
                <input
                  value={expertSearch}
                  onChange={e => setExpertSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchExperts(0)}
                  placeholder="Search by name or skill…"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  onClick={() => fetchExperts(0)}
                  className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3">Expert</th>
                      <th className="px-5 py-3">Skills</th>
                      <th className="px-5 py-3">Rate</th>
                      <th className="px-5 py-3">Trust Tier</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {experts.map(w => (
                      <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-gray-900">{w.display_name || w.name}</div>
                          <div className="text-gray-400 text-xs mt-0.5">{w.village || w.location_text || "—"}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {(w.skills || []).slice(0, 3).map(s => (
                              <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full capitalize">
                                {s.replace(/_/g, " ")}
                              </span>
                            ))}
                            {(w.skills || []).length > 3 && (
                              <span className="text-gray-400 text-xs">+{w.skills.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-700">
                          {w.daily_rate ? `₹${w.daily_rate}/day` : "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <select
                            value={w.trust_tier || 1}
                            onChange={e => setTrustTier(w.id, parseInt(e.target.value))}
                            className={`text-xs font-semibold rounded-lg px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${TIER_COLORS[w.trust_tier || 1]}`}
                          >
                            {[1, 2, 3, 4].map(t => (
                              <option key={t} value={t}>{TIER_LABELS[t]}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={
                            w.availability_status === "suspended" || w.is_active === false
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700"
                          }>
                            {w.availability_status === "suspended" ? "Suspended" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => suspendExpert(w.id, w.availability_status)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                                w.availability_status === "suspended"
                                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                              }`}
                            >
                              {w.availability_status === "suspended" ? "Reactivate" : "Suspend"}
                            </button>
                            <button
                              onClick={() => deleteExpert(w.id, w.display_name || w.name)}
                              className="text-xs px-2.5 py-1 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {experts.length === 0 && (
                  <div className="p-10 text-center text-gray-400 text-sm">No experts found</div>
                )}
              </div>
            )}

            {/* Pagination */}
            {expertTotal > LIMIT && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Showing {expertPage * LIMIT + 1}–{Math.min((expertPage + 1) * LIMIT, expertTotal)} of {expertTotal}</span>
                <div className="flex gap-2">
                  <button
                    disabled={expertPage === 0}
                    onClick={() => fetchExperts(expertPage - 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <button
                    disabled={(expertPage + 1) * LIMIT >= expertTotal}
                    onClick={() => fetchExperts(expertPage + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── USERS ── */}
        {tab === "users" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
              <SectionTitle>Users ({userTotal})</SectionTitle>
              <div className="flex items-center gap-2">
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchUsers()}
                  placeholder="Search by name or phone…"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <button
                  onClick={fetchUsers}
                  className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Search
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Phone</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900">{u.name}</td>
                        <td className="px-5 py-3.5 text-gray-500">{u.phone_primary || "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{u.village || u.pincode || "—"}</td>
                        <td className="px-5 py-3.5">
                          {u.has_service_profile
                            ? <Badge className="bg-indigo-100 text-indigo-700">Expert</Badge>
                            : <Badge className="bg-gray-100 text-gray-600">Customer</Badge>
                          }
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={u.is_active === false ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}>
                            {u.is_active === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <div className="p-10 text-center text-gray-400 text-sm">No users found</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── JOBS ── */}
        {tab === "jobs" && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <SectionTitle>Jobs ({jobTotal})</SectionTitle>
            </div>

            {loading ? (
              <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3">Title</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Rate</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {jobs.map(j => (
                      <tr key={j.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-gray-900 max-w-[200px] truncate">{j.title}</td>
                        <td className="px-5 py-3.5 text-gray-500 capitalize">{j.category || "—"}</td>
                        <td className="px-5 py-3.5 text-gray-700">{j.daily_rate ? `₹${j.daily_rate}` : "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{j.job_date || "—"}</td>
                        <td className="px-5 py-3.5 text-gray-500">{j.village || j.pincode || "—"}</td>
                        <td className="px-5 py-3.5">
                          <Badge className={
                            j.status === "open"      ? "bg-green-100 text-green-700"  :
                            j.status === "closed"    ? "bg-gray-100 text-gray-600"    :
                            j.status === "cancelled" ? "bg-red-100 text-red-600"      :
                                                       "bg-blue-100 text-blue-700"
                          }>
                            {j.status || "open"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {jobs.length === 0 && (
                  <div className="p-10 text-center text-gray-400 text-sm">No jobs found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
