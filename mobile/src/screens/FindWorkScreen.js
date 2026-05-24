import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, shadow, spacing } from "../theme";

const CATEGORIES = [
  { v: "", label: "All Jobs", icon: "briefcase-outline" },
  { v: "construction", label: "Mason", icon: "construct-outline" },
  { v: "farm", label: "Farm", icon: "leaf-outline" },
  { v: "electrical", label: "Electrician", icon: "flash-outline" },
  { v: "cleaning", label: "Cleaning", icon: "sparkles-outline" },
  { v: "transport", label: "Driver", icon: "car-outline" },
  { v: "home", label: "Home", icon: "home-outline" },
  { v: "other", label: "Other", icon: "cube-outline" },
];

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

function pretty(value) {
  if (!value) return "";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function jobSkills(job) {
  const required = Array.isArray(job.required_skills) ? job.required_skills : [];
  const fromRequired = required.map((s) => s?.skill || s?.category).filter(Boolean);
  const direct = [
    ...(Array.isArray(job.skills_required) ? job.skills_required : []),
    ...(Array.isArray(job.skills) ? job.skills : []),
  ];
  return [...new Set([...fromRequired, ...direct].filter(Boolean))];
}

function locationText(job) {
  const address = job.address || {};
  return [
    job.village || address.village || job.location_text,
    job.pincode || address.pincode,
  ].filter(Boolean).join(" · ");
}

function payText(job) {
  if (job.budget_min) {
    return {
      amount: `₹${job.budget_min}${job.budget_max ? `-${job.budget_max}` : ""}`,
      unit: job.budget_type === "hourly" ? "/ HR" : "TOTAL",
    };
  }
  if (job.daily_rate) return { amount: `₹${job.daily_rate}`, unit: "/ DAY" };
  return { amount: "Ask", unit: "PRICE" };
}

export default function FindWorkScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [query, setQuery] = useState("");
  const [pincode, setPincode] = useState("");
  const [category, setCategory] = useState("");
  const [skills, setSkills] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftPincode, setDraftPincode] = useState("");
  const [draftCategory, setDraftCategory] = useState("");
  const [draftSkills, setDraftSkills] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    api.get("/service-profiles/mine")
      .then((r) => {
        const pc = r.data?.pincode || r.data?.address?.pincode || "";
        if (pc) setPincode(pc);
      })
      .catch(() => {});
  }, [user?.id]);

  const load = useCallback(async () => {
    const params = {};
    if (pincode.length === 6) params.pincode = pincode;
    if (category) params.category = category;
    if (skills.trim()) params.skills = skills.trim();

    try {
      const [jobRes, mineRes] = await Promise.all([
        api.get("/jobs/feed", { params }).catch(() => api.get("/jobs/public", { params })),
        user ? api.get("/work-requests/mine").catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);
      setJobs(Array.isArray(jobRes.data) ? jobRes.data : []);
      setRequests(Array.isArray(mineRes.data) ? mineRes.data : []);
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, pincode, skills, user]);

  useEffect(() => { load(); }, [load]);

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      const haystack = [
        job.title,
        job.description,
        job.category,
        locationText(job),
        ...jobSkills(job),
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [jobs, query]);

  const requestFor = (jobId) =>
    requests.find((r) => r.job_id === jobId && ["requested", "accepted"].includes(r.status));

  const apply = async (jobId) => {
    if (!user) {
      Alert.alert(
        lang === "hi" ? "Login जरूरी है" : "Login required",
        lang === "hi" ? "Apply karne ke liye login karo." : "Sign in to apply for this job.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Login", onPress: () => navigation.navigate("Login") },
        ],
      );
      return;
    }
    try {
      await api.post("/work-requests", { job_id: jobId, request_type: "job_application" });
      Alert.alert("Request sent", "The job poster will review your application.");
      load();
    } catch (err) {
      const detail = err?.response?.data?.detail || "";
      if (detail.toLowerCase().includes("service profile")) {
        Alert.alert(
          "Create Service Profile",
          "Create your service profile first to apply to jobs.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Create Profile", onPress: () => navigation.navigate("BecomeExpert") },
          ],
        );
      } else {
        Alert.alert("Error", formatApiError(err));
      }
    }
  };

  const withdraw = (requestId) => {
    Alert.alert("Withdraw?", "", [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await api.post(`/work-requests/${requestId}/cancel`);
            load();
          } catch (err) {
            Alert.alert("Failed", formatApiError(err));
          }
        },
      },
    ]);
  };

  const bookmarkJob = async (jobId) => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    try {
      await api.post(`/auth/me/save-job/${jobId}`);
      refreshUser();
    } catch {}
  };

  const openFilter = () => {
    setDraftPincode(pincode);
    setDraftCategory(category);
    setDraftSkills(skills);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    Keyboard.dismiss();
    setPincode(draftPincode);
    setCategory(draftCategory);
    setSkills(draftSkills);
    setLoading(true);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setQuery("");
    setPincode("");
    setCategory("");
    setSkills("");
    setDraftPincode("");
    setDraftCategory("");
    setDraftSkills("");
    setLoading(true);
    setFilterOpen(false);
  };

  const hasFilters = !!(query.trim() || pincode || category || skills.trim());

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView edges={["top"]} style={s.safe}>
        <View style={s.header}>
          <View style={s.titleRow}>
            <Pressable
              style={s.backBtn}
              hitSlop={10}
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </Pressable>
            <Text style={s.title}>Find Jobs</Text>
          </View>

          <View style={s.searchRow}>
            <Pressable
              style={[s.searchBox, searchFocused && s.searchBoxFocused]}
              onPress={() => inputRef.current?.focus()}
            >
              <Ionicons name="search-outline" size={22} color="#9CA3AF" />
              <TextInput
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                style={s.searchInput}
                placeholder="Search for plumbers, electricians..."
                placeholderTextColor="#7E7576"
                returnKeyType="search"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {query.length > 0 ? (
                <Pressable style={s.clearSearchBtn} onPress={() => setQuery("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </Pressable>
              ) : null}
            </Pressable>
            <Pressable style={s.filterBtn} onPress={openFilter}>
              <Ionicons name="options-outline" size={25} color="#fff" />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={visibleJobs}
          keyExtractor={(item, index) => String(item.id || index)}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 116 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#111827"
            />
          }
          ListHeaderComponent={
            <View style={s.feedHeader}>
              <Text style={s.feedTitle}>Available Jobs</Text>
              <Pressable onPress={clearFilters} disabled={!hasFilters} hitSlop={8}>
                <Text style={[s.viewAllText, !hasFilters && s.viewAllMuted]}>View All</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <JobCard
              job={item}
              request={requestFor(item.id)}
              bookmarked={(user?.saved_jobs || []).includes(item.id)}
              onOpen={() => navigation.navigate("JobDetail", { jobId: item.id })}
              onApply={() => apply(item.id)}
              onWithdraw={() => withdraw(requestFor(item.id)?.id)}
              onBookmark={() => bookmarkJob(item.id)}
            />
          )}
          ListFooterComponentStyle={visibleJobs.length ? s.footerWrap : null}
          ListHeaderComponentStyle={s.headerWrap}
          ListEmptyComponentStyle={s.emptyWrap}
          ListFooterComponent={!loading && visibleJobs.length ? <NoMoreJobs onAdjust={openFilter} /> : null}
          ListEmptyComponent={loading ? null : <NoMoreJobs onAdjust={openFilter} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        {loading ? (
          <View style={s.loadingOverlay}>
            <ActivityIndicator color="#111827" />
          </View>
        ) : null}

        <FilterModal
          visible={filterOpen}
          pincode={draftPincode}
          setPincode={setDraftPincode}
          category={draftCategory}
          setCategory={setDraftCategory}
          skills={draftSkills}
          setSkills={setDraftSkills}
          onClose={() => setFilterOpen(false)}
          onClear={clearFilters}
          onApply={applyFilters}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function JobCard({ job, request, bookmarked, onOpen, onApply, onWithdraw, onBookmark }) {
  const posted = timeAgo(job.created_at);
  const pay = payText(job);
  const loc = locationText(job) || "Location not added";
  const skills = jobSkills(job);
  const category = pretty(job.category) || "General";
  const workersNeeded = Number(job.workers_needed || 1);
  const filled = Number(job.filled_count || 0);
  const workersLabel = `${Math.max(workersNeeded - filled, 1)} needed`;
  const poster = job.posted_by_name || job.poster_name || job.customer_name || "Job Poster";
  const rating = Number(job.poster_rating || job.rating || 0);

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.cardPressed]} onPress={onOpen}>
      <View style={s.cardTop}>
        <View style={s.posterBlock}>
          <View style={s.posterAvatar}>
            <Ionicons name="business-outline" size={17} color="#D1D5DB" />
          </View>
          <View style={s.posterTextWrap}>
            <Text style={s.posterName} numberOfLines={1}>{poster}</Text>
            <View style={s.ratingRow}>
              <Ionicons name={rating ? "star" : "star-outline"} size={14} color="#F59E0B" />
              <Text style={s.posterRating}>{rating ? rating.toFixed(1) : "New"}</Text>
            </View>
          </View>
        </View>
        <Pressable
          hitSlop={10}
          onPress={(e) => { e.stopPropagation?.(); onBookmark?.(); }}
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={24}
            color={bookmarked ? colors.primary : "#7E7576"}
          />
        </Pressable>
      </View>

      <Text style={s.jobTitle} numberOfLines={2}>{job.title || "Untitled Job"}</Text>

      <View style={s.metaRow}>
        <View style={s.metaItem}>
          <Ionicons name="location-outline" size={17} color="#4B5563" />
          <Text style={s.metaText} numberOfLines={1}>{job.distance_label || loc}</Text>
        </View>
        {posted ? (
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={17} color="#4B5563" />
            <Text style={s.metaText}>{posted}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.detailPills}>
        <InfoPill icon="calendar-outline" text={job.job_date || job.date_required || "Date open"} />
        <InfoPill icon="people-outline" text={workersLabel} />
        <InfoPill icon="pricetag-outline" text={category} />
        {job.pincode || job.address?.pincode ? (
          <InfoPill icon="pin-outline" text={job.pincode || job.address?.pincode} />
        ) : null}
        {skills.slice(0, 2).map((skill) => (
          <InfoPill key={skill} icon="hammer-outline" text={pretty(skill)} />
        ))}
      </View>

      <View style={s.cardDivider} />

      <View style={s.cardFooter}>
        <View style={s.payBlock}>
          <View style={s.payRow}>
            <Text style={s.payAmount} numberOfLines={1}>{pay.amount}</Text>
            <Text style={s.payUnit}>{pay.unit}</Text>
          </View>
          <View style={s.verifiedRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#047857" />
            <Text style={s.verifiedText}>Verified</Text>
          </View>
        </View>

        {request ? (
          <Pressable style={s.pendingBtn} onPress={request.status === "requested" ? onWithdraw : onOpen}>
            <Text style={s.pendingBtnText}>{request.status === "accepted" ? "Accepted" : "Pending"}</Text>
          </Pressable>
        ) : (
          <Pressable style={s.applyBtn} onPress={onApply}>
            <Text style={s.applyBtnText}>Apply Now</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function InfoPill({ icon, text }) {
  if (!text) return null;
  return (
    <View style={s.infoPill}>
      <Ionicons name={icon} size={13} color="#5E5E60" />
      <Text style={s.infoPillText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function NoMoreJobs({ onAdjust }) {
  return (
    <View style={s.noMore}>
      <View style={s.noMoreIcon}>
        <Ionicons name="file-tray-full-outline" size={31} color="#5E5E60" />
      </View>
      <Text style={s.noMoreTitle}>No more jobs in your area</Text>
      <Text style={s.noMoreSub}>Try expanding your search radius or adjusting filters to find more opportunities.</Text>
      <Pressable style={s.adjustBtn} onPress={onAdjust}>
        <Text style={s.adjustText}>Adjust Filters</Text>
      </Pressable>
    </View>
  );
}

function FilterModal({
  visible,
  pincode,
  setPincode,
  category,
  setCategory,
  skills,
  setSkills,
  onClose,
  onClear,
  onApply,
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.modalBg} onPress={onClose}>
          <Pressable style={s.modalSheet} onPress={() => {}}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Filter Jobs</Text>
            <Text style={s.modalSub}>Use pincode, category, and skills to find better matches.</Text>

            <Text style={s.fieldLabel}>Pincode</Text>
            <View style={s.modalInputRow}>
              <Ionicons name="location-outline" size={18} color="#111827" />
              <TextInput
                style={s.modalInput}
                value={pincode}
                onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={s.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modalChips}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.v || "all"}
                  style={[s.modalChip, category === cat.v && s.modalChipActive]}
                  onPress={() => setCategory(cat.v)}
                >
                  <Ionicons name={cat.icon} size={14} color={category === cat.v ? "#fff" : "#111827"} />
                  <Text style={[s.modalChipText, category === cat.v && s.modalChipTextActive]}>{cat.label}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={s.fieldLabel}>Skills</Text>
            <View style={s.modalInputRow}>
              <Ionicons name="hammer-outline" size={18} color="#111827" />
              <TextInput
                style={s.modalInput}
                value={skills}
                onChangeText={setSkills}
                placeholder="electrician, plumber..."
                placeholderTextColor="#9CA3AF"
                returnKeyType="done"
              />
            </View>

            <View style={s.modalButtons}>
              <Pressable style={s.clearBtn} onPress={onClear}>
                <Text style={s.clearBtnText}>Clear</Text>
              </Pressable>
              <Pressable style={s.applyFilterBtn} onPress={onApply}>
                <Text style={s.applyFilterText}>Apply Filters</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F9FE" },

  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8ED",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...shadow.sm,
    zIndex: 2,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: 22 },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.bodyBold, fontSize: 28, color: "#111827", letterSpacing: 0 },

  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchBox: {
    flex: 1,
    minWidth: 0,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#F3F3F8",
    borderRadius: 16,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  searchBoxFocused: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#111827" },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 56,
    paddingVertical: 0,
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#111827",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  clearSearchBtn: { flexShrink: 0, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  filterBtn: {
    flexShrink: 0,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },

  list: { paddingHorizontal: spacing.md, paddingTop: 26 },
  headerWrap: { marginBottom: spacing.lg },
  feedHeader: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  feedTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#1A1C1F" },
  viewAllText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: "#111827" },
  viewAllMuted: { color: "#9CA3AF" },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    top: 144,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(249,249,254,0.55)",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 13,
    paddingHorizontal: 24,
    paddingVertical: 22,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "transparent",
    ...shadow.sm,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.996 }] },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  posterBlock: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  posterAvatar: {
    width: 42,
    height: 42,
    borderRadius: 9,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  posterTextWrap: { flex: 1, minWidth: 0 },
  posterName: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1A1C1F", includeFontPadding: false },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  posterRating: { fontFamily: fonts.bodyMedium, fontSize: 13, color: "#4C4546", includeFontPadding: false },

  jobTitle: { fontFamily: fonts.bodyBold, fontSize: 21, lineHeight: 28, color: "#111827", marginBottom: 10, includeFontPadding: false },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5, maxWidth: "100%" },
  metaText: { fontFamily: fonts.body, fontSize: 14, color: "#4C4546", flexShrink: 1 },

  detailPills: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 18 },
  infoPill: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F3F3F8",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  infoPillText: { maxWidth: 180, fontFamily: fonts.bodyMedium, fontSize: 11, color: "#4C4546", includeFontPadding: false },

  cardDivider: { height: 1, backgroundColor: "#E8E8ED", marginBottom: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  payBlock: { flex: 1, minWidth: 0 },
  payRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  payAmount: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 25, color: "#000", letterSpacing: 0, includeFontPadding: false },
  payUnit: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#4C4546" },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#047857", textTransform: "uppercase" },
  applyBtn: {
    flexShrink: 0,
    width: 132,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff", includeFontPadding: false, textAlign: "center" },
  pendingBtn: {
    flexShrink: 0,
    width: 132,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#92400E" },

  footerWrap: { marginTop: spacing.sm },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  emptyTop: { marginTop: spacing.xl },
  noMore: {
    minHeight: 292,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CFC4C5",
    backgroundColor: "#EDEDF2",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  noMoreIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E2E2E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  noMoreTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#1A1C1F", textAlign: "center" },
  noMoreSub: { marginTop: 5, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: "#4C4546", textAlign: "center" },
  adjustBtn: {
    marginTop: spacing.xl,
    minWidth: 148,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  adjustText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: "#111827" },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#111827" },
  modalSub: { fontFamily: fonts.body, fontSize: 14, color: "#6B7280", lineHeight: 20, marginTop: 4, marginBottom: 20 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  modalInputRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F3F3F8",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  modalInput: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 16, color: "#111827", paddingVertical: 0 },
  modalChips: { gap: 8, paddingBottom: 18 },
  modalChip: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F3F3F8",
  },
  modalChipActive: { backgroundColor: "#000" },
  modalChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#111827" },
  modalChipTextActive: { color: "#fff" },
  modalButtons: { flexDirection: "row", gap: 10, marginTop: 4 },
  clearBtn: {
    width: 104,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#4C4546" },
  applyFilterBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  applyFilterText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
