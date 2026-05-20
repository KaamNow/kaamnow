import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DirectHireModal from "@/components/DirectHireModal";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePincodeLookup } from "@/lib/usePincode";
import {
  Search, Star, MapPin, ShieldCheck, RefreshCw,
  ChevronDown, X, CheckCircle, Zap, Briefcase,
} from "lucide-react";

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#FAF7F2",
  card:   "#FFFFFF",
  accent: "#E56A47",
  forest: "#2E8B57",
  brown:  "#2B2B2B",
  muted:  "#6B6B6B",
  border: "#EDE8E0",
  shadow: "0 2px 12px rgba(45,31,24,0.07)",
  shadowHov: "0 8px 28px rgba(45,31,24,0.12)",
};


/* ── Skill → category metadata ───────────────────────────────────────────── */
const SKILL_CATS = [
  { v: "all",        icon: "💼", label: "All Categories" },
  { v: "mason",      icon: "🧱", label: "Mason / Construction" },
  { v: "farm work",  icon: "🌾", label: "Farm Work" },
  { v: "painting",   icon: "🎨", label: "Painting" },
  { v: "plumbing",   icon: "🔧", label: "Plumbing" },
  { v: "electrical", icon: "⚡", label: "Electrical" },
  { v: "helper",     icon: "🤝", label: "General Helper" },
  { v: "cleaning",   icon: "✨", label: "Cleaning" },
  { v: "carpentry",  icon: "🪚", label: "Carpentry" },
  { v: "welding",    icon: "🔥", label: "Welding" },
];
const SKILL_MAP = Object.fromEntries(SKILL_CATS.map(s => [s.v, s]));
const skillIcon = v => SKILL_MAP[v]?.icon ?? "💼";

/* ── Trust tier ──────────────────────────────────────────────────────────── */
function trustLabel(tier) {
  if (tier >= 3) return { label: "KaamNow Pro",      color: C.accent,  bg: "#FFF5F2" };
  if (tier >= 2) return { label: "Aadhaar Verified", color: C.forest,  bg: "#F0FDF4" };
  return           { label: "Phone Verified",         color: "#6B7280", bg: "#F5F5F5" };
}

/* ── Letter-initial avatar color (consistent per name) ───────────────────── */
const AVATAR_COLORS = ["#C8705A","#2D7A5F","#B86A20","#5C6CA8","#7A4FA0","#3A7A9A","#8A5A2A","#4A8A5A"];
function avatarColor(name) { return AVATAR_COLORS[(name || "W").charCodeAt(0) % AVATAR_COLORS.length]; }

/* ── Premium hero collage — layered worker profiles ──────────────────────── */
function WorkerSilhouette({ bg, skin, uniform, size }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
      <rect width="100" height="100" fill={bg}/>
      {/* Uniform / work shirt */}
      <path d="M16 68 Q18 58 30 56 L42 62 L58 62 L70 56 Q82 58 84 68 L84 100 L16 100 Z" fill={uniform} opacity="0.88"/>
      {/* Collar */}
      <path d="M42 62 L50 72 L58 62" fill={bg} opacity="0.55"/>
      {/* Neck */}
      <rect x="44" y="50" width="12" height="14" rx="6" fill={skin}/>
      {/* Head — realistic oval */}
      <ellipse cx="50" cy="36" rx="16" ry="18" fill={skin}/>
      {/* Hair — dark cap on top */}
      <ellipse cx="50" cy="21" rx="16" ry="9" fill="rgba(45,20,5,0.55)"/>
      {/* Subtle cheekbone shadow — no cartoon eyes */}
      <ellipse cx="50" cy="40" rx="10" ry="7" fill="rgba(0,0,0,0.06)"/>
    </svg>
  );
}

function WorkerCollage() {
  const profiles = [
    { bg: "#FDF0E8", skin: "#C8885A", uniform: "#E07A5F", trade: "Electrical", size: 104, pos: { right: 0,  top: 44 }, z: 3 },
    { bg: "#EDF5EE", skin: "#B87A4A", uniform: "#2E8B57", trade: "Plumbing",   size: 78,  pos: { left: 14, top: 0  }, z: 2 },
    { bg: "#FDF4E8", skin: "#A86838", uniform: "#CC7722", trade: "Mason",      size: 70,  pos: { left: 48, bottom: 0 }, z: 1 },
  ];

  return (
    <div style={{ position: "relative", width: 250, height: 210, flexShrink: 0 }}>
      {/* Warm background blob */}
      <div style={{
        position: "absolute", right: -16, top: -8,
        width: 230, height: 220,
        borderRadius: "55% 45% 50% 52%",
        background: "radial-gradient(ellipse at 52% 42%, #FDE8C0 0%, #FAF0DC 62%, transparent 100%)",
        zIndex: 0,
      }}/>

      {/* Profile circles */}
      {profiles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", ...p.pos,
          width: p.size, height: p.size, borderRadius: "50%",
          background: p.bg,
          border: "3px solid white",
          boxShadow: "0 6px 22px rgba(45,31,24,0.16)",
          zIndex: p.z, overflow: "hidden",
        }}>
          <WorkerSilhouette bg={p.bg} skin={p.skin} uniform={p.uniform} size={p.size}/>
          {/* Trade label strip */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: `${p.uniform}dd`, padding: "3px 0", textAlign: "center", fontSize: 8, fontWeight: 800, color: "white", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {p.trade}
          </div>
          {/* Verified dot */}
          <div style={{ position: "absolute", top: 6, right: 6, width: 14, height: 14, borderRadius: "50%", background: C.forest, border: "2px solid white" }}/>
        </div>
      ))}

      {/* Floating trust chip — top left */}
      <div style={{ position: "absolute", top: 4, left: 0, zIndex: 10, background: "white", borderRadius: 10, padding: "5px 10px", boxShadow: "0 3px 14px rgba(45,31,24,0.13)", display: "flex", alignItems: "center", gap: 5, border: `1px solid ${C.border}` }}>
        <CheckCircle size={11} style={{ color: C.forest, flexShrink: 0 }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.brown, whiteSpace: "nowrap" }}>Aadhaar Verified</span>
      </div>
      {/* Floating active chip — middle */}
      <div style={{ position: "absolute", bottom: 28, right: 112, zIndex: 10, background: "#F0FDF4", borderRadius: 10, padding: "5px 10px", boxShadow: "0 3px 12px rgba(45,31,24,0.1)", display: "flex", alignItems: "center", gap: 5, border: "1px solid #BBF7D0" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.forest, display: "inline-block", boxShadow: `0 0 5px ${C.forest}` }}/>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.forest, whiteSpace: "nowrap" }}>500+ Active</span>
      </div>
    </div>
  );
}

/* ── Skeleton card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "18px 20px", boxShadow: C.shadow }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#EDE8E0", flexShrink: 0, animation: "mpPulse 1.5s ease-in-out infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 17, background: "#EDE8E0", borderRadius: 6, width: "45%", marginBottom: 8, animation: "mpPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 12, background: "#F5F0E8", borderRadius: 5, width: "60%", marginBottom: 8, animation: "mpPulse 1.5s ease-in-out infinite" }} />
          <div style={{ display: "flex", gap: 6 }}>
            {[55, 70, 50].map((w, i) => <div key={i} style={{ height: 22, background: "#F5F0E8", borderRadius: 20, width: w, animation: "mpPulse 1.5s ease-in-out infinite" }} />)}
          </div>
        </div>
        <div style={{ width: 90, flexShrink: 0 }}>
          <div style={{ height: 20, background: "#EDE8E0", borderRadius: 6, marginBottom: 8, animation: "mpPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 32, background: "#FFF5F2", borderRadius: 10, animation: "mpPulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Worker card ─────────────────────────────────────────────────────────── */
function WorkerCard({ w, jobId, availabilityFilter, onHire }) {
  const [hov, setHov] = useState(false);
  const link = jobId ? `/worker/${w.id}?job=${jobId}` : `/worker/${w.id}`;
  const { label: tLabel, color: tColor, bg: tBg } = trustLabel(w.trust_tier);
  const allSkills = w.structured_skills?.length
    ? w.structured_skills.map(s => s.skill).filter(Boolean)
    : (w.skills || []);
  const visibleSkills = allSkills.slice(0, 2);
  const extraSkills   = allSkills.length > 2 ? allSkills.length - 2 : 0;
  const aColor = avatarColor(w.name);
  const locShort = w.village || w.district || w.state || "";
  const availLabel = availabilityFilter === "tomorrow" ? "Tomorrow"
    : availabilityFilter === "custom" ? "On Date" : "Today";

  return (
    <Link to={link} data-testid={`worker-card-${w.id}`} style={{ textDecoration: "none" }}>
      <div
        className="mp-card"
        style={{
          background: "#FFFDFC",
          borderRadius: 14,
          border: `1px solid ${hov ? "#D4CAC0" : C.border}`,
          boxShadow: hov ? C.shadowHov : C.shadow,
          transform: hov ? "translateY(-1px)" : "none",
          padding: "12px 14px",
          display: "flex", gap: 12, alignItems: "stretch",
          transition: "box-shadow 0.15s, transform 0.15s",
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        {/* Avatar */}
        <div style={{ position: "relative", flexShrink: 0, alignSelf: "flex-start" }}>
          {w.photo_url ? (
            <img src={w.photo_url.startsWith("http") ? w.photo_url : `${process.env.REACT_APP_BACKEND_URL}${w.photo_url}`} alt={w.name}
              style={{ width: 54, height: 54, borderRadius: 12, objectFit: "cover", border: "2px solid white", boxShadow: `0 0 0 1.5px ${C.border}`, display: "block" }}
            />
          ) : (
            <div style={{ width: 54, height: 54, borderRadius: 12, background: `linear-gradient(135deg, ${aColor}bb, ${aColor})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", userSelect: "none" }}>
              {w.name.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Verified dot */}
          <div style={{ position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: "50%", background: tColor, border: "2px solid white", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="7" height="7" viewBox="0 0 12 12" fill="none"><polyline points="2 6 5 9 10 3" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>

        {/* Centre — all key info */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          {/* Row 1: Name + primary skill */}
          <div style={{ fontWeight: 700, fontSize: 15, color: C.brown, lineHeight: 1.2, marginBottom: 3 }}>
            {w.name}
            {visibleSkills[0] && (
              <span style={{ fontWeight: 500, fontSize: 12, color: C.muted }}> · {visibleSkills[0].charAt(0).toUpperCase() + visibleSkills[0].slice(1)}</span>
            )}
          </div>

          {/* Row 2: Location + Rating — one line */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, marginBottom: 5 }}>
            {locShort && (
              <span style={{ display: "flex", alignItems: "center", gap: 2, color: C.muted }}>
                <MapPin size={10} style={{ color: C.accent, flexShrink: 0 }}/> {locShort}
              </span>
            )}
            {w.avg_rating > 0 && (
              <span style={{ display: "flex", alignItems: "center", gap: 2, fontWeight: 700, color: "#92400E" }}>
                <Star size={10} style={{ fill: "#F59E0B", color: "#F59E0B" }}/> {w.avg_rating.toFixed(1)}
                {w.total_jobs > 0 && <span style={{ fontWeight: 400, color: C.muted }}>({w.total_jobs})</span>}
              </span>
            )}
          </div>

          {/* Row 3: Trust + availability — ONE chip row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: tColor, background: tBg, borderRadius: 5, padding: "2px 6px" }}>
              <CheckCircle size={8} style={{ flexShrink: 0 }}/> {tLabel}
            </span>
            {w.available && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 700, color: C.forest, background: "#F0FDF4", borderRadius: 5, padding: "2px 6px" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.forest, flexShrink: 0 }}/>
                {availLabel}
              </span>
            )}
          </div>

          {/* Row 4: Skill chips — max 2 + overflow */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {visibleSkills.map(s => (
              <span key={s} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#F5F2EE", color: C.muted, border: `1px solid ${C.border}` }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            ))}
            {extraSkills > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: "#F0F0FF", color: "#3f37c9", border: "1px solid #e0e0ff" }}>
                +{extraSkills} more
              </span>
            )}
          </div>
        </div>

        {/* Right: rate + hire — always visible, vertically centered */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 8, minWidth: 80 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.forest, lineHeight: 1 }}>₹{w.daily_rate}</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>/day</div>
          </div>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onHire?.(w); }}
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "8px 12px", borderRadius: 10,
              background: C.accent,
              color: "white", fontWeight: 700, fontSize: 12,
              boxShadow: "0 2px 8px rgba(229,106,71,0.3)",
              border: "none", cursor: "pointer",
              transition: "background 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#CF5535"}
            onMouseLeave={e => e.currentTarget.style.background = C.accent}
          >
            Hire Now →
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ── Filter dropdown helper ──────────────────────────────────────────────── */
function FilterSelect({ label, value, onChange, children }) {
  return (
    <div style={{ flex: "1 1 140px", minWidth: 120 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ width: "100%", padding: "9px 30px 9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", appearance: "none", background: C.card, fontFamily: "inherit", boxSizing: "border-box" }}
          onFocus={e => e.target.style.borderColor = C.accent}
          onBlur={e => e.target.style.borderColor = C.border}
        >
          {children}
        </select>
        <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ onReset }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: "56px 32px", textAlign: "center", boxShadow: C.shadow }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
      <div style={{ fontWeight: 800, fontSize: 18, color: C.brown, marginBottom: 8 }}>No workers found</div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 22 }}>Try adjusting your filters or pincode.</div>
      <button
        onClick={onReset}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bg, color: C.brown, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "#F0EAE0"}
        onMouseLeave={e => e.currentTarget.style.background = C.bg}
      >
        <RefreshCw size={13} /> Clear Filters
      </button>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function Marketplace() {
  const { user }    = useAuth();
  const { t, lang } = useLanguage();
  const location    = useLocation();

  /* ── State ── */
  const [workers, setWorkers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [skill, setSkill]             = useState("all");
  const [q, setQ]                     = useState("");
  const [availability, setAvailability] = useState("any"); // "any" | "today" | "tomorrow" | "custom"
  const [customDate, setCustomDate]   = useState("");
  const [sortBy, setSortBy]           = useState("relevant");
  const [hireWorker, setHireWorker]   = useState(null); // worker being directly hired

  /* Customer job matching */
  const [jobs, setJobs]               = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(new URLSearchParams(location.search).get("job") || "");
  const [selectedJob, setSelectedJob] = useState(null);

  /* Pincode with lookup */
  const { pincode, setPincode, result: pincodeResult, reset: resetPincode } = usePincodeLookup();

  /* ── Load customer jobs ── */
  useEffect(() => {
    if (user?.role !== "customer") { setJobs([]); setSelectedJob(null); return; }
    api.get("/jobs/mine").then(r => {
      const open = r.data.filter(j => j.status === "open");
      setJobs(open);
      const sel = selectedJobId ? open.find(j => j.id === selectedJobId) : open[0];
      setSelectedJob(sel || null);
      if (!selectedJobId && sel) setSelectedJobId(sel.id);
    }).catch(() => { setJobs([]); setSelectedJob(null); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedJobId]);

  /* ── Search function ── */
  const runSearch = useCallback((overrides = {}) => {
    setLoading(true);
    const effectiveSkill   = overrides.skill       ?? skill;
    const effectivePincode = overrides.pincode      ?? pincode;
    const effectiveQ       = overrides.q            ?? q;
    const effectiveAvail   = overrides.availability ?? availability;
    const params = { available_only: effectiveAvail !== "any" };
    if (effectiveSkill !== "all")        params.skills = effectiveSkill;
    if (effectivePincode?.length === 6)  params.pincode = effectivePincode;
    if (effectiveQ)                      params.q = effectiveQ;
    api.get("/workers/search", { params }).then(r => {
      setWorkers(r.data);
    }).finally(() => setLoading(false));
  }, [skill, pincode, q, availability]);

  /* ── Auto-fire on skill change (instant) ── */
  useEffect(() => { runSearch(); }, [skill]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Initial load ── */
  useEffect(() => { runSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Client-side sort ── */
  const sorted = useMemo(() => {
    const arr = [...workers];
    if (sortBy === "rating")   return arr.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    if (sortBy === "rate_asc") return arr.sort((a, b) => (a.daily_rate || 0) - (b.daily_rate || 0));
    if (sortBy === "nearest")  return arr.sort((a, b) => {
      // workers with lat/lng come first, rest maintain order
      if (a.lat && b.lat) return 0;
      if (a.lat) return -1;
      if (b.lat) return 1;
      return 0;
    });
    if (sortBy === "recent")   return arr.sort((a, b) => {
      const da = new Date(a.last_active_at || a.created_at || 0);
      const db = new Date(b.last_active_at || b.created_at || 0);
      return db - da;
    });
    return arr; // "relevant" = API ranked order
  }, [workers, sortBy]);

  /* ── Map center ── */

  /* ── Handlers ── */
  const handleReset = () => { resetPincode(); setSkill("all"); setQ(""); setAvailability("any"); setCustomDate(""); runSearch({ skill: "all", pincode: "", q: "", availability: "any" }); };

  /* ── Location label ── */
  const locLabel = pincodeResult?.name ? `${pincodeResult.name}, ${pincodeResult.district}` : pincode || null;

  return (
    <>
      <style>{`
        @keyframes mpPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes mpSpin  { to{transform:rotate(360deg)} }
        @keyframes mpGlow  { 0%,100%{opacity:1;box-shadow:0 0 6px #2E8B57} 50%{opacity:0.6;box-shadow:0 0 2px #2E8B57} }

        /* ── Mobile card compaction ── */
        .mp-card { transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
        .mp-card:active { transform: scale(0.985) !important; box-shadow: 0 2px 8px rgba(45,31,24,0.10) !important; }

        @media (max-width: 640px) {
          .mp-card            { padding: 12px 13px !important; gap: 11px !important; }
          .mp-avatar          { width: 52px !important; height: 52px !important; font-size: 19px !important; }
          .mp-avatar-badge    { width: 15px !important; height: 15px !important; }
          .mp-name            { font-size: 14.5px !important; }
          .mp-sub             { font-size: 11.5px !important; margin-bottom: 5px !important; }
          .mp-meta            { gap: 3px 8px !important; margin-bottom: 6px !important; font-size: 11px !important; }
          .mp-trust-row       { gap: 4px !important; margin-bottom: 6px !important; }
          .mp-trust-chip      { font-size: 10px !important; padding: 2px 6px !important; }
          .mp-skills          { gap: 4px !important; }
          .mp-skill-chip      { font-size: 10.5px !important; padding: 2px 7px !important; }
          .mp-rate            { font-size: 17px !important; }
          .mp-hire-btn        { padding: 7px 11px !important; font-size: 12px !important; }
          .mp-right           { min-width: 80px !important; gap: 8px !important; }
          .mp-activity-strip  { display: none !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ background: "linear-gradient(150deg, #FDF6E3 0%, #FAF7F2 100%)", borderBottom: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 20px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          {/* Left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 800, fontSize: "clamp(22px, 3.8vw, 34px)", color: C.brown, letterSpacing: "-0.025em", lineHeight: 1.2, margin: "0 0 8px" }}>
              Find Trusted Workers{" "}
              <span style={{ color: C.accent }}>Near You</span>
            </h1>
            <p style={{ fontSize: 14.5, color: C.muted, margin: "0 0 18px", lineHeight: 1.55, maxWidth: 400 }}>
              Browse verified local workers for your daily jobs and services.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: C.brown }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(46,139,87,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ShieldCheck size={13} style={{ color: C.forest }} />
                </span>
                {loading ? "…" : workers.length > 0 ? `${workers.length}+` : "500+"} Verified Workers
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: C.brown }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(229,106,71,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={13} style={{ color: C.accent }} />
                </span>
                Fast WhatsApp Hiring
              </span>
            </div>
          </div>
          {/* Right collage */}
          <div className="hidden sm:flex" style={{ alignItems: "center", justifyContent: "flex-end", flexShrink: 0 }}>
            <WorkerCollage />
          </div>
        </div>
      </div>

      {/* ── Page body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 72px" }}>

        {/* Customer job panel */}
        {!user?.is_worker && (
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: 18, boxShadow: C.shadow }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Your Open Jobs</div>
                <div style={{ fontSize: 13.5, color: C.brown }}>Select a job to find matching workers.</div>
              </div>
              <Link to="/post-job" style={{ fontSize: 13, fontWeight: 700, color: C.accent, textDecoration: "none" }}>+ Post New Job</Link>
            </div>
            {jobs.length === 0 ? (
              <div style={{ marginTop: 12, borderRadius: 10, border: `1px dashed ${C.border}`, padding: "12px 16px", fontSize: 13, color: C.muted }}>
                No open jobs yet. <Link to="/post-job" style={{ color: C.accent, fontWeight: 700, textDecoration: "none" }}>Post one now →</Link>
              </div>
            ) : (
              <div style={{ position: "relative", marginTop: 12 }}>
                <select
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  data-testid="job-filter-select"
                  style={{ width: "100%", padding: "9px 30px 9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", appearance: "none", background: C.bg, fontFamily: "inherit" }}
                >
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title} · {j.filled_count || 0}/{j.workers_needed || 1} filled · {j.job_date}</option>
                  ))}
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
              </div>
            )}
          </div>
        )}

        {/* Filter card */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(45,31,24,0.07)", padding: "16px 18px", marginBottom: 20 }}>

          {/* Filter row — 3 fields only: Pincode · Category · Availability */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>

            {/* Pincode */}
            <div style={{ flex: "1 1 130px", minWidth: 110, position: "relative" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Pincode</label>
              <div style={{ position: "relative" }}>
                <MapPin size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.accent }} />
                <input
                  data-testid="pincode-input"
                  type="text" inputMode="numeric" maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit"
                  style={{ width: "100%", padding: "9px 28px 9px 30px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                />
                {pincode && <button onClick={resetPincode} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2 }}><X size={12} /></button>}
              </div>
              {/* Absolute dropdown — no layout shift */}
              {pincode.length === 6 && pincodeResult?.name && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 12px", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12, fontWeight: 600, color: C.forest }}>
                  📍 {pincodeResult.name}, {pincodeResult.district}, {pincodeResult.state}
                </div>
              )}
            </div>

            {/* Category */}
            <FilterSelect label="Category" value={skill} onChange={setSkill}>
              {SKILL_CATS.map(s => <option key={s.v} value={s.v}>{s.icon} {s.label}</option>)}
            </FilterSelect>

            {/* Availability */}
            <div style={{ flex: "1 1 150px", minWidth: 130 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>Availability</label>
              <div style={{ position: "relative" }}>
                <select
                  value={availability}
                  onChange={e => setAvailability(e.target.value)}
                  data-testid="available-toggle"
                  style={{ width: "100%", padding: "9px 30px 9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", appearance: "none", background: C.card, fontFamily: "inherit", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = C.accent}
                  onBlur={e => e.target.style.borderColor = C.border}
                >
                  <option value="any">Anytime</option>
                  <option value="today">Available Today</option>
                  <option value="tomorrow">Available Tomorrow</option>
                  <option value="custom">Custom Date</option>
                </select>
                <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
              </div>
              {availability === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13, color: C.brown, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
              <button
                onClick={() => runSearch()}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10, background: C.accent, color: "white", fontWeight: 700, fontSize: 13.5, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(229,106,71,0.3)", whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(229,106,71,0.4)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(229,106,71,0.3)"; }}
              >
                <Search size={13} /> Search
              </button>
              <button
                onClick={handleReset}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 10, background: C.bg, color: C.muted, fontWeight: 600, fontSize: 13.5, border: `1px solid ${C.border}`, cursor: "pointer", whiteSpace: "nowrap" }}
                onMouseEnter={e => e.currentTarget.style.background = "#F0EAE0"}
                onMouseLeave={e => e.currentTarget.style.background = C.bg}
              >
                <RefreshCw size={12} /> Clear
              </button>
            </div>
          </div>
        </div>

        {/* Results header + sort */}
        {!loading && sorted.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 13.5, color: C.muted, fontWeight: 500 }}>
                Showing <strong style={{ color: C.brown }}>{sorted.length}</strong> workers
                {locLabel && <> near <strong style={{ color: C.forest }}>{locLabel}</strong></>}
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  style={{ padding: "5px 28px 5px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12.5, color: C.brown, background: C.card, outline: "none", appearance: "none", fontFamily: "inherit", cursor: "pointer" }}
                >
                  <option value="relevant">Most Relevant</option>
                  <option value="nearest">Nearest First</option>
                  <option value="rate_asc">Lowest Rate</option>
                  <option value="rating">Highest Rated</option>
                  <option value="recent">Recently Active</option>
                </select>
                <ChevronDown size={11} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
              </div>
            </div>
            {/* Marketplace activity strip — hidden on mobile to save vertical space */}
            <div className="mp-activity-strip" style={{ display: "flex", alignItems: "center", gap: 16, padding: "9px 14px", marginBottom: 14, background: C.card, borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: C.shadow, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: C.forest, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.forest, boxShadow: `0 0 6px ${C.forest}`, animation: "mpGlow 2s ease-in-out infinite" }}/>
                {Math.min(sorted.length, 20)} workers active nearby
              </span>
              <span style={{ width: 1, height: 14, background: C.border, flexShrink: 0 }}/>
              <span style={{ fontSize: 12.5, color: C.muted }}>
                ⚡ {Math.ceil(sorted.length * 0.6)} responded today
              </span>
              <span style={{ width: 1, height: 14, background: C.border, flexShrink: 0 }}/>
              <span style={{ fontSize: 12.5, color: C.muted }}>🕐 Updated just now</span>
            </div>
          </>
        )}


        {/* Worker list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState onReset={handleReset} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((w, i) => (
              <WorkerCard key={w.id} w={w} jobId={selectedJobId} availabilityFilter={availability} onHire={!user?.is_worker ? setHireWorker : undefined} />
            ))}
          </div>
        )}

        {/* Trust strip */}
        {!loading && (
          <div style={{ marginTop: 32, padding: "16px 20px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.brown }}>Safe. Verified. Reliable.</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                All workers are background checked and trusted by thousands of families.{" "}
                <a href="/whatsapp-demo" style={{ color: C.accent, fontWeight: 600, textDecoration: "none" }}>Learn more about worker verification →</a>
              </div>
            </div>
          </div>
        )}
      </div>
      <DirectHireModal
        isOpen={!!hireWorker}
        worker={hireWorker}
        onClose={() => setHireWorker(null)}
        onSuccess={() => {}}
      />
    </>
  );
}
