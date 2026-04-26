import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts, radius, spacing } from "../theme";
import Overline from "../components/Overline";

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
    cards: [
      { h: "Urban Company", g: "Polished metro UX & background checks", b: "Built for Tier-1. ₹500-min orders don't fit ₹400/day work. No Hindi voice." },
      { h: "WorkIndia / Apna", g: "Job board with vernacular support", b: "Listings only — no real-time booking, no village micro-jobs." },
      { h: "NoBroker / Sulekha", g: "Connects to home services", b: "Urban only. Requires tech literacy. No village reach." },
      { h: "Gram Unnati / Kisan apps", g: "Farmer outreach & advisory", b: "No labour booking layer. Farmers still call mukhiya." },
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
    lead: "Three labourer archetypes and three customer archetypes — grounded in real rural dynamics.",
    list: [
      { color: colors.indigo, label: "Labourer", h: "Ramesh, 38 — Mason", d: "Pratapgarh UP. ₹450-600/day, 12-15 days/month. Sits at chowk daily. Heavy WhatsApp voice-note user." },
      { color: "#1d9e75", label: "Labourer", h: "Sunita, 45 — Farm worker", d: "Wardha. ₹200-350/day, only 80 days/year. SHG is her trust network." },
      { color: "#7f77dd", label: "Labourer", h: "Chhotu, 24 — Multi-skill", d: "Muzaffarpur Bihar. Painting + electrical + shifting. Watches YouTube." },
      { color: colors.saffron, label: "Customer", h: "Mahesh, 55 — Farmer", d: "Hoshangabad MP. 4 acres. Spends 2hrs arranging 6 workers." },
      { color: "#d85a30", label: "Customer", h: "Priya, 38 — House owner", d: "Lucknow village. ₹18L house. Wants verified profiles & written rates." },
      { color: "#ba7517", label: "Customer", h: "Suresh, 42 — Contractor", d: "Jodhpur. 15 workers across 4 projects. Wants on-demand crews." },
    ],
  },
  product: {
    title: "Core Product Design",
    lead: "Two interfaces, one backend. Designed for slow internet, low literacy, WhatsApp-first behaviour.",
    sections: [
      { h: "Labourer side", items: ["Voice-based registration", "Skill badges with icons", "Simple availability toggle", "Rate card with area average", "WhatsApp job alerts", "Star rating & history"] },
      { h: "Customer side", items: ["Voice job posting", "Nearby workers within 5km", "WhatsApp one-tap booking", "Worker trust signals", "Job posting bulletin board", "Pre-booking 3-7 days"] },
    ],
  },
  mvp: {
    title: "MVP Definition",
    lead: "You are not building an app. You are building: WhatsApp bot + thin PWA + human field-agent network.",
    build: ["WhatsApp bot (Hindi)", "5-field worker profile", "Job posting via WhatsApp", "12-skill taxonomy", "Aadhar verification", "Star rating", "SMS fallback", "Field-agent dashboard"],
    skip: ["Native mobile app v1", "In-app payment", "GPS live tracking", "Multi-language UI day 1", "Contractor crew SaaS", "AI matching", "Insurance integration", "Online skill assessments"],
  },
  tech: {
    title: "Tech Architecture",
    lead: "Stack handles 100K users with 2 engineers. Managed services everywhere.",
    stack: [
      ["Frontend", "React PWA + Tailwind"],
      ["WhatsApp", "Gupshup (WABA)"],
      ["Backend", "FastAPI / Node.js"],
      ["Database", "PostgreSQL + Redis"],
      ["Cloud", "AWS Mumbai"],
      ["Voice", "Sarvam AI"],
      ["SMS", "MSG91"],
      ["Aadhar", "DigiLocker API"],
      ["Maps", "MapMyIndia"],
      ["Analytics", "Mixpanel + Metabase"],
    ],
  },
  gtm: {
    title: "Go-To-Market",
    lead: "GTM is door-to-door, not Facebook ads. Each launch is a physical campaign in one village.",
    phases: [
      { h: "Pre-launch (4 weeks)", items: ["Pick 1 village (500-2000 pop.)", "Meet sarpanch personally", "Recruit 5 Gaon Champions", "Map physical chowk", "Print local posters"] },
      { h: "First 100 labourers", items: ["Register at chowk at 6am", "Run camp under peepal tree", "First 20 get guaranteed jobs", "Pay same-day", "Mahila SHG tie-up"] },
      { h: "First 100 customers", items: ["Target 10 biggest employers", "Free first hire", "Post jobs on their behalf", "Kirana stores as awareness hubs", "Live demo at weekly haat"] },
    ],
  },
  monetization: {
    title: "Monetization Ladder",
    lead: "Build habit first. Then monetize. Workers free always.",
    stages: [
      { h: "0-6 mo", m: "100% Free", d: "Build GMV. 500 bookings = proof.", c: colors.indigo },
      { h: "6-12 mo", m: "Customer fee ₹30-50/booking", d: "Only when worker shows up.", c: "#1d9e75" },
      { h: "12-24 mo", m: "Worker Pro ₹49-99/mo", d: "Priority placement + 30 alerts.", c: colors.saffron },
      { h: "24+ mo", m: "Contractor SaaS ₹299-999/mo", d: "Crew + attendance + records.", c: "#d85a30" },
      { h: "Scale", m: "B2B2C: NGO/Govt", d: "₹200-500 per verified worker.", c: "#ba7517" },
    ],
  },
  risks: {
    title: "Risks & Mitigation",
    lead: "Every rural-tech failure is one of these 5 patterns.",
    risks: [
      { r: "Workers don't trust digital", m: "Show real outcomes from known villagers first." },
      { r: "Customers fear no-shows", m: "First 90 days field agent personally follows up every job." },
      { r: "Disintermediation", m: "Easier rebooking via platform. Pro badge requires platform history." },
      { r: "Slow monetization", m: "Budget 12 months zero revenue. NGO/CSR + MeitY grants." },
      { r: "Funded competitor copies", m: "Sarpanch relationships, Gaon Champions, community trust are the moat." },
    ],
  },
  scaling: {
    title: "Scaling Strategy",
    lead: "Scale like a crop season — depth before breadth. Nail Village 1, then replicate.",
    phases: [
      { h: "Village 1 (mo 1-6)", goal: "Prove the model", k: ["100 workers", "100 customers", "50+ bookings/mo"], cap: "₹3-5L" },
      { h: "5 villages (mo 6-12)", goal: "Test replication", k: ["500 workers", "300 customers", "₹20K/mo"], cap: "₹15-20L" },
      { h: "District (mo 12-24)", goal: "District brand", k: ["2K workers", "1K customers", "₹1.5L/mo"], cap: "₹60L-1Cr" },
      { h: "State (mo 24-36)", goal: "Dominant state player", k: ["10K workers", "5K customers", "₹15-25L/mo"], cap: "₹5-10Cr" },
    ],
    northstar: "Northstar metric: extra days of income enabled per worker per month.",
  },
};

export default function StrategyScreen() {
  const [active, setActive] = useState("market");
  const c = CONTENT[active];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Overline>Product blueprint</Overline>
          <Text style={styles.h1}>How we&apos;re going to win <Text style={{ color: colors.saffron }}>rural India.</Text></Text>
          <Text style={styles.lead}>A 9-section playbook — built for one village, designed to scale to 10,000.</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {SECTIONS.map((s) => (
            <Pressable
              key={s.id}
              testID={`section-${s.id}`}
              onPress={() => setActive(s.id)}
              style={[styles.tab, active === s.id && styles.tabActive]}
            >
              <Text style={[styles.tabN, active === s.id && { color: colors.saffron }]}>{s.n}</Text>
              <Text style={[styles.tabT, active === s.id && styles.tabTActive]}>{s.t}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.contentCard}>
          <Text style={styles.h2}>{c.title}</Text>
          <Text style={styles.contentLead}>{c.lead}</Text>

          {active === "market" && (
            <>
              {c.cards.map((it, i) => (
                <View key={i} style={styles.cardItem}>
                  <Text style={styles.cardItemH}>{it.h}</Text>
                  <Overline color={colors.indigo} style={{ marginTop: 10 }}>Strength</Overline>
                  <Text style={styles.cardItemP}>{it.g}</Text>
                  <Overline color={colors.saffron} style={{ marginTop: 10 }}>Where they fail rural</Overline>
                  <Text style={styles.cardItemP}>{it.b}</Text>
                </View>
              ))}
              <Overline style={{ marginTop: 20 }}>5 Gaps to exploit</Overline>
              {c.gaps.map((g, i) => (
                <View key={i} style={styles.gapItem}>
                  <View style={styles.gapNum}><Text style={styles.gapNumText}>{i + 1}</Text></View>
                  <Text style={styles.gapText}>{g}</Text>
                </View>
              ))}
            </>
          )}

          {active === "personas" && c.list.map((p, i) => (
            <View key={i} style={[styles.cardItem, { borderLeftWidth: 4, borderLeftColor: p.color }]}>
              <Text style={[styles.label, { color: p.color }]}>{p.label}</Text>
              <Text style={styles.cardItemH}>{p.h}</Text>
              <Text style={styles.cardItemP}>{p.d}</Text>
            </View>
          ))}

          {active === "product" && c.sections.map((s, i) => (
            <View key={i} style={styles.cardItem}>
              <Text style={styles.cardItemH}>{s.h}</Text>
              {s.items.map((it, j) => (
                <Text key={j} style={styles.bullet}>• {it}</Text>
              ))}
            </View>
          ))}

          {active === "mvp" && (
            <>
              <View style={[styles.cardItem, { backgroundColor: colors.indigoTint, borderColor: colors.indigo }]}>
                <Overline color={colors.indigo}>Build in V1</Overline>
                {c.build.map((b, i) => (
                  <Text key={i} style={[styles.bullet, { color: colors.text }]}>✓ {b}</Text>
                ))}
              </View>
              <View style={styles.cardItem}>
                <Overline color={colors.danger}>Skip in V1</Overline>
                {c.skip.map((b, i) => (
                  <Text key={i} style={styles.bullet}>✗ {b}</Text>
                ))}
              </View>
            </>
          )}

          {active === "tech" && c.stack.map(([layer, tech], i) => (
            <View key={i} style={[styles.cardItem, { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }]}>
              <Text style={styles.label}>{layer}</Text>
              <Text style={[styles.cardItemP, { color: colors.indigo, fontFamily: fonts.bodyBold }]}>{tech}</Text>
            </View>
          ))}

          {active === "gtm" && c.phases.map((p, i) => (
            <View key={i} style={styles.cardItem}>
              <Text style={styles.cardItemH}>{p.h}</Text>
              {p.items.map((it, j) => <Text key={j} style={styles.bullet}>• {it}</Text>)}
            </View>
          ))}

          {active === "monetization" && c.stages.map((s, i) => (
            <View key={i} style={[styles.cardItem, { borderLeftWidth: 4, borderLeftColor: s.c }]}>
              <Text style={styles.label}>Stage {i + 1} · {s.h}</Text>
              <Text style={[styles.cardItemH, { color: s.c, fontSize: 16 }]}>{s.m}</Text>
              <Text style={styles.cardItemP}>{s.d}</Text>
            </View>
          ))}

          {active === "risks" && c.risks.map((r, i) => (
            <View key={i} style={styles.cardItem}>
              <Overline color={colors.danger}>Risk</Overline>
              <Text style={[styles.cardItemH, { fontSize: 15 }]}>{r.r}</Text>
              <Overline color="#3B6D11" style={{ marginTop: 10 }}>Mitigation</Overline>
              <Text style={styles.cardItemP}>{r.m}</Text>
            </View>
          ))}

          {active === "scaling" && (
            <>
              {c.phases.map((p, i) => (
                <View key={i} style={styles.cardItem}>
                  <Text style={styles.cardItemH}>{p.h}</Text>
                  <Text style={[styles.label, { color: colors.indigo }]}>{p.goal}</Text>
                  {p.k.map((it, j) => <Text key={j} style={styles.bullet}>• {it}</Text>)}
                  <Text style={[styles.label, { marginTop: 10 }]}>Capital: {p.cap}</Text>
                </View>
              ))}
              <View style={[styles.cardItem, { backgroundColor: colors.indigo }]}>
                <Overline color="#FFB89A">Northstar</Overline>
                <Text style={[styles.cardItemH, { color: "#fff", fontSize: 18, marginTop: 6 }]}>{c.northstar}</Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { padding: spacing.xl, paddingBottom: 8 },
  h1: { fontFamily: fonts.display, fontSize: 30, color: colors.text, marginTop: 8, lineHeight: 34 },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  tabsRow: { paddingHorizontal: spacing.xl, paddingVertical: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff", borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 6 },
  tabActive: { borderColor: colors.saffron, borderWidth: 2 },
  tabN: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  tabT: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  tabTActive: { color: colors.text },
  contentCard: { backgroundColor: "#fff", margin: spacing.xl, marginTop: 0, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  h2: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  contentLead: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  cardItem: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 14, marginTop: 12 },
  cardItemH: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  cardItemP: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
  label: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textMuted },
  bullet: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  gapItem: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.saffronTint, borderColor: "#FFD4C2", borderWidth: 1, borderRadius: radius.md, padding: 12, marginTop: 8 },
  gapNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  gapNumText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 12 },
  gapText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, flex: 1 },
});
