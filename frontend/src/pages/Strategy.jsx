import { useState } from "react";

const SECTIONS = [
  { id: "market", n: "01", t: "Market" },
  { id: "personas", n: "02", t: "Personas" },
  { id: "product", n: "03", t: "Product" },
  { id: "mvp", n: "04", t: "MVP" },
  { id: "tech", n: "05", t: "Tech" },
  { id: "gtm", n: "06", t: "GTM" },
  { id: "monetization", n: "07", t: "Monetization" },
  { id: "risks", n: "08", t: "Risks" },
  { id: "scaling", n: "09", t: "Scaling" },
];

const CONTENT = {
  market: {
    title: "Market & Competitive Gap",
    lead: "India: 900M+ rural residents, 250M+ daily-wage workers. Existing platforms target metros. Nobody has cracked the rural-first labour marketplace.",
    items: [
      { h: "Urban Company", g: "Polished metro UX & background checks", b: "Built for Tier-1 cities. ₹500-min orders don't fit ₹400/day work. No Hindi voice. No WhatsApp." },
      { h: "WorkIndia / Apna", g: "Job board with vernacular support", b: "Listings only — no real-time booking, no village micro-jobs, no trust layer beyond profile." },
      { h: "NoBroker / Sulekha", g: "Connects to home services", b: "Urban only. Requires tech literacy. No village reach. Pre-paid only." },
      { h: "Gram Unnati / Kisan apps", g: "Farmer outreach & advisory", b: "No labour booking layer. Farmers still call mukhiya or walk to chowk." },
    ],
    gaps: [
      "WhatsApp-native booking",
      "Village-level trust graph (sarpanch endorsement)",
      "Voice-first UX in 22 Indian languages",
      "Farm calendar pre-booking",
      "Cash + UPI hybrid payments",
    ],
  },
  personas: {
    title: "User Personas",
    lead: "Three labourer archetypes and three customer archetypes — grounded in real rural dynamics across UP, Maharashtra, Bihar, MP, Rajasthan.",
    cards: [
      { color: "#3f37c9", label: "Labourer", h: "Ramesh, 38 — Mason", d: "Pratapgarh UP. ₹450-600/day, 12-15 days/month. Sits at chowk daily. Loses 20-30% to contractors. Heavy WhatsApp voice-note user. Wants steady work, fair rate, advance notice." },
      { color: "#1d9e75", label: "Labourer", h: "Sunita, 45 — Farm worker", d: "Wardha Vidarbha. ₹200-350/day, only 80 days/year. Mukadam exploits her. SHG is her trust network. Wants minimum wage assurance and woman-to-woman recommendations." },
      { color: "#7f77dd", label: "Labourer", h: "Chhotu, 24 — Multi-skill", d: "Muzaffarpur Bihar. Painting + electrical + shifting. Watches YouTube tutorials. Comfortable with apps. Wants to showcase skills and set his own rate." },
      { color: "#ff6b35", label: "Customer", h: "Mahesh, 55 — Farmer", d: "Hoshangabad MP. 4 acres. Spends 2hrs arranging 6 workers. No-shows kill his harvest. Wants WhatsApp booking and known-face workers." },
      { color: "#d85a30", label: "Customer", h: "Priya, 38 — Building house", d: "Lucknow village. ₹18L house, needs mason/painter/tile-fitter over 8 months. Hates 'workers go missing after advance'. Wants verified profiles and written rates." },
      { color: "#ba7517", label: "Customer", h: "Suresh, 42 — Contractor", d: "Jodhpur Rajasthan. Manages 15 workers across 4 projects. Spends 30% time on attendance. Wants on-demand crews and digital records." },
    ],
  },
  product: {
    title: "Core Product Design",
    lead: "Two interfaces, one backend. Every feature designed for slow internet, low literacy, and WhatsApp-first behaviour.",
    sections: [
      {
        h: "Labourer side",
        items: [
          "Voice-based registration (no typing)",
          "Skill badges with illustrated icons",
          "Simple availability toggle",
          "Rate card with area average",
          "WhatsApp job alerts ('Reply 1 to accept')",
          "Star rating & work history",
        ],
      },
      {
        h: "Customer side",
        items: [
          "Voice job posting in any Indian language",
          "Nearby workers within 5km on map",
          "WhatsApp one-tap booking flow",
          "Worker trust signals (village, sarpanch, rating)",
          "Job posting bulletin board",
          "Pre-booking 3-7 days ahead (farm season)",
        ],
      },
    ],
    trust: [
      { tier: "Tier 1", l: "Self-verified", d: "Aadhar + selfie. Phone verified. Below verified workers." },
      { tier: "Tier 2", l: "Gaon Verified", d: "Sarpanch OR 3 customers endorse. Priority placement." },
      { tier: "Tier 3", l: "KaamNow Pro", d: "Background check + 10+ jobs. Premium rates." },
    ],
  },
  mvp: {
    title: "MVP Definition",
    lead: "You are not building an app. You are building: WhatsApp bot + thin PWA + human field-agent network. Tech is minimal. Execution is everything.",
    build: [
      "WhatsApp bot (Hindi only)",
      "5-field worker profile",
      "Job posting via WhatsApp",
      "12-skill taxonomy",
      "Aadhar verification",
      "Star rating via WhatsApp",
      "SMS fallback for non-WhatsApp users",
      "Field-agent web dashboard",
    ],
    skip: [
      "Native mobile app (PWA wins)",
      "In-app payment gateway (cash first)",
      "GPS live tracking",
      "Multi-language UI day 1",
      "Contractor crew SaaS",
      "AI matching algorithm",
      "Insurance / ESIC integration",
      "Online skill assessments",
    ],
  },
  tech: {
    title: "Tech Architecture",
    lead: "Stack handles 100K users with 2 engineers. Managed services everywhere.",
    stack: [
      ["Frontend", "Next.js / React + Tailwind PWA"],
      ["WhatsApp", "Gupshup (WABA) — better Hindi support"],
      ["Backend", "FastAPI or Node.js"],
      ["Database", "PostgreSQL + Redis"],
      ["Cloud", "AWS Mumbai (ap-south-1)"],
      ["Voice", "Sarvam AI for Indian dialects"],
      ["SMS", "MSG91 — better rural DLR"],
      ["Aadhar", "DigiLocker API (free)"],
      ["Maps", "MapMyIndia for village-level coverage"],
      ["Analytics", "Mixpanel + Metabase"],
    ],
  },
  gtm: {
    title: "Go-To-Market",
    lead: "GTM is door-to-door, not Facebook ads. Each launch is a physical campaign in one village.",
    phases: [
      { h: "Pre-launch (4 weeks)", items: ["Pick 1 village, 500-2000 pop.", "Meet sarpanch personally", "Recruit 5 Gaon Champions", "Map physical chowk dynamics", "Print posters in local script"] },
      { h: "First 100 labourers", items: ["Register at the chowk at 6am", "Run a 'GaonKaam camp' under peepal tree", "First 20 get guaranteed jobs", "Pay same-day → word spreads", "Tie up with Mahila SHG for women workers"] },
      { h: "First 100 customers", items: ["Target 10 biggest village employers", "Free first hire", "Post jobs on their behalf initially", "Kirana stores as awareness hubs", "Live demo at weekly haat"] },
    ],
  },
  monetization: {
    title: "Monetization Ladder",
    lead: "Build habit first. Then monetize. Workers free always. Customers pay per booking. Contractors pay SaaS.",
    stages: [
      { h: "0-6 mo", m: "100% Free", d: "Build GMV. 500 bookings = proof.", color: "#3f37c9" },
      { h: "6-12 mo", m: "Customer fee ₹30-50/booking", d: "Only when worker shows up. Target ₹15K/month.", color: "#1d9e75" },
      { h: "12-24 mo", m: "Worker Pro subscription ₹49-99/mo", d: "Priority placement + 30 guaranteed alerts.", color: "#ff6b35" },
      { h: "24+ mo", m: "Contractor SaaS ₹299-999/mo", d: "Crew + attendance + digital records.", color: "#d85a30" },
      { h: "Scale", m: "B2B2C: NGO/Govt partnerships", d: "₹200-500 per verified worker. Crore-level potential.", color: "#ba7517" },
    ],
  },
  risks: {
    title: "Risks & Mitigation",
    lead: "Every rural-tech failure is one of these 5 patterns. Here's how we survive each.",
    risks: [
      { r: "Workers don't trust digital platforms", m: "Show real outcomes from known villagers first. Social proof from same village beats any pitch." },
      { r: "Customers fear no-shows", m: "First 90 days: field agent personally follows up every job. Human backup until data-driven reliability kicks in." },
      { r: "Disintermediation (direct contact)", m: "Defense: easier rebooking via platform, Pro badge requires platform history, dispute resolution & insurance only via platform." },
      { r: "Slow monetization, runway risk", m: "Budget 12 months zero revenue. NGO/CSR + MeitY rural startup grants. Govt is actively funding this category." },
      { r: "Funded competitor copies model", m: "Tech isn't the moat. Sarpanch relationships, Gaon Champions, community trust are. Bangalore startup can't replicate in 6 months." },
    ],
  },
  scaling: {
    title: "Scaling Strategy",
    lead: "Scale like a crop season — depth before breadth. Nail Village 1, then replicate as a franchise.",
    phases: [
      { h: "Village 1 (mo 1-6)", goal: "Prove the model", k: ["100 workers", "100 customers", "50+ bookings/mo", "4.0+ rating"], cap: "₹3-5L" },
      { h: "5 villages (mo 6-12)", goal: "Test replication", k: ["500 workers", "300 customers", "200+ bookings/mo", "₹20K/mo revenue"], cap: "₹15-20L (seed)" },
      { h: "District (mo 12-24)", goal: "District brand", k: ["2K workers", "1K customers", "1.5K+ bookings/mo", "₹1.5L/mo"], cap: "₹60L-1Cr" },
      { h: "State (mo 24-36)", goal: "Dominant state player", k: ["10K workers", "5K customers", "10K+ bookings/mo", "₹15-25L/mo"], cap: "₹5-10Cr (Series A)" },
    ],
    northstar: "Northstar metric: extra days of income enabled per worker per month.",
  },
};

export default function Strategy() {
  const [active, setActive] = useState("market");
  const c = CONTENT[active];

  return (
    <div data-testid="strategy-page" className="max-w-7xl mx-auto px-6 py-10">
      <div className="kn-overline">Product blueprint</div>
      <h1 className="font-display text-4xl lg:text-5xl tracking-tight mt-2">
        How we&apos;re going to win <span className="text-[#ff6b35]">rural India</span>.
      </h1>
      <p className="text-gray-600 mt-3 max-w-2xl">
        A 9-section playbook — built for one village, designed to scale to 10,000.
      </p>

      <div className="mt-10 grid lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3" data-testid="strategy-sidebar">
          <div className="lg:sticky lg:top-24 space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                data-testid={`section-${s.id}`}
                onClick={() => setActive(s.id)}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition border-l-4 ${
                  active === s.id
                    ? "bg-white border-[#ff6b35] text-gray-900 font-bold"
                    : "border-transparent text-gray-600 hover:bg-white"
                }`}
              >
                <span className="text-xs font-mono text-gray-400">{s.n}</span>
                <span className="text-sm">{s.t}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="lg:col-span-9" data-testid="strategy-content">
          <div className="kn-card p-8">
            <h2 className="font-display text-3xl tracking-tight">{c.title}</h2>
            <p className="text-gray-600 mt-3 leading-relaxed">{c.lead}</p>

            {active === "market" && (
              <>
                <div className="mt-8 grid md:grid-cols-2 gap-4">
                  {c.items.map((it, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-5">
                      <div className="font-bold text-gray-900">{it.h}</div>
                      <div className="text-xs uppercase tracking-wider mt-3 text-[#3f37c9] font-bold">Strength</div>
                      <p className="text-sm text-gray-700 mt-1">{it.g}</p>
                      <div className="text-xs uppercase tracking-wider mt-3 text-[#ff6b35] font-bold">Where they fail rural</div>
                      <p className="text-sm text-gray-700 mt-1">{it.b}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <div className="kn-overline">5 Gaps to exploit</div>
                  <div className="mt-3 grid md:grid-cols-2 gap-3">
                    {c.gaps.map((g, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 bg-[#fff7f3] border border-[#ffd4c2] rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-[#ff6b35] text-white flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
                        <div className="font-semibold text-sm">{g}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {active === "personas" && (
              <div className="mt-8 grid md:grid-cols-2 gap-4">
                {c.cards.map((p, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-5" style={{ borderLeftColor: p.color, borderLeftWidth: 4 }}>
                    <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: p.color }}>{p.label}</div>
                    <div className="font-display text-xl mt-1">{p.h}</div>
                    <p className="text-sm text-gray-700 mt-2 leading-relaxed">{p.d}</p>
                  </div>
                ))}
              </div>
            )}

            {active === "product" && (
              <>
                <div className="mt-8 grid md:grid-cols-2 gap-5">
                  {c.sections.map((s, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-5">
                      <div className="font-display text-xl">{s.h}</div>
                      <ul className="mt-3 space-y-2 text-sm text-gray-700">
                        {s.items.map((it, j) => <li key={j}>• {it}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8">
                  <div className="kn-overline">Trust tiers</div>
                  <div className="mt-3 grid md:grid-cols-3 gap-3">
                    {c.trust.map((t, i) => (
                      <div key={i} className="border border-gray-200 rounded-lg p-5">
                        <div className="font-display text-2xl text-[#3f37c9]">{t.tier}</div>
                        <div className="text-xs uppercase tracking-wider font-bold text-gray-500 mt-1">{t.l}</div>
                        <p className="text-sm text-gray-700 mt-3">{t.d}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {active === "mvp" && (
              <div className="mt-8 grid md:grid-cols-2 gap-5">
                <div className="border border-[#3f37c9]/30 bg-[#3f37c9]/5 rounded-lg p-5">
                  <div className="kn-overline">Build in V1</div>
                  <ul className="mt-3 space-y-2 text-sm">
                    {c.build.map((b, i) => <li key={i} className="flex gap-2"><span className="text-[#3f37c9] font-bold">✓</span> {b}</li>)}
                  </ul>
                </div>
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="kn-overline" style={{ color: "#a32d2d" }}>Skip in V1</div>
                  <ul className="mt-3 space-y-2 text-sm text-gray-700">
                    {c.skip.map((b, i) => <li key={i} className="flex gap-2"><span className="text-gray-400 font-bold">✗</span> {b}</li>)}
                  </ul>
                </div>
              </div>
            )}

            {active === "tech" && (
              <div className="mt-8 grid sm:grid-cols-2 gap-3">
                {c.stack.map(([layer, tech], i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4 flex items-baseline justify-between gap-3">
                    <div className="text-xs uppercase tracking-wider font-bold text-gray-500">{layer}</div>
                    <div className="font-mono text-sm text-[#3f37c9] font-bold text-right">{tech}</div>
                  </div>
                ))}
              </div>
            )}

            {active === "gtm" && (
              <div className="mt-8 space-y-5">
                {c.phases.map((p, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-5">
                    <div className="font-display text-xl">{p.h}</div>
                    <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                      {p.items.map((it, j) => <li key={j}>• {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {active === "monetization" && (
              <div className="mt-8 space-y-3">
                {c.stages.map((s, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-5 flex flex-wrap gap-4 items-center" style={{ borderLeftColor: s.color, borderLeftWidth: 4 }}>
                    <div className="w-32 shrink-0">
                      <div className="text-xs uppercase tracking-widest font-bold text-gray-500">Stage</div>
                      <div className="font-display text-lg">{s.h}</div>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-bold" style={{ color: s.color }}>{s.m}</div>
                      <div className="text-sm text-gray-700 mt-1">{s.d}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {active === "risks" && (
              <div className="mt-8 space-y-4">
                {c.risks.map((r, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-5">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-[#a32d2d]">Risk</div>
                    <div className="font-bold mt-1">{r.r}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-[#3b6d11] mt-3">Mitigation</div>
                    <p className="text-sm text-gray-700 mt-1">{r.m}</p>
                  </div>
                ))}
              </div>
            )}

            {active === "scaling" && (
              <>
                <div className="mt-8 grid md:grid-cols-2 gap-4">
                  {c.phases.map((p, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-5">
                      <div className="font-display text-xl">{p.h}</div>
                      <div className="text-xs uppercase tracking-wider font-bold text-[#3f37c9] mt-1">{p.goal}</div>
                      <ul className="mt-3 space-y-1 text-sm text-gray-700">
                        {p.k.map((it, j) => <li key={j}>• {it}</li>)}
                      </ul>
                      <div className="mt-3 text-xs font-bold text-gray-500">Capital: {p.cap}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-6 rounded-lg bg-[#3f37c9] text-white">
                  <div className="kn-overline" style={{ color: "#ffb89a" }}>Northstar</div>
                  <div className="font-display text-2xl mt-2">{c.northstar}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
