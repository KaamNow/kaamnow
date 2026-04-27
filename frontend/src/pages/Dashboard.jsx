import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Briefcase, Star, Calendar, ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("bookings");

  const reload = async () => {
    if (user?.role === "customer") {
      const j = await api.get("/jobs/mine");
      setJobs(j.data);
    }
    const b = await api.get("/bookings/mine");
    setBookings(b.data);
  };

  useEffect(() => {
    if (user) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const accept = async (id) => {
    await api.post(`/bookings/${id}/accept`);
    toast.success("Booking accepted");
    reload();
  };

  const complete = async (id) => {
    await api.post(`/bookings/${id}/complete`);
    toast.success("Marked completed");
    reload();
  };

  const rate = async (id) => {
    const r = parseInt(prompt("Rate this worker 1-5:"), 10);
    if (!r || r < 1 || r > 5) return;
    try {
      await api.post("/bookings/rate", { booking_id: id, rating: r, comment: "" });
      toast.success("Thanks for rating!");
      reload();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  if (!user) return null;

  return (
    <div data-testid="dashboard-page" className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kn-overline">Dashboard</div>
          <h1 className="font-display text-4xl tracking-tight mt-2">
            Hi {user.name.split(" ")[0]}, <span className="text-[#3f37c9]">{user.role === "worker" ? "your jobs" : "your hires"}</span>
          </h1>
        </div>
        {user.role === "customer" && (
          <Link to="/post-job" data-testid="post-job-cta" className="btn-saffron flex items-center gap-2">
            <Plus size={16} /> Post a job
          </Link>
        )}
        {user.role === "worker" && (
          <Link to="/worker/setup" data-testid="worker-setup-cta" className="btn-outline flex items-center gap-2">
            <ShieldCheck size={16} /> Worker profile
          </Link>
        )}
      </div>

      <div className="mt-8 flex gap-2">
        <TabBtn active={tab === "bookings"} onClick={() => setTab("bookings")} testId="tab-bookings">
          Bookings ({bookings.length})
        </TabBtn>
        {user.role === "customer" && (
          <TabBtn active={tab === "jobs"} onClick={() => setTab("jobs")} testId="tab-jobs">
            My jobs ({jobs.length})
          </TabBtn>
        )}
      </div>

      {tab === "bookings" && (
        <div className="mt-6 space-y-3" data-testid="bookings-list">
          {bookings.length === 0 && <div className="kn-card p-8 text-center text-gray-500">No bookings yet.</div>}
          {bookings.map((b) => (
            <div key={b.id} className="kn-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg">{b.job_title}</div>
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {b.job_date}</span>
                  <span>₹{b.daily_rate}/day</span>
                  <span>{user.role === "worker" ? `Customer: ${b.customer_name}` : `Worker: ${b.worker_name}`}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${
                  b.status === "completed" ? "bg-green-100 text-green-700" :
                  b.status === "confirmed" ? "bg-[#3f37c9] text-white" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {b.status}
                </span>
                {user.role === "worker" && b.status === "pending" && (
                  <button data-testid={`accept-${b.id}`} onClick={() => accept(b.id)} className="btn-indigo !py-2 !px-3 text-sm">Accept</button>
                )}
                {b.status === "confirmed" && user.role === "customer" && (
                  <button data-testid={`complete-${b.id}`} onClick={() => complete(b.id)} className="btn-outline !py-2 !px-3 text-sm">Mark done</button>
                )}
                {b.status === "completed" && !b.rating && user.role === "customer" && (
                  <button data-testid={`rate-${b.id}`} onClick={() => rate(b.id)} className="btn-saffron !py-2 !px-3 text-sm flex items-center gap-1">
                    <Star size={12} /> Rate
                  </button>
                )}
                {b.rating && (
                  <span className="text-sm flex items-center gap-1">
                    <Star size={12} className="fill-[#ff6b35] text-[#ff6b35]" /> {b.rating}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "jobs" && user.role === "customer" && (
        <div className="mt-6 space-y-3" data-testid="jobs-list">
          {jobs.length === 0 && <div className="kn-card p-8 text-center text-gray-500">No jobs posted yet.</div>}
          {jobs.map((j) => (
            <div key={j.id} className="kn-card p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-display text-lg">{j.title}</div>
                <div className="text-sm text-gray-600 mt-1 flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {j.job_date}</span>
                  <span>{j.village}</span>
                  <span>{j.workers_needed} worker(s) · ₹{j.daily_rate}/day</span>
                </div>
              </div>
              <Link to="/marketplace" className="btn-outline !py-2 !px-3 text-sm flex items-center gap-1">
                <Briefcase size={12} /> Find workers
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children, testId }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
        active ? "bg-[#3f37c9] text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-[#3f37c9]"
      }`}
    >
      {children}
    </button>
  );
}
