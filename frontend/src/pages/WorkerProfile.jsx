import { useEffect, useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Star, MapPin, ShieldCheck, ArrowLeft, Briefcase, Check, Clock, AlertTriangle, X } from "lucide-react";

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
  const [existingBooking, setExistingBooking] = useState(null); // pending request for this worker
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    api.get(`/workers/${id}`).then((r) => {
      setWorker(r.data);
      const workerData = { id: r.data.id, name: r.data.name, photo_url: r.data.photo_url, skills: r.data.skills };
      const saved = JSON.parse(localStorage.getItem("recently_viewed_workers") || "[]");
      localStorage.setItem("recently_viewed_workers", JSON.stringify([workerData, ...saved.filter(w => w.id !== r.data.id)].slice(0, 5)));
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "customer") {
      Promise.all([
        api.get("/jobs/mine"),
        api.get("/bookings/mine"),
      ]).then(([jobsRes, bookingsRes]) => {
        const openJobs = jobsRes.data.filter((j) => j.status === "open");
        setMyJobs(openJobs);
        if (requestedJobId && openJobs.some((j) => j.id === requestedJobId)) {
          setSelectedJob(requestedJobId);
        } else if (openJobs.length > 0) {
          setSelectedJob(openJobs[0].id);
        }
        // Check if a pending request already exists for this worker
        const pending = bookingsRes.data.find(
          (b) => b.worker_id === id && (b.engagement_status === "requested" || b.status === "pending")
        );
        setExistingBooking(pending || null);
      });
    }
  }, [user, requestedJobId, id]);

  const book = async () => {
    if (!selectedJob) return toast.error("Pick a job to book this worker for.");
    setBooking(true);
    try {
      const res = await api.post("/bookings", { job_id: selectedJob, worker_id: id });
      toast.success("Booking request sent! Worker will respond shortly.");
      setExistingBooking(res.data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  const withdraw = async () => {
    setWithdrawing(true);
    try {
      await api.post(`/engagements/${existingBooking.id}/cancel`);
      toast.success("Booking request withdrawn.");
      setExistingBooking(null);
      setConfirmWithdraw(false);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-500">Loading…</div>;
  if (!worker) return <div className="p-12 text-center text-gray-500">Worker not found.</div>;

  const tierLabels = { 1: "Self-verified", 2: "Gaon Verified", 3: "KaamNow Pro" };

  const skills = worker.structured_skills?.length
    ? worker.structured_skills.map(s => s.skill)
    : (worker.skills || []);

  const photoSrc = worker.photo_url
    ? (worker.photo_url.startsWith("http") ? worker.photo_url : `${process.env.REACT_APP_BACKEND_URL}${worker.photo_url}`)
    : null;

  return (
    <div data-testid="worker-profile-page" className="max-w-3xl mx-auto px-4 py-5">
      {/* Back */}
      <Link to="/marketplace" data-testid="back-to-marketplace" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#3f37c9] mb-4">
        <ArrowLeft size={13} /> Marketplace
      </Link>

      {/* Hero row — compact */}
      <div className="kn-card p-4 flex items-center gap-4 mb-3">
        {photoSrc ? (
          <img src={photoSrc} alt={worker.name}
            className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl font-display font-bold text-[#3f37c9] flex-shrink-0">
            {worker.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl tracking-tight leading-tight">{worker.name}</h1>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <MapPin size={11} /> {[worker.village, worker.district, worker.state].filter(Boolean).join(", ")}
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#3f37c9] text-white">
              <ShieldCheck size={10} /> {tierLabels[worker.trust_tier]}
            </span>
            <span className="flex items-center gap-1 text-xs">
              <Star size={12} className="fill-[#ff6b35] text-[#ff6b35]" />
              <span className="font-bold">{worker.avg_rating.toFixed(1)}</span>
              <span className="text-gray-400">· {worker.total_jobs} jobs</span>
            </span>
            <span className="font-display text-base font-bold text-[#3f37c9]">
              ₹{worker.daily_rate}<span className="text-xs text-gray-400 font-medium">/day</span>
            </span>
          </div>
        </div>
      </div>

      {/* Booking panel — mobile first, before details */}
      <div className="kn-card p-4 mb-3" data-testid="booking-panel">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg">Book {worker.name.split(" ")[0]}</h3>
        </div>
        {!user && (
          <Link to="/login" className="btn-saffron w-full text-center block text-sm">Log in to book</Link>
        )}
        {user?.role === "worker" && (
          <p className="text-sm text-gray-500">Workers can't book other workers.</p>
        )}
        {user?.role === "customer" && (
          <div className="space-y-2">
            {existingBooking ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#fff9f0", border: "1.5px solid #ffe0b2" }}>
                  <Clock size={18} style={{ color: "#ff6b35", flexShrink: 0 }} />
                  <div>
                    <div className="font-bold text-sm text-gray-800">Request sent — awaiting response</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {existingBooking.job_title ? `For: ${existingBooking.job_title}` : "Worker will respond shortly"}
                    </div>
                  </div>
                </div>
                <button onClick={() => setConfirmWithdraw(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition">
                  <X size={14} /> Withdraw Request
                </button>
              </div>
            ) : myJobs.length === 0 ? (
              <>
                <p className="text-sm text-gray-500">No open jobs yet.</p>
                <Link to="/post-job" data-testid="post-job-link" className="btn-saffron w-full text-center block text-sm">
                  <Briefcase size={13} className="inline mr-1" /> Post a job first
                </Link>
              </>
            ) : (
              <>
                <select data-testid="job-select" value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)} className="kn-input text-sm">
                  <option value="">— Pick an open job —</option>
                  {myJobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title} ({j.job_date})</option>
                  ))}
                </select>
                <button onClick={book} disabled={booking || !selectedJob} data-testid="confirm-booking"
                  className="btn-saffron w-full disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
                  <Check size={15} /> {booking ? "Sending…" : "Send booking request"}
                </button>
                <Link to="/post-job" className="text-xs text-[#3f37c9] font-bold">+ Post a new job</Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Jobs Done", value: worker.total_jobs },
          { label: "Rating", value: worker.avg_rating.toFixed(1) + " ★" },
          { label: "Trust", value: `Tier ${worker.trust_tier}` },
        ].map(s => (
          <div key={s.label} className="kn-card p-3 text-center">
            <div className="font-display text-lg text-[#3f37c9] leading-none">{s.value}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Skills */}
      {skills.length > 0 && (
        <div className="kn-card p-4 mb-3">
          <div className="kn-overline mb-2">Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {skills.map(s => (
              <span key={s} className="px-2.5 py-1 rounded-lg bg-[#f0f0ff] text-[#3f37c9] text-xs font-semibold">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      {worker.bio && (
        <div className="kn-card p-4">
          <div className="kn-overline mb-2">About</div>
          <p className="text-gray-600 text-sm leading-relaxed">{worker.bio}</p>
        </div>
      )}

      {/* Withdraw Dialog */}
      {confirmWithdraw && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <h3 className="font-display text-xl">Withdraw Request?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">The worker will no longer see your request. You can send a new one anytime.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmWithdraw(false)} className="flex-1 btn-outline" disabled={withdrawing}>Keep it</button>
              <button onClick={withdraw} disabled={withdrawing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition disabled:opacity-60">
                {withdrawing ? "Withdrawing…" : "Yes, Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
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
