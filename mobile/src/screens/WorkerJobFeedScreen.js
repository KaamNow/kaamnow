import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, RefreshControl, ActivityIndicator, TextInput, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, spacing } from "../theme";

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

export default function WorkerJobFeedScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [jobs, setJobs]               = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [category, setCategory] = useState("");
  const [skill, setSkill]       = useState("");
  const [pincode, setPincode]   = useState("");

  const load = useCallback(async () => {
    try {
      const params = {};
      if (category) params.category = category;
      if (skill)    params.skills = skill;
      if (pincode.length === 6) params.pincode = pincode;

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
  }, [category, skill, pincode]);

  useEffect(() => { load(); }, [load]);

  const engagementFor = (jobId) =>
    engagements.find(e => e.job_id === jobId && ["requested","accepted"].includes(e.status));

  const expressInterest = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert(
        lang === "hi" ? "Interest भेजा!" : "Interest sent!",
        lang === "hi" ? "Customer आपको देखेगा।" : "The customer will see you on their list."
      );
      load();
    } catch (err) { Alert.alert("Could not send", formatApiError(err)); }
  };

  const withdraw = async (engagementId) => {
    Alert.alert(lang === "hi" ? "Interest वापस लें?" : "Withdraw interest?", "", [
      { text: lang === "hi" ? "रद्द करो" : "Cancel", style: "cancel" },
      { text: lang === "hi" ? "वापस लो" : "Withdraw", style: "destructive", onPress: async () => {
        try { await api.post(`/engagements/${engagementId}/cancel`); load(); }
        catch (err) { Alert.alert("Failed", formatApiError(err)); }
      }},
    ]);
  };

  const activeFilterCount = [!!category, !!skill, pincode.length === 6].filter(Boolean).length;
  const clearAll = () => { setCategory(""); setSkill(""); setPincode(""); };

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
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            <Text style={s.screenLabel}>{lang === "hi" ? "JOB FEED" : "JOB FEED"}</Text>
            <Text style={s.title}>{lang === "hi" ? "पास के काम" : "Jobs near you"}</Text>
          </View>
          <Pressable
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setFiltersOpen(o => !o)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? "#fff" : colors.saffron} />
            {activeFilterCount > 0 && <View style={s.filterDot} />}
          </Pressable>
        </View>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={s.chipRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.v} onPress={() => setCategory(c.v)} style={[s.chip, category === c.v && s.chipOn]}>
                <Text style={s.chipEmoji}>{c.icon}</Text>
                <Text style={[s.chipTxt, category === c.v && s.chipTxtOn]}>
                  {c.l[lang] || c.l.en}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Expandable filters */}
        {filtersOpen && (
          <View style={s.filterPanel}>
            <Text style={s.filterLabel}>{lang === "hi" ? "Skill" : "Skill"}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={s.chipRow}>
                <Pressable onPress={() => setSkill("")} style={[s.chip, !skill && s.chipOn]}>
                  <Text style={[s.chipTxt, !skill && s.chipTxtOn]}>{lang === "hi" ? "कोई भी" : "Any skill"}</Text>
                </Pressable>
                {SKILLS.map(sk => (
                  <Pressable key={sk} onPress={() => setSkill(sk)} style={[s.chip, skill === sk && s.chipOn]}>
                    <Text style={[s.chipTxt, skill === sk && s.chipTxtOn]}>{sk}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={s.filterLabel}>{lang === "hi" ? "Pincode" : "Pincode"}</Text>
            <TextInput
              style={s.filterInput}
              placeholder={lang === "hi" ? "6-अंक pincode" : "6-digit pincode"}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={v => setPincode(v.replace(/\D/g,"").slice(0,6))}
            />

            {activeFilterCount > 0 && (
              <Pressable onPress={clearAll} style={s.clearBtn}>
                <Ionicons name="refresh-outline" size={13} color={colors.saffron} />
                <Text style={s.clearTxt}>{lang === "hi" ? "सब हटाओ" : "Clear all filters"}</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={s.countRow}>
          <Text style={s.countTxt}>
            {jobs.length} {lang === "hi" ? "काम मिले" : jobs.length === 1 ? "job found" : "jobs found"}
          </Text>
          {loading && <ActivityIndicator size="small" color={colors.saffron} />}
        </View>
      </View>

      {/* ── Job List ──────────────────────────────────────────────── */}
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.saffron} />}
        renderItem={({ item }) => {
          const eng = engagementFor(item.id);
          const catInfo = CATEGORIES.find(c => c.v === item.category) || CATEGORIES[0];
          return <JobCard item={item} eng={eng} catInfo={catInfo} lang={lang} onInterest={() => expressInterest(item.id)} onWithdraw={() => withdraw(eng?.id)} />;
        }}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💼</Text>
              <Text style={s.emptyTitle}>{lang === "hi" ? "कोई काम नहीं मिला" : "No jobs found"}</Text>
              <Text style={s.emptySub}>
                {activeFilterCount > 0
                  ? (lang === "hi" ? "Filters हटाकर देखो।" : "Try clearing some filters.")
                  : (lang === "hi" ? "नीचे खींचकर refresh करो।" : "Pull down to refresh.")}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={clearAll} style={s.clearBtn}>
                  <Text style={s.clearTxt}>{lang === "hi" ? "Filters हटाओ" : "Clear filters"}</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

/* ── Job Card ──────────────────────────────────────────────────────── */
function JobCard({ item, eng, catInfo, lang, onInterest, onWithdraw }) {
  return (
    <View style={s.card}>
      {/* Top row: emoji + title + rate */}
      <View style={s.cardTop}>
        <View style={s.catBadge}>
          <Text style={s.catEmoji}>{catInfo.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.cardMeta}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <Text style={s.cardMetaTxt}>
              {item.village || item.address?.village || "—"}
            </Text>
            {item.job_date && (
              <>
                <Text style={s.metaDot}>·</Text>
                <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
                <Text style={s.cardMetaTxt}>{item.job_date}</Text>
              </>
            )}
          </View>
        </View>
        {/* Best match badge */}
        {item.match_rank === 1 && (
          <View style={s.matchBadge}>
            <Ionicons name="star" size={9} color={colors.saffron} />
            <Text style={s.matchTxt}>{lang === "hi" ? "मेल" : "Match"}</Text>
          </View>
        )}
      </View>

      {/* Rate + workers row */}
      <View style={s.pillRow}>
        <View style={s.ratePill}>
          <Text style={s.rateTxt}>₹{item.daily_rate}</Text>
          <Text style={s.rateUnit}>/day</Text>
        </View>
        <View style={s.infoPill}>
          <Ionicons name="people-outline" size={12} color={colors.textSecondary} />
          <Text style={s.infoPillTxt}>{item.workers_needed} {lang === "hi" ? "चाहिए" : "needed"}</Text>
        </View>
        {item.address?.pincode && (
          <View style={s.infoPill}>
            <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
            <Text style={s.infoPillTxt}>{item.address.pincode}</Text>
          </View>
        )}
      </View>

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
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={s.acceptedTxt}>{lang === "hi" ? "आप hire हो गए! Customer से contact करो।" : "You're hired! Contact customer."}</Text>
          </View>
        ) : (
          <Pressable style={s.btnOutline} onPress={onWithdraw}>
            <Text style={s.btnOutlineTxt}>{lang === "hi" ? "Interest वापस लो" : "Withdraw interest"}</Text>
          </Pressable>
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

  // Header
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.saffron },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginTop: 1 },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.saffronTint, borderWidth: 1.5, borderColor: colors.saffron, position: "relative" },
  filterBtnActive: { backgroundColor: colors.saffron },
  filterDot: { position: "absolute", top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.money, borderWidth: 1.5, borderColor: "#fff" },

  chipRow: { flexDirection: "row", gap: 7, paddingBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  chipEmoji: { fontSize: 12 },
  chipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary },
  chipTxtOn: { color: "#fff" },

  filterPanel: { marginTop: 12, backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  filterLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 },
  filterInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text, marginBottom: 4 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, alignSelf: "flex-end" },
  clearTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.saffron },

  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  countTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },

  // Job card
  card: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 },
  catBadge: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  catEmoji: { fontSize: 22 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, lineHeight: 20 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cardMetaTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  metaDot: { color: colors.textMuted, fontSize: 11 },
  matchBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: colors.saffronTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  matchTxt: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.saffron },

  pillRow: { flexDirection: "row", gap: 7, flexWrap: "wrap", marginBottom: 10 },
  ratePill: { flexDirection: "row", alignItems: "baseline", gap: 1, backgroundColor: "#FFFBEB", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "#FDE68A" },
  rateTxt: { fontFamily: fonts.display, fontSize: 16, color: colors.money },
  rateUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f9f8f5", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  infoPillTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary },

  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 12 },

  matchedRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  matchedChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#f0fdf4", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#86efac" },
  matchedChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#16a34a" },

  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 13, borderRadius: 12 },
  btnPrimaryTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  btnOutline: { borderWidth: 1.5, borderColor: colors.border, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnOutlineTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  acceptedBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#ecfdf5", padding: 12, borderRadius: 10 },
  acceptedTxt: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#15803d", flex: 1 },

  empty: { padding: 40, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
