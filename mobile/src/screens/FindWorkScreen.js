import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, RefreshControl, ActivityIndicator,
  TextInput, ScrollView, Linking,
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

const URGENCY_BADGE = {
  urgent:   { label: "🔥 Urgent",   bg: "#fff1f2", border: "#fecaca", text: "#dc2626" },
  immediate:{ label: "⚡ Now",      bg: "#fffbeb", border: "#fde68a", text: "#b45309" },
  flexible: { label: "📅 Flexible", bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a" },
};

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

export default function FindWorkScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [jobs, setJobs]               = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  // Input state (what user is typing — not yet applied)
  const [searchInput, setSearchInput]   = useState("");
  const [pincodeInput, setPincodeInput] = useState("");
  const [category, setCategory]         = useState("");
  const [showFilters, setShowFilters]   = useState(false);

  // Applied state (what was last searched)
  const [appliedSearch, setAppliedSearch]   = useState("");
  const [appliedPincode, setAppliedPincode] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");

  const doSearch = useCallback(async (overrides = {}) => {
    const cat  = overrides.category  !== undefined ? overrides.category  : category;
    const pin  = overrides.pincode   !== undefined ? overrides.pincode   : pincodeInput;
    const text = overrides.search    !== undefined ? overrides.search    : searchInput;

    setAppliedCategory(cat);
    setAppliedPincode(pin);
    setAppliedSearch(text);
    setLoading(true);

    try {
      const params = { status: "open" };
      if (cat) params.category = cat;
      if (pin.length === 6) params.pincode = pin;
      if (text.trim()) params.search = text.trim();

      const [pub, mine] = await Promise.all([
        api.get("/jobs/public", { params }).catch(() => api.get("/jobs/feed", { params }).catch(() => ({ data: [] }))),
        user?.role === "worker"
          ? api.get("/engagements/mine").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setJobs(Array.isArray(pub.data) ? pub.data : []);
      setEngagements(Array.isArray(mine.data) ? mine.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, category, pincodeInput, searchInput]);

  // Initial load
  useEffect(() => { doSearch(); }, []); // eslint-disable-line

  const load = () => doSearch();

  const resetAll = () => {
    setSearchInput(""); setPincodeInput(""); setCategory("");
    doSearch({ category: "", pincode: "", search: "" });
  };

  const engagementFor = (jobId) =>
    engagements.find(e => e.job_id === jobId && ["requested","accepted"].includes(e.status));

  const hasActiveFilters = appliedSearch || appliedPincode || appliedCategory;

  const onApply = async (jobId) => {
    if (!user) {
      Alert.alert(
        lang === "hi" ? "Login जरूरी है" : "Login required",
        lang === "hi" ? "Apply करने के लिए login करो।" : "Sign in as a worker to apply.",
        [
          { text: lang === "hi" ? "रद्द" : "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ]
      );
      return;
    }
    if (user.role !== "worker") {
      Alert.alert(lang === "hi" ? "सिर्फ workers के लिए" : "Workers only", lang === "hi" ? "Worker account से apply करो।" : "Only worker accounts can apply.");
      return;
    }
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert(
        lang === "hi" ? "Interest भेजा! ✅" : "Interest sent! ✅",
        lang === "hi" ? "Customer आपको देखेगा।" : "The customer will review your profile."
      );
      load();
    } catch (err) { Alert.alert("Error", formatApiError(err)); }
  };

  const withdraw = async (engId) => {
    Alert.alert(
      lang === "hi" ? "Withdraw करें?" : "Withdraw?",
      "",
      [
        { text: lang === "hi" ? "नहीं" : "No", style: "cancel" },
        { text: lang === "hi" ? "हाँ" : "Yes", style: "destructive", onPress: async () => {
          try { await api.post(`/engagements/${engId}/cancel`); load(); }
          catch (err) { Alert.alert("Failed", formatApiError(err)); }
        }},
      ]
    );
  };

  const activeFilters = [!!appliedCategory, appliedPincode.length === 6].filter(Boolean).length;

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.overline}>{lang === "hi" ? "FIND WORK" : "FIND WORK"}</Text>
            <Text style={s.title}>{lang === "hi" ? "काम खोजो" : "Find Jobs"}</Text>
          </View>
          <Pressable
            style={[s.filterBtn, activeFilters > 0 && s.filterBtnActive]}
            onPress={() => setShowFilters(v => !v)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilters > 0 ? "#fff" : colors.saffron} />
            {activeFilters > 0 && <View style={s.filterDot} />}
          </Pressable>
        </View>

        {/* Search bar + button */}
        <View style={s.searchRow}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder={lang === "hi" ? "title, जगह, काम खोजो…" : "Search title, location, skill…"}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => doSearch()}
          />
          {searchInput.length > 0 && (
            <Pressable onPress={() => setSearchInput("")} hitSlop={8} style={{ marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
          <Pressable style={s.searchBtn} onPress={() => doSearch()}>
            <Text style={s.searchBtnTxt}>{lang === "hi" ? "खोजो" : "Search"}</Text>
          </Pressable>
        </View>

        {/* Category chips — instant */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={s.chipRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.v} onPress={() => { setCategory(c.v); doSearch({ category: c.v }); }}
                style={[s.chip, category === c.v && s.chipOn]}>
                <Text style={s.chipEmoji}>{c.icon}</Text>
                <Text style={[s.chipTxt, category === c.v && s.chipTxtOn]}>{c.l[lang] || c.l.en}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Pincode filter panel */}
        {showFilters && (
          <View style={s.filterPanel}>
            <Text style={s.filterLabel}>{lang === "hi" ? "Pincode से खोजो" : "Filter by Pincode"}</Text>
            <View style={s.pincodeRow}>
              <TextInput
                style={[s.pincodeInput, { flex: 1 }]}
                value={pincodeInput}
                onChangeText={v => setPincodeInput(v.replace(/\D/g,"").slice(0,6))}
                placeholder={lang === "hi" ? "6-अंक pincode" : "6-digit pincode"}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                onSubmitEditing={() => doSearch()}
              />
              <Pressable style={s.applyBtn} onPress={() => doSearch()}>
                <Text style={s.applyBtnTxt}>{lang === "hi" ? "Apply" : "Apply"}</Text>
              </Pressable>
            </View>
            {hasActiveFilters && (
              <Pressable onPress={resetAll} style={s.clearBtn}>
                <Ionicons name="refresh-outline" size={13} color={colors.saffron} />
                <Text style={s.clearTxt}>{lang === "hi" ? "सब Reset करो" : "Reset all"}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 6, paddingBottom: 2 }}>
              {appliedSearch ? (
                <View style={s.activeChip}>
                  <Ionicons name="search" size={10} color={colors.saffron} />
                  <Text style={s.activeChipTxt} numberOfLines={1}>"{appliedSearch}"</Text>
                  <Pressable onPress={() => { setSearchInput(""); doSearch({ search: "" }); }} hitSlop={6}>
                    <Ionicons name="close" size={12} color={colors.saffron} />
                  </Pressable>
                </View>
              ) : null}
              {appliedPincode ? (
                <View style={s.activeChip}>
                  <Ionicons name="location" size={10} color={colors.saffron} />
                  <Text style={s.activeChipTxt}>{appliedPincode}</Text>
                  <Pressable onPress={() => { setPincodeInput(""); doSearch({ pincode: "" }); }} hitSlop={6}>
                    <Ionicons name="close" size={12} color={colors.saffron} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          </ScrollView>
        )}

        <Text style={s.countTxt}>
          {loading ? "" : `${jobs.length} ${lang === "hi" ? "काम मिले" : jobs.length === 1 ? "job found" : "jobs found"}`}
        </Text>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.saffron} size="large" />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={j => j.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.saffron} />
          }
          renderItem={({ item }) => {
            const eng = engagementFor(item.id);
            const cat = CATEGORIES.find(c => c.v === item.category) || CATEGORIES[0];
            return (
              <JobCard
                item={item} eng={eng} cat={cat} lang={lang}
                isWorker={user?.role === "worker"}
                onApply={() => onApply(item.id)}
                onWithdraw={() => withdraw(eng?.id)}
              />
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>
                {search ? (lang === "hi" ? "कोई match नहीं" : "No matches") : (lang === "hi" ? "कोई काम नहीं मिला" : "No jobs found")}
              </Text>
              <Text style={s.emptySub}>
                {search
                  ? (lang === "hi" ? "दूसरे words से खोजो।" : "Try different keywords.")
                  : (lang === "hi" ? "नीचे खींचकर refresh करो।" : "Pull down to refresh.")}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ── Job Card ── */
function JobCard({ item, eng, cat, lang, isWorker, onApply, onWithdraw }) {
  const urgency = URGENCY_BADGE[item.urgency];
  const posted = daysAgo(item.created_at);

  const callCustomer = () => {
    if (eng?.customer_phone) Linking.openURL(`tel:${eng.customer_phone}`);
  };

  return (
    <View style={[s.card, eng?.status === "accepted" && s.cardAccepted]}>
      {/* Top */}
      <View style={s.cardTop}>
        <View style={s.catBadge}>
          <Text style={s.catEmoji}>{cat.icon}</Text>
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

      {/* Pills */}
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

      {/* Description */}
      {!!item.description && (
        <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
      )}

      {/* Skills required */}
      {item.required_skills?.length > 0 && (
        <View style={s.skillsRow}>
          {item.required_skills.slice(0,3).map(sk => (
            <View key={sk} style={s.skillChip}>
              <Text style={s.skillChipTxt}>{sk}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      {eng ? (
        eng.status === "accepted" ? (
          <View style={s.acceptedBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.acceptedTitle}>{lang === "hi" ? "🎉 आप hire हो गए!" : "🎉 You're hired!"}</Text>
              <Text style={s.acceptedSub}>{lang === "hi" ? "Customer से contact करो।" : "Contact the customer to confirm."}</Text>
            </View>
            {eng.customer_phone && (
              <Pressable style={s.callBtn} onPress={callCustomer}>
                <Ionicons name="call" size={15} color="#fff" />
                <Text style={s.callBtnTxt}>Call</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={s.pendingBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.pendingTitle}>{lang === "hi" ? "⏳ Review हो रहा है" : "⏳ Pending review"}</Text>
              <Text style={s.pendingSub}>{lang === "hi" ? "Customer आपका profile देख रहा है।" : "Customer is reviewing your profile."}</Text>
            </View>
            <Pressable style={s.withdrawBtn} onPress={onWithdraw}>
              <Text style={s.withdrawTxt}>{lang === "hi" ? "वापस लो" : "Withdraw"}</Text>
            </Pressable>
          </View>
        )
      ) : (
        <Pressable style={s.btnPrimary} onPress={onApply}>
          <Ionicons name="hand-right-outline" size={15} color="#fff" />
          <Text style={s.btnPrimaryTxt}>
            {isWorker ? (lang === "hi" ? "मुझे interest है" : "I'm interested") : (lang === "hi" ? "Login करके apply करो" : "Login to apply")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.saffron },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 1 },
  filterBtn: {
    width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.saffronTint, borderWidth: 1.5, borderColor: colors.saffron, position: "relative",
  },
  filterBtnActive: { backgroundColor: colors.saffron },
  filterDot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.money, borderWidth: 1.5, borderColor: "#fff" },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f9f8f5", borderRadius: 12, borderWidth: 1.5,
    borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, padding: 0 },

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

  filterPanel: { marginTop: 10, backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  filterLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 },
  pincodeInput: {
    backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12,
    fontFamily: fonts.body, fontSize: 14, color: colors.text,
  },
  searchBtn: { backgroundColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  searchBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  pincodeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  applyBtn: { backgroundColor: colors.saffron, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  applyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, alignSelf: "flex-end" },
  clearTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.saffron },
  activeChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.saffronTint, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: colors.saffron + "40",
  },
  activeChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron, maxWidth: 120 },
  countTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 10 },

  // Card
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  cardAccepted: { borderColor: "#86efac", borderWidth: 1.5 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  catBadge: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 22 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardMetaTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flex: 1 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  urgencyTxt: { fontFamily: fonts.bodyBold, fontSize: 10 },

  pillRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 8 },
  ratePill: { flexDirection: "row", alignItems: "baseline", gap: 1, backgroundColor: "#FFFBEB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A" },
  rateTxt: { fontFamily: fonts.display, fontSize: 16, color: colors.money },
  rateUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f9f8f5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  infoPillTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textSecondary },

  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },

  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  skillChip: { backgroundColor: "#eff6ff", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#bfdbfe" },
  skillChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#1d4ed8" },

  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 13, borderRadius: 12 },
  btnPrimaryTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

  acceptedBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#86efac" },
  acceptedTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#15803d" },
  acceptedSub: { fontFamily: fonts.body, fontSize: 12, color: "#166534", marginTop: 2 },
  callBtn: { backgroundColor: "#16a34a", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  callBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  pendingBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fffbeb", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#fde68a" },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#92400e" },
  pendingSub: { fontFamily: fonts.body, fontSize: 12, color: "#78350f", marginTop: 2 },
  withdrawBtn: { borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  withdrawTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },

  empty: { padding: 40, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
