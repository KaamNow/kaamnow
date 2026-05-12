import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Users, 
  Briefcase, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  Loader2
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users?limit=20")
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.items);
    } catch (err) {
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const updateUserTrustTier = async (userId, currentTier) => {
    try {
      const newTier = currentTier === 1 ? 2 : 1; // Toggle between tier 1 and 2
      await api.patch(`/admin/users/${userId}/status`, { trust_tier: newTier });
      toast.success("User trust tier updated");
      fetchData();
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  const suspendUser = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === "suspended" ? "active" : "suspended";
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User ${newStatus}`);
      fetchData();
    } catch (err) {
      toast.error("Failed to update user");
    }
  };

  // Redirect if not admin
  if (!user || user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-[#ff6b35]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10" data-testid="admin-dashboard">
      <div className="kn-overline">Platform Control</div>
      <h1 className="font-display text-4xl tracking-tight mt-2 mb-8">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard 
          icon={<Users size={24} className="text-blue-600" />} 
          label="Total Users" 
          value={stats?.users || 0} 
        />
        <StatCard 
          icon={<Briefcase size={24} className="text-[#ff6b35]" />} 
          label="Active Jobs" 
          value={stats?.jobs?.active || 0} 
        />
        <StatCard 
          icon={<CheckCircle size={24} className="text-green-600" />} 
          label="Completed Bookings" 
          value={stats?.bookings?.completed || 0} 
        />
        <StatCard 
          icon={<Clock size={24} className="text-purple-600" />} 
          label="Total Bookings" 
          value={stats?.bookings?.total || 0} 
        />
      </div>

      {/* Recent Users Table */}
      <div className="kn-card overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="font-bold text-lg">Recent Users</h2>
          <button onClick={fetchData} className="text-sm font-bold text-[#3f37c9] hover:underline">
            Refresh Data
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                <th className="p-4 font-bold">User</th>
                <th className="p-4 font-bold">Role</th>
                <th className="p-4 font-bold">Location</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900">{u.name}</div>
                    <div className="text-gray-500 text-xs">{u.phone_primary || "—"}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      u.role === 'worker' ? 'bg-[#fff4f0] text-[#e85a25]' : 
                      u.role === 'customer' ? 'bg-[#f0f0ff] text-[#3f37c9]' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{u.village || "N/A"}</td>
                  <td className="p-4">
                    {u.status === "suspended" ? (
                      <span className="flex items-center text-red-600 text-xs font-bold"><ShieldAlert size={12} className="mr-1"/> Suspended</span>
                    ) : (
                      <span className="flex items-center text-green-600 text-xs font-bold"><CheckCircle size={12} className="mr-1"/> Active</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {u.role === "worker" && (
                        <button 
                          onClick={() => updateUserTrustTier(u.id, 1)} 
                          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded flex items-center transition-colors"
                          title="Promote Trust Tier"
                        >
                          <ShieldCheck size={14} className="mr-1" /> Tier
                        </button>
                      )}
                      <button 
                        onClick={() => suspendUser(u.id, u.status)}
                        className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                          u.status === "suspended" ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {u.status === "suspended" ? "Activate" : "Suspend"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="kn-card p-6 flex flex-col justify-between h-full hover:-translate-y-1 transition-transform">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        <div className="text-sm font-bold text-gray-600">{label}</div>
      </div>
      <div className="text-3xl font-display text-gray-900">{value}</div>
    </div>
  );
}
