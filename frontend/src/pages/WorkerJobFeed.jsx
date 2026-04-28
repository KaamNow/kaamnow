import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { useAuth, formatApiError } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Briefcase,
  MapPin,
  Calendar,
  IndianRupee,
  Zap,
  CheckCircle,
  Clock,
  Search,
  SlidersHorizontal,
  HandHeart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";

/* ─── Match Rank Pill ──────────────────────────────────────────────────── */
function MatchPill({ rank, samePin, skillMatch }) {
  if (rank === 1)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
        <BadgeCheck size={10} /> Best match
      </span>
    );
  if (rank === 2 && skillMatch)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
        Skill match
      </span>
    );
  if (rank === 3 && samePin)
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
        Near you
      </span>
    );
  return null;
}

/* ─── Urgency Badge ────────────────────────────────────────────────────── */
function UrgencyBadge({ urgency }) {
  if (urgency !== "urgent") return null;
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
      <Zap size={9} /> Urgent
    </span>
  );
}

/* ─── Job Card ─────────────────────────────────────────────────────────── */
function JobCard({ job, onInterest, sending }) {
  const [expanded, setExpanded] = useState(false);
  const addr = job.address || {};
  const addrParts = [addr.village || job.village, addr.district, addr.state, addr.pincode]
    .filter(Boolean);

  return (
    <div
      className="kn-card overflow-hidden transition-all"
      style={{
        borderColor: job.match_rank === 1 ? "#16a34a" : job.same_pincode ? "#ff6b35" : undefined,
        borderWidth: job.match_rank === 1 ? "1.5px" : undefined,
      }}
    >
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-display text-base leading-tight">{job.title}</div>
            <div className="text-xs text-gray-400 mt-0.5">{job.customer_name}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <UrgencyBadge urgency={job.urgency} />
            <MatchPill rank={job.match_rank} samePin={job.same_pincode} skillMatch={job.skill_match} />
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <IndianRupee size={12} />
            <strong className="text-gray-700">₹{job.daily_rate}/day</strong>
          </span>
          {job.job_date && (
            <span className="flex items-center gap-1">
              <Calendar size={12} /> {job.job_date}
            </span>
          )}
          {addrParts.length > 0 && (
            <span className="flex items-center gap-1">
              <MapPin size={12} /> {addrParts.join(", ")}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} /> {job.workers_needed} worker{job.workers_needed > 1 ? "s" : ""} needed
          </span>
        </div>

        {/* Matched skills */}
        {job.matched_skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.matched_skills.map((s) => (
              <span
                key={s}
                className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "#dcfce7", color: "#166534" }}
              >
                ✓ {s}
              </span>
            ))}
          </div>
        )}

        {/* Description expand */}
        {job.description && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {expanded ? "Hide details" : "View details"}
            </button>
            {expanded && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">{job.description}</p>
            )}
          </div>
        )}

        {/* Action */}
        <div className="mt-4 flex items-center gap-3">
          <button
            data-testid={`interest-${job.id}`}
            disabled={sending === job.id || job._already_interested}
            onClick={() => onInterest(job.id)}
            className="btn-saffron flex items-center gap-2 text-sm !py-2 !px-4 disabled:opacity-60"
          >
            {sending === job.id ? (
              <>
                <RefreshCw size={13} className="animate-spin" /> Sending…
              </>
            ) : job._already_interested ? (
              <>
                <CheckCircle size={13} /> Interested
              </>
            ) : (
              <>
                <HandHeart size={13} /> Interested / रुचि है
              </>
            )}
          </button>
          {job.match_rank === 1 && (
            <span className="text-xs text-green-600 font-semibold">Perfect match!</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────── */
export default function WorkerJobFeed() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null); // job_id currently being sent
  const [interestedIds, setInterestedIds] = useState(new Set());
  const [pincodeFilter, setPincodeFilter] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  const loadFeed = useCallback(async (pincode = "") => {
    setLoading(true);
    try {
      const params = pincode ? { pincode } : {};
      const r = await api.get("/jobs/feed", { params });
      setJobs(r.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadFeed();
  }, [user, loadFeed]);

  const handleInterest = async (jobId) => {
    if (interestedIds.has(jobId)) return;
    setSending(jobId);
    try {
      await api.post(`/jobs/${jobId}/interest`);
      setInterestedIds((prev) => new Set([...prev, jobId]));
      toast.success("Interest sent! The customer will be notified.");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSending(null);
    }
  };

  const handlePincodeSearch = (e) => {
    e.preventDefault();
    loadFeed(pincodeFilter.trim());
  };

  const enrichedJobs = jobs.map((j) => ({
    ...j,
    _already_interested: interestedIds.has(j.id),
  }));

  const bestMatches = enrichedJobs.filter((j) => j.match_rank === 1);
  const otherMatches = enrichedJobs.filter((j) => j.match_rank !== 1);

  return (
    <div data-testid="worker-job-feed" className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="kn-overline mb-1">Job Feed</div>
          <h1 className="font-display text-3xl tracking-tight">
            Jobs near you
          </h1>
        </div>
        <button
          onClick={() => setShowFilter((v) => !v)}
          className="btn-outline flex items-center gap-2 text-sm !py-2 !px-3"
        >
          <SlidersHorizontal size={14} /> Filter
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-4">
        Matched to your skills and pincode. Tap{" "}
        <strong className="text-[#ff6b35]">Interested / रुचि है</strong> to send your request.
      </p>

      {/* Filter panel */}
      {showFilter && (
        <form
          onSubmit={handlePincodeSearch}
          className="kn-card p-4 mb-4 flex gap-2 items-end fade-up"
        >
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-700 mb-1 block">Search by pincode</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincodeFilter}
              onChange={(e) => setPincodeFilter(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit pincode"
              className="kn-input"
            />
          </div>
          <button type="submit" className="btn-indigo flex items-center gap-2 text-sm !py-2.5">
            <Search size={14} /> Search
          </button>
          <button
            type="button"
            onClick={() => { setPincodeFilter(""); loadFeed(""); }}
            className="btn-outline text-sm !py-2.5"
          >
            Reset
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="kn-card p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : enrichedJobs.length === 0 ? (
        <div className="kn-card p-12 text-center">
          <Briefcase size={40} className="mx-auto mb-4 text-gray-200" />
          <h3 className="font-display text-xl mb-2">No jobs found</h3>
          <p className="text-gray-500 text-sm">
            No open jobs match your area or skills right now. Check back soon!
          </p>
          <button
            onClick={() => loadFeed("")}
            className="btn-outline mt-4 text-sm flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={13} /> Show all jobs
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {bestMatches.length > 0 && (
            <section>
              <div className="text-xs font-bold uppercase tracking-wider text-green-700 mb-2 flex items-center gap-2">
                <BadgeCheck size={13} /> Best matches ({bestMatches.length})
              </div>
              <div className="space-y-3">
                {bestMatches.map((job) => (
                  <JobCard key={job.id} job={job} onInterest={handleInterest} sending={sending} />
                ))}
              </div>
            </section>
          )}

          {otherMatches.length > 0 && (
            <section>
              {bestMatches.length > 0 && (
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Other jobs ({otherMatches.length})
                </div>
              )}
              <div className="space-y-3">
                {otherMatches.map((job) => (
                  <JobCard key={job.id} job={job} onInterest={handleInterest} sending={sending} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
