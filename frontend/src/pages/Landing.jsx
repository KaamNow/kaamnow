import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MapPin, ShieldCheck, Users, Briefcase, ArrowRight, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

/* ─── Palette shortcuts ────────────────────────────────────────────────────── */
const C = {
  terracotta: "#E07A5F",
  green:      "#2D6A4F",
  ochre:      "#CC7722",
  dark:       "#3A2E20",
  cream:      "#F4F1EA",
  mud:        "#8B7355",
  bg:         "#F4F1EA",
  cardBg:     "#FFFFFF",
  border:     "#E5D9CC",
};

/* ─── Service categories config ────────────────────────────────────────────── */
const CATEGORIES = [
  { key: "construction", slug: "construction", emoji: "🏗️", color: C.terracotta, bg: "#FFF0EC" },
  { key: "farm",         slug: "farm",         emoji: "🌾", color: C.green,      bg: "#EAF4EE" },
  { key: "electrical",   slug: "electrical",   emoji: "⚡", color: C.ochre,      bg: "#FFF8EC" },
  { key: "cleaning",     slug: "cleaning",     emoji: "✨", color: "#4A90D9",    bg: "#EBF4FF" },
  { key: "transport",    slug: "transport",    emoji: "🚛", color: "#6B4C9A",    bg: "#F3EEFF" },
  { key: "mechanical",   slug: "mechanical",   emoji: "🔧", color: "#C0392B",    bg: "#FEECEB" },
  { key: "tailoring",    slug: "tailoring",    emoji: "✂️", color: "#D4699A",    bg: "#FEF0F7" },
  { key: "home",         slug: "home",         emoji: "🏠", color: C.dark,       bg: "#F0EDE8" },
];

/* ─── Trust badge ──────────────────────────────────────────────────────────── */
function TrustBadge({ tier }) {
  const cfg = {
    1: { label: { en: "Self-verified", hi: "खुद सत्यापित" }, bg: "#F4F1EA", color: C.mud },
    2: { label: { en: "Gaon Verified", hi: "गाँव सत्यापित" }, bg: "#EAF4EE", color: C.green },
    3: { label: { en: "KaamNow Pro",   hi: "KaamNow Pro"   }, bg: "#FFF0EC", color: C.terracotta },
  }[tier] || { label: { en: "Verified", hi: "सत्यापित" }, bg: "#F4F1EA", color: C.mud };
  const { lang } = useLanguage();
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}>
      <ShieldCheck size={9} />{cfg.label[lang] ?? cfg.label.en}
    </span>
  );
}

/* ─── FAQ item ─────────────────────────────────────────────────────────────── */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-4"
      >
        <span className="font-bold text-sm leading-snug" style={{ color: C.dark }}>{q}</span>
        {open
          ? <ChevronUp size={16} style={{ color: C.mud, flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: C.mud, flexShrink: 0 }} />}
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B5744" }}>{a}</p>
      )}
    </div>
  );
}

/* ─── Section heading ──────────────────────────────────────────────────────── */
function SectionHead({ overline, heading, accent, sub, center }) {
  return (
    <div className={center ? "text-center" : ""}>
      {overline && (
        <div className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2"
          style={{ color: C.ochre, justifyContent: center ? "center" : undefined }}>
          <span style={{ width: 20, height: 2, background: C.ochre, display: "inline-block", borderRadius: 1 }} />
          {overline}
          <span style={{ width: 20, height: 2, background: C.ochre, display: "inline-block", borderRadius: 1 }} />
        </div>
      )}
      <h2 className="font-bold leading-tight"
        style={{ fontSize: "clamp(1.55rem, 4vw, 2.4rem)", color: C.dark }}>
        {heading}{" "}
        {accent && <span style={{ color: C.terracotta }}>{accent}</span>}
      </h2>
      {sub && <p className="mt-3 text-sm leading-relaxed max-w-lg" style={{ color: "#6B5744" }}>{sub}</p>}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function Landing() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";
  const isWorker   = user?.role === "worker";
  const [stats, setStats]               = useState({ workers: 0, jobs: 0, villages: 0 });
  const [featuredWorkers, setWorkers]   = useState([]);
  const [featuredJobs, setJobs]         = useState([]);
  const [waitName, setWaitName]         = useState("");
  const [waitPhone, setWaitPhone]       = useState("");
  const [waitRole, setWaitRole]         = useState("customer");
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    api.get("/stats").then(r => setStats(r.data)).catch(() => {});
    api.get("/workers/search").then(r => setWorkers(r.data.slice(0, 4))).catch(() => {});
    api.get("/jobs/feed").then(r => setJobs(r.data.slice(0, 3))).catch(() => {});
  }, []);

  const submitWaitlist = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/waitlist", {
        email: `wa_${waitPhone}@kaamnow.com`,
        name: waitName,
        role: waitRole,
      });
      toast.success(t("wait_success"));
      setWaitName(""); setWaitPhone("");
    } catch { toast.error(t("wait_error")); }
    finally { setSubmitting(false); }
  };

  const isHi = lang === "hi";

  /* ── Role-based hero config ─────────────────────────────────────────────── */
  const heroContent = {
    guest: {
      tagline: t("hero_guest_tagline"),
      title: (
        <>{t("hero_guest_t1")} <span style={{ color: C.terracotta }}>{t("hero_guest_t2")}</span>{" "}
        <span style={{ color: C.green }}>{t("hero_guest_t3")}</span></>
      ),
      subtitle: t("hero_guest_sub"),
      description: t("hero_guest_desc"),
      ctas: [
        { to: "/marketplace",   label: t("cta_find_workers"), icon: <Users size={17} />,       bg: C.terracotta },
        { to: "/find-work",     label: t("cta_find_work"),    icon: <Briefcase size={17} />,   bg: C.green },
        { to: "/whatsapp-demo", label: t("hero_cta_demo"),    icon: <MessageCircle size={16} />, bg: "white", color: "#075E54", border: `1.5px solid #9DCDB5` },
      ],
    },
    customer: {
      tagline: null,
      title: (
        <>{t("hero_customer_t1")}{" "}
        <span style={{ color: C.terracotta }}>{t("hero_customer_t2")}</span></>
      ),
      subtitle: t("hero_customer_sub"),
      description: t("hero_customer_desc"),
      ctas: [
        { to: "/marketplace", label: t("cta_find_workers"), icon: <Users size={17} />,     bg: C.terracotta },
        { to: "/post-job",    label: t("cta_post_job"),     icon: <Briefcase size={17} />, bg: C.green },
      ],
    },
    worker: {
      tagline: null,
      title: (
        <>{t("hero_worker_t1")}{" "}
        <span style={{ color: C.green }}>{t("hero_worker_t2")}</span></>
      ),
      subtitle: t("hero_worker_sub"),
      description: t("hero_worker_desc"),
      ctas: [
        { to: "/worker/job-feed", label: t("cta_find_jobs"),    icon: <Briefcase size={17} />,   bg: C.green },
        { to: "/whatsapp-demo",   label: t("cta_whatsapp_bot"), icon: <MessageCircle size={16} />, bg: "white", color: "#075E54", border: `1.5px solid #9DCDB5` },
      ],
    },
  };

  const role = isCustomer ? "customer" : isWorker ? "worker" : "guest";
  const hero = heroContent[role];

  return (
    <div data-testid="landing-page"
      style={{ background: C.bg, color: C.dark, fontFamily: isHi ? "'Noto Sans Devanagari','Manrope',sans-serif" : undefined }}>

      {/* ══════════════════════════════════════════════════════════
          1. HERO — direct, no fluff, two clear paths
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "linear-gradient(160deg,#FDF6E3 0%,#F4F1EA 100%)", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 pt-12 pb-14">

          {/* Overline / tagline */}
          {hero.tagline ? (
            <div className="mb-4">
              <span className="text-sm font-semibold italic px-3 py-1 rounded-full"
                style={{ background: `${C.ochre}18`, color: C.ochre, border: `1px solid ${C.ochre}33` }}>
                {hero.tagline}
              </span>
            </div>
          ) : (
            <div className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: C.ochre }}>
              {t("hero_overline")}
            </div>
          )}

          {/* Headline */}
          <h1 className="font-bold leading-tight"
            style={{ fontSize: "clamp(1.9rem,6vw,3.6rem)", color: C.dark }}>
            {hero.title}
          </h1>

          {/* Subtitle */}
          <p className="mt-3 max-w-xl text-base font-semibold leading-snug" style={{ color: C.dark }}>
            {hero.subtitle}
          </p>

          {/* Description */}
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: "#6B5744" }}>
            {hero.description}
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            {hero.ctas.map((cta, i) => (
              <Link key={i} to={cta.to}
                className="flex items-center gap-2 font-bold rounded-2xl active:scale-95 transition-all"
                style={{
                  background: cta.bg,
                  color: cta.color || "white",
                  border: cta.border || "none",
                  padding: "13px 24px",
                  fontSize: 15,
                  minHeight: 50,
                  boxShadow: cta.border ? "none" : "0 2px 10px rgba(0,0,0,0.12)",
                }}>
                {cta.icon} {cta.label}
              </Link>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {[
              { v: `${stats.workers || 20}+`, l: t("stat_workers") },
              { v: `${stats.villages || 6}+`, l: t("stat_villages") },
              { v: "₹450",                    l: t("stat_wage") },
              { v: "<15m",                    l: t("stat_match") },
            ].map(s => (
              <div key={s.l}>
                <div className="font-bold" style={{ fontSize: "clamp(1.6rem,4vw,2.2rem)", color: C.dark, lineHeight: 1 }}>{s.v}</div>
                <div className="text-xs font-semibold uppercase tracking-wide mt-0.5" style={{ color: C.mud }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          2. SERVICE CATEGORIES — the most important section
             "Kya kaam karwana hai?" — answers instantly
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "white", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <div className="mb-7">
            <h2 className="font-bold" style={{ fontSize: "clamp(1.3rem,3.5vw,1.9rem)", color: C.dark }}>
              {t("cat_heading")}
            </h2>
            <p className="mt-1.5 text-sm" style={{ color: "#6B5744" }}>{t("cat_sub")}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.key}
                to={`/marketplace?category=${cat.slug}`}
                className="flex flex-col items-start gap-2 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
                style={{ background: cat.bg, border: `1px solid ${cat.color}22` }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{cat.emoji}</span>
                <div>
                  <div className="font-bold text-sm leading-tight" style={{ color: cat.color }}>
                    {t(`cat_${cat.key}`)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          3. FOR WORKERS — find work section
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <div className="rounded-3xl p-7 sm:p-10 grid md:grid-cols-2 gap-8 items-center"
            style={{ background: "linear-gradient(135deg,#EAF4EE 0%,#F4F1EA 100%)", border: `1px solid #9DCDB5` }}>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.green }}>
                {t("findwork_overline")}
              </div>
              <h2 className="font-bold leading-tight" style={{ fontSize: "clamp(1.4rem,3.5vw,2rem)", color: C.dark }}>
                {t("findwork_headline")}<br />
                <span style={{ color: C.green }}>{t("findwork_headline_accent")}</span>
              </h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "#4B5563" }}>{t("findwork_sub")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/signup"
                  className="font-bold rounded-xl px-6 py-3 text-sm text-white active:scale-95 transition shadow"
                  style={{ background: C.green }}>
                  {t("findwork_cta_register")}
                </Link>
                <Link to="/find-work"
                  className="flex items-center gap-1 font-bold text-sm transition hover:underline"
                  style={{ color: C.green }}>
                  {t("findwork_cta_browse")} <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Live job teasers */}
            <div className="space-y-2.5">
              {featuredJobs.map((j, i) => (
                <Link to="/find-work" key={j.id}
                  className="flex items-center justify-between rounded-xl px-4 py-3.5 transition hover:shadow-md"
                  style={{ background: "white", border: `1px solid ${C.border}`, opacity: 1 - i * 0.12 }}>
                  <div>
                    <div className="font-bold text-sm" style={{ color: C.dark }}>{j.title}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.mud }}>
                      {j.village} · ₹{j.daily_rate}/day
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: C.green }} />
                </Link>
              ))}
              {featuredJobs.length === 0 && (
                <div className="text-center py-6 text-sm italic" style={{ color: C.mud }}>
                  {t("findwork_empty")}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          4. FEATURED WORKERS
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "white", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <div className="flex items-end justify-between mb-7 gap-4">
            <SectionHead heading={t("workers_headline")} accent={t("workers_headline_accent")} />
            <Link to="/marketplace"
              className="flex items-center gap-1.5 font-bold text-sm whitespace-nowrap rounded-xl px-5 py-3 text-white shadow transition-all"
              style={{ background: C.terracotta }}>
              {t("workers_cta")} <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredWorkers.map(w => (
              <Link key={w.id} to={`/worker/${w.id}`}
                className="block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ border: `1px solid ${C.border}`, background: C.cardBg }}>
                <div className="relative aspect-square bg-gray-100">
                  <img
                    src={w.photo_url || "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400"}
                    alt={w.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/95 rounded-full px-2 py-1 shadow-sm">
                    <Star size={10} style={{ fill: "#F2C94C", color: "#F2C94C" }} />
                    <span className="text-xs font-bold" style={{ color: C.dark }}>{w.avg_rating?.toFixed(1)}</span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="font-bold text-base mb-1" style={{ color: C.dark }}>{w.name}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {w.skills?.slice(0, 2).map(s => (
                      <span key={s} className="text-[10px] font-bold uppercase tracking-wider" style={{ color: C.mud }}>{s}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs flex items-center gap-1" style={{ color: C.mud }}>
                      <MapPin size={10} />{w.village}
                    </span>
                    <span className="font-bold text-sm" style={{ color: C.green }}>₹{w.daily_rate}/day</span>
                  </div>
                  <TrustBadge tier={w.trust_tier} />
                </div>
              </Link>
            ))}
            {featuredWorkers.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm italic" style={{ color: C.mud }}>
                {t("workers_empty")}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          5. HOW IT WORKS
      ══════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, scrollMarginTop: 100 }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <SectionHead
            overline={t("how_overline")}
            heading={t("how_headline")}
            accent={t("how_headline_accent")}
            center
          />

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {[
              { n: "01", emoji: "📱", title: t("how_step1_title"), desc: t("how_step1_desc"), color: C.green },
              { n: "02", emoji: "📍", title: t("how_step2_title"), desc: t("how_step2_desc"), color: C.ochre },
              { n: "03", emoji: "🤝", title: t("how_step3_title"), desc: t("how_step3_desc"), color: C.terracotta },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl p-6"
                style={{ background: "white", border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-4xl" style={{ color: C.border, lineHeight: 1 }}>{s.n}</span>
                  <span style={{ fontSize: 32 }}>{s.emoji}</span>
                </div>
                <div className="w-8 h-1 rounded-full mb-3" style={{ background: s.color }} />
                <h3 className="font-bold text-base mb-2 leading-snug" style={{ color: C.dark }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B5744" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          6. WHATSAPP — our biggest differentiator (not on DiHaadi)
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "#075E54" }}>
        <div className="max-w-5xl mx-auto px-5 py-14">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#9DCDB5" }}>
                {t("wa_section_overline")}
              </div>
              <h2 className="font-bold leading-tight text-white"
                style={{ fontSize: "clamp(1.5rem,4vw,2.2rem)" }}>
                {t("wa_section_heading")}
              </h2>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.8)" }}>
                {t("wa_section_sub")}
              </p>
              <Link to="/whatsapp-demo"
                className="mt-6 inline-flex items-center gap-2 font-bold rounded-xl px-6 py-3 text-sm transition-all active:scale-95"
                style={{ background: "#25D366", color: "white" }}>
                <MessageCircle size={16} /> {t("wa_try")}
              </Link>
            </div>

            {/* Command list */}
            <div className="space-y-2.5">
              {[t("wa_cmd1"), t("wa_cmd2"), t("wa_cmd3"), t("wa_cmd4")].map((cmd, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#25D366" }} />
                  <span className="text-sm font-semibold text-white">{cmd}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          7. TESTIMONIALS — three real voices
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "white", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <SectionHead overline={t("test_overline")} heading={isHi ? "उनकी जुबानी" : "Their words"} />

          <div className="mt-8 grid md:grid-cols-3 gap-5">
            {[
              {
                quote: t("test_quote"),
                name: isHi ? "रमेश कुमार, राज मिस्त्री" : "Ramesh Kumar, Mason",
                meta: isHi ? "प्रतापगढ़, UP — 47 काम पूरे" : "Pratapgarh, UP — 47 jobs",
                img: "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
                accent: C.terracotta,
              },
              {
                quote: t("test2_quote"),
                name: isHi ? "सुनीता देवी, Painter" : "Sunita Devi, Painter",
                meta: isHi ? "मुजफ्फरपुर, Bihar — 32 काम" : "Muzaffarpur, Bihar — 32 jobs",
                img: "https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
                accent: C.green,
              },
              {
                quote: t("test3_quote"),
                name: isHi ? "सुरेश शर्मा, Plumber" : "Suresh Sharma, Plumber",
                meta: isHi ? "वर्धा, Maharashtra — 63 काम" : "Wardha, Maharashtra — 63 jobs",
                img: "https://images.pexels.com/photos/29858623/pexels-photo-29858623.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200",
                accent: C.ochre,
              },
            ].map((item, i) => (
              <div key={i} className="rounded-2xl p-6 flex flex-col"
                style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                {/* Quote mark */}
                <div className="text-4xl font-bold leading-none mb-3" style={{ color: item.accent, opacity: 0.35 }}>"</div>
                <p className="text-sm leading-relaxed flex-1" style={{ color: C.dark, fontFamily: isHi ? "'Noto Sans Devanagari','Manrope',sans-serif" : undefined }}>
                  {item.quote}
                </p>
                <div className="mt-5 flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
                  <img src={item.img} alt={item.name}
                    className="w-10 h-10 rounded-full object-cover"
                    style={{ border: `2px solid ${item.accent}` }} />
                  <div>
                    <div className="font-bold text-xs" style={{ color: C.dark }}>{item.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: C.mud }}>{item.meta}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          8. WHY KAAMNOW — 5 differentiators
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-12">
          <SectionHead
            overline={t("feat_overline")}
            heading={t("feat_headline")}
            accent={t("feat_headline_accent")}
          />

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: "💬", title: t("feat_wa_title"),       desc: t("feat_wa_desc"),       big: true },
              { emoji: "🎙️", title: t("feat_voice_title"),   desc: t("feat_voice_desc") },
              { emoji: "🛡️", title: t("feat_trust_title"),   desc: t("feat_trust_desc") },
              { emoji: "📅", title: t("feat_calendar_title"), desc: t("feat_calendar_desc") },
              { emoji: "💵", title: t("feat_pay_title"),      desc: t("feat_pay_desc") },
            ].map((f, i) => (
              <div key={i}
                className={`rounded-2xl p-6 ${f.big ? "sm:col-span-2 lg:col-span-1" : ""}`}
                style={{
                  background: f.big ? C.green : "white",
                  border: `1px solid ${f.big ? C.green : C.border}`,
                  color: f.big ? "white" : C.dark,
                }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.emoji}</div>
                <div className="font-bold text-base mb-2">{f.title}</div>
                <p className="text-sm leading-relaxed" style={{ color: f.big ? "rgba(255,255,255,0.82)" : "#6B5744" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          9. FAQ
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: "white", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-3xl mx-auto px-5 py-12">
          <SectionHead heading={t("faq_heading")} center />
          <div className="mt-8">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <FAQItem key={n} q={t(`faq_q${n}`)} a={t(`faq_a${n}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          10. WAITLIST / CTA
      ══════════════════════════════════════════════════════════ */}
      <section style={{ background: `linear-gradient(160deg, ${C.ochre} 0%, #A85E10 100%)` }}>
        <div className="max-w-4xl mx-auto px-5 py-14 text-center text-white">
          <div style={{ fontSize: 44, marginBottom: 12 }}>🌾</div>
          <h2 className="font-bold leading-tight"
            style={{ fontSize: "clamp(1.7rem,5vw,2.8rem)" }}>
            {t("wait_headline")}
          </h2>
          <p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.88)" }}>
            {t("wait_sub")}
          </p>

          <form onSubmit={submitWaitlist} data-testid="waitlist-form"
            className="mt-8 max-w-lg mx-auto rounded-2xl p-5 text-left"
            style={{ background: "white", boxShadow: "0 20px 50px rgba(0,0,0,0.18)" }}>
            <div className="grid sm:grid-cols-2 gap-3">
              <input required data-testid="waitlist-name" placeholder={t("wait_name")}
                value={waitName} onChange={e => setWaitName(e.target.value)} className="kn-input" />
              <input required data-testid="waitlist-phone" type="tel" inputMode="numeric"
                placeholder={t("wait_phone")} value={waitPhone}
                onChange={e => setWaitPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="kn-input" />
              <select data-testid="waitlist-role" value={waitRole}
                onChange={e => setWaitRole(e.target.value)} className="kn-input">
                <option value="customer">{t("wait_role_customer")}</option>
                <option value="worker">{t("wait_role_worker")}</option>
                <option value="partner">{t("wait_role_partner")}</option>
              </select>
              <button disabled={submitting} data-testid="waitlist-submit"
                className="font-bold rounded-xl py-3 transition-all active:scale-95 disabled:opacity-60"
                style={{ background: C.ochre, color: "white", fontSize: 15 }}>
                {submitting ? t("wait_cta_loading") : t("wait_cta")}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          11. FOOTER
      ══════════════════════════════════════════════════════════ */}
      <footer style={{ background: C.dark, color: "rgba(255,255,255,0.6)" }}>
        <div className="max-w-5xl mx-auto px-5 py-10">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
            <div className="font-bold text-xl text-white">
              kaam<span style={{ color: C.terracotta }}>now</span>.com
            </div>
            <div style={{ color: "rgba(255,255,255,0.4)" }}>{t("footer_copy")}</div>
            <div className="flex gap-5">
              <Link to="/marketplace" className="hover:text-white transition">{t("footer_marketplace")}</Link>
              <Link to="/whatsapp-demo" className="hover:text-white transition">{t("footer_whatsapp")}</Link>
            </div>
          </div>

          {/* Social row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-5"
            style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
              {t("footer_follow")}
            </span>
            <div className="flex items-center gap-3">
              <a href="https://www.instagram.com/kaamnow_" target="_blank" rel="noreferrer"
                aria-label="KaamNow on Instagram"
                className="flex items-center justify-center rounded-xl transition"
                style={{ width: 44, height: 44, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(224,122,95,0.25)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4.5"/>
                  <circle cx="17.5" cy="6.5" r="1" fill="rgba(255,255,255,0.7)" stroke="none"/>
                </svg>
              </a>
              {/* X button disabled — link to be added */}
            </div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{t("footer_tagline")}</div>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════
          MOBILE STICKY BAR
      ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex gap-2 px-4 py-3"
        style={{ background: "rgba(244,241,234,0.96)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.border}` }}>
        {!isWorker && (
          <Link to="/marketplace"
            className="flex-1 flex items-center justify-center gap-2 font-bold rounded-xl py-3.5 text-sm text-white active:scale-95 transition"
            style={{ background: C.terracotta }}>
            <Users size={15} /> {t("mob_workers")}
          </Link>
        )}
        {!isCustomer && (
          <Link to="/find-work"
            className="flex-1 flex items-center justify-center gap-2 font-bold rounded-xl py-3.5 text-sm text-white active:scale-95 transition"
            style={{ background: C.green }}>
            <Briefcase size={15} /> {t("mob_work")}
          </Link>
        )}
      </div>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "LocalBusiness",
        "name": "KaamNow", "url": "https://kaamnow.com",
        "description": "India's village labour marketplace.",
        "address": { "@type": "PostalAddress", "addressCountry": "IN" }
      })}} />
    </div>
  );
}
