import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView,
  Alert,
  Image, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { setCache, getCache } from "../lib/cache";
import api, { API_URL } from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useLocationContext } from "../contexts/LocationContext";
import LocationPickerSheet from "../components/LocationPickerSheet";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const INDIGO = colors.primary;

/* ─── Skill options ────────────────────────────────────────────── */
const SKILLS = [
  { v: "all",            l: "All",         icon: "apps-outline" },
  { v: "electrician",    l: "Electrician", icon: "flash-outline" },
  { v: "plumber",        l: "Plumber",     icon: "water-outline" },
  { v: "carpenter",      l: "Carpenter",   icon: "hammer-outline" },
  { v: "painter",        l: "Painter",     icon: "color-palette-outline" },
  { v: "driver",         l: "Driver",      icon: "car-outline" },
  { v: "security_guard", l: "Security",    icon: "shield-outline" },
  { v: "cook",           l: "Cook",        icon: "restaurant-outline" },
  { v: "mason",          l: "Mason",       icon: "construct-outline" },
  { v: "welder",         l: "Welder",      icon: "flame-outline" },
  { v: "cleaner",        l: "Cleaner",     icon: "sparkles-outline" },
  { v: "gardener",       l: "Gardener",    icon: "leaf-outline" },
];

const SKILL_ALIASES = {
  // English variants
  electrical: "electrician", plumbing: "plumber", carpentry: "carpenter",
  painting: "painter", cooking: "cook", welding: "welder", "farm work": "gardener",
  cleaning: "cleaner", driving: "driver", farming: "farmer",
  masonry: "mason", tailoring: "tailor", security: "security guard",
  // Hindi / Bhojpuri / regional terms
  safai: "cleaner", "साफाई": "cleaner", "सफाई": "cleaner",
  rangai: "painter", rang: "painter", "रंगाई": "painter", "रंग": "painter",
  bijli: "electrician", "बिजली": "electrician",
  nali: "plumber", "नाली": "plumber",
  mistri: "mason", "मिस्त्री": "mason",
  barhai: "carpenter", "बढ़ई": "carpenter",
  darzi: "tailor", "दर्जी": "tailor",
  dhobi: "laundry", "धोबी": "laundry",
  mali: "gardener", "माली": "gardener",
  kisan: "farmer", kheti: "farmer", "किसान": "farmer", "खेती": "farmer",
  chalak: "driver", "चालक": "driver",
  rasoia: "cook", khana: "cook", "रसोइया": "cook",
  mazdoor: "labour", "मजदूर": "labour",
  chowkidar: "security guard", "चौकीदार": "security guard",
  weldar: "welder", "वेल्डर": "welder",
};

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;

const prettySkill = (value) => {
  if (!value) return "Local Expert";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

export default function MarketplaceScreen({ navigation, route }) {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { location, clearLocation } = useLocationContext();

  // ── State ────────────────────────────────────────────────────
  const [workers, setWorkers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const initialSkill = SKILL_ALIASES[route?.params?.skill] || route?.params?.skill || "all";
  const [skill, setSkill]             = useState(initialSkill);
  const [q, setQ]                     = useState(route?.params?.search || "");
  const [availOnly, setAvailOnly]     = useState(false);
  const [locPickerVisible, setLocPickerVisible] = useState(false);

  // Booking form sheet
  const [bookingTarget, setBookingTarget] = useState(null);
  const [bookPrice,     setBookPrice]     = useState("");
  const [bookAddress,   setBookAddress]   = useState("");
  const [bookNote,      setBookNote]      = useState("");
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);

  // Pick up skill passed from Landing category tap
  useEffect(() => {
    if (route?.params?.skill) setSkill(SKILL_ALIASES[route.params.skill] || route.params.skill);
    if (route?.params?.search) setQ(route.params.search);
  }, [route?.params?.skill, route?.params?.search]);

  // ── Load workers ─────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    const locPincode = location?.pincode || "";
    const locLat = location?.lat;
    const locLng = location?.lng;

    const spParams = {};
    if (skill !== "all") spParams.skill = skill;
    if (locPincode.length === 6) spParams.pincode = locPincode;
    if (availOnly) spParams.available_only = true;
    if (locLat && locLng) { spParams.lat = locLat; spParams.lng = locLng; spParams.radius = 20; }

    const runSearch = async () => {
      try {
        if (q.trim()) {
          const rawQ = q.toLowerCase().trim();
          const localResolved = SKILL_ALIASES[rawQ];
          if (localResolved) {
            if (!spParams.skill) spParams.skill = localResolved;
          } else {
            try {
              const aiRes = await api.get("/ai/resolve-skill", { params: { q: q.trim() } });
              if (aiRes.data?.resolved && !spParams.skill) {
                spParams.skill = aiRes.data.skill;
              } else {
                spParams.search = q.trim();
              }
            } catch {
              spParams.search = q.trim();
            }
          }
        }

        const r = await api.get("/service-profiles", { params: spParams });
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
      } catch {
        const cached = await getCache("worker_list");
        setWorkers(cached || []);
      } finally {
        setLoading(false);
      }
    };

    runSearch();
  }, [skill, q, location, availOnly]);

  useEffect(() => { load(); }, [load]);

  // ── Helpers ──────────────────────────────────────────────────
  const hasFilter = skill !== "all" || q.trim() || location || availOnly;

  const clearAll = () => {
    setSkill("all");
    setQ("");
    setAvailOnly(false);
    clearLocation();
  };

  const locationLabel = location?.label || (location?.pincode ? `Pincode: ${location.pincode}` : null);

  const openProfile = (item) => navigation.navigate("WorkerProfile", { id: item.id });

  const bookExpert = (item) => {
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
    setBookPrice("");
    setBookAddress("");
    setBookNote("");
    setBookingTarget(item);
  };

  const submitBooking = async () => {
    const priceStr = bookPrice.trim();
    const addr     = bookAddress.trim();
    const note     = bookNote.trim();
    const name     = bookingTarget?.name || bookingTarget?.display_name || "this Local Expert";

    const priceNum = parseFloat(priceStr);
    if (!priceStr || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Price required", "Please enter a proposed price.");
      return;
    }
    if (!addr) {
      Alert.alert("Address required", "Please enter where the work needs to happen.");
      return;
    }
    setBookSubmitting(true);
    try {
      await api.post("/work-requests", {
        requested_to_user_id: bookingTarget.user_id,
        request_type: "direct_booking",
        message: note || `Hi ${name}, I'd like to book your service.`,
        proposed_price: priceNum,
        address: addr,
      });
      setBookingTarget(null);
      Alert.alert("Request sent", `${name} will respond shortly.`);
      navigation.navigate("Tabs", { screen: "Activity", params: { initialTab: "sent" } });
    } catch (err) {
      Alert.alert("Could not book", err?.response?.data?.detail || err?.message || "Please try again.");
    } finally {
      setBookSubmitting(false);
    }
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

        {/* Location chip — Flipkart-style */}
        <Pressable style={s.locChip} onPress={() => setLocPickerVisible(true)}>
          <Ionicons name="location-outline" size={14} color={colors.primary} />
          <Text style={s.locChipTxt} numberOfLines={1}>
            {locationLabel || "Set location"}
          </Text>
          <Ionicons name="chevron-down" size={13} color="#6B7280" />
        </Pressable>

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
            onPress={() => setLocPickerVisible(true)}
          >
            <Ionicons name="options-outline" size={24} color="#fff" />
            {location ? (
              <View style={s.filterBadge} />
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* Skill filter pills + Available Now toggle */}
      <View style={s.chipsWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.pillRow}>
            {/* Available Now toggle — first pill */}
            <Pressable
              style={[s.pill, s.pillAvail, availOnly && s.pillAvailActive]}
              onPress={() => setAvailOnly(v => !v)}
            >
              <View style={[s.availDot, availOnly && s.availDotActive]} />
              <Text style={[s.pillTxt, availOnly && s.pillTxtActive]}>Available Now</Text>
            </Pressable>

            {SKILLS.map(sk => (
              <Pressable
                key={sk.v}
                style={[s.pill, skill === sk.v && s.pillActive]}
                onPress={() => setSkill(sk.v)}
              >
                <Ionicons name={sk.icon} size={13} color={skill === sk.v ? "#fff" : "#4B5563"} />
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
        ListHeaderComponent={
          <View>
            {loading ? (
              <View style={s.loadingRow}>
                <ActivityIndicator size="small" color={INDIGO} />
                <Text style={s.loadingTxt}>Finding experts…</Text>
              </View>
            ) : (
              <View style={s.resultsRow}>
                <Text style={s.resultsCount}>
                  {workers.length > 0
                    ? `${workers.length} Expert${workers.length === 1 ? "" : "s"} Found`
                    : "Local Experts"}
                </Text>
                {workers.length > 0 && (
                  <Text style={s.resultsSub}>Sorted by rating</Text>
                )}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={!loading ? (
          <EmptyState
            icon="people-outline"
            title={hasFilter ? "No experts match your filters" : "No experts in this area yet"}
            subtitle={hasFilter
              ? "Try clearing filters or searching a nearby pincode"
              : "Be the first expert here — create your profile to show up"}
            actionLabel={hasFilter ? "Clear filters" : "Become an Expert"}
            onAction={hasFilter ? clearAll : undefined}
          />
        ) : null}
      />

      {/* ── Location picker sheet ────────────────────────────── */}
      <LocationPickerSheet
        visible={locPickerVisible}
        onClose={() => setLocPickerVisible(false)}
      />

      {/* Booking form sheet */}
      {bookingTarget && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setBookingTarget(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <Pressable style={s.bookSheetOverlay} onPress={() => { if (!bookSubmitting) setBookingTarget(null); }} />
            <View style={s.bookSheetInner}>
              <Text style={s.bookSheetTitle}>
                Book {bookingTarget?.name || bookingTarget?.display_name || "Expert"}
              </Text>
              <Text style={s.bookSheetSub}>
                {prettySkill(bookingTarget?.skills?.[0] || bookingTarget?.categories?.[0])}
              </Text>

              <Text style={s.bookFieldLabel}>Your proposed price (₹) *</Text>
              <TextInput
                style={[s.bookField, s.bookFieldSingle]}
                placeholder={
                  (bookingTarget?.hourly_rate || bookingTarget?.daily_rate)
                    ? `₹${bookingTarget.hourly_rate || bookingTarget.daily_rate}${bookingTarget.hourly_rate ? "/hr" : "/day"} — their listed rate`
                    : "e.g. 500"
                }
                placeholderTextColor={colors.outline}
                value={bookPrice}
                onChangeText={setBookPrice}
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={s.bookFieldLabel}>Where is the work? *</Text>
              <TextInput
                style={s.bookField}
                placeholder="House no., street, village / city, pincode"
                placeholderTextColor={colors.outline}
                value={bookAddress}
                onChangeText={setBookAddress}
                multiline
                maxLength={300}
              />

              <Text style={s.bookFieldLabel}>Add a note (optional)</Text>
              <TextInput
                style={s.bookField}
                placeholder="Any extra details for the expert…"
                placeholderTextColor={colors.outline}
                value={bookNote}
                onChangeText={setBookNote}
                multiline
                maxLength={300}
              />

              <Pressable
                style={[s.bookSubmitBtn, bookSubmitting && { opacity: 0.6 }]}
                onPress={submitBooking}
                disabled={bookSubmitting}
              >
                {bookSubmitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.bookSubmitText}>Send Booking Request</Text>
                }
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
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
          {item.is_available_now ? (
            <View style={s.availNowChip}>
              <View style={s.availNowDot} />
              <Text style={s.availNowText}>Available Now</Text>
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
  locChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#EEF2FF", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: spacing.sm,
  },
  locChipTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary, maxWidth: 220 },

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
    flexShrink: 0, position: "relative",
  },
  filterBadge: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", borderWidth: 1.5, borderColor: "#000" },

  /* Skill pills */
  chipsWrap: {
    backgroundColor: "#F9F9FE",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  pillRow: { flexDirection: "row", gap: spacing.sm },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill,
    backgroundColor: "#E8E8ED",
  },
  pillActive: { backgroundColor: "#000" },
  pillAvail: { backgroundColor: "#dcfce7", borderWidth: 1, borderColor: "#bbf7d0" },
  pillAvailActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  availDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#86efac" },
  availDotActive: { backgroundColor: "#fff" },
  pillTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#1A1C1F" },
  pillTxtActive: { color: "#fff" },

  /* List */
  list: { paddingHorizontal: spacing.md, paddingBottom: 104, gap: spacing.xl },
  loadingRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: spacing.md,
  },
  loadingTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.outline },
  resultsRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 },
  resultsCount: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#111827" },
  resultsSub: { fontFamily: fonts.body, fontSize: 12, color: "#6B7280" },

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

  // Booking sheet
  bookSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  bookSheetInner: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
  },
  bookSheetTitle:  { fontFamily: fonts.bodyBold, fontSize: 18, color: "#111827", marginBottom: 2 },
  bookSheetSub:    { fontFamily: fonts.body,     fontSize: 13, color: "#6B7280", marginBottom: 20 },
  bookFieldLabel:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#374151", marginBottom: 6, marginTop: 4 },
  bookField: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12,
    padding: 12, fontFamily: fonts.body, fontSize: 14, color: "#111827",
    minHeight: 72, textAlignVertical: "top", marginBottom: 12,
  },
  bookFieldSingle: { minHeight: 48, textAlignVertical: "center" },
  bookSubmitBtn: {
    backgroundColor: "#000", borderRadius: radius.xxl,
    height: 54, alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  bookSubmitText: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#fff" },
  availNowChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", marginTop: 5 },
  availNowDot:  { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#16a34a" },
  availNowText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#16a34a" },
});
