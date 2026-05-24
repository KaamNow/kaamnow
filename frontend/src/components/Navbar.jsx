import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import KaamNowLogo from "@/components/KaamNowLogo";
import { Bell, User, X, Menu, ChevronDown, MapPin, Users, Briefcase, Settings, LogOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/api";

/* ── Palette ─────────────────────────────────────────────────────────────── */
const C = {
  bg:     "#FAF7F2",
  text:   "#2B2B2B",
  accent: "#E56A47",
  forest: "#2D6A4F",
  brown:  "#2D1F18",
  muted:  "#6B6B6B",
  green:  "#6FAF5F",
  border: "#EDE8E0",
  shadow: "0 2px 20px rgba(45,31,24,0.07)",
};

/* ── Two-tone logo text ──────────────────────────────────────────────────── */
function LogoText({ size = "md" }) {
  const big  = size === "sm" ? 17 : 21;
  const sm   = size === "sm" ? 10 : 12;
  const tag  = size === "sm" ? 8.5 : 9.5;
  return (
    <div style={{ lineHeight: 1 }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 800, fontSize: big, color: C.accent, letterSpacing: "-0.025em" }}>Kaam</span>
        <span style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 800, fontSize: big, color: C.forest, letterSpacing: "-0.025em" }}>Now</span>
        <span style={{ fontSize: sm, fontWeight: 600, color: C.muted }}>.com</span>
      </div>
      <div style={{ fontSize: tag, color: C.muted, fontWeight: 500, letterSpacing: "0.055em", marginTop: 3, textTransform: "uppercase" }}>
        Trusted. Local. Reliable.
      </div>
    </div>
  );
}

/* ── Language toggle ─────────────────────────────────────────────────────── */
function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <button
      onClick={() => setLang(lang === "hi" ? "en" : "hi")}
      title="भाषा / Language"
      style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "7px 11px", borderRadius: 10,
        border: `1px solid ${C.border}`, background: "white",
        color: C.brown, fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", userSelect: "none", transition: "border-color 0.15s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <span style={{ fontSize: 12 }}>🇮🇳</span>
      <span>{lang === "hi" ? "HI" : "EN"}</span>
      <ChevronDown size={10} style={{ color: C.muted }} />
    </button>
  );
}

/* ── Notification bell ───────────────────────────────────────────────────── */
function NotifBell({ size = 18 }) {
  const [count, setCount] = useState(0);
  const { user } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!user) return;
    const load = () =>
      api.get("/notifications/mine/unread-count").then(r => setCount(r.data.count)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [user]);

  const handleClick = () => {
    const tab = "notifications";
    const base = "/dashboard";
    nav(`${base}?tab=${tab}`, { replace: false });
  };

  return (
    <button onClick={handleClick} aria-label="Notifications"
      style={{ position: "relative", padding: 7, borderRadius: 10, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s", background: "none", border: "none", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.background = "#F0EAE0"; e.currentTarget.style.color = C.brown; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
      <Bell size={size} />
      {count > 0 && (
        <span style={{
          position: "absolute", top: 4, right: 4, width: 14, height: 14,
          background: C.accent, color: "white", fontSize: 8, fontWeight: 700,
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

/* ── User dropdown ───────────────────────────────────────────────────────── */
function UserDropdown({ user, logout, t }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const dashLink = "/dashboard";

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: 4, borderRadius: 24,
          border: `1.5px solid ${open ? C.accent : C.border}`, background: "white",
          cursor: "pointer", transition: "border-color 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = C.border; }}
      >
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E8E3DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
          {user.photo_url
            ? <img src={user.photo_url.startsWith("http") ? user.photo_url : `${process.env.REACT_APP_BACKEND_URL}${user.photo_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>{user.name?.[0]?.toUpperCase()}</span>}
        </div>
        <ChevronDown size={11} style={{ color: C.muted, marginRight: 4, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          background: "white", borderRadius: 14,
          boxShadow: "0 8px 32px rgba(45,31,24,0.12)",
          border: `1px solid ${C.border}`,
          padding: 8, minWidth: 180, zIndex: 100,
        }}>
          <Link to={dashLink} onClick={() => { setOpen(false); }} state={{ tab: "profile" }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, color: C.brown, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F5F0E8"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <User size={15} style={{ color: C.muted }} /> My Profile
          </Link>
          <Link to={dashLink} onClick={() => setOpen(false)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, color: C.brown, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F5F0E8"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <Settings size={15} style={{ color: C.muted }} /> Dashboard
          </Link>
          <div style={{ height: 1, background: C.border, margin: "4px 8px" }} />
          <button
            onClick={async () => { await logout(); nav("/"); setOpen(false); }}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, color: "#dc2626", fontWeight: 600, fontSize: 14, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => e.currentTarget.style.background = "#FFF1EC"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <LogOut size={15} style={{ color: "#dc2626" }} /> {t("nav_logout")}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Contact bottom sheet ────────────────────────────────────────────────── */
const SUPPORT_WA    = "917834811114";
const SUPPORT_EMAIL = "contact@kaamnow.com";

function ContactSheet({ open, onClose, t }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  const waMsg = encodeURIComponent("Namaste KaamNow, mujhe madad chahiye: ");
  return (
    <>
      <div onClick={onClose} aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(45,31,24,0.5)" }} />
      <div role="dialog" aria-modal="true" style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 81,
        background: C.bg, borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 48px rgba(45,31,24,0.15)",
        padding: "24px 24px 44px", maxWidth: 480, margin: "0 auto",
      }}>
        <div style={{ width: 40, height: 4, background: C.muted, borderRadius: 2, margin: "0 auto 24px", opacity: 0.2 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.brown }}>{t("contact_sheet_title")}</span>
          <button onClick={onClose} aria-label={t("contact_close")}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(45,31,24,0.07)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} style={{ color: C.muted }} />
          </button>
        </div>
        <a href={`https://wa.me/${SUPPORT_WA}?text=${waMsg}`} target="_blank" rel="noreferrer" onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 16, background: "#F0FAF2", border: "1.5px solid #B2DFBC", marginBottom: 10, textDecoration: "none" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#25D366", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12.004 2C6.477 2 2.003 6.474 2.003 12.001c0 1.868.491 3.627 1.349 5.151L2 22l4.984-1.306A9.974 9.974 0 0012.004 22C17.53 22 22 17.526 22 12.001 22 6.474 17.53 2 12.004 2z" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1A7A3A" }}>{t("contact_wa")}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t("contact_wa_hint")}</div>
          </div>
        </a>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=KaamNow%20Support`} onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", borderRadius: 16, background: "white", border: `1.5px solid ${C.border}`, textDecoration: "none" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.bg, border: `1.5px solid ${C.border}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.brown }}>{t("contact_email")}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{t("contact_email_hint")}</div>
          </div>
        </a>
      </div>
    </>
  );
}

/* ── Desktop nav link ────────────────────────────────────────────────────── */
function NavItem({ to, active, children, onClick }) {
  const [hov, setHov] = useState(false);
  const baseStyle = {
    position: "relative", display: "flex", alignItems: "center", gap: 5,
    fontSize: 14.5, fontWeight: active ? 600 : 500,
    color: active ? C.brown : hov ? C.text : C.muted,
    paddingBottom: 4, textDecoration: "none",
    whiteSpace: "nowrap", transition: "color 0.15s",
    background: "none", border: "none", cursor: "pointer",
  };
  const underline = (
    <span style={{
      position: "absolute", bottom: -6, left: 0, right: 0, height: 2, borderRadius: 1,
      background: active ? C.accent : hov ? `${C.accent}44` : "transparent",
      transition: "background 0.15s",
    }} />
  );

  if (onClick) {
    return (
      <button style={baseStyle} onClick={onClick}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        {children}{underline}
      </button>
    );
  }
  return (
    <Link to={to} style={baseStyle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}{underline}
    </Link>
  );
}

/* ── Mobile nav row ──────────────────────────────────────────────────────── */
function MobNavItem({ to, onClose, children }) {
  const loc = useLocation();
  const active = loc.pathname === to;
  return (
    <Link to={to} onClick={onClose} style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "13px 16px", borderRadius: 12,
      fontWeight: active ? 700 : 500, fontSize: 15,
      color: active ? C.accent : C.text,
      background: active ? "#FFF1EC" : "none",
      borderLeft: `3px solid ${active ? C.accent : "transparent"}`,
      textDecoration: "none",
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#F0EAE0"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "none"; }}>
      {children}
    </Link>
  );
}

/* ── Mobile slide-out menu ───────────────────────────────────────────────── */
function MobileMenu({ open, onClose, user, logout, t, onContact, nav, onHowItWorks }) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;

  const dashLink = "/dashboard";

  return (
    <>
      <div onClick={onClose} aria-hidden="true"
        style={{ position: "fixed", inset: 0, zIndex: 48, background: "rgba(45,31,24,0.4)" }} />
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 49,
        background: C.bg, boxShadow: "0 8px 40px rgba(45,31,24,0.14)",
        paddingBottom: 32,
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <KaamNowLogo height={32} wordmark={false} />
            <LogoText size="sm" />
          </div>
          <button onClick={onClose} aria-label="Close menu"
            style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(45,31,24,0.07)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} style={{ color: C.brown }} />
          </button>
        </div>

        {/* Nav links */}
        <div style={{ padding: "12px 12px 0" }}>
          <MobNavItem to="/"            onClose={onClose}>{t("nav_home")}</MobNavItem>
          <MobNavItem to="/marketplace" onClose={onClose}>{t("nav_workers")}</MobNavItem>
          <MobNavItem to="/find-work"   onClose={onClose}>{t("nav_work")}</MobNavItem>
          <MobNavItem to="/post-job"    onClose={onClose}>Post a Job</MobNavItem>
          <button
            onClick={() => { onClose(); onHowItWorks(); }}
            style={{ width: "100%", display: "flex", alignItems: "center", padding: "13px 16px", borderRadius: 12, fontWeight: 500, fontSize: 15, color: C.text, background: "none", border: "none", cursor: "pointer", textAlign: "left", borderLeft: "3px solid transparent" }}
            onMouseEnter={e => e.currentTarget.style.background = "#F0EAE0"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}>
            {t("nav_how_it_works")}
          </button>
        </div>

        {/* Bottom */}
        <div style={{ margin: "16px 20px 0", paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <LangToggle />
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Link to={dashLink} onClick={onClose}
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 700, color: C.brown, textDecoration: "none" }}>
                <User size={14} style={{ color: C.forest }} />
                {user.name?.split(" ")[0]}
              </Link>
              <button onClick={async () => { await logout(); nav("/"); onClose(); }}
                style={{ fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: 10, color: C.accent, background: "#FFF1EC", border: `1px solid ${C.accent}33`, cursor: "pointer" }}>
                {t("nav_logout")}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Link to="/login" onClick={onClose}
                style={{ fontSize: 14, fontWeight: 600, color: C.brown, textDecoration: "none", padding: "8px 12px" }}>
                {t("nav_login")}
              </Link>
              <Link to="/signup" onClick={onClose}
                style={{ fontSize: 14, fontWeight: 700, padding: "9px 20px", borderRadius: 12, background: "linear-gradient(135deg, #E56A47 0%, #CF5535 100%)", color: "white", textDecoration: "none", boxShadow: "0 2px 8px rgba(229,106,71,0.35)" }}>
                {t("nav_signup")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main Navbar ─────────────────────────────────────────────────────────── */
export default function Navbar() {
  const { user, logout }   = useAuth();
  const { t }              = useLanguage();
  const nav                = useNavigate();
  const loc                = useLocation();
  const [contactOpen, setContactOpen] = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [barVisible,  setBarVisible]  = useState(true);

  /* Smooth-scroll to How It Works section with sticky-nav offset */
  const handleHowItWorks = useCallback(() => {
    if (loc.pathname === "/") {
      const el = document.getElementById("how-it-works");
      if (el) {
        const offset = 90;
        window.scrollTo({ top: el.offsetTop - offset, behavior: "smooth" });
        return;
      }
    }
    nav("/");
    sessionStorage.setItem("scrollTo", "how-it-works");
  }, [loc.pathname, nav]);

  const hasServiceProfile = user?.has_service_profile === true;

  return (
    <>
      {/* ── Desktop-only announcement bar ── */}
      {barVisible && (
        <div className="hidden lg:flex" style={{
          background: "linear-gradient(90deg, #2D1F18 0%, #3D2810 55%, #2D1F18 100%)",
          color: "rgba(255,255,255,0.85)",
          height: 38, alignItems: "center",
          padding: "0 20px", fontSize: 12.5, fontWeight: 500,
        }}>
          <div style={{ maxWidth: 1152, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "rgba(111,175,95,0.18)", border: "1px solid rgba(111,175,95,0.4)",
                color: C.green, borderRadius: 6, padding: "2px 8px", fontSize: 10.5, fontWeight: 700,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", boxShadow: "0 0 5px #6FAF5F" }} />
                LIVE
              </span>
              <span>Now live in 6 districts across UP, Bihar &amp; Maharashtra 🎉</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.65, fontSize: 12 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Trusted by 10,000+ families &amp; businesses
              </span>
              <button onClick={() => setBarVisible(false)} aria-label="Dismiss"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", padding: "2px 4px", lineHeight: 1, display: "flex" }}>
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main sticky nav ── */}
      <nav data-testid="main-nav" className="sticky top-0 z-40" style={{
        background: C.bg,
        boxShadow: C.shadow,
        borderBottom: `1px solid ${C.border}`,
      }}>
        {/* ── Row 1: brand + links + actions ── */}
        <div style={{ maxWidth: 1024, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0 }}>

            {/* Hamburger — mobile/tablet only */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden items-center justify-center flex"
              style={{ width: 38, height: 38, borderRadius: 10, background: "white", border: `1px solid ${C.border}`, color: C.brown, cursor: "pointer", flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <Menu size={18} />
            </button>

            {/* Logo */}
            <Link to="/" data-testid="logo-link" aria-label="KaamNow home"
              style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flexShrink: 0, textDecoration: "none" }}>
              {/* Mark — lineHeight:0 kills inline-block gap; negative margin closes transparent padding inside PNG */}
              <span className="hidden lg:block" style={{ lineHeight: 0, marginBottom: -6 }}>
                <KaamNowLogo height={54} wordmark={false} />
              </span>
              {/* Wordmark */}
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <span style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 800, fontSize: 18, color: C.accent, letterSpacing: "-0.025em", lineHeight: 1 }}>Kaam</span>
                <span style={{ fontFamily: "'Cabinet Grotesk','Manrope','Inter',sans-serif", fontWeight: 800, fontSize: 18, color: C.forest, letterSpacing: "-0.025em", lineHeight: 1 }}>Now</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, lineHeight: 1 }}>.com</span>
              </div>
            </Link>

            {/* Desktop centre nav */}
            <div className="hidden lg:flex" style={{ alignItems: "center", gap: 36, flex: 1, justifyContent: "center" }}>
              {hasServiceProfile ? (
                <>
                  <NavItem to="/worker/dashboard" active={loc.pathname === "/worker/dashboard"}>{t("nav_dashboard")}</NavItem>
                  <NavItem to="/worker/job-feed"  active={loc.pathname === "/worker/job-feed"}>{t("nav_work")}</NavItem>
                  <NavItem to="/support"          active={loc.pathname === "/support"}>Help</NavItem>
                </>
              ) : user ? (
                <>
                  <NavItem to="/marketplace"   active={loc.pathname === "/marketplace"}>{t("nav_workers")}</NavItem>
                  <NavItem to="/post-job"       active={loc.pathname === "/post-job"}>Post a Job</NavItem>
                  <NavItem to="/dashboard"      active={loc.pathname === "/dashboard"}>My Bookings</NavItem>
                </>
              ) : (
                <>
                  <NavItem to="/"              active={loc.pathname === "/"}>{t("nav_home")}</NavItem>
                  <NavItem to="/marketplace"   active={loc.pathname === "/marketplace"}>{t("nav_workers")}</NavItem>
                  <NavItem to="/find-work"     active={loc.pathname === "/find-work"}>{t("nav_work")}</NavItem>
                  <NavItem active={false} onClick={handleHowItWorks}>{t("nav_how_it_works")}</NavItem>
                </>
              )}
            </div>

            {/* Right actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <LangToggle />

              {user ? (
                <>
                  {/* Desktop: bell + user pill */}
                  <div className="hidden lg:flex" style={{ alignItems: "center", gap: 4, marginLeft: 4 }}>
                    <NotifBell />
                    <UserDropdown user={user} logout={logout} t={t} />
                  </div>
                  {/* Mobile: bell + avatar pill */}
                  <div className="lg:hidden flex items-center gap-1.5">
                    <NotifBell size={20} />
                    <UserDropdown user={user} logout={logout} t={t} />
                  </div>
                </>
              ) : (
                <>
                  {/* Desktop: login + sign up */}
                  <div className="hidden lg:flex" style={{ alignItems: "center", gap: 10, marginLeft: 4 }}>
                    <Link to="/login" data-testid="nav-login"
                      style={{ fontSize: 14, fontWeight: 700, padding: "8px 20px", borderRadius: 10, color: C.forest, textDecoration: "none", border: `1.5px solid ${C.forest}`, transition: "background 0.15s, color 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = C.forest; e.currentTarget.style.color = "white"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.forest; }}>
                      {t("nav_login")}
                    </Link>
                    <Link to="/signup" data-testid="nav-signup"
                      style={{
                        fontSize: 14, fontWeight: 700, padding: "9px 22px", borderRadius: 12,
                        background: "linear-gradient(135deg, #E56A47 0%, #CF5535 100%)",
                        color: "white", textDecoration: "none",
                        boxShadow: "0 2px 10px rgba(229,106,71,0.3)",
                        transition: "transform 0.12s, box-shadow 0.12s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 18px rgba(229,106,71,0.42)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 2px 10px rgba(229,106,71,0.3)"; }}>
                      {t("nav_signup")}
                    </Link>
                  </div>
                  {/* Mobile: sign up button only */}
                  <Link to="/signup" className="lg:hidden" data-testid="mob-signup"
                    style={{ fontSize: 13, fontWeight: 700, padding: "8px 16px", borderRadius: 10, background: "linear-gradient(135deg, #E56A47 0%, #CF5535 100%)", color: "white", textDecoration: "none", boxShadow: "0 2px 8px rgba(229,106,71,0.3)", whiteSpace: "nowrap" }}>
                    {t("nav_signup")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 2 (mobile only): quick pills — role-aware ── */}
        {!hasServiceProfile && (
          <div className="lg:hidden" style={{ borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <Link to="/marketplace"
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", fontSize: 14, fontWeight: 600, color: C.accent, textDecoration: "none", transition: "background 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#FFF5F2"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <Users size={16} style={{ color: C.accent }} />
                {t("nav_workers")}
              </Link>
              <div style={{ width: 1, background: C.border, alignSelf: "stretch", margin: "10px 0" }} />
              {user ? (
                <Link to="/post-job"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", fontSize: 14, fontWeight: 600, color: C.text, textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5F0E8"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Briefcase size={16} style={{ color: C.muted }} />
                  Post a Job
                </Link>
              ) : (
                <Link to="/find-work"
                  style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", fontSize: 14, fontWeight: 600, color: C.text, textDecoration: "none", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F5F0E8"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <Briefcase size={16} style={{ color: C.muted }} />
                  {t("nav_work")}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Row 3 (mobile only): live announcement strip ── */}
        <div className="lg:hidden" style={{ borderTop: `1px solid ${C.border}`, background: "#F5F1EB" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: C.brown, fontWeight: 500 }}>
              <MapPin size={14} style={{ color: C.accent, flexShrink: 0 }} />
              <span>Now live in 6 districts across UP, Bihar &amp; Maharashtra 🎉</span>
            </div>
            <ChevronDown size={14} style={{ color: C.muted, transform: "rotate(-90deg)", flexShrink: 0, marginLeft: 8 }} />
          </div>
        </div>
      </nav>

      {/* ── Overlays ── */}
      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        user={user}
        logout={logout}
        t={t}
        onContact={() => setContactOpen(true)}
        nav={nav}
        onHowItWorks={handleHowItWorks}
      />
      <ContactSheet open={contactOpen} onClose={() => setContactOpen(false)} t={t} />
    </>
  );
}
