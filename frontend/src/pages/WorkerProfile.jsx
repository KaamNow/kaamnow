import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Star, MapPin, ShieldCheck, ArrowLeft, Briefcase, Check } from "lucide-react";

export default function WorkerProfile() {
  const { id } = useParams();
  const location = useLocation();
  const requestedJobId = new URLSearchParams(location.search).get("job") || "";
  const { user } = useAuth();
  const nav = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/workers/${id}`).then((r) => {
      setWorker(r.data);
      // Save to recently viewed
      const workerData = {
        id: r.data.id,
        name: r.data.name,
        photo_url: r.data.photo_url,
        skills: r.data.skills
      };
      const saved = JSON.parse(localStorage.getItem("recently_viewed_workers") || "[]");
      const filtered = saved.filter(w => w.id !== r.data.id);
      const updated = [workerData, ...filtered].slice(0, 5);
      localStorage.setItem("recently_viewed_workers", JSON.stringify(updated));
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "customer") {
      api.get("/jobs/mine").then((r) => {
        const openJobs = r.data.filter((j) => j.status === "open");
        setMyJobs(openJobs);
        if (requestedJobId && openJobs.some((j) => j.id === requestedJobId)) {
          setSelectedJob(requestedJobId);
        } else if (openJobs.length > 0) {
          setSelectedJob(openJobs[0].id);
        }
      });
    }
  }, [user, requestedJobId]);

  const book = async () => {
    if (!selectedJob) return toast.error("Pick a job to book this worker for.");
    setBooking(true);
    try {
      await api.post("/bookings", { job_id: selectedJob, worker_id: id });
      toast.success("Booking request sent!");
      nav("/dashboard");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading…</div>;
  if (!worker) return <div className="p-12 text-center text-gray-500">Worker not found.</div>;

  const tierLabels = { 1: "Self-verified", 2: "Gaon Verified", 3: "KaamNow Pro" };

  return (
    <div data-testid="worker-profile-page" className="max-w-5xl mx-auto px-6 py-10">
      <Link to="/marketplace" data-testid="back-to-marketplace" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#3f37c9]">
        <ArrowLeft size={14} /> Back to marketplace
      </Link>

      <div className="mt-6 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 kn-card p-8">
          <div className="flex flex-wrap gap-6 items-start">
            <img
              src={worker.photo_url}
              alt={worker.name}
              className="w-28 h-28 rounded-xl object-cover border border-gray-200"
            />
            <div className="flex-1 min-w-[240px]">
              <h1 className="font-display text-4xl tracking-tight">{worker.name}</h1>
              <div className="mt-1 text-gray-600 flex items-center gap-2">
                <MapPin size={14} /> {worker.village}, {worker.district}, {worker.state}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#3f37c9] text-white">
                  <ShieldCheck size={12} /> {tierLabels[worker.trust_tier]}
                </span>
                <div className="flex items-center gap-1 text-sm">
                  <Star size={14} className="fill-[#ff6b35] text-[#ff6b35]" />
                  <span className="font-bold">{worker.avg_rating.toFixed(1)}</span>
                  <span className="text-gray-500">· {worker.total_jobs} jobs done</span>
                </div>
              </div>
              <div className="mt-4 font-display text-3xl text-[#3f37c9]">
                ₹{worker.daily_rate}<span className="text-base text-gray-500 font-medium">/day</span>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <div className="kn-overline mb-2">Skills</div>
            <div className="flex flex-wrap gap-2">
              {worker.skills.map((s) => (
                <span key={s} className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-semibold">
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <div className="kn-overline mb-2">About</div>
            <p className="text-gray-700 leading-relaxed">{worker.bio}</p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-gray-200 pt-6">
            <Stat label="Jobs" value={worker.total_jobs} />
            <Stat label="Rating" value={worker.avg_rating.toFixed(1)} />
            <Stat label="Trust" value={`Tier ${worker.trust_tier}`} />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="kn-card p-6 sticky top-24" data-testid="booking-panel">
            <h3 className="font-display text-2xl">Book {worker.name.split(" ")[0]}</h3>
            <p className="text-sm text-gray-600 mt-1">Select one of your open jobs to send a booking request.</p>

            {!user && (
              <div className="mt-5 text-sm">
                <Link to="/login" className="btn-saffron w-full text-center block">Log in to book</Link>
              </div>
            )}
            {user?.role === "worker" && (
              <p className="mt-5 text-sm text-gray-500">Workers can&apos;t book other workers.</p>
            )}
            {user?.role === "customer" && (
              <div className="mt-5 space-y-3">
                {myJobs.length === 0 ? (
                  <>
                    <p className="text-sm text-gray-600">You don&apos;t have any open jobs yet.</p>
                    <Link to="/post-job" data-testid="post-job-link" className="btn-saffron w-full text-center block">
                      <Briefcase size={14} className="inline mr-1" /> Post a job first
                    </Link>
                  </>
                ) : (
                  <>
                    <select
                      data-testid="job-select"
                      value={selectedJob}
                      onChange={(e) => setSelectedJob(e.target.value)}
                      className="kn-input"
                    >
                      <option value="">— Pick an open job —</option>
                      {myJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title} ({j.job_date})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={book}
                      disabled={booking || !selectedJob}
                      data-testid="confirm-booking"
                      className="btn-saffron w-full disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      <Check size={16} /> {booking ? "Sending…" : "Send booking request"}
                    </button>
                    <Link to="/post-job" className="text-sm text-[#3f37c9] font-bold">+ Post a new job</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="font-display text-2xl">{value}</div>
      <div className="text-xs uppercase tracking-wider font-bold text-gray-500 mt-1">{label}</div>
    </div>
  );
}
