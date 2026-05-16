import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, RefreshControl, ActivityIndicator,
  TextInput, ScrollView, Linking, Keyboard,
  KeyboardAvoidingView, Platform, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import LocationBar from "../components/LocationBar";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, spacing } from "../theme";

/* ─── Constants ─────────────────────────────────────────────────────── */

const CATS = [
  { v: "",             label: { en: "All",     hi: "सभी"    }, icon: "💼" },
  { v: "construction", label: { en: "Mason",   hi: "राजमिस्त्री" }, icon: "🏗️" },
  { v: "farm",         label: { en: "Farm",    hi: "खेती"   }, icon: "🌾" },
  { v: "electrical",   label: { en: "Electric",hi: "बिजली" }, icon: "⚡" },
  { v: "cleaning",     label: { en: "Cleaning",hi: "सफाई"  }, icon: "✨" },
  { v: "transport",    label: { en: "Driver",  hi: "ड्राइवर" }, icon: "🚛" },
  { v: "home",         label: { en: "Home",    hi: "घर"    }, icon: "🏠" },
  { v: "other",        label: { en: "Other",   hi: "अन्य"  }, icon: "📦" },
];

function daysAgo(d) {
  if (!d) return null;
  const n = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  return n === 0 ? "Today" : n === 1 ? "Yesterday" : `${n}d ago`;
}

/* ─── Screen ─────────────────────────────────────────────────────────── */

export default function FindWorkScreen({ navigation }) {
  const { user } = useAuth();
  const { lang }  = useLanguage();
  const inputRef  = useRef(null);

  const [jobs, setJobs]             = useState([]);
  const [engs, setEngs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // What the user is typing right now
  const [query, setQuery]     = useState("");
  const [pincode, setPincode] = useState("");
  const [cat, setCat]         = useState("");

  // What's actually applied (shown in results)
  const [applied, setApplied] = useState({ query: "", pincode: "", cat: "" });

  // Location modal
  const [showLocModal, setShowLocModal] = useState(false);
  const [tempPincode, setTempPincode]   = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  /* ── Auto-detect worker pincode on mount ── */
  useEffect(() => {
    if (user?.role === "worker") {
      api.get("/workers/me/profile")
        .then(r => {
          const pc = r.data?.address?.pincode || r.data?.pincode || "";
          if (pc) setPincode(pc);
        })
        .catch(() => {});
    }
  }, [user]);

  /* ── Fetch ── */
  const fetch = useCallback(async (params = {}) => {
    const p = { status: "open", ...params };
    try {
      const [jobs, mine] = await Promise.all([
        api.get("/jobs/public", { params: p })
          .catch(() => api.get("/jobs/feed", { params: p })
          .catch(() => ({ data: [] }))),
        user?.role === "worker"
          ? api.get("/engagements/mine").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setJobs(Array.isArray(jobs.data) ? jobs.data : []);
      setEngs(Array.isArray(mine.data) ? mine.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  /* ── Search ── */
  const doSearch = (overrides = {}) => {
    Keyboard.dismiss();
    const q  = overrides.query   !== undefined ? overrides.query   : query;
    const pc = overrides.pincode !== undefined ? overrides.pincode : pincode;
    const c  = overrides.cat     !== undefined ? overrides.cat     : cat;
    setApplied({ query: q, pincode: pc, cat: c });
    setLoading(true);
    const params = {};
    if (c)              params.category = c;
    if (pc.length === 6) params.pincode = pc;
    if (q.trim())       params.search = q.trim();
    fetch(params);
  };

  const resetSearch = () => {
    setQuery(""); setPincode(""); setCat("");
    setApplied({ query: "", pincode: "", cat: "" });
    setLoading(true);
    fetch();
  };

  const engFor = (jobId) =>
    engs.find(e => e.job_id === jobId && ["requested","accepted"].includes(e.status));

  /* ── Apply / Withdraw ── */
  const apply = async (jobId) => {
    if (!user) {
      Alert.alert(
        lang === "hi" ? "Login जरूरी है" : "Login required",
        lang === "hi" ? "Worker account से login करो।" : "Sign in as a worker to apply.",
        [{ text: lang === "hi" ? "रद्द" : "Cancel", style: "cancel" },
         { text: "Login", onPress: () => navigation.navigate("Login") }]
      );
      return;
    }
    if (user.role !== "worker") {
      Alert.alert(lang === "hi" ? "सिर्फ workers के लिए" : "Workers only");
      return;
    }
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert(
        lang === "hi" ? "✅ Interest भेजा!" : "✅ Interest sent!",
        lang === "hi" ? "Customer आपका profile देखेगा।" : "Customer will review your profile."
      );
      doSearch();
    } catch (err) { Alert.alert("Error", formatApiError(err)); }
  };

  const withdraw = (engId) => {
    Alert.alert(
      lang === "hi" ? "Withdraw करें?" : "Withdraw?", "",
      [{ text: lang === "hi" ? "नहीं" : "No", style: "cancel" },
       { text: lang === "hi" ? "हाँ" : "Yes", style: "destructive",
         onPress: async () => {
           try { await api.post(`/engagements/${engId}/cancel`); doSearch(); }
           catch (err) { Alert.alert("Failed", formatApiError(err)); }
         }}]
    );
  };

  const hasActive = applied.query || applied.pincode || applied.cat;

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── HEADER BLOCK — fixed height, never overlaps results ── */}
      <View style={s.header}>

      {/* ── Top bar ── */}
      <View style={s.topBar}>
        <View style={s.topLeft}>
          <Text style={s.overline}>{lang === "hi" ? "काम खोजो" : "FIND WORK"}</Text>
          <Text style={s.screenTitle}>{lang === "hi" ? "नौकरियाँ" : "Job Board"}</Text>
        </View>
        {hasActive && (
          <Pressable onPress={resetSearch} style={s.resetBtn}>
            <Ionicons name="refresh-outline" size={14} color={colors.saffron} />
            <Text style={s.resetTxt}>{lang === "hi" ? "Reset" : "Reset"}</Text>
          </Pressable>
        )}
      </View>

      {/* ── Location bar — tap to open pincode modal ── */}
      <LocationBar
        pincode={pincode}
        onPress={() => { setTempPincode(pincode); setShowLocModal(true); }}
        label={lang === "hi" ? "Jobs aapke paas" : "Jobs near you"}
        compact
        style={s.locationBar}
      />

      {/* ── Search box ── */}
      <View style={[s.searchBox, searchFocused && s.searchBoxFocused]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={lang === "hi" ? "काम, skill खोजो…" : "Search job or skill…"}
          placeholderTextColor={colors.textMuted}
          returnKeyType="search"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onSubmitEditing={() => doSearch()}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* ── Category chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chipList} style={s.chipScroll}>
        {CATS.map(c => (
          <Pressable key={c.v}
            onPress={() => { setCat(c.v); doSearch({ cat: c.v }); }}
            style={[s.chip, cat === c.v && s.chipActive]}>
            <Text style={s.chipIcon}>{c.icon}</Text>
            <Text style={[s.chipTxt, cat === c.v && s.chipTxtActive]}>
              {c.label[lang] || c.label.en}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* ── Applied filters ── */}
      {hasActive && (
        <View style={s.appliedRow}>
          <Text style={s.appliedLabel}>{lang === "hi" ? "खोज:" : "Results for:"}</Text>
          {applied.query ? <View style={s.tag}><Text style={s.tagTxt}>"{applied.query}"</Text></View> : null}
          {applied.pincode ? <View style={s.tag}><Ionicons name="location" size={10} color={colors.saffron}/><Text style={s.tagTxt}> {applied.pincode}</Text></View> : null}
          {applied.cat ? <View style={s.tag}><Text style={s.tagTxt}>{CATS.find(c=>c.v===applied.cat)?.icon} {applied.cat}</Text></View> : null}
        </View>
      )}

      </View>{/* end header */}

      {/* ── RESULTS BLOCK — flex: 1 fills all remaining space ── */}
      <View style={{ flex: 1 }}>
      {/* ── Results ── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.saffron} size="large" />
          <Text style={s.loadingTxt}>{lang === "hi" ? "ढूंढ रहे हैं…" : "Searching…"}</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={j => j.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); doSearch(); }}
              tintColor={colors.saffron} />
          }
          renderItem={({ item }) => {
            const eng = engFor(item.id);
            const cat = CATS.find(c => c.v === item.category) || CATS[0];
            return (
              <JobCard item={item} eng={eng} cat={cat} lang={lang}
                isWorker={user?.role === "worker"}
                onApply={() => apply(item.id)}
                onWithdraw={() => withdraw(eng?.id)}
              />
            );
          }}
          ListHeaderComponent={
            <Text style={s.resultCount}>
              {jobs.length === 0
                ? (lang === "hi" ? "कोई काम नहीं मिला" : "No jobs found")
                : `${jobs.length} ${lang === "hi" ? "काम मिले" : jobs.length === 1 ? "job" : "jobs"}`}
            </Text>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>
                {lang === "hi" ? "कोई काम नहीं मिला" : "No jobs found"}
              </Text>
              <Text style={s.emptySub}>
                {lang === "hi" ? "दूसरी जगह या category आज़माओ।" : "Try a different area or category."}
              </Text>
              {hasActive && (
                <Pressable onPress={resetSearch} style={s.resetBtnLg}>
                  <Ionicons name="refresh-outline" size={15} color="#fff" />
                  <Text style={s.resetBtnLgTxt}>{lang === "hi" ? "सब Reset करो" : "Reset search"}</Text>
                </Pressable>
              )}
            </View>
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
      </View>{/* end results */}

      {/* ── Location modal — same pattern as MarketplaceScreen ── */}
      <Modal
        visible={showLocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={s.locModalBg} onPress={() => setShowLocModal(false)}>
            <Pressable style={s.locModalSheet} onPress={() => {}}>
              <View style={s.locModalHandle} />
              <Text style={s.locModalTitle}>
                {lang === "hi" ? "Location चुनो" : "Set location"}
              </Text>
              <Text style={s.locModalSub}>
                {lang === "hi"
                  ? "Pincode dalein — us area ke jobs dikhenge"
                  : "Enter pincode to see jobs in that area"}
              </Text>
              <View style={s.locModalInputWrap}>
                <Ionicons name="location-outline" size={18} color={colors.saffron} />
                <TextInput
                  style={s.locModalInput}
                  value={tempPincode}
                  onChangeText={v => setTempPincode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder={lang === "hi" ? "6-अंक pincode" : "6-digit pincode"}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {tempPincode.length > 0 ? (
                  <Pressable onPress={() => setTempPincode("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <View style={s.locModalBtns}>
                {pincode.length > 0 ? (
                  <Pressable
                    style={s.locModalClear}
                    onPress={() => {
                      setPincode("");
                      doSearch({ pincode: "" });
                      setShowLocModal(false);
                    }}
                  >
                    <Text style={s.locModalClearText}>
                      {lang === "hi" ? "Clear करो" : "Clear location"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[s.locModalApply, tempPincode.length !== 6 && { opacity: 0.4 }]}
                  disabled={tempPincode.length !== 6}
                  onPress={() => {
                    setPincode(tempPincode);
                    doSearch({ pincode: tempPincode });
                    setShowLocModal(false);
                  }}
                >
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={s.locModalApplyText}>
                    {lang === "hi" ? "यहाँ खोजो" : "Search here"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

/* ─── Job Card ───────────────────────────────────────────────────────── */

function JobCard({ item, eng, cat, lang, isWorker, onApply, onWithdraw }) {
  const posted = daysAgo(item.created_at);

  return (
    <View style={[s.card, eng?.status === "accepted" && s.cardHired]}>

      {/* Header */}
      <View style={s.cardHead}>
        <View style={s.catIcon}><Text style={s.catEmoji}>{cat.icon}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.jobTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={s.metaTxt} numberOfLines={1}>
              {[item.village || item.address?.village, item.address?.pincode].filter(Boolean).join(" · ") || "—"}
            </Text>
          </View>
        </View>
        {/* Rate — top right */}
        <View style={s.rateBadge}>
          <Text style={s.rateAmt}>₹{item.daily_rate}</Text>
          <Text style={s.rateUnit}>/day</Text>
        </View>
      </View>

      {/* Pills */}
      <View style={s.pills}>
        {item.job_date && (
          <View style={s.pill}>
            <Ionicons name="calendar-outline" size={11} color={colors.textSecondary} />
            <Text style={s.pillTxt}>{item.job_date}</Text>
          </View>
        )}
        <View style={s.pill}>
          <Ionicons name="people-outline" size={11} color={colors.textSecondary} />
          <Text style={s.pillTxt}>{item.workers_needed} {lang === "hi" ? "चाहिए" : "needed"}</Text>
        </View>
        {posted && (
          <View style={s.pill}>
            <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
            <Text style={s.pillTxt}>{posted}</Text>
          </View>
        )}
        {item.urgency === "urgent" && (
          <View style={s.urgentPill}>
            <Text style={s.urgentTxt}>🔥 {lang === "hi" ? "Urgent" : "Urgent"}</Text>
          </View>
        )}
      </View>

      {/* Description */}
      {!!item.description && (
        <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
      )}

      {/* ── CTA ── */}
      {eng ? (
        eng.status === "accepted" ? (
          /* HIRED */
          <View style={s.hiredBox}>
            <View style={{ flex: 1 }}>
              <Text style={s.hiredTitle}>{lang === "hi" ? "🎉 आप hire हो गए!" : "🎉 You're hired!"}</Text>
              <Text style={s.hiredSub}>{lang === "hi" ? "Customer से contact करो।" : "Contact the customer."}</Text>
            </View>
            {eng.customer_phone && (
              <Pressable style={s.callBtn} onPress={() => Linking.openURL(`tel:${eng.customer_phone}`)}>
                <Ionicons name="call" size={15} color="#fff" />
                <Text style={s.callTxt}>Call</Text>
              </Pressable>
            )}
          </View>
        ) : (
          /* PENDING */
          <View style={s.pendingBox}>
            <Text style={s.pendingTxt}>
              {lang === "hi" ? "⏳ Review हो रहा है — " : "⏳ Pending review — "}
            </Text>
            <Pressable onPress={onWithdraw}>
              <Text style={s.withdrawTxt}>{lang === "hi" ? "वापस लो" : "Withdraw"}</Text>
            </Pressable>
          </View>
        )
      ) : (
        /* APPLY */
        <Pressable style={s.applyBigBtn} onPress={onApply}>
          <Ionicons name="hand-right-outline" size={16} color="#fff" />
          <Text style={s.applyBigTxt}>
            {isWorker
              ? (lang === "hi" ? "Apply करो" : "Apply Now")
              : (lang === "hi" ? "Login करके apply करो" : "Login to Apply")}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f4f0" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 60 },
  loadingTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  // Header block wrapper — contains all header rows, never overlaps results
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border },

  // Top bar — compact
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 8, backgroundColor: "#fff" },
  topLeft: {},
  overline: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.saffron },
  screenTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginTop: 1 },
  resetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  resetTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron },

  // Location bar
  locationBar: { marginHorizontal: spacing.lg, marginTop: 6, marginBottom: 4 },

  // Search box — full width, no separate button, focused border
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: spacing.lg, marginBottom: 6, backgroundColor: "#f5f4f0", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1.5, borderColor: colors.border },
  searchBoxFocused: { borderColor: colors.saffron },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.text, padding: 0 },

  // Location modal
  locModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  locModalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  locModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
  locModalTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 4 },
  locModalSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  locModalInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f5f4f0", borderRadius: 12, borderWidth: 1.5, borderColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  locModalInput: { flex: 1, fontFamily: fonts.body, fontSize: 18, color: colors.text, letterSpacing: 2 },
  locModalBtns: { flexDirection: "row", gap: 10 },
  locModalClear: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, justifyContent: "center", minHeight: 50 },
  locModalClearText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  locModalApply: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 12, minHeight: 50 },
  locModalApplyText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },

  // Category chips — fixed height so it never expands and overlaps results
  chipScroll: { backgroundColor: "#fff", height: 52 },
  chipList: { paddingHorizontal: spacing.lg, paddingVertical: 6, gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff", minHeight: 40 },
  chipActive: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  chipIcon: { fontSize: 16, lineHeight: 20 },
  chipTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  chipTxtActive: { color: "#fff" },

  // Applied filters
  appliedRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 8, backgroundColor: colors.saffronTint, flexWrap: "wrap" },
  appliedLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  tag: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: colors.saffron + "50" },
  tagTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron },

  // Count
  resultCount: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textMuted, marginBottom: 10 },

  // Card
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  cardHired: { borderColor: "#86efac", borderWidth: 2 },
  cardHead: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  catIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 20 },
  jobTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, lineHeight: 20, flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, flex: 1 },
  rateBadge: { alignItems: "flex-end" },
  rateAmt: { fontFamily: fonts.display, fontSize: 18, color: colors.money },
  rateUnit: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f5f4f0", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20 },
  pillTxt: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.textSecondary },
  urgentPill: { backgroundColor: "#fff1f2", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: "#fecaca" },
  urgentTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#dc2626" },

  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },

  // Apply button — BIG and obvious
  applyBigBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 14, marginTop: 4 },
  applyBigTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },

  // Hired
  hiredBox: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#86efac" },
  hiredTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#15803d" },
  hiredSub: { fontFamily: fonts.body, fontSize: 12, color: "#166534", marginTop: 2 },
  callBtn: { backgroundColor: "#16a34a", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  callTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  // Pending
  pendingBox: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", backgroundColor: "#fffbeb", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#fde68a" },
  pendingTxt: { fontFamily: fonts.body, fontSize: 13, color: "#92400e" },
  withdrawTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.saffron },

  // Empty
  empty: { paddingTop: 60, alignItems: "center", gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  resetBtnLg: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, backgroundColor: colors.saffron, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  resetBtnLgTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
