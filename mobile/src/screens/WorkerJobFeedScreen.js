import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, RefreshControl, ActivityIndicator, TextInput, ScrollView, Linking,
  KeyboardAvoidingView, Platform, Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, spacing } from "../theme";

const CATEGORIES = [
  { v: "",             l: { en: "All",          hi: "सभी"     }, icon: "💼" },
  { v: "construction", l: { en: "Construction", hi: "निर्माण" }, icon: "🏗️" },
  { v: "farm",         l: { en: "Farm",         hi: "खेती"    }, icon: "🌾" },
  { v: "electrical",   l: { en: "Electrical",   hi: "बिजली"  }, icon: "⚡" },
  { v: "cleaning",     l: { en: "Cleaning",     hi: "सफाई"   }, icon: "✨" },
  { v: "transport",    l: { en: "Transport",    hi: "ट्रांसपोर्ट" }, icon: "🚛" },
  { v: "home",         l: { en: "Home",         hi: "घर"     }, icon: "🏠" },
  { v: "other",        l: { en: "Other",        hi: "अन्य"   }, icon: "📦" },
];

const SKILLS = ["mason","farm work","painting","plumbing","electrical","helper","cleaning","carpentry","welding","cooking","driver","harvesting"];

const URGENCY_BADGE = {
  urgent:   { label: "🔥 Urgent",   bg: "#fff1f2", border: "#fecaca", text: "#dc2626" },
  flexible: { label: "📅 Flexible", bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
  immediate:{ label: "⚡ Now",      bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
};

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

export default function WorkerJobFeedScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [jobs, setJobs]               = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Pending (what user is editing)
  const [category, setCategory] = useState("");
  const [skill, setSkill]       = useState("");
  const [pincode, setPincode]   = useState("");
  const [workerPincode, setWorkerPincode] = useState("");

  // Applied (what's actually sent to the API — only changes on explicit search)
  const [applied, setApplied] = useState({ category: "", skill: "", pincode: "" });

  // Auto-detect worker's pincode on mount
  useEffect(() => {
    if (user?.role !== "worker") return;
    api.get("/workers/me/profile")
      .then(res => {
        const pc = res.data?.address?.pincode || res.data?.pincode || "";
        if (pc) {
          setWorkerPincode(pc);
          setPincode(pc);
          setApplied({ category: "", skill: "", pincode: pc });
        }
      })
      .catch(() => {});
  }, [user]);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (applied.category) params.category = applied.category;
      if (applied.skill)    params.skills = applied.skill;
      if (applied.pincode?.length === 6) params.pincode = applied.pincode;

      const [feed, mine] = await Promise.all([
        api.get("/jobs/feed", { params }).catch(() => ({ data: [] })),
        api.get("/engagements/mine").catch(() => ({ data: [] })),
      ]);
      setJobs(Array.isArray(feed.data) ? feed.data : []);
      setEngagements(Array.isArray(mine.data) ? mine.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applied]);

  useEffect(() => { load(); }, [load]);

  // Explicit apply — worker must press search/apply
  const applySearch = () => {
    Keyboard.dismiss();
    setApplied({ category, skill, pincode });
    setFiltersOpen(false);
  };

  const engagementFor = (jobId) =>
    engagements.find(e => e.job_id === jobId && ["requested","accepted"].includes(e.status));

  const expressInterest = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert(
        lang === "hi" ? "Interest भेजा! ✅" : "Interest sent! ✅",
        lang === "hi" ? "Customer आपको देखेगा।" : "The customer will review your profile."
      );
      load();
    } catch (err) { Alert.alert("Error", formatApiError(err)); }
  };

  const withdraw = async (engagementId) => {
    Alert.alert(
      lang === "hi" ? "Interest वापस लें?" : "Withdraw interest?",
      lang === "hi" ? "आप इस job के लिए apply नहीं रहेंगे।" : "You will no longer be applying for this job.",
      [
        { text: lang === "hi" ? "रद्द करो" : "Cancel", style: "cancel" },
        { text: lang === "hi" ? "वापस लो" : "Withdraw", style: "destructive", onPress: async () => {
          try { await api.post(`/engagements/${engagementId}/cancel`); load(); }
          catch (err) { Alert.alert("Failed", formatApiError(err)); }
        }},
      ]
    );
  };

  const activeFilterCount = [!!applied.category, !!applied.skill, applied.pincode?.length === 6 && applied.pincode !== workerPincode].filter(Boolean).length;
  const clearAll = () => {
    setCategory("");
    setSkill("");
    setPincode(workerPincode);
    setApplied({ category: "", skill: "", pincode: workerPincode });
    setFiltersOpen(false);
  };

  if (user?.role !== "worker") {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Ionicons name="briefcase-outline" size={40} color={colors.textMuted} />
          <Text style={s.centerText}>{lang === "hi" ? "यह view सिर्फ workers के लिए है।" : "This view is for workers only."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        {/* Title row */}
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.screenLabel}>JOB FEED</Text>
            <Text style={s.title}>{lang === "hi" ? "पास के काम" : "Jobs near you"}</Text>
          </View>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearAll} style={s.resetPill}>
              <Ionicons name="refresh-outline" size={12} color={colors.saffron} />
              <Text style={s.resetPillTxt}>Reset</Text>
            </Pressable>
          )}
        </View>

        {/* Search bar: pincode + send button */}
        <View style={s.searchRow}>
          <Ionicons name="location-outline" size={16} color={colors.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={s.searchInput}
            placeholder={lang === "hi" ? "Pincode डालो (6 digits)" : "Enter pincode (6 digits)"}
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
            onSubmitEditing={applySearch}
            returnKeyType="search"
          />
          {workerPincode && pincode !== workerPincode && (
            <Pressable onPress={() => setPincode(workerPincode)} style={s.myLocBtn}>
              <Ionicons name="navigate" size={13} color={colors.saffron} />
            </Pressable>
          )}
          <Pressable
            style={[s.sendBtn, pincode.length === 6 && s.sendBtnActive]}
            onPress={applySearch}
          >
            <Ionicons name="arrow-forward" size={18} color={pincode.length === 6 ? "#fff" : colors.textMuted} />
          </Pressable>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={s.chipRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.v} onPress={() => setCategory(c.v)} style={[s.chip, category === c.v && s.chipOn]}>
                <Text style={s.chipEmoji}>{c.icon}</Text>
                <Text style={[s.chipTxt, category === c.v && s.chipTxtOn]}>{c.l[lang] || c.l.en}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Skill filter row + Apply button */}
        <View style={s.filterRow}>
          <Pressable
            style={[s.filterToggle, filtersOpen && s.filterToggleOn]}
            onPress={() => setFiltersOpen(o => !o)}
          >
            <Ionicons name="construct-outline" size={13} color={filtersOpen ? "#fff" : colors.textSecondary} />
            <Text style={[s.filterToggleTxt, filtersOpen && { color: "#fff" }]}>
              {skill ? skill : (lang === "hi" ? "Skill filter" : "Skill filter")}
            </Text>
            {skill && <Ionicons name="checkmark-circle" size={13} color={filtersOpen ? "#fff" : colors.saffron} />}
          </Pressable>
          <Pressable style={s.applyBtn} onPress={applySearch}>
            <Ionicons name="search-outline" size={14} color="#fff" />
            <Text style={s.applyBtnTxt}>{lang === "hi" ? "खोजो" : "Search"}</Text>
          </Pressable>
        </View>

        {/* Skill chips (collapsible) */}
        {filtersOpen && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 4 }}>
            <View style={s.chipRow}>
              <Pressable onPress={() => setSkill("")} style={[s.chip, !skill && s.chipOn]}>
                <Text style={[s.chipTxt, !skill && s.chipTxtOn]}>{lang === "hi" ? "सभी" : "All"}</Text>
              </Pressable>
              {SKILLS.map(sk => (
                <Pressable key={sk} onPress={() => setSkill(sk)} style={[s.chip, skill === sk && s.chipOn]}>
                  <Text style={[s.chipTxt, skill === sk && s.chipTxtOn]}>{sk}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={s.countRow}>
          <Text style={s.countTxt}>
            {loading
              ? (lang === "hi" ? "लोड हो रहा है…" : "Loading…")
              : `${jobs.length} ${lang === "hi" ? "काम मिले" : jobs.length === 1 ? "job found" : "jobs found"}`}
            {applied.pincode && applied.pincode !== workerPincode ? ` · ${applied.pincode}` : ""}
          </Text>
          {loading && <ActivityIndicator size="small" color={colors.saffron} />}
        </View>
      </View>

      {/* ── Job List ── */}
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.saffron}
          />
        }
        renderItem={({ item }) => {
          const eng = engagementFor(item.id);
          const catInfo = CATEGORIES.find(c => c.v === item.category) || CATEGORIES[0];
          return (
            <JobCard
              item={item}
              eng={eng}
              catInfo={catInfo}
              lang={lang}
              onInterest={() => expressInterest(item.id)}
              onWithdraw={() => withdraw(eng?.id)}
            />
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💼</Text>
              <Text style={s.emptyTitle}>{lang === "hi" ? "कोई काम नहीं मिला" : "No jobs found"}</Text>
              <Text style={s.emptySub}>
                {pincode && pincode !== workerPincode
                  ? (lang === "hi" ? "इस pincode में कोई काम नहीं।" : "No jobs in this pincode.")
                  : (lang === "hi" ? "नीचे खींचकर refresh करो।" : "Pull down to refresh.")}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={clearAll} style={[s.clearBtn, { marginTop: 12 }]}>
                  <Ionicons name="refresh-outline" size={13} color={colors.saffron} />
                  <Text style={s.clearTxt}>{lang === "hi" ? "Reset करो" : "Reset filters"}</Text>
                </Pressable>
              )}
            </View>
          )
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/* ── Job Card ── */
function JobCard({ item, eng, catInfo, lang, onInterest, onWithdraw }) {
  const urgency = URGENCY_BADGE[item.urgency];
  const posted = daysAgo(item.created_at);

  const callCustomer = () => {
    if (eng?.customer_phone) Linking.openURL(`tel:${eng.customer_phone}`);
  };

  return (
    <View style={[s.card, eng?.status === "accepted" && s.cardAccepted]}>
      {/* Top row: category icon + title + urgency */}
      <View style={s.cardTop}>
        <View style={s.catBadge}>
          <Text style={s.catEmoji}>{catInfo.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.cardMeta}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={s.cardMetaTxt} numberOfLines={1}>
              {item.village || item.address?.village || "—"}
              {item.address?.pincode ? ` · ${item.address.pincode}` : ""}
            </Text>
          </View>
        </View>
        {urgency && (
          <View style={[s.urgencyBadge, { backgroundColor: urgency.bg, borderColor: urgency.border }]}>
            <Text style={[s.urgencyTxt, { color: urgency.text }]}>{urgency.label}</Text>
          </View>
        )}
      </View>

      {/* Pills row */}
      <View style={s.pillRow}>
        <View style={s.ratePill}>
          <Text style={s.rateTxt}>₹{item.daily_rate}</Text>
          <Text style={s.rateUnit}>/day</Text>
        </View>
        <View style={s.infoPill}>
          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
          <Text style={s.infoPillTxt}>{item.workers_needed} {lang === "hi" ? "चाहिए" : "needed"}</Text>
        </View>
        {item.job_date && (
          <View style={s.infoPill}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={s.infoPillTxt}>{item.job_date}</Text>
          </View>
        )}
        {posted && (
          <View style={s.infoPill}>
            <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
            <Text style={s.infoPillTxt}>{posted}</Text>
          </View>
        )}
      </View>

      {/* Customer name */}
      {item.customer_name && (
        <Text style={s.customerName}>
          <Ionicons name="person-outline" size={11} color={colors.textMuted} /> {item.customer_name}
        </Text>
      )}

      {/* Description */}
      {!!item.description && (
        <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
      )}

      {/* Matched skills */}
      {item.matched_skills?.length > 0 && (
        <View style={s.matchedRow}>
          {item.matched_skills.map(sk => (
            <View key={sk} style={s.matchedChip}>
              <Ionicons name="checkmark" size={9} color="#16a34a" />
              <Text style={s.matchedChipTxt}>{sk}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      {eng ? (
        eng.status === "accepted" ? (
          <View style={s.acceptedBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.acceptedTitle}>
                {lang === "hi" ? "🎉 आप hire हो गए!" : "🎉 You're hired!"}
              </Text>
              <Text style={s.acceptedSub}>
                {lang === "hi" ? "Customer से contact करो।" : "Reach out to the customer to confirm details."}
              </Text>
            </View>
            {eng.customer_phone && (
              <Pressable style={s.callBtn} onPress={callCustomer}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={s.callBtnTxt}>{lang === "hi" ? "Call" : "Call"}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.pendingBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.pendingTitle}>
                {lang === "hi" ? "⏳ Review हो रहा है" : "⏳ Pending review"}
              </Text>
              <Text style={s.pendingSub}>
                {lang === "hi" ? "Customer आपका profile देख रहा है।" : "Customer is reviewing your profile."}
              </Text>
            </View>
            <Pressable style={s.withdrawBtn} onPress={onWithdraw}>
              <Text style={s.withdrawTxt}>{lang === "hi" ? "वापस लो" : "Withdraw"}</Text>
            </Pressable>
          </View>
        )
      ) : (
        <Pressable style={s.btnPrimary} onPress={onInterest}>
          <Ionicons name="hand-right-outline" size={15} color="#fff" />
          <Text style={s.btnPrimaryTxt}>{lang === "hi" ? "मुझे interest है" : "I'm interested"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  centerText: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },

  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.saffron },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  pincodePill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: colors.saffronTint, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1, borderColor: colors.saffron + "40",
  },
  pincodePillTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron },
  searchRow: {
    flexDirection: "row", alignItems: "center", marginTop: 12,
    backgroundColor: "#f9f8f5", borderRadius: 14, borderWidth: 1.5, borderColor: colors.border,
    overflow: "hidden",
  },
  searchInput: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 10,
    fontFamily: fonts.body, fontSize: 14, color: colors.text,
  },
  myLocBtn: { padding: 10 },
  sendBtn: {
    width: 46, height: 46, alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0ede6",
  },
  sendBtnActive: { backgroundColor: colors.saffron },
  resetPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.saffron + "60", backgroundColor: colors.saffronTint,
  },
  resetPillTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  filterToggle: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#f9f8f5",
  },
  filterToggleOn: { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary },
  filterToggleTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, flex: 1 },
  applyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.saffron,
  },
  applyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  chipRow: { flexDirection: "row", gap: 7, paddingBottom: 4 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff",
  },
  chipOn: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  chipEmoji: { fontSize: 12 },
  chipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary },
  chipTxtOn: { color: "#fff" },


  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  countTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },

  // Card
  card: {
    backgroundColor: "#fff", borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  cardAccepted: { borderColor: "#86efac", borderWidth: 1.5 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  catBadge: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: colors.saffronTint,
    alignItems: "center", justifyContent: "center",
  },
  catEmoji: { fontSize: 22 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardMetaTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flex: 1 },
  urgencyBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  urgencyTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },

  pillRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 8 },
  ratePill: {
    flexDirection: "row", alignItems: "baseline", gap: 1,
    backgroundColor: "#FFFBEB", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A",
  },
  rateTxt: { fontFamily: fonts.display, fontSize: 16, color: colors.money },
  rateUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f9f8f5", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  infoPillTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textSecondary },

  customerName: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },

  matchedRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  matchedChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f0fdf4", paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: "#86efac",
  },
  matchedChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#16a34a" },

  // CTAs
  btnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.saffron, paddingVertical: 13, borderRadius: 12,
  },
  btnPrimaryTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

  acceptedBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f0fdf4", padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#86efac",
  },
  acceptedTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#15803d" },
  acceptedSub: { fontFamily: fonts.body, fontSize: 12, color: "#166534", marginTop: 2 },
  callBtn: {
    backgroundColor: "#16a34a", paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6,
  },
  callBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  pendingBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fffbeb", padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#fde68a",
  },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#92400e" },
  pendingSub: { fontFamily: fonts.body, fontSize: 12, color: "#78350f", marginTop: 2 },
  withdrawBtn: {
    borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12,
    paddingVertical: 8, borderRadius: 10,
  },
  withdrawTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },

  empty: { padding: 40, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
