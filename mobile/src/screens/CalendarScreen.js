import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import AppScreen from "../components/AppScreen";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const DAY_LABELS    = { en: ["Su","Mo","Tu","We","Th","Fr","Sa"], hi: ["र","सो","मं","बु","गु","शु","श"] };
const MONTH_NAMES   = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  hi: ["जनवरी","फरवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"],
};

function toDateStr(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayStr() {
  const n = new Date();
  return toDateStr(n.getFullYear(), n.getMonth(), n.getDate());
}

export default function CalendarScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isWorker = user?.has_service_profile === true;
  const months = MONTH_NAMES[lang] || MONTH_NAMES.en;
  const days   = DAY_LABELS[lang]  || DAY_LABELS.en;
  const now = new Date();

  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth()); // 0-indexed
  const [selected, setSelected] = useState(todayStr());
  const [engagements, setEngagements] = useState([]);
  const [jobs, setJobs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [engR, jobR] = await Promise.all([
        api.get("/work-requests/mine").catch(() => ({ data: [] })),
        !isWorker
          ? api.get("/jobs/mine").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setEngagements(Array.isArray(engR.data) ? engR.data : []);
      setJobs(Array.isArray(jobR.data) ? jobR.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isWorker]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  // Build date maps
  const engDateMap = {}; // "YYYY-MM-DD" → [{...eng}]
  engagements.forEach(e => {
    const d = e.job_date;
    if (!d) return;
    if (!engDateMap[d]) engDateMap[d] = [];
    engDateMap[d].push(e);
  });

  const jobDateMap = {}; // for customer: job dates
  jobs.forEach(j => {
    const d = j.job_date;
    if (!d) return;
    if (!jobDateMap[d]) jobDateMap[d] = [];
    jobDateMap[d].push(j);
  });

  const allDateMap = isWorker ? engDateMap : jobDateMap;

  // Calendar math
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  // Stats for this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEngs = engagements.filter(e => (e.job_date || "").startsWith(monthPrefix));
  const monthJobs = jobs.filter(j => (j.job_date || "").startsWith(monthPrefix));

  const completedThisMonth = monthEngs.filter(e => (e.engagement_status || e.status) === "completed");
  const earnedThisMonth = completedThisMonth.reduce((s, e) => s + (e.daily_rate || 0), 0);

  // Items for selected day
  const selectedItems = selected
    ? [...(engDateMap[selected] || []), ...(isWorker ? [] : (jobDateMap[selected] || []))]
    : [];

  const today = todayStr();

  const STATUS_DOT = {
    requested: "#f59e0b",
    accepted:  "#16a34a",
    completed: "#0F766E",
    rejected:  "#ef4444",
    cancelled: "#9ca3af",
    open:      "#0F766E",
    booked:    "#16a34a",
  };

  if (loading) return (
    <AppScreen style={s.safe}>
      <View style={s.center}><ActivityIndicator color={colors.primary} size="large" /></View>
    </AppScreen>
  );

  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero stats ──────────────────────────────────────────────── */}
        <LinearGradient
          colors={isWorker ? ["#0F766E", "#0D9488"] : ["#0F766E", "#0D5F59"]}
          start={{ x:0, y:0 }} end={{ x:1, y:1 }}
          style={s.hero}
        >
          <View style={s.heroCircle} />
          <Text style={s.heroTitle}>
            {isWorker ? (lang === "hi" ? "मेरा काम कैलेंडर" : "My Work Calendar") : (lang === "hi" ? "Job Schedule" : "Job Schedule")}
          </Text>
          <Text style={s.heroSub}>{months[month]} {year}</Text>
          <View style={s.heroStats}>
            {isWorker ? (
              <>
                <HeroStat icon="briefcase-outline" val={completedThisMonth.length} label={lang === "hi" ? "काम हुए" : "Jobs done"} />
                <View style={s.heroDivider} />
                <HeroStat icon="cash-outline" val={earnedThisMonth > 0 ? `₹${earnedThisMonth}` : "—"} label={lang === "hi" ? "कमाई" : "Earned"} />
                <View style={s.heroDivider} />
                <HeroStat icon="time-outline" val={monthEngs.filter(e => (e.engagement_status||e.status)==="accepted").length} label={lang === "hi" ? "आने वाले" : "Upcoming"} />
              </>
            ) : (
              <>
                <HeroStat icon="hammer-outline" val={monthJobs.length} label={lang === "hi" ? "Jobs पोस्ट" : "Jobs posted"} />
                <View style={s.heroDivider} />
                <HeroStat icon="people-outline" val={monthEngs.filter(e => (e.engagement_status||e.status)==="accepted").length} label={lang === "hi" ? "Hired" : "Hired"} />
                <View style={s.heroDivider} />
                <HeroStat icon="checkmark-circle-outline" val={completedThisMonth.length} label={lang === "hi" ? "पूरे हुए" : "Completed"} />
              </>
            )}
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {/* ── Calendar card ─────────────────────────────────────────── */}
          <View style={s.calCard}>
            {/* Month nav */}
            <View style={s.calNav}>
              <Pressable onPress={prevMonth} style={s.navBtn}>
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </Pressable>
              <Text style={s.calMonth}>{months[month]} {year}</Text>
              <Pressable onPress={nextMonth} style={s.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={s.dayHeaders}>
              {days.map((d, i) => (
                <Text key={i} style={s.dayHeader}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            <View style={s.grid}>
              {cells.map((day, i) => {
                if (!day) return <View key={`e-${i}`} style={s.gridCell} />;
                const key = toDateStr(year, month, day);
                const hasItems = !!allDateMap[key]?.length;
                const isToday = key === today;
                const isSel = key === selected;
                const dots = allDateMap[key] || [];

                return (
                  <Pressable
                    key={key}
                    style={[
                      s.gridCell,
                      s.gridBtn,
                      isToday && !isSel && s.gridToday,
                      isSel && s.gridSelected,
                    ]}
                    onPress={() => setSelected(isSel ? null : key)}
                  >
                    <Text style={[
                      s.gridDayText,
                      isToday && !isSel && s.gridTodayText,
                      isSel && s.gridSelectedText,
                    ]}>{day}</Text>
                    {hasItems && !isSel && (
                      <View style={s.dotsRow}>
                        {dots.slice(0, 3).map((item, di) => {
                          const status = item.engagement_status || item.status || "open";
                          return <View key={di} style={[s.dot, { backgroundColor: STATUS_DOT[status] || colors.primary }]} />;
                        })}
                      </View>
                    )}
                    {isSel && hasItems && (
                      <View style={[s.dot, { backgroundColor: colors.surfaceCard }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Legend */}
            <View style={s.legend}>
              {[
                { color: "#16a34a", en: "Accepted", hi: "मिला" },
                { color: "#f59e0b", en: "Pending",  hi: "बाकी" },
                { color: "#0F766E", en: "Completed", hi: "पूरा" },
                { color: "#9ca3af", en: "Cancelled", hi: "रद्द" },
              ].map(l => (
                <View key={l.en} style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: l.color }]} />
                  <Text style={s.legendText}>{lang === "hi" ? l.hi : l.en}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Selected day detail ───────────────────────────────────── */}
          {selected && (
            <View>
              <Text style={s.selectedDate}>
                {new Date(selected + "T00:00:00").toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday:"long", day:"numeric", month:"long" })}
              </Text>

              {selectedItems.length === 0 ? (
                <View style={s.emptyDay}>
                  <Text style={s.emptyDayText}>
                    {lang === "hi" ? "इस दिन कोई काम नहीं" : `No ${isWorker ? "jobs" : "activity"} on this day`}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {selectedItems.map((item, i) => {
                    const isJob = !!item.title; // jobs have title, engagements have job_title
                    const title = item.title || item.job_title || "Job";
                    const status = item.engagement_status || item.status || "open";
                    const dotColor = STATUS_DOT[status] || colors.primary;
                    return (
                      <View key={i} style={[s.itemCard, { borderLeftColor: dotColor }]}>
                        <View style={s.itemHeader}>
                          <Text style={s.itemTitle}>{title}</Text>
                          <View style={[s.statusBadge, { backgroundColor: dotColor + "20" }]}>
                            <Text style={[s.statusText, { color: dotColor }]}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                          </View>
                        </View>
                        <Text style={s.itemMeta}>
                          ₹{item.daily_rate}/day
                          {isWorker && item.customer_name ? ` · Customer: ${item.customer_name}` : ""}
                          {!isWorker && item.worker_name ? ` · Worker: ${item.worker_name}` : ""}
                          {!isWorker && isJob && item.workers_needed ? ` · ${item.workers_needed} needed` : ""}
                        </Text>
                        {status === "accepted" && (
                          <View style={s.contactRow}>
                            <Ionicons name="call-outline" size={12} color={colors.statusSuccess} />
                            <Text style={s.contactText}>
                              {isWorker ? (item.customer_phone || "Contact shared") : (item.worker_phone || "Contact shared")}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function HeroStat({ icon, val, label }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Ionicons name={icon} size={16} color="rgba(255,255,255,0.7)" />
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.onPrimary, marginTop: 4 }}>{val}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 1 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero gradient
  hero: { padding: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl, position: "relative", overflow: "hidden" },
  heroCircle: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -50 },
  heroTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onPrimary, marginBottom: 2 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 20 },
  heroStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.xxl, paddingVertical: 14, paddingHorizontal: 10 },
  heroDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },

  // Calendar card
  calCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 18,
    marginBottom: 20,
    ...shadow.sm,
  },
  calNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  navBtn: { padding: 8, borderRadius: 10, backgroundColor: colors.primaryFixed, minWidth: 36, minHeight: 36, alignItems: "center", justifyContent: "center" },
  calMonth: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: "center", fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5, color: colors.outline },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  gridCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  gridBtn: { borderRadius: 10 },
  gridToday: { borderWidth: 2, borderColor: colors.primary },
  gridSelected: { backgroundColor: colors.primary },
  gridDayText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textHeading },
  gridTodayText: { color: colors.primary, fontFamily: fonts.bodyBold },
  gridSelectedText: { color: colors.onPrimary, fontFamily: fonts.bodyBold },
  dotsRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Legend
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.body, fontSize: 10, color: colors.outline },

  // Selected day
  selectedDate: { fontFamily: fonts.display, fontSize: 18, color: colors.textHeading, marginBottom: 12 },
  emptyDay: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 20,
    alignItems: "center",
    ...shadow.sm,
  },
  emptyDayText: { fontFamily: fonts.body, color: colors.outline, fontSize: 13 },

  // Item cards
  itemCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderLeftWidth: 4,
    padding: 14,
    ...shadow.sm,
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  itemTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textHeading, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },
  itemMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, backgroundColor: colors.successLight, padding: 8, borderRadius: 8 },
  contactText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.statusSuccess },
});
