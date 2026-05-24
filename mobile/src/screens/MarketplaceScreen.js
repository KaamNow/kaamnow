import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView,
  Alert,
  Image, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { setCache, getCache } from "../lib/cache";
import api, { API_URL } from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const INDIGO = colors.primary;

/* ─── Skill options ────────────────────────────────────────────── */
const SKILLS = [
  { v: "all",            l: "All Experts" },
  { v: "electrician",    l: "Electrician" },
  { v: "plumber",        l: "Plumber" },
  { v: "carpenter",      l: "Carpenter" },
  { v: "painter",        l: "Painter" },
  { v: "driver",         l: "Driver" },
  { v: "security_guard", l: "Security" },
  { v: "cook",           l: "Cook" },
  { v: "mason",          l: "Mason" },
  { v: "welder",         l: "Welder" },
];

const SKILL_ALIASES = {
  electrical: "electrician",
  plumbing: "plumber",
  carpentry: "carpenter",
  painting: "painter",
  cooking: "cook",
  welding: "welder",
  "farm work": "gardener",
};

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;

const prettySkill = (value) => {
  if (!value) return "Local Expert";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

export default function MarketplaceScreen({ navigation, route }) {
  const { lang } = useLanguage();
  const { user } = useAuth();

  // ── State ────────────────────────────────────────────────────
  const [workers, setWorkers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const initialSkill = SKILL_ALIASES[route?.params?.skill] || route?.params?.skill || "all";
  const [skill, setSkill]             = useState(initialSkill);
  const [q, setQ]                     = useState(route?.params?.search || "");
  const [pincode, setPincode]         = useState(route?.params?.filterPincode || "");
  const [availOnly, setAvailOnly]     = useState(false);
  const [nearMeLat, setNearMeLat]     = useState(null);
  const [nearMeLng, setNearMeLng]     = useState(null);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [tempPincode, setTempPincode] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Pick up skill passed from Landing category tap
  useEffect(() => {
    if (route?.params?.skill) setSkill(SKILL_ALIASES[route.params.skill] || route.params.skill);
    if (route?.params?.search) setQ(route.params.search);
    if (route?.params?.filterPincode) setPincode(route.params.filterPincode);
  }, [route?.params?.skill, route?.params?.search, route?.params?.filterPincode]);

  // ── Load workers ─────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (skill !== "all")      params.skills = skill;
    if (q.trim())             params.q = q.trim();
    if (pincode.length === 6) params.pincode = pincode;
    if (availOnly)            params.available_only = true;
    if (nearMeLat && nearMeLng) { params.lat = nearMeLat; params.lng = nearMeLng; params.radius = 20; }

    const spParams = {};
    if (params.skills) spParams.skill = params.skills;
    if (params.pincode) spParams.pincode = params.pincode;
    if (params.available_only) spParams.available_only = true;
    if (params.q) spParams.search = params.q;

    api.get("/service-profiles", { params: spParams })
      .then(r => {
        const raw = Array.isArray(r.data) ? r.data : [];
        const list = raw.map(sp => ({
          ...sp,
          name: sp.display_name || sp.name || "Local Expert",
          avg_rating: sp.rating_avg ?? sp.avg_rating ?? 0,
          total_jobs: sp.completed_jobs ?? sp.total_jobs ?? 0,
          is_available: sp.availability !== false,
          trust_tier: sp.trust_tier || 1,
          village: sp.village || sp.location_text,
          pincode: sp.pincode,
          review_count: sp.rating_count ?? 0,
        }));
        setWorkers(list);
        if (list.length > 0) setCache("worker_list", list);
      })
      .catch(async () => {
        const cached = await getCache("worker_list");
        setWorkers(cached || []);
      })
      .finally(() => setLoading(false));
  }, [skill, q, pincode, availOnly, nearMeLat, nearMeLng]);

  useEffect(() => { load(); }, [load]);

  // ── GPS ──────────────────────────────────────────────────────
  const useNearMe = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNearMeLat(loc.coords.latitude);
      setNearMeLng(loc.coords.longitude);
      setPincode(""); // clear pincode when using GPS
    } catch {}
    finally { setGpsLoading(false); }
  };

  // ── Helpers ──────────────────────────────────────────────────
  const hasFilter = skill !== "all" || q.trim() || pincode || availOnly || nearMeLat;

  const clearAll = () => {
    setSkill("all");
    setQ("");
    setPincode("");
    setAvailOnly(false);
    setNearMeLat(null);
    setNearMeLng(null);
  };

  const locationLabel = nearMeLat
    ? "Using GPS location"
    : pincode
    ? `Pincode: ${pincode}`
    : null;

  const openProfile = (item) => navigation.navigate("WorkerProfile", { id: item.id });

  const bookExpert = (item) => {
    const name = item.name || item.display_name || "this Local Expert";
    if (!user) {
      Alert.alert("Log in required", "Please log in to send a booking request.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log In", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }
    if (user.id === item.user_id) {
      Alert.alert("Your profile", "You cannot book your own service profile.");
      return;
    }
    Alert.alert(
      "Book now?",
      `Send a booking request to ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: async () => {
            try {
              await api.post("/work-requests", {
                requested_to_user_id: item.user_id,
                request_type: "direct_booking",
                message: `Hi ${name}, I'd like to book your service.`,
              });
              Alert.alert("Request sent", `${name} will respond shortly.`);
              navigation.navigate("Tabs", { screen: "Activity", params: { initialTab: "sent" } });
            } catch (err) {
              Alert.alert("Could not book", err?.response?.data?.detail || err?.message || "Please try again.");
            }
          },
        },
      ],
    );
  };

  // ── Render ───────────────────────────────────────────────────
  return (
    <AppScreen edges={["top"]} style={s.safe}>

      {/* ── Header ───────────────────────────────────────────── */}
      <View style={s.header}>

        {/* Title row */}
        <View style={s.titleRow}>
          <Pressable
            style={s.backBtn}
            onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Home")}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={s.title}>Find Experts</Text>
        </View>

        <View style={s.searchRow}>
          <Pressable
            style={[s.searchBox, searchFocused && s.searchBoxFocused]}
            onPress={() => searchRef.current?.focus()}
          >
            <Ionicons name="search-outline" size={22} color="#5E5E60" />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder="Search for plumbers, electricians..."
              placeholderTextColor="#7E7576"
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {q.length > 0 && (
              <Pressable style={s.clearSearchBtn} onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.outline} />
              </Pressable>
            )}
          </Pressable>
          <Pressable
            style={s.filterBtn}
            onPress={() => { setTempPincode(pincode); setShowLocModal(true); }}
          >
            <Ionicons name="options-outline" size={24} color="#fff" />
          </Pressable>
        </View>

        {locationLabel && (
          <View style={s.locLabel}>
            <Ionicons name="location-outline" size={12} color="#5E5E60" />
            <Text style={s.locLabelTxt}>{locationLabel}</Text>
            <Pressable onPress={clearAll} hitSlop={8}>
              <Ionicons name="close" size={13} color="#5E5E60" />
            </Pressable>
          </View>
        )}
      </View>

      {/* Skill filter pills */}
      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.pillRow}>
            {SKILLS.map(sk => (
              <Pressable
                key={sk.v}
                style={[s.pill, skill === sk.v && s.pillActive]}
                onPress={() => setSkill(sk.v)}
              >
                <Text style={[s.pillTxt, skill === sk.v && s.pillTxtActive]}>{sk.l}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ── Results list ─────────────────────────────────────── */}
      <FlatList
        data={workers}
        keyExtractor={(item, i) => String(item.id ?? item._id ?? i)}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <ExpertCard
            item={item}
            onProfile={() => openProfile(item)}
            onBook={() => bookExpert(item)}
          />
        )}
        ListHeaderComponent={loading ? (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={INDIGO} />
            <Text style={s.loadingTxt}>Finding experts…</Text>
          </View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <EmptyState
            icon="search-outline"
            title="No Local Experts found"
            subtitle="Try a different skill or location"
            actionLabel={hasFilter ? "Clear filters" : undefined}
            onAction={hasFilter ? clearAll : undefined}
          />
        ) : null}
      />

      {/* ── Location modal ───────────────────────────────────── */}
      <Modal visible={showLocModal} transparent animationType="slide"
        onRequestClose={() => setShowLocModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable style={s.modalBg} onPress={() => setShowLocModal(false)}>
            <Pressable style={s.modalSheet} onPress={() => {}}>
              <View style={s.modalHandle} />
              <Text style={s.modalTitle}>Set location</Text>
              <Text style={s.modalSub}>Filter experts by area</Text>

              {/* GPS option */}
              <Pressable style={s.gpsRow} onPress={() => { useNearMe(); setShowLocModal(false); }}>
                <View style={s.gpsIcon}>
                  <Ionicons name="locate-outline" size={18} color={INDIGO} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.gpsTxt}>Use my current location</Text>
                  <Text style={s.gpsSub}>Uses GPS to find experts near you</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.outline} />
              </Pressable>

              <Text style={s.orDivider}>— or enter pincode —</Text>

              {/* Pincode input */}
              <View style={s.pincodeRow}>
                <Ionicons name="location-outline" size={18} color={INDIGO} />
                <TextInput
                  style={s.pincodeInput}
                  value={tempPincode}
                  onChangeText={v => setTempPincode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {tempPincode.length > 0 && (
                  <Pressable onPress={() => setTempPincode("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.outline} />
                  </Pressable>
                )}
              </View>

              <View style={s.modalBtns}>
                {pincode.length > 0 && (
                  <Pressable style={s.modalClearBtn}
                    onPress={() => { setPincode(""); setNearMeLat(null); setNearMeLng(null); setShowLocModal(false); }}>
                    <Text style={s.modalClearTxt}>Clear</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[s.modalApplyBtn, tempPincode.length !== 6 && { opacity: 0.4 }]}
                  disabled={tempPincode.length !== 6}
                  onPress={() => { setPincode(tempPincode); setNearMeLat(null); setNearMeLng(null); setShowLocModal(false); }}
                >
                  <Text style={s.modalApplyTxt}>Search here</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

function ExpertCard({ item, onProfile, onBook }) {
  const name = item.name || item.display_name || "Local Expert";
  const photo = fullUrl(item.photo_url || item.photos?.[0]?.image_url || item.photos?.[0]?.url);
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const skill = prettySkill(item.skills?.[0] || item.categories?.[0]);
  const experience = item.experience_years || item.experience;
  const rating = Number(item.avg_rating || item.rating_avg || 0);
  const reviews = Number(item.review_count ?? item.rating_count ?? 0);
  const rate = item.hourly_rate || item.daily_rate;
  const rateUnit = item.hourly_rate ? "/hr" : "/day";
  const location = item.location_text || item.village || "";
  const pincode = item.pincode || "";
  const verified = item.verification_status === "verified" || item.trust_tier >= 2;

  return (
    <Pressable style={({ pressed }) => [s.expertCard, pressed && s.expertCardPressed]} onPress={onProfile}>
      <View style={s.expertMain}>
        {photo ? (
          <Image source={{ uri: photo }} style={s.expertPhoto} />
        ) : (
          <View style={[s.expertPhoto, s.photoFallback]}>
            <Text style={s.photoInitials}>{initials}</Text>
          </View>
        )}

        <View style={s.expertInfo}>
          <View style={s.nameLine}>
            <Text style={s.expertName} numberOfLines={1}>{name}</Text>
            {verified ? <Ionicons name="shield-checkmark-outline" size={18} color="#111827" /> : null}
          </View>
          <Text style={s.expertMeta} numberOfLines={1}>
            {skill}{experience ? ` • ${experience} yrs exp` : ""}
          </Text>
          <View style={s.ratingLine}>
            <Ionicons name={rating > 0 ? "star" : "star-outline"} size={15} color="#111827" />
            <Text style={s.ratingText}>{rating > 0 ? rating.toFixed(1) : "New"}</Text>
            <Text style={s.reviewText}>({reviews} reviews)</Text>
          </View>
          {(location || pincode) ? (
            <View style={s.cardLocationRow}>
              <Ionicons name="location-outline" size={13} color="#7E7576" />
              <Text style={s.cardLocationText} numberOfLines={1}>
                {[location, pincode].filter(Boolean).join(" • ")}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={s.cardDivider} />

      <View style={s.cardFooter}>
        <View style={s.priceBlock}>
          <Text style={s.startingLabel}>Starting from</Text>
          <Text style={s.priceText} numberOfLines={1}>{rate ? `₹${rate}${rateUnit}` : "Ask price"}</Text>
        </View>
        <View style={s.cardActions}>
          <Pressable style={s.profileBtn} onPress={onProfile}>
            <Text style={s.profileBtnText} numberOfLines={1}>Profile</Text>
          </Pressable>
          <Pressable style={s.bookNowBtn} onPress={onBook}>
            <Text style={s.bookNowText} numberOfLines={1}>Book Now</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

/* ─── Styles ───────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F9FE" },

  /* Header */
  header: {
    backgroundColor: "#F9F9FE",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDF2",
  },

  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
  backBtn: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 24, color: "#111827", marginLeft: spacing.sm },
  locLabel: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  locLabelTxt: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#5E5E60" },

  /* Search */
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  searchBox: {
    flex: 1,
    minWidth: 0,
    height: 50,
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: "#EDEDF2", borderRadius: radius.xl,
    paddingHorizontal: 14,
    overflow: "hidden",
  },
  searchBoxFocused: { backgroundColor: "#fff" },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 50,
    fontFamily: fonts.body,
    fontSize: 16,
    color: "#1A1C1F",
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  clearSearchBtn: { flexShrink: 0, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  filterBtn: {
    width: 50, height: 50, borderRadius: radius.xl,
    backgroundColor: "#000",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  /* Skill pills */
  chipsWrap: {
    backgroundColor: "#F9F9FE",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  pillRow: { flexDirection: "row", gap: spacing.sm },
  pill: {
    paddingHorizontal: 17, paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: "#E8E8ED",
  },
  pillActive: { backgroundColor: "#000" },
  pillTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#1A1C1F" },
  pillTxtActive: { color: "#fff" },

  /* List */
  list: { paddingHorizontal: spacing.md, paddingBottom: 104, gap: spacing.xl },
  loadingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: spacing.md,
  },
  loadingTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.outline },

  expertCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadow.sm,
  },
  expertCardPressed: { opacity: 0.94, transform: [{ scale: 0.995 }] },
  expertMain: { flexDirection: "row", gap: spacing.lg },
  expertPhoto: { width: 82, height: 82, borderRadius: radius.xl, backgroundColor: "#E8E8ED" },
  photoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: "#111827" },
  photoInitials: { fontFamily: fonts.bodyBold, fontSize: 24, color: "#fff" },
  expertInfo: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: "row", alignItems: "center", gap: 5 },
  expertName: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 22, color: "#111827", letterSpacing: -0.3 },
  expertMeta: { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#5E5E60", marginTop: 3 },
  ratingLine: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#111827" },
  reviewText: { fontFamily: fonts.body, fontSize: 14, color: "#5E5E60" },
  cardLocationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  cardLocationText: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: "#7E7576" },
  cardDivider: { height: 1, backgroundColor: "#E8E8ED", marginVertical: spacing.lg },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  priceBlock: { flex: 1, minWidth: 0, paddingRight: spacing.xs },
  startingLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  priceText: { fontFamily: fonts.bodyBold, fontSize: 20, color: "#111827", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8, flexShrink: 0 },
  profileBtn: {
    width: 76,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: "#E8E8ED",
    alignItems: "center",
    justifyContent: "center",
  },
  profileBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#111827", textAlign: "center", includeFontPadding: false },
  bookNowBtn: {
    width: 96,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bookNowText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff", textAlign: "center", includeFontPadding: false },

  /* Location modal */
  modalBg:     { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet:  { backgroundColor: colors.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle, alignSelf: "center", marginBottom: 20 },
  modalTitle:  { fontFamily: fonts.display, fontSize: 22, color: colors.textHeading, marginBottom: 4 },
  modalSub:    { fontFamily: fonts.body, fontSize: 13, color: colors.textBody, marginBottom: 20 },

  gpsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.primaryFixed, borderRadius: radius.xxl,
    borderWidth: 1, borderColor: INDIGO + "30",
    padding: 14, marginBottom: 20,
  },
  gpsIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceCard, alignItems: "center", justifyContent: "center" },
  gpsTxt:  { fontFamily: fonts.bodyBold, fontSize: 14, color: INDIGO },
  gpsSub:  { fontFamily: fonts.body, fontSize: 12, color: colors.textBody, marginTop: 2 },

  orDivider: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, textAlign: "center", marginBottom: 16 },

  pincodeRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xxl,
    borderWidth: 1.5, borderColor: INDIGO,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  pincodeInput: { flex: 1, fontFamily: fonts.body, fontSize: 18, color: colors.textHeading, letterSpacing: 2 },

  modalBtns: { flexDirection: "row", gap: 10 },
  modalClearBtn: {
    paddingVertical: 15, paddingHorizontal: 18,
    borderRadius: radius.xxl, borderWidth: 1.5, borderColor: colors.borderSubtle, justifyContent: "center",
  },
  modalClearTxt:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textBody },
  modalApplyBtn:  { flex: 1, backgroundColor: INDIGO, paddingVertical: 15, borderRadius: radius.xxl, alignItems: "center" },
  modalApplyTxt:  { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
});
