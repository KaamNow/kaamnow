import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [category, setCategory] = useState("");
  const [skill, setSkill] = useState("");
  const [pincode, setPincode] = useState("");
  const [workerPincode, setWorkerPincode] = useState("");

  const [applied, setApplied] = useState({ category: "", skill: "", pincode: "" });

  useEffect(() => {
    if (user?.role !== "worker") return;
    api.get("/workers/me/profile")
      .then((res) => {
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
      if (applied.skill) params.skills = applied.skill;
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

  const applySearch = () => {
    Keyboard.dismiss();
    setApplied({ category, skill, pincode });
    setFiltersOpen(false);
  };

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
    !!applied.skill,
    applied.pincode?.length === 6 && applied.pincode !== workerPincode,
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0 || !!skill || !!category || (pincode && pincode !== workerPincode);

  const clearAll = () => {
    setCategory("");
    setSkill("");
    setPincode(workerPincode);
    setApplied({ category: "", skill: "", pincode: workerPincode });
    setFiltersOpen(false);
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
            label="Current area"
            compact
            style={styles.locationBar}
          />

          <View style={styles.searchRow}>
            <Ionicons name="location-outline" size={17} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Pincode ya skill search karein"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={(value) => setPincode(value.replace(/\D/g, "").slice(0, 6))}
              onSubmitEditing={applySearch}
              returnKeyType="search"
            />
            {workerPincode && pincode !== workerPincode ? (
              <Pressable onPress={() => setPincode(workerPincode)} style={styles.myLocBtn}>
                <Ionicons name="navigate" size={14} color={colors.primary} />
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.searchBtn, pincode.length === 6 && styles.searchBtnActive]}
              onPress={applySearch}
            >
              <Ionicons name="arrow-forward" size={18} color={pincode.length === 6 ? "#fff" : colors.textMuted} />
            </Pressable>
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
                  onPress={() => setCategory(item.v)}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterToggle, filtersOpen && styles.filterToggleActive]}
              onPress={() => setFiltersOpen((open) => !open)}
            >
              <Ionicons name="construct-outline" size={14} color={filtersOpen ? "#fff" : colors.textSecondary} />
              <Text style={[styles.filterToggleText, filtersOpen && styles.filterToggleTextActive]} numberOfLines={1}>
                {skill || "Skill filter"}
              </Text>
              {skill ? <Ionicons name="checkmark-circle" size={14} color={filtersOpen ? "#fff" : colors.primary} /> : null}
            </Pressable>
            <Pressable style={styles.applyBtn} onPress={applySearch}>
              <Ionicons name="search-outline" size={14} color="#fff" />
              <Text style={styles.applyBtnText}>Search</Text>
            </Pressable>
          </View>

          {filtersOpen ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillScroller}>
              <View style={styles.chipRow}>
                <ServiceCategoryCard
                  size="chip"
                  label="All"
                  icon="grid-outline"
                  selected={!skill}
                  onPress={() => setSkill("")}
                />
                {SKILLS.map((item) => (
                  <ServiceCategoryCard
                    key={item}
                    size="chip"
                    label={item}
                    icon="construct-outline"
                    selected={skill === item}
                    onPress={() => setSkill(item)}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

          <View style={styles.countRow}>
            <Text style={styles.countText}>
              {loading
                ? (lang === "hi" ? "लोड हो रहा है..." : "Loading...")
                : `${jobs.length} ${lang === "hi" ? "kaam mile" : jobs.length === 1 ? "job found" : "jobs found"}`}
              {applied.pincode ? ` · ${applied.pincode}` : ""}
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
  locationBar: { marginBottom: spacing.md },
  searchRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.xs,
  },
  searchIcon: { marginLeft: 12 },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  myLocBtn: { minWidth: 40, minHeight: 44, alignItems: "center", justifyContent: "center" },
  searchBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
  },
  searchBtnActive: { backgroundColor: colors.primary },
  categoryScroller: { marginTop: spacing.md },
  skillScroller: { marginTop: spacing.sm, marginBottom: 2 },
  chipRow: { flexDirection: "row", gap: 8, paddingBottom: 5 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  filterToggle: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterToggleText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  filterToggleTextActive: { color: "#fff" },
  applyBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  applyBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
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
