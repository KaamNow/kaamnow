import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { Search, Star, MapPin, ShieldCheck, Filter } from "lucide-react";

const SAFFRON_ICON = new L.DivIcon({
  className: "",
  html: `<div style="width:28px;height:28px;background:#ff6b35;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.25)"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const SKILLS = [
  "all",
  "mason",
  "farm work",
  "painting",
  "plumbing",
  "electrical",
  "helper",
  "cleaning",
  "carpentry",
  "welding",
];

function TrustBadge({ tier }) {
  const labels = { 1: "Self-verified", 2: "Gaon Verified", 3: "KaamNow Pro" };
  const colors = { 1: "bg-gray-100 text-gray-700", 2: "bg-[#3f37c9] text-white", 3: "bg-[#ff6b35] text-white" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${colors[tier]}`}>
      <ShieldCheck size={10} /> {labels[tier]}
    </span>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const location = useLocation();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("all");
  const [q, setQ] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(new URLSearchParams(location.search).get("job") || "");
  const [selectedJob, setSelectedJob] = useState(null);

  useEffect(() => {
    const queryJobId = new URLSearchParams(location.search).get("job") || "";
    if (queryJobId && queryJobId !== selectedJobId) {
      setSelectedJobId(queryJobId);
    }
  }, [location.search, selectedJobId]);

  useEffect(() => {
    if (user?.role !== "customer") {
      setJobs([]);
      setSelectedJob(null);
      return;
    }

    api
      .get("/jobs/mine")
      .then((r) => {
        const openJobs = r.data.filter((job) => job.status === "open");
        setJobs(openJobs);
        const selected = selectedJobId
          ? openJobs.find((job) => job.id === selectedJobId)
          : openJobs[0];
        setSelectedJob(selected || null);
        if (!selectedJobId && selected) {
          setSelectedJobId(selected.id);
        }
      })
      .catch(() => {
        setJobs([]);
        setSelectedJob(null);
      });
  }, [user, selectedJobId]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (skill !== "all") params.skill = skill;
    if (q) params.q = q;
    if (availableOnly) params.available_only = true;
    api
      .get("/workers", { params })
      .then((r) => setWorkers(r.data))
      .finally(() => setLoading(false));
  }, [skill, q, availableOnly]);

  const center = useMemo(() => {
    if (workers.length === 0) return [22.9734, 78.6569];
    const sumLat = workers.reduce((a, w) => a + w.lat, 0);
    const sumLng = workers.reduce((a, w) => a + w.lng, 0);
    return [sumLat / workers.length, sumLng / workers.length];
  }, [workers]);

  return (
    <div data-testid="marketplace-page" className="bg-[#fcfbf9] min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="kn-overline">Find Workers</div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight mt-2">
          {workers.length} verified workers ready to work.
        </h1>

        <div className="mt-8 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              data-testid="search-input"
              placeholder="Search by name, village or skill"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="kn-input pl-9"
            />
          </div>
          <label data-testid="available-toggle" className="flex items-center gap-2 px-3 h-[46px] border border-gray-200 rounded-lg bg-white cursor-pointer">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
              className="accent-[#ff6b35]"
            />
            <span className="text-sm font-semibold">Available only</span>
          </label>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap" data-testid="skill-filters">
          {SKILLS.map((s) => (
            <button
              key={s}
              onClick={() => setSkill(s)}
              data-testid={`skill-${s.replace(/\s+/g, "-")}`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition ${
                skill === s
                  ? "bg-[#3f37c9] text-white"
                  : "bg-white border border-gray-200 text-gray-700 hover:border-[#3f37c9]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-8 grid lg:grid-cols-3 gap-6">
          {user?.role === "customer" && (
            <div className="lg:col-span-3">
              <div className="kn-card p-5 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold text-gray-600">Your open jobs</div>
                    <div className="mt-2 text-sm text-gray-700">Choose a job and book workers who match it.</div>
                  </div>
                  {jobs.length > 0 && (
                    <Link to="/post-job" className="text-[#3f37c9] font-bold text-sm">
                      Post another job
                    </Link>
                  )}
                </div>

                <div className="mt-4">
                  {jobs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
                      You have no open jobs yet. <Link to="/post-job" className="text-[#3f37c9] font-semibold">Post one now</Link> to start matching.
                    </div>
                  ) : (
                    <select
                      value={selectedJobId}
                      onChange={(e) => setSelectedJobId(e.target.value)}
                      className="kn-input w-full"
                      data-testid="job-filter-select"
                    >
                      {jobs.map((job) => (
                        <option key={job.id} value={job.id}>
                          {job.title} • {job.workers_needed} worker(s) • {job.job_date}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedJob && (
                  <div className="mt-4 rounded-xl bg-[#f8f6ff] p-4 border border-[#d7d2ff]">
                    <div className="font-semibold">{selectedJob.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{selectedJob.description}</div>
                    <div className="mt-2 text-xs uppercase tracking-wider font-bold text-[#3f37c9]">
                      Matching workers for this job
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4" data-testid="workers-grid">
            {loading && <div className="col-span-2 p-12 text-center text-gray-500">Loading workers…</div>}
            {!loading && workers.length === 0 && (
              <div className="col-span-2 p-12 text-center text-gray-500">No workers match your filters.</div>
            )}

            {workers.map((w, i) => {
              const workerLink = selectedJobId ? `/worker/${w.id}?job=${selectedJobId}` : `/worker/${w.id}`;
              return (
                <Link
                  key={w.id}
                  to={workerLink}
                  data-testid={`worker-card-${w.id}`}
                  className="kn-card p-5 fade-up"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <div className="flex gap-4">
                    <img
                      src={w.photo_url || "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400"}
                      alt={w.name}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-lg leading-tight">{w.name}</div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {w.village}, {w.state}
                          </div>
                        </div>
                        <div className="font-display text-lg text-[#3f37c9]">₹{w.daily_rate}</div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {w.skills.slice(0, 3).map((s) => (
                          <span key={s} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-gray-100 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <TrustBadge tier={w.trust_tier} />
                        <div className="flex items-center gap-1 text-xs">
                          <Star size={12} className="fill-[#ff6b35] text-[#ff6b35]" />
                          <span className="font-bold">{w.avg_rating.toFixed(1)}</span>
                          <span className="text-gray-500">· {w.total_jobs} jobs</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="lg:col-span-1">
            <div className="kn-card overflow-hidden sticky top-24" data-testid="workers-map">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 text-sm font-bold">
                <Filter size={14} /> Map view
              </div>
              <div className="h-[480px]">
                {workers.length > 0 && (
                  <MapContainer
                    center={center}
                    zoom={5}
                    style={{ height: "100%", width: "100%" }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                      attribution='&copy; OpenStreetMap &copy; CARTO'
                    />
                    {workers.map((w) => (
                      <Marker key={w.id} position={[w.lat, w.lng]} icon={SAFFRON_ICON}>
                        <Popup>
                          <div className="text-sm">
                            <div className="font-bold">{w.name}</div>
                            <div className="text-gray-600">{w.village}, {w.state}</div>
                            <div className="mt-1">₹{w.daily_rate}/day · ⭐ {w.avg_rating.toFixed(1)}</div>
                            <Link
                              to={selectedJobId ? `/worker/${w.id}?job=${selectedJobId}` : `/worker/${w.id}`}
                              className="text-[#3f37c9] font-bold"
                            >
                              View profile →
                            </Link>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}