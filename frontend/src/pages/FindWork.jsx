import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePincodeLookup } from "@/lib/usePincode";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  MapPin, Calendar, Search, RefreshCw,
  CheckCircle, XCircle, Clock, ChevronDown, X,
} from "lucide-react";

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:      "#FAF7F2",
  card:    "#FFFFFF",
  accent:  "#E56A47",
  forest:  "#2E8B57",
  brown:   "#2B2B2B",
  muted:   "#6B6B6B",
  border:  "#EDE8E0",
  shadow:  "0 2px 12px rgba(45,31,24,0.07)",
};

/* ── Category metadata ───────────────────────────────────────────────────── */
const CATS = [
  { v: "construction", icon: "🏗️", label: "Construction",  hi: "निर्माण",     bg: "#FFF3E0", chipBg: "#FFF3E0", chipColor: "#E65100" },
  { v: "farm",         icon: "🌾", label: "Agriculture",   hi: "खेती-बाड़ी",  bg: "#F1F8E9", chipBg: "#F1F8E9", chipColor: "#2E7D32" },
  { v: "electrical",   icon: "⚡", label: "Electrical",    hi: "बिजली काम",   bg: "#FFFDE7", chipBg: "#FFFDE7", chipColor: "#F57F17" },
  { v: "cleaning",     icon: "✨", label: "Cleaning",      hi: "सफाई",        bg: "#E3F2FD", chipBg: "#E3F2FD", chipColor: "#1565C0" },
  { v: "transport",    icon: "🚛", label: "Transport",     hi: "गाड़ी-चालन", bg: "#FCE4EC", chipBg: "#FCE4EC", chipColor: "#880E4F" },
  { v: "mechanical",   icon: "🔧", label: "Mechanical",    hi: "मशीन मरम्मत",bg: "#F3E5F5", chipBg: "#F3E5F5", chipColor: "#6A1B9A" },
  { v: "tailoring",    icon: "✂️", label: "Tailoring",     hi: "सिलाई",       bg: "#E0F2F1", chipBg: "#E0F2F1", chipColor: "#00695C" },
  { v: "home",         icon: "🏠", label: "Home Services", hi: "घरेलू सेवा", bg: "#FBE9E7", chipBg: "#FFF0EC", chipColor: "#BF360C" },
  { v: "other",        icon: "📦", label: "Other",         hi: "अन्य",        bg: "#F5F5F5", chipBg: "#F5F5F5", chipColor: "#424242" },
];
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.v, c]));
const catMeta  = v   => CAT_MAP[v] ?? { icon: "💼", label: v, hi: v, bg: "#F5F5F5", chipBg: "#F5F5F5", chipColor: "#424242" };
const catLabel = (v, lang) => lang === "hi" ? catMeta(v).hi : catMeta(v).label;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function timeAgo(iso, agoWord) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60)    return `<1 min ${agoWord}`;
  if (s < 3600)  return `${Math.floor(s / 60)} min ${agoWord}`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ${agoWord}`;
  return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? "s" : ""} ${agoWord}`;
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Hero section — full-scene illustrated + photo hybrid ────────────────── */
function HeroScene({ jobCount, loading, t }) {
  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(150deg, #FDF6E3 0%, #FAF7F2 100%)",
      borderBottom: "1px solid #EDE8E0",
      overflow: "hidden",
    }}>



      {/* ── Text content ── */}
      <div style={{
        position: "relative", zIndex: 3,
        maxWidth: 1100, margin: "0 auto",
        padding: "28px 20px 24px 24px",
      }}>
        <h1 style={{
          fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif",
          fontWeight: 800,
          fontSize: "clamp(22px, 3.5vw, 36px)",
          color: "#2D1F18",
          letterSpacing: "-0.025em",
          lineHeight: 1.2,
          margin: "0 0 10px",
        }}>
          Find Work Near You
        </h1>
        <p style={{ fontSize: 15, color: "#6B6B6B", margin: "0 0 20px", lineHeight: 1.55, maxWidth: 380 }}>
          Find daily wage jobs and local work opportunities.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "#2D1F18" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(229,106,71,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E56A47" strokeWidth="2.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/>
              </svg>
            </span>
            {loading ? "…" : jobCount} active jobs available
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13.5, fontWeight: 600, color: "#2D1F18" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(46,139,87,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2E8B57" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
            100% free to apply
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Skeleton card ───────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: "20px 22px", boxShadow: C.shadow }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "#EDE8E0", flexShrink: 0, animation: "fwPulse 1.5s ease-in-out infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 18, background: "#EDE8E0", borderRadius: 7, width: "55%", marginBottom: 9, animation: "fwPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 12, background: "#F5F0E8", borderRadius: 6, width: "38%", animation: "fwPulse 1.5s ease-in-out infinite" }} />
        </div>
        <div style={{ width: 80, flexShrink: 0 }}>
          <div style={{ height: 22, background: "#EDE8E0", borderRadius: 7, marginBottom: 6, animation: "fwPulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: 32, background: "#FFF5F2", borderRadius: 10, animation: "fwPulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {[100, 80, 70].map((w, i) => (
          <div key={i} style={{ height: 26, background: "#F5F0E8", borderRadius: 8, width: w, animation: "fwPulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

/* ── Apply action (compact, right-column) ────────────────────────────────── */
function ApplyAction({ job, eng, user, sending, withdrawing, accepting, declining, onApply, onWithdraw, onAccept, onDecline, t }) {
  const nav = useNavigate();

  const applyBtn = (label, onClick, disabled = false) => (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "8px 14px", borderRadius: 10,
        background: disabled ? "#EDE8E0" : C.accent,
        color: disabled ? C.muted : "white",
        fontWeight: 700, fontSize: 13, border: "none",
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : "0 2px 8px rgba(229,106,71,0.28)",
        transition: "transform 0.12s, box-shadow 0.12s",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(229,106,71,0.38)"; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = disabled ? "none" : "0 2px 8px rgba(229,106,71,0.28)"; }}
    >
      {label}
    </button>
  );

  if (!user)
    return applyBtn("Apply Now →", () => { sessionStorage.setItem("fw_after_login", "/find-work"); nav("/login"); });

  if (!user?.is_worker)
    return <span style={{ fontSize: 11.5, color: C.muted, fontStyle: "italic" }}>Employer view</span>;

  if (!eng)
    return sending === job.id
      ? applyBtn(<><RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>, null, true)
      : applyBtn("Apply Now →", () => onApply(job.id));

  if (eng.status === "requested") {
    if (eng.source === "customer_booking") {
      // Customer sent this request — worker must Accept or Decline
      const isActing = accepting === job.id || declining === job.id;
      return (
        <div style={{ textAlign: "right" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", fontSize: 11, fontWeight: 700, color: "#1e40af", background: "#eff6ff", borderRadius: 8, padding: "4px 9px", border: "1px solid #bfdbfe", marginBottom: 7 }}>
            📋 Booking Request
          </span>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button
              disabled={isActing}
              onClick={() => onAccept(eng.id, job.id)}
              style={{ padding: "6px 13px", borderRadius: 8, background: isActing ? "#d1fae5" : "#16a34a", color: "white", fontWeight: 700, fontSize: 12, border: "none", cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.7 : 1 }}>
              {accepting === job.id ? "…" : "✓ Accept"}
            </button>
            <button
              disabled={isActing}
              onClick={() => onDecline(eng.id, job.id)}
              style={{ padding: "6px 13px", borderRadius: 8, background: "white", color: "#dc2626", fontWeight: 700, fontSize: 12, border: "2px solid #fecaca", cursor: isActing ? "default" : "pointer", opacity: isActing ? 0.7 : 1 }}>
              {declining === job.id ? "…" : "✗ Decline"}
            </button>
          </div>
        </div>
      );
    }
    // Worker expressed interest — can withdraw
    return (
      <div style={{ textAlign: "right" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "flex-end", fontSize: 12, fontWeight: 700, color: "#92400E", background: "#FFFBEB", borderRadius: 8, padding: "5px 10px", border: "1px solid #FDE68A" }}>
          <Clock size={11} /> {t("fw_pending")}
        </span>
        <button
          disabled={withdrawing === job.id}
          onClick={() => onWithdraw(eng.id, job.id)}
          style={{ marginTop: 5, fontSize: 11.5, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
          {withdrawing === job.id ? "…" : t("fw_withdraw")}
        </button>
      </div>
    );
  }

  if (eng.status === "accepted")
    return (
      <div style={{ textAlign: "right" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", fontSize: 12, fontWeight: 700, color: C.forest, marginBottom: 3 }}>
          <CheckCircle size={12} /> {t("fw_confirmed")}
        </div>
        {eng.customer_phone && (
          <a href={`tel:${eng.customer_phone}`} style={{ fontSize: 12, color: C.forest, fontWeight: 600, textDecoration: "none" }}>📞 {eng.customer_phone}</a>
        )}
      </div>
    );

  if (eng.status === "rejected" || eng.status === "cancelled")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: C.muted, justifyContent: "flex-end" }}>
        <XCircle size={11} />{" "}
        {eng.status === "rejected"
          ? t("fw_rejected")
          : eng.source === "customer_booking"
            ? "Customer withdrew"
            : t("fw_withdrawn")}
      </span>
    );

  if (eng.status === "completed")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: C.muted, justifyContent: "flex-end" }}>
        <CheckCircle size={11} /> {t("fw_completed")}
      </span>
    );

  return null;
}

/* ── Job Card ────────────────────────────────────────────────────────────── */
function JobCard({ job, eng, user, sending, withdrawing, accepting, declining, onApply, onWithdraw, onAccept, onDecline, t, lang }) {
  const [hov, setHov] = useState(false);
  const slots   = job.workers_needed - job.filled_count;
  const isUrgent = job.urgency === "urgent";
  const meta    = catMeta(job.category);
  const loc     = [job.village, job.district].filter(Boolean).join(", ");

  return (
    <div
      style={{
        background: C.card, borderRadius: 16,
        border: `1px solid ${isUrgent ? "#FECDD3" : C.border}`,
        boxShadow: hov ? "0 8px 28px rgba(45,31,24,0.12)" : C.shadow,
        transform: hov ? "translateY(-2px)" : "none",
        transition: "box-shadow 0.18s, transform 0.18s",
        overflow: "hidden",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Urgent strip */}
      {isUrgent && (
        <div style={{ background: "#FEF2F2", borderBottom: "1px solid #FECDD3", padding: "4px 18px", display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#DC2626", letterSpacing: "0.07em", textTransform: "uppercase" }}>⚡ {t("fw_urgent")}</span>
        </div>
      )}

      <div style={{ padding: "18px 20px 16px", display: "flex", gap: 14 }}>

        {/* ── LEFT: category icon + all text ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
            {/* Icon circle */}
            <div style={{ width: 52, height: 52, borderRadius: 14, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {meta.icon}
            </div>
            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: C.brown, lineHeight: 1.25, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {job.title}
              </div>
              <div style={{ fontSize: 12.5, color: C.muted }}>
                {catLabel(job.category, lang)} · {timeAgo(job.created_at, t("fw_posted_ago"))}
              </div>
            </div>
          </div>

          {/* Location + date + slots row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11, alignItems: "center" }}>
            {loc && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, color: C.brown }}>
                <MapPin size={11} style={{ color: C.accent, flexShrink: 0 }} />
                {loc}{job.pincode ? ` · ${job.pincode}` : ""}
              </span>
            )}
            {job.job_date && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.muted, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7, padding: "3px 8px" }}>
                <Calendar size={10} /> {fmtDate(job.job_date)}
              </span>
            )}
            {slots > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: C.forest, background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 7, padding: "3px 9px" }}>
                {slots} {t("fw_open_slots")}
              </span>
            )}
          </div>

          {/* Category chip */}
          <div style={{ marginTop: 11 }}>
            <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 20, background: meta.chipBg, color: meta.chipColor }}>
              {catLabel(job.category, lang)}
            </span>
          </div>
        </div>

        {/* ── RIGHT: salary + badge + apply ── */}
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", minWidth: 110, gap: 10 }}>
          {/* Salary */}
          {job.daily_rate ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: C.forest, lineHeight: 1 }}>₹{job.daily_rate}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{t("fw_per_day")}</div>
            </div>
          ) : <div />}

          {/* Verified badge + apply */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, color: C.forest }}>
              <CheckCircle size={12} style={{ flexShrink: 0 }} /> Verified Employer
            </span>
            <ApplyAction
              job={job} eng={eng} user={user}
              sending={sending} withdrawing={withdrawing}
              accepting={accepting} declining={declining}
              onApply={onApply} onWithdraw={onWithdraw}
              onAccept={onAccept} onDecline={onDecline} t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Filter card ─────────────────────────────────────────────────────────── */
function FilterCard({ pincode, setPincode, onClearPincode, pincodeResult, category, setCategory, sort, setSort, onSearch, onReset, t, lang }) {
  return (
    <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(45,31,24,0.08)", padding: "18px 20px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>

        {/* Pincode */}
        <div style={{ flex: "1 1 130px", minWidth: 110 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            {t("fw_filter_pincode")}
          </label>
          <div style={{ position: "relative" }}>
            <MapPin size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.accent }} />
            <input
              type="text" inputMode="numeric" maxLength={6}
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit"
              style={{ width: "100%", padding: "9px 30px 9px 30px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            {pincode && (
              <button onClick={onClearPincode} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>
          {pincode.length === 6 && pincodeResult?.name && (
            <div style={{ marginTop: 4, fontSize: 11.5, color: C.forest, fontWeight: 600 }}>
              📍 {pincodeResult.name}, {pincodeResult.district}
            </div>
          )}
        </div>

        {/* Category */}
        <div style={{ flex: "1 1 148px", minWidth: 130 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            {t("fw_filter_category")}
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: "100%", padding: "9px 30px 9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", appearance: "none", background: C.card, fontFamily: "inherit", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            >
              <option value="">{t("fw_all_cats")}</option>
              {CATS.map(c => <option key={c.v} value={c.v}>{c.icon} {lang === "hi" ? c.hi : c.label}</option>)}
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Sort */}
        <div style={{ flex: "1 1 148px", minWidth: 130 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            {t("fw_filter_sort")}
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{ width: "100%", padding: "9px 30px 9px 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, fontSize: 13.5, color: C.brown, outline: "none", appearance: "none", background: C.card, fontFamily: "inherit", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = C.accent}
              onBlur={e => e.target.style.borderColor = C.border}
            >
              <option value="newest">{t("fw_sort_newest")}</option>
              <option value="popular">{t("fw_sort_popular")}</option>
            </select>
            <ChevronDown size={12} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, alignSelf: "flex-end" }}>
          <button
            onClick={onSearch}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10, background: C.accent, color: "white", fontWeight: 700, fontSize: 13.5, border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(229,106,71,0.3)", transition: "transform 0.12s, box-shadow 0.12s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(229,106,71,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(229,106,71,0.3)"; }}
          >
            <Search size={13} /> Search
          </button>
          <button
            onClick={onReset}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 14px", borderRadius: 10, background: C.bg, color: C.muted, fontWeight: 600, fontSize: 13.5, border: `1px solid ${C.border}`, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F0EAE0"}
            onMouseLeave={e => e.currentTarget.style.background = C.bg}
          >
            <RefreshCw size={12} /> Clear
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState({ onReset, t }) {
  return (
    <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, padding: "56px 32px", textAlign: "center", boxShadow: C.shadow }}>
      <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
      <div style={{ fontWeight: 800, fontSize: 19, color: C.brown, marginBottom: 8 }}>{t("fw_empty_title")}</div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>{t("fw_empty_sub")}</div>
      <button
        onClick={onReset}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 22px", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.bg, color: C.brown, fontWeight: 700, fontSize: 14, cursor: "pointer" }}
        onMouseEnter={e => e.currentTarget.style.background = "#F0EAE0"}
        onMouseLeave={e => e.currentTarget.style.background = C.bg}
      >
        <RefreshCw size={13} /> {t("fw_show_all")}
      </button>
    </div>
  );
}

/* ── Trust footer strip ──────────────────────────────────────────────────── */
function TrustStrip() {
  return (
    <div style={{ marginTop: 32, padding: "16px 20px", background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 14, boxShadow: C.shadow }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "#F0FDF4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.brown }}>Safe. Verified. Reliable.</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
          All employers are verified and jobs are 100% genuine.{" "}
          <a href="/whatsapp-demo" style={{ color: C.accent, fontWeight: 600, textDecoration: "none" }}>Learn more →</a>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function FindWork() {
  const { user }     = useAuth();
  const { t, lang }  = useLanguage();

  const [jobs, setJobs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [myEngs, setMyEngs]           = useState({});
  const [sending, setSending]         = useState(null);
  const [withdrawing, setWithdrawing] = useState(null);
  const [accepting, setAccepting]     = useState(null);
  const [declining, setDeclining]     = useState(null);

  const { pincode, setPincode, result: pincodeResult, reset: resetPincode } = usePincodeLookup();
  const [category, setCategory] = useState("");
  const [sort, setSort]         = useState("newest");

  const loadEngs = useCallback(async () => {
    if (!user || user?.is_worker !== true) return;
    try {
      const r = await api.get("/engagements/mine");
      const map = {};
      for (const e of (r.data || [])) map[e.job_id] = e;
      setMyEngs(map);
    } catch { /* non-critical */ }
  }, [user]);

  const loadJobs = useCallback(async (pc = "", cat = "", srt = "newest") => {
    setLoading(true);
    try {
      const params = { sort: srt };
      if (pc)  params.pincode  = pc;
      if (cat) params.category = cat;
      const [res] = await Promise.all([api.get("/jobs/public", { params }), loadEngs()]);
      setJobs(res.data || []);
    } catch {
      toast.error("Could not load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadEngs]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const handleSearch  = () => loadJobs(pincode.trim(), category, sort);
  const handleReset   = () => { resetPincode(); setCategory(""); setSort("newest"); loadJobs(); };

  const handleApply = async jobId => {
    setSending(jobId);
    try {
      await api.post(`/jobs/${jobId}/interest`);
      toast.success("Interest sent! The customer will be notified.");
      await loadEngs();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? "Could not send interest.");
    } finally { setSending(null); }
  };

  const handleWithdraw = async (engId, jobId) => {
    setWithdrawing(jobId);
    try {
      await api.post(`/engagements/${engId}/cancel`);
      toast.success("Interest withdrawn.");
      await loadEngs();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? "Could not withdraw.");
    } finally { setWithdrawing(null); }
  };

  const handleAccept = async (engId, jobId) => {
    setAccepting(jobId);
    try {
      await api.post(`/engagements/${engId}/accept`);
      toast.success("Job accepted! Customer will be notified.");
      await loadEngs();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? "Could not accept.");
    } finally { setAccepting(null); }
  };

  const handleDecline = async (engId, jobId) => {
    setDeclining(jobId);
    try {
      await api.post(`/engagements/${engId}/reject`);
      toast.success("Booking declined.");
      await loadEngs();
    } catch (err) {
      toast.error(err?.response?.data?.detail ?? "Could not decline.");
    } finally { setDeclining(null); }
  };

  /* Location label for results header */
  const locationLabel = pincodeResult?.name
    ? `${pincodeResult.name}, ${pincodeResult.district}`
    : pincode || null;

  return (
    <>
      <style>{`
        @keyframes fwPulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      {/* ── Hero scene ── */}
      <HeroScene jobCount={jobs.length} loading={loading} t={t} />

      {/* ── Page body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 16px 72px" }}>

        {/* Filter card */}
        <FilterCard
          pincode={pincode} setPincode={setPincode} onClearPincode={resetPincode} pincodeResult={pincodeResult}
          category={category} setCategory={setCategory}
          sort={sort} setSort={setSort}
          onSearch={handleSearch} onReset={handleReset}
          t={t} lang={lang}
        />

        {/* Results label */}
        {!loading && jobs.length > 0 && (
          <div style={{ margin: "18px 0 14px", fontSize: 13.5, color: C.muted, fontWeight: 500 }}>
            Showing <strong style={{ color: C.brown }}>{jobs.length}</strong> jobs
            {locationLabel && (
              <> near <strong style={{ color: C.forest }}>{locationLabel}</strong></>
            )}
            {category && !locationLabel && (
              <> · {catLabel(category, lang)}</>
            )}
          </div>
        )}

        {/* Job list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState onReset={handleReset} t={t} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {jobs.map(job => (
              <JobCard
                key={job.id} job={job}
                eng={myEngs[job.id] || null}
                user={user} sending={sending} withdrawing={withdrawing}
                accepting={accepting} declining={declining}
                onApply={handleApply} onWithdraw={handleWithdraw}
                onAccept={handleAccept} onDecline={handleDecline}
                t={t} lang={lang}
              />
            ))}
          </div>
        )}

        {/* Guest CTA nudge */}
        {!user && !loading && jobs.length > 0 && (
          <div style={{ marginTop: 20, background: "linear-gradient(135deg, #FFF5F2, #FAF7F2)", border: `1.5px solid ${C.accent}28`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: C.brown, marginBottom: 2 }}>Ready to apply?</div>
              <div style={{ fontSize: 13, color: C.muted }}>Login or sign up free — takes 30 seconds.</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <a href="/login" style={{ padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${C.border}`, color: C.brown, fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>Login</a>
              <a href="/signup" style={{ padding: "8px 18px", borderRadius: 10, background: C.accent, color: "white", fontWeight: 700, fontSize: 13.5, textDecoration: "none", boxShadow: "0 2px 8px rgba(229,106,71,0.3)" }}>Sign Up Free</a>
            </div>
          </div>
        )}

        {/* Trust strip */}
        {!loading && <TrustStrip />}
      </div>
    </>
  );
}
