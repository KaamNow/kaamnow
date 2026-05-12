import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  Alert, RefreshControl, ActivityIndicator, TextInput, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Overline from "../components/Overline";

const CATEGORIES = [
  { v: "",             l: "All",          icon: "💼" },
  { v: "construction", l: "Construction", icon: "🏗️" },
  { v: "farm",         l: "Farm",         icon: "🌾" },
  { v: "electrical",   l: "Electrical",   icon: "⚡" },
  { v: "cleaning",     l: "Cleaning",     icon: "✨" },
  { v: "transport",    l: "Transport",    icon: "🚛" },
  { v: "home",         l: "Home",         icon: "🏠" },
  { v: "other",        l: "Other",        icon: "📦" },
];

const SKILLS = ["mason","farm work","painting","plumbing","electrical","helper","cleaning","carpentry","welding","cooking","driver","harvesting"];

export default function WorkerJobFeedScreen({ navigation }) {
  const { user } = useAuth();
  const [jobs, setJobs]             = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [category, setCategory]   = useState("");
  const [skill, setSkill]         = useState("");
  const [pincode, setPincode]     = useState("");

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
  const onRefresh = () => { setRefreshing(true); load(); };

  const engagementFor = (jobId) =>
    engagements.find(e => e.job_id === jobId && ["requested","accepted"].includes(e.status));

  const expressInterest = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert("Interest sent!", "The customer will see you on their list.");
      load();
    } catch (err) { Alert.alert("Could not send", formatApiError(err)); }
  };

  const withdraw = async (engagementId) => {
    Alert.alert("Withdraw interest?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Withdraw", style: "destructive", onPress: async () => {
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
        <View style={s.center}><Text style={s.centerText}>This view is for workers only.</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Header / Filters ──────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.titleRow}>
          <View>
            <Overline>Job Feed</Overline>
            <Text style={s.title}>Jobs near you</Text>
          </View>
          <Pressable
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setFiltersOpen(o => !o)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? "#fff" : colors.indigo} />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Category chips — always visible */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={s.chipRow}>
            {CATEGORIES.map(c => (
              <Pressable key={c.v} onPress={() => setCategory(c.v)} style={[s.chip, category === c.v && s.chipOn]}>
                <Text style={s.chipEmoji}>{c.icon}</Text>
                <Text style={[s.chipText, category === c.v && s.chipTextOn]}>{c.l}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Expandable filter panel */}
        {filtersOpen && (
          <View style={s.filterPanel}>
            <Text style={s.filterLabel}>Skill</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={s.chipRow}>
                <Pressable onPress={() => setSkill("")} style={[s.chip, !skill && s.chipOn]}>
                  <Text style={[s.chipText, !skill && s.chipTextOn]}>Any skill</Text>
                </Pressable>
                {SKILLS.map(sk => (
                  <Pressable key={sk} onPress={() => setSkill(sk)} style={[s.chip, skill === sk && s.chipOn]}>
                    <Text style={[s.chipText, skill === sk && s.chipTextOn]}>{sk}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={s.filterLabel}>Pincode</Text>
            <TextInput
              style={s.filterInput}
              placeholder="Filter by 6-digit pincode"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={v => setPincode(v.replace(/\D/g,"").slice(0,6))}
            />

            {activeFilterCount > 0 && (
              <Pressable onPress={clearAll} style={s.clearBtn}>
                <Ionicons name="refresh-outline" size={13} color={colors.indigo} />
                <Text style={s.clearText}>Clear all filters</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={s.countRow}>
          <Text style={s.countText}>{jobs.length} {jobs.length === 1 ? "job" : "jobs"} found</Text>
          {loading && <ActivityIndicator size="small" color={colors.indigo} />}
        </View>
      </View>

      {/* ── Job List ──────────────────────────────────────────────── */}
      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => {
          const eng = engagementFor(item.id);
          return (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.catIcon}>
                  {CATEGORIES.find(c => c.v === item.category)?.icon || "💼"}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardMeta}>
                    {item.village || item.address?.village || "—"} · {item.job_date}
                  </Text>
                </View>
                {item.match_rank === 1 && (
                  <View style={s.matchBadge}>
                    <Text style={s.matchText}>Best match</Text>
                  </View>
                )}
              </View>

              <Text style={s.desc} numberOfLines={2}>{item.description}</Text>

              <View style={s.statsRow}>
                <StatPill icon="cash-outline" val={`₹${item.daily_rate}/day`} />
                <StatPill icon="people-outline" val={`${item.workers_needed} needed`} />
                {item.address?.pincode && <StatPill icon="location-outline" val={item.address.pincode} />}
              </View>

              {/* Matched skills */}
              {item.matched_skills?.length > 0 && (
                <View style={s.matchedSkillsRow}>
                  {item.matched_skills.map(sk => (
                    <View key={sk} style={s.matchedSkillChip}>
                      <Text style={s.matchedSkillText}>✓ {sk}</Text>
                    </View>
                  ))}
                </View>
              )}

              {eng ? (
                eng.status === "accepted" ? (
                  <View style={s.acceptedBox}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={s.acceptedText}>You're hired! Contact customer.</Text>
                  </View>
                ) : (
                  <Pressable style={s.btnSecondary} onPress={() => withdraw(eng.id)}>
                    <Text style={s.btnSecondaryText}>Withdraw interest</Text>
                  </Pressable>
                )
              ) : (
                <Pressable style={s.btnPrimary} onPress={() => expressInterest(item.id)}>
                  <Ionicons name="hand-right-outline" size={15} color="#fff" />
                  <Text style={s.btnPrimaryText}>I'm interested</Text>
                </Pressable>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💼</Text>
              <Text style={s.emptyTitle}>No jobs found</Text>
              <Text style={s.emptySub}>
                {activeFilterCount > 0 ? "Try clearing some filters." : "Pull down to refresh."}
              </Text>
              {activeFilterCount > 0 && (
                <Pressable onPress={clearAll} style={s.clearBtn}>
                  <Text style={s.clearText}>Clear filters</Text>
                </Pressable>
              )}
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

function StatPill({ icon, val }) {
  return (
    <View style={s.statPill}>
      <Ionicons name={icon} size={12} color={colors.indigo} />
      <Text style={s.statPillText}>{val}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerText: { fontFamily: fonts.body, color: colors.textMuted },
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.indigoTint, borderWidth: 1.5, borderColor: colors.indigo, position: "relative" },
  filterBtnActive: { backgroundColor: colors.indigo },
  filterBadge: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  filterBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#fff" },
  chipRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipEmoji: { fontSize: 13 },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textSecondary },
  chipTextOn: { color: "#fff" },
  filterPanel: { marginTop: 12, backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  filterLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 },
  filterInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text, marginBottom: 4 },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8, alignSelf: "flex-end" },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.indigo },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  countText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  // Job cards
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  catIcon: { fontSize: 26 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  matchBadge: { backgroundColor: "#dcfce7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  matchText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#16a34a" },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 10 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.indigoTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statPillText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.indigo },
  matchedSkillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  matchedSkillChip: { backgroundColor: "#f0fdf4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: "#86efac" },
  matchedSkillText: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#16a34a" },
  btnPrimary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: colors.saffron, paddingVertical: 13, borderRadius: 12 },
  btnPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  btnSecondary: { borderWidth: 1.5, borderColor: colors.border, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnSecondaryText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  acceptedBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ecfdf5", padding: 12, borderRadius: 10 },
  acceptedText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#15803d" },
  empty: { padding: 40, alignItems: "center" },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginBottom: 6 },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
