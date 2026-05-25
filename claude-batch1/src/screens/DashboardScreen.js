import { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Image, RefreshControl, ActivityIndicator,
  StatusBar, Dimensions, Modal, KeyboardAvoidingView, Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts } from "../theme";
import api from "../lib/api";

// ─── Layout constants (match HTML margin-mobile=16, gap-4=16) ──────────────
const PAD   = 16;
const GAP   = 16;
const { width: SW } = Dimensions.get("window");
const CARD_W = Math.floor((SW - PAD * 2 - GAP) / 2);

// ─── All categories (first 6 shown by default, rest on "View All") ──────────
const ALL_CATEGORIES = [
  { skill: "mason",      label: "Mason",       icon: "hammer-outline",    photo: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80" },
  { skill: "electrical", label: "Electrician", icon: "flash-outline",     photo: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80" },
  { skill: "farm work",  label: "Farming",     icon: "leaf-outline",      photo: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=600&q=80" },
  { skill: "cleaning",   label: "Cleaning",    icon: "sparkles-outline",  photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80" },
  { skill: "driver",     label: "Transport",   icon: "car-outline",       photo: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=600&q=80" },
  { skill: "welding",    label: "Mechanical",  icon: "construct-outline", photo: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80" },
  { skill: "plumbing",   label: "Plumber",     icon: "water-outline",     photo: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80" },
  { skill: "carpentry",  label: "Carpenter",   icon: "cut-outline",       photo: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80" },
  { skill: "painting",   label: "Painter",     icon: "color-palette-outline", photo: "https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80" },
  { skill: "cooking",    label: "Cook",        icon: "restaurant-outline", photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" },
  { skill: "helper",     label: "Helper",      icon: "hand-right-outline", photo: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80" },
];

function timeAgo(iso) {
  if (!iso) return "";
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const [urgentJobs, setUrgentJobs]   = useState([]);
  const [unreadChats, setUnreadChats]   = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [search, setSearch]           = useState("");

  const [showAllCats, setShowAllCats] = useState(false);

  // Location modal state
  const [locModal, setLocModal]           = useState(false);
  const [pinInput, setPinInput]           = useState("");
  const [locLoading, setLocLoading]       = useState(false);
  const [locSaving, setLocSaving]         = useState(false);
  const [selectedLocAddrId, setSelectedLocAddrId] = useState(null);
  const chatPulse = useRef(new Animated.Value(0)).current;

  const locationLabel =
    user?.address?.city || user?.address?.district || user?.pincode || "Set location";

  const load = useCallback(async () => {
    try {
      const [jobsRes, chatRes, notifRes] = await Promise.all([
        api.get("/jobs/feed").catch(() => ({ data: [] })),
        api.get("/chat/unread-count").catch(() => ({ data: { count: 0 } })),
        api.get("/notifications/mine/unread-count").catch(() => ({ data: { count: 0 } })),
      ]);
      const jobs = Array.isArray(jobsRes.data) ? jobsRes.data : [];
      const cutoff = Date.now() - 24 * 3600 * 1000;
      setUrgentJobs(jobs.filter((j) => j.created_at && new Date(j.created_at).getTime() > cutoff).slice(0, 5));
      setUnreadChats(chatRes.data?.count || 0);
      setUnreadNotifs(notifRes.data?.count || 0);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(chatPulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(chatPulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [chatPulse]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSearch = () => {
    const q = search.trim();
    navigation.navigate("Marketplace", q ? { search: q } : undefined);
  };

  // ── Location helpers ────────────────────────────────────────────────────
  const openLocModal = () => {
    const addrs = user?.saved_addresses || [];
    const def = addrs.find(a => a.is_default) || addrs[0] || null;
    setPinInput(def?.address?.pincode || user?.pincode || "");
    setSelectedLocAddrId(def?.id || null);
    setLocModal(true);
  };

  const useGPS = async () => {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const addr = results?.[0];
      const pincode = addr?.postalCode || "";
      if (pincode) setPinInput(pincode);
    } catch {}
    finally { setLocLoading(false); }
  };

  const saveLocation = async () => {
    const pin = pinInput.trim();
    if (!pin || pin.length < 4) return;
    setLocSaving(true);
    try {
      await api.patch("/auth/me", { pincode: pin });
      await refreshUser();
      setLocModal(false);
    } catch {}
    finally { setLocSaving(false); }
  };

  const avatarUri = user?.avatar_url || user?.photo_url || null;
  const initials  = (user?.name || "?")[0].toUpperCase();

  // build category rows from the full or trimmed list
  const visibleCats = showAllCats ? ALL_CATEGORIES : ALL_CATEGORIES.slice(0, 6);
  const catRows = [];
  for (let i = 0; i < visibleCats.length; i += 2) catRows.push(visibleCats.slice(i, i + 2));

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        {/* Location — tappable, opens pincode modal */}
        <TouchableOpacity onPress={openLocModal} activeOpacity={0.7}>
          <Text style={s.locLabel}>Location</Text>
          <View style={s.locRow}>
            <Text style={s.locText} numberOfLines={1}>{locationLabel}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textHeading} style={{ marginTop: 1 }} />
          </View>
        </TouchableOpacity>

        <View style={s.topActions}>
          <TouchableOpacity style={s.iconCircle} onPress={() => navigation.navigate("Notifications")}>
            <Ionicons name="notifications-outline" size={22} color={colors.textHeading} />
            {unreadNotifs > 0 && (
              <View style={s.notifBadge}>
                <Text style={s.notifBadgeTxt}>{unreadNotifs > 9 ? "9+" : String(unreadNotifs)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
            {avatarUri
              ? <Image source={{ uri: avatarUri }} style={s.avatar} />
              : <View style={[s.avatar, s.avatarFb]}><Text style={s.avatarTxt}>{initials}</Text></View>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable body ───────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >

        {/* Search bar — h-14 = 56, rounded-full */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={s.searchInput}
            placeholder="Search for experts or jobs..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Hero cards */}
        <View style={s.heroRow}>
          {/* Find Local Expert — dark */}
          <TouchableOpacity style={[s.heroCard, s.heroDark]} onPress={() => navigation.navigate("Marketplace")} activeOpacity={0.9}>
            <View style={[s.heroIconWrap, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <Ionicons name="search-outline" size={22} color={colors.onPrimary} />
            </View>
            <Text style={[s.heroTitle, { color: colors.onPrimary }]}>Find Local{"\n"}Expert</Text>
            <Text style={[s.heroSub, { color: "rgba(255,255,255,0.7)" }]}>Hire top talent{"\n"}for your task</Text>
          </TouchableOpacity>

          {/* Find Work — light */}
          <TouchableOpacity style={[s.heroCard, s.heroLight]} onPress={() => navigation.navigate("FindWork")} activeOpacity={0.9}>
            <View style={[s.heroIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name="briefcase-outline" size={22} color={colors.textHeading} />
            </View>
            <Text style={[s.heroTitle, { color: colors.textHeading }]}>Find Work</Text>
            <Text style={[s.heroSub, { color: colors.textSecondary }]}>Apply for nearby{"\n"}job openings</Text>
          </TouchableOpacity>
        </View>

        {/* Categories — gap-4, aspect-square, rounded-xl */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Categories</Text>
        </View>

        <View style={s.catGrid}>
          {catRows.map((row, ri) => (
            <View key={ri} style={s.catRow}>
              {row.map((cat) => (
                <TouchableOpacity
                  key={cat.skill}
                  style={s.catCard}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate("Marketplace", { skill: cat.skill })}
                >
                  <Image source={{ uri: cat.photo }} style={s.catImg} resizeMode="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.65)"]}
                    style={s.catGrad}
                    locations={[0.4, 1]}
                  />
                  <View style={s.catLabelWrap}>
                    <Ionicons name={cat.icon} size={18} color="#fff" style={{ marginBottom: 4 }} />
                    <Text style={s.catLabel}>{cat.label}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* View All / Show Less — below the grid */}
        <TouchableOpacity style={s.viewAllBtn} onPress={() => setShowAllCats((v) => !v)} activeOpacity={0.8}>
          <Text style={s.viewAllBtnTxt}>{showAllCats ? "Show Less" : "View All Categories"}</Text>
          <Ionicons name={showAllCats ? "chevron-up" : "chevron-down"} size={14} color="#6b7280" />
        </TouchableOpacity>

        {/* Urgent Jobs */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Urgent Jobs</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time" size={14} color={colors.danger} />
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.danger }}>Hiring Now</Text>
          </View>
        </View>

        {loadingJobs ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
        ) : urgentJobs.length === 0 ? (
          <View style={s.emptyJobs}>
            <Ionicons name="briefcase-outline" size={28} color={colors.textMuted} />
            <Text style={s.emptyTxt}>No urgent jobs right now</Text>
          </View>
        ) : urgentJobs.map((job) => (
          <View key={job.id} style={s.jobCard}>
            <View style={s.jobBadgeRow}>
              <View style={s.urgentBadge}><Text style={s.urgentTxt}>URGENT</Text></View>
              <Text style={s.jobTime}>{timeAgo(job.created_at)}</Text>
            </View>
            <Text style={s.jobTitle}>{job.title}</Text>
            <View style={s.jobMeta}>
              {(job.location_text || job.pincode) ? (
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text style={s.metaTxt}>{job.location_text || job.pincode}</Text>
                </View>
              ) : null}
              {(job.budget_min || job.daily_rate) ? (
                <View style={s.metaItem}>
                  <Ionicons name="cash-outline" size={14} color="#6b7280" />
                  <Text style={[s.metaTxt, { color: colors.textHeading, fontFamily: fonts.bodyBold }]}>
                    {job.budget_min
                      ? `₹${job.budget_min}${job.budget_max ? ` – ₹${job.budget_max}` : ""}`
                      : `₹${job.daily_rate}/day`}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={s.jobBtns}>
              <TouchableOpacity style={s.detailBtn} onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}>
                <Text style={s.detailBtnTxt}>Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.applyBtn} onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}>
                <Text style={s.applyBtnTxt}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Location Modal ────────────────────────────────────────────── */}
      <Modal visible={locModal} transparent animationType="fade" onRequestClose={() => setLocModal(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setLocModal(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.modalSheet}
          pointerEvents="box-none"
        >
          <View style={[s.modalCard, { paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={s.handle} />

            <Text style={s.modalTitle}>Set Your Location</Text>
            <Text style={s.modalSub}>
              {(user?.saved_addresses || []).length > 0
                ? "Pick a saved address, use GPS, or search by pincode."
                : "Use GPS or enter your pincode to find nearby jobs."}
            </Text>

            {/* Saved addresses quick-select */}
            {(user?.saved_addresses || []).length > 0 && (
              <>
                <Text style={s.locSavedHint}>SAVED ADDRESSES</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
                  style={{ marginBottom: 4 }}
                >
                  {(user.saved_addresses).map(addr => {
                    const isActive = selectedLocAddrId === addr.id;
                    const pin = addr.address?.pincode || "";
                    const area = addr.address?.village || addr.address?.district || "";
                    const icon = addr.label === "Home" ? "home-outline" : addr.label === "Work" ? "briefcase-outline" : addr.label === "Site" ? "construct-outline" : "location-outline";
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[s.locAddrChip, isActive && s.locAddrChipActive]}
                        onPress={async () => {
                          if (!pin) return;
                          setSelectedLocAddrId(addr.id);
                          setPinInput(pin);
                          setLocSaving(true);
                          try {
                            await api.patch("/auth/me", { pincode: pin });
                            await refreshUser();
                            setLocModal(false);
                          } catch {}
                          finally { setLocSaving(false); }
                        }}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={icon} size={14} color={isActive ? "#fff" : colors.primary} />
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Text style={[s.locAddrLabel, isActive && { color: "#fff" }]}>{addr.label}</Text>
                            {addr.is_default && <View style={s.locDefaultDot} />}
                          </View>
                          {area ? <Text style={[s.locAddrSub, isActive && { color: "rgba(255,255,255,0.7)" }]} numberOfLines={1}>{area}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={[s.divider, { marginTop: 12 }]}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerTxt}>or</Text>
                  <View style={s.dividerLine} />
                </View>
              </>
            )}

            {/* GPS button */}
            <TouchableOpacity style={s.gpsBtn} onPress={useGPS} disabled={locLoading} activeOpacity={0.8}>
              {locLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="navigate-outline" size={18} color={colors.textHeading} />
              }
              <Text style={s.gpsBtnTxt}>Use Current Location</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or search by pincode</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Pincode input */}
            <TextInput
              style={s.pinInput}
              value={pinInput}
              onChangeText={v => { setSelectedLocAddrId(null); setPinInput(v); }}
              placeholder="e.g. 400001"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={10}
            />

            {/* Save */}
            <TouchableOpacity
              style={[s.saveBtn, (!pinInput.trim() || locSaving) && { opacity: 0.5 }]}
              onPress={saveLocation}
              disabled={!pinInput.trim() || locSaving}
              activeOpacity={0.85}
            >
              {locSaving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.saveBtnTxt}>Save Location</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Chat FAB */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.chatFabGlow,
          {
            bottom: insets.bottom + 86,
            opacity: chatPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.32] }),
            transform: [{ scale: chatPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] }) }],
          },
        ]}
      />
      <TouchableOpacity
        style={[s.chatFab, { bottom: insets.bottom + 92 }]}
        onPress={() => navigation.navigate("ChatsList")}
        activeOpacity={0.85}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color={colors.onPrimary} />
        {unreadChats > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{unreadChats > 9 ? "9+" : String(unreadChats)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // ── Top bar
  topBar: {
    height: 64,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: PAD,
    backgroundColor: colors.surfaceCard,
    ...CARD_SHADOW,
  },
  locLabel: { fontSize: 11, fontFamily: fonts.body, color: colors.textMuted },
  locRow:   { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 1 },
  locText:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading, maxWidth: 180 },
  topActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  notifBadge: {
    position: "absolute", top: 0, right: 0,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.surfaceCard,
  },
  notifBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.onPrimary },
  avatar:   { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSubtle },
  avatarFb: { backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt:{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },

  // ── Body
  body: { paddingHorizontal: PAD, paddingTop: 24, gap: 32 },

  // ── Search (h-14 = 56px, rounded-full)
  searchBar: {
    height: 56, flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, borderRadius: 999,
    paddingHorizontal: 20,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textHeading, paddingVertical: 0 },

  // ── Hero cards
  heroRow: { flexDirection: "row", gap: GAP },
  heroCard: {
    flex: 1, borderRadius: 14, padding: 20, minHeight: 160,
    ...CARD_SHADOW,
  },
  heroDark:  { backgroundColor: colors.primary },
  heroLight: { backgroundColor: colors.surfaceCard, borderWidth: 1, borderColor: colors.borderSubtle },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, marginBottom: 4 },
  heroSub:   { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },

  // ── Section headers
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading },

  // ── View All button (below category grid)
  viewAllBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: 12, minHeight: 44,
    borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12,
    backgroundColor: colors.surfaceCard,
  },
  viewAllBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },

  // ── Category grid
  catGrid: { gap: GAP },
  catRow:  { flexDirection: "row", gap: GAP },
  catCard: { width: CARD_W, height: CARD_W, borderRadius: 12, overflow: "hidden", backgroundColor: "#d1d5db" },
  catImg:  { width: CARD_W, height: CARD_W, position: "absolute" },
  catGrad: { position: "absolute", left: 0, right: 0, bottom: 0, height: CARD_W },
  catLabelWrap: { position: "absolute", bottom: 16, left: 16 },
  catLabel: {
    fontFamily: fonts.bodyBold, fontSize: 20, color: "#fff",
    textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  // ── Urgent jobs
  emptyJobs: { alignItems: "center", gap: 8, paddingVertical: 24, backgroundColor: colors.surfaceCard, borderRadius: 14, borderWidth: 1, borderColor: colors.borderSubtle },
  emptyTxt:  { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  jobCard: {
    backgroundColor: colors.surfaceCard, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.borderSubtle,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  jobBadgeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  urgentBadge: { backgroundColor: colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  urgentTxt:   { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.danger, letterSpacing: 0.6 },
  jobTime:     { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  jobTitle:    { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading, marginBottom: 6, lineHeight: 22 },
  jobMeta:     { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metaItem:    { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:     { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  jobBtns:     { flexDirection: "row", gap: 8 },
  detailBtn: {
    flex: 1, minHeight: 48, paddingHorizontal: 12,
    alignItems: "center", justifyContent: "center",
    borderRadius: 12, borderWidth: 1, borderColor: colors.borderSubtle, backgroundColor: colors.surfaceCard,
  },
  detailBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  applyBtn: {
    flex: 1, minHeight: 48, paddingHorizontal: 12,
    alignItems: "center", justifyContent: "center",
    borderRadius: 12, backgroundColor: colors.primary,
  },
  applyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },

  // ── Location modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  modalSheet: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.borderSubtle, alignSelf: "center", marginBottom: 20,
  },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading, marginBottom: 6 },
  modalSub:   { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  gpsBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 52, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12,
    paddingVertical: 14, marginBottom: 20, backgroundColor: colors.surfaceCard,
  },
  gpsBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
  divider: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  dividerTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  pinInput: {
    minHeight: 52, borderWidth: 0, backgroundColor: colors.surface,
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading,
    letterSpacing: 3, marginBottom: 16,
  },
  saveBtn: {
    minHeight: 52, backgroundColor: colors.primary,
    borderRadius: 12, alignItems: "center", justifyContent: "center",
    marginBottom: 8, paddingVertical: 14, paddingHorizontal: 24,
  },
  saveBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },

  // ── Location modal: saved address chips
  locSavedHint: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textMuted, letterSpacing: 1, marginBottom: 10 },
  locAddrChip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, minHeight: 44,
    backgroundColor: colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: "transparent",
  },
  locAddrChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  locAddrLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  locAddrSub:   { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, maxWidth: 90 },
  locDefaultDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.statusSuccess },

  // ── Chat FAB (premium, neutral)
  chatFabGlow: {
    position: "absolute",
    right: 18,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
  },
  chatFab: {
    position: "absolute", right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 0,
    shadowColor: "#0B0B14",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
  },
  badge: {
    position: "absolute", top: -3, right: -3,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.danger, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.surfaceCard, paddingHorizontal: 3,
  },
  badgeTxt: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.onPrimary },
});
