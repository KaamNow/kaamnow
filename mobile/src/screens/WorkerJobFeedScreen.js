import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import JobCard from "../components/JobCard";
import LocationBar from "../components/LocationBar";
import ServiceCategoryCard from "../components/ServiceCategoryCard";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const CATEGORIES = [
  { v: "", l: { en: "All", hi: "सभी" }, icon: "briefcase-outline" },
  { v: "construction", l: { en: "Construction", hi: "निर्माण" }, icon: "construct-outline" },
  { v: "farm", l: { en: "Farm", hi: "खेती" }, icon: "leaf-outline" },
  { v: "electrical", l: { en: "Electrical", hi: "बिजली" }, icon: "flash-outline" },
  { v: "cleaning", l: { en: "Cleaning", hi: "सफाई" }, icon: "sparkles-outline" },
  { v: "transport", l: { en: "Transport", hi: "ट्रांसपोर्ट" }, icon: "car-outline" },
  { v: "home", l: { en: "Home", hi: "घर" }, icon: "home-outline" },
  { v: "other", l: { en: "Other", hi: "अन्य" }, icon: "ellipsis-horizontal-outline" },
];

const SKILLS = ["mason", "farm work", "painting", "plumbing", "electrical", "helper", "cleaning", "carpentry", "welding", "cooking", "driver", "harvesting"];

export default function WorkerJobFeedScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [jobs, setJobs] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [tempPincode, setTempPincode] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [skill, setSkill] = useState("");
  const [pincode, setPincode] = useState("");
  const [workerPincode, setWorkerPincode] = useState("");

  const [applied, setApplied] = useState({ category: "", skill: "", pincode: "", query: "" });

  useEffect(() => {
    if (user?.role !== "worker") return;
    api.get("/workers/me/profile")
      .then((res) => {
        const pc = res.data?.address?.pincode || res.data?.pincode || "";
        if (pc) {
          setWorkerPincode(pc);
          setPincode(pc);
          setApplied({ category: "", skill: "", pincode: pc, query: "" });
        }
      })
      .catch(() => {});
  }, [user]);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (applied.category) params.category = applied.category;
      if (applied.skill) params.skills = applied.skill;
      if (applied.pincode?.length === 6) params.pincode = applied.pincode;
      if (applied.query?.trim()) params.search = applied.query.trim();

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

  const engagementFor = (jobId) =>
    engagements.find((engagement) => engagement.job_id === jobId && ["requested", "accepted"].includes(engagement.status));

  const expressInterest = async (jobId) => {
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert(
        lang === "hi" ? "Apply ho gaya! ✅" : "Applied! ✅",
        lang === "hi" ? "Customer aapka profile dekhega." : "The customer will review your profile."
      );
      load();
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    }
  };

  const withdraw = async (engagementId) => {
    Alert.alert(
      lang === "hi" ? "Apply wapas lein?" : "Withdraw application?",
      lang === "hi" ? "Aap is job ke liye apply nahi rahenge." : "You will no longer be applying for this job.",
      [
        { text: lang === "hi" ? "रद्द करो" : "Cancel", style: "cancel" },
        {
          text: lang === "hi" ? "वापस लो" : "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await api.post(`/engagements/${engagementId}/cancel`);
              load();
            } catch (err) {
              Alert.alert("Failed", formatApiError(err));
            }
          },
        },
      ]
    );
  };

  const activeFilterCount = [
    !!applied.category,
    applied.pincode?.length === 6 && applied.pincode !== workerPincode,
    !!applied.query?.trim(),
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0;

  const clearAll = () => {
    setCategory("");
    setSkill("");
    setQuery("");
    setPincode(workerPincode);
    setApplied({ category: "", skill: "", pincode: workerPincode, query: "" });
  };

  if (user?.role !== "worker") {
    return (
      <AppScreen edges={["top"]} style={styles.safe}>
        <EmptyState
          icon="briefcase-outline"
          title={lang === "hi" ? "Workers ke liye" : "Workers only"}
          subtitle={lang === "hi" ? "Yeh view sirf workers ke liye hai." : "This view is for workers only."}
        />
      </AppScreen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <AppScreen edges={["top"]} style={styles.safe}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.titleTextBlock}>
              <Text style={styles.title}>Jobs Near You</Text>
              <Text style={styles.subtitle}>Aapke area ke kaam</Text>
            </View>
            {activeFilterCount > 0 ? (
              <Pressable onPress={clearAll} style={styles.resetPill}>
                <Ionicons name="refresh-outline" size={13} color={colors.primary} />
                <Text style={styles.resetPillText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>

          <LocationBar
            pincode={applied.pincode || pincode || workerPincode}
            onPress={() => { setTempPincode(pincode || workerPincode); setShowLocModal(true); }}
            label={lang === "hi" ? "Aapke paas ke kaam" : "Jobs near you"}
            compact
            style={styles.locationBar}
          />

          {/* ── Search box ── */}
          <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={lang === "hi" ? "Kaam, skill search karein…" : "Search job or skill…"}
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onSubmitEditing={() =>
                setApplied((prev) => ({ ...prev, query: query.trim() }))
              }
            />
            {query.length > 0 ? (
              <Pressable
                onPress={() => { setQuery(""); setApplied((prev) => ({ ...prev, query: "" })); }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={17} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroller}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((item) => (
                <ServiceCategoryCard
                  key={item.v || "all"}
                  size="chip"
                  label={item.l[lang] || item.l.en}
                  icon={item.icon}
                  selected={category === item.v}
                  onPress={() => {
                    setCategory(item.v);
                    setApplied((prev) => ({ ...prev, category: item.v }));
                  }}
                />
              ))}
            </View>
          </ScrollView>

          {/* ── Applied filters row ── */}
          {hasAnyFilter ? (
            <View style={styles.appliedRow}>
              <Text style={styles.appliedLabel}>{lang === "hi" ? "Filter:" : "Results for:"}</Text>
              {applied.query ? (
                <View style={styles.appliedTag}>
                  <Text style={styles.appliedTagTxt}>"{applied.query}"</Text>
                </View>
              ) : null}
              {applied.pincode && applied.pincode !== workerPincode ? (
                <View style={styles.appliedTag}>
                  <Ionicons name="location" size={10} color={colors.primary} />
                  <Text style={styles.appliedTagTxt}> {applied.pincode}</Text>
                </View>
              ) : null}
              {applied.category ? (
                <View style={styles.appliedTag}>
                  <Text style={styles.appliedTagTxt}>
                    {CATEGORIES.find((c) => c.v === applied.category)?.l[lang] || applied.category}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {loading
                ? (lang === "hi" ? "लोड हो रहा है..." : "Loading...")
                : `${jobs.length} ${lang === "hi" ? "kaam mile" : jobs.length === 1 ? "job found" : "jobs found"}`}
              {applied.pincode && applied.pincode !== workerPincode ? ` · ${applied.pincode}` : ""}
            </Text>
            {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>
        </View>

        <FlatList
          data={jobs}
          keyExtractor={(job, index) => String(job.id ?? job._id ?? index)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => {
            const engagement = engagementFor(item.id);
            return (
              <JobCard
                job={item}
                engagement={engagement}
                lang={lang}
                onApply={() => expressInterest(item.id)}
                onWithdraw={engagement ? () => withdraw(engagement.id) : undefined}
              />
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="briefcase-outline"
                title="Is area mein koi kaam nahin"
                subtitle="Pincode change karo ya baad mein check karo"
                actionLabel={hasAnyFilter ? "Filters reset karo" : undefined}
                onAction={hasAnyFilter ? clearAll : undefined}
              />
            ) : null
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      {/* ── Location modal ── */}
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
          <Pressable style={styles.locModalBg} onPress={() => setShowLocModal(false)}>
            <Pressable style={styles.locModalSheet} onPress={() => {}}>
              <View style={styles.locModalHandle} />
              <Text style={styles.locModalTitle}>
                {lang === "hi" ? "Location chunein" : "Set location"}
              </Text>
              <Text style={styles.locModalSub}>
                {lang === "hi"
                  ? "Pincode dalein — us area ke jobs dikhenge"
                  : "Enter pincode to see jobs in that area"}
              </Text>
              <View style={styles.locModalInputWrap}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <TextInput
                  style={styles.locModalInput}
                  value={tempPincode}
                  onChangeText={(v) => setTempPincode(v.replace(/\D/g, "").slice(0, 6))}
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
              <View style={styles.locModalBtns}>
                {pincode && pincode !== workerPincode ? (
                  <Pressable
                    style={styles.locModalClear}
                    onPress={() => {
                      setPincode(workerPincode);
                      setApplied((prev) => ({ ...prev, pincode: workerPincode }));
                      setShowLocModal(false);
                    }}
                  >
                    <Text style={styles.locModalClearText}>
                      {lang === "hi" ? "My location" : "My location"}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.locModalApply, tempPincode.length !== 6 && { opacity: 0.4 }]}
                  disabled={tempPincode.length !== 6}
                  onPress={() => {
                    setPincode(tempPincode);
                    setApplied((prev) => ({ ...prev, pincode: tempPincode }));
                    setShowLocModal(false);
                  }}
                >
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={styles.locModalApplyText}>
                    {lang === "hi" ? "Yahan dhoondhein" : "Search here"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
      </AppScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleTextBlock: { flex: 1 },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  resetPill: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
  },
  resetPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  locationBar: { marginBottom: spacing.sm },

  // Search box
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: spacing.sm,
    ...shadow.xs,
  },
  searchBoxFocused: { borderColor: colors.primary },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.text,
    padding: 0,
  },

  // Applied filters row
  appliedRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    marginBottom: spacing.sm,
  },
  appliedLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  appliedTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary + "50",
  },
  appliedTagTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },

  categoryScroller: { marginTop: spacing.xs },
  chipRow: { flexDirection: "row", gap: 8, paddingBottom: 5 },

  // Location modal
  locModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  locModalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 40 },
  locModalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
  locModalTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 4 },
  locModalSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  locModalInputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface2, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.primary, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  locModalInput: { flex: 1, fontFamily: fonts.body, fontSize: 18, color: colors.text, letterSpacing: 2 },
  locModalBtns: { flexDirection: "row", gap: 10 },
  locModalClear: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, justifyContent: "center", minHeight: 50 },
  locModalClearText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  locModalApply: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: radius.md, minHeight: 50 },
  locModalApplyText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  countText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
});
