import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View, Text, StyleSheet, Pressable,
  ScrollView, RefreshControl, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView,
  Platform, Linking, Alert, Image, ImageBackground,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import api, { API_URL } from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import JobCard from "../components/JobCard";
import LocationBarComponent from "../components/LocationBar";
import WorkerCard from "../components/WorkerCard";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import OnboardingWalkthrough, { hasSeenOnboarding, markOnboardingSeen } from "../components/OnboardingWalkthrough";
import { CARD_IMAGES, getCategoryCardImage } from "../constants/cardImages";

const KAAMNOW_WA_NUMBER = "917834811114";

function openKaamNowWhatsApp() {
  Linking.openURL(`https://wa.me/${KAAMNOW_WA_NUMBER}?text=Hi%20KaamNow`).catch(() =>
    Alert.alert("WhatsApp not found", "Please install WhatsApp or message +91 78348 11114 directly.")
  );
}

/* ─── Strings (EN default, HI on toggle) ──────────────────────── */
const T = {
  en: {
    tagline: "Work. Earn. Grow.",
    heroTitle: "Hire skilled workers\nnear you",
    heroSub: "Verified Local Experts — matched in minutes",
    nearWorkers: (n) => `${n} experts available near you`,
    findExpert: "Find a Local Expert",
    findWork: "Find Work",
    joinFree: "Join Free",
    login: "Sign In",
    statsW: "Local Experts", statsV: "Districts", statsJ: "Jobs Done",
    greetCustomer: (name) => `Hello, ${name}`,
    greetWorker: (name) => `Welcome back, ${name}`,
    subCustomer: "What do you need help with today?",
    subWorker: "Find jobs near you",
    postJob: "Post a Job",
    findJobs: "Find Jobs Near You",
    nearJobs: (n) => `${n} jobs available`,
    available: "Available", busy: "Busy",
    activeJobs: "Active Jobs", yourJobs: "Your Open Jobs",
    availableNear: "Available Near You", seeAll: "See all →",
    emptyJobs: "Post a job — nearby Local Experts will be notified",
    noJobsNear: "No jobs nearby. Check back later.",
    completeProfile: "Complete your profile — get more calls",
    profilePct: (n) => `${n}% complete`,
    responses: "Responses", workersNear: "Experts Near",
    openJobs: "Open Jobs", dashboard: "Dashboard →",
    reviewNow: "Review now →",
    interested: (n) => `${n} expert${n > 1 ? "s" : ""} interested`,
    interestedSub: "A Local Expert responded to your job",
    setLocation: "Set your location",
  },
  hi: {
    tagline: "काम। कमाई। तरक्की।",
    heroTitle: "पास के कुशल कारीगर\nतुरंत खोजें",
    heroSub: "Verified Local Experts — मिनटों में मिलान",
    nearWorkers: (n) => `आपके पास ${n} experts उपलब्ध`,
    findExpert: "Local Expert खोजें",
    findWork: "काम खोजें",
    joinFree: "मुफ्त जुड़ें",
    login: "Login करें",
    statsW: "Local Experts", statsV: "जिले", statsJ: "काम हुए",
    greetCustomer: (name) => `नमस्ते, ${name}`,
    greetWorker: (name) => `स्वागत है, ${name}`,
    subCustomer: "आज कौनसा काम करवाना है?",
    subWorker: "पास के काम खोजें",
    postJob: "Job Post करें",
    findJobs: "Jobs खोजें",
    nearJobs: (n) => `${n} jobs उपलब्ध`,
    available: "Available", busy: "Busy",
    activeJobs: "चल रहे काम", yourJobs: "आपके Open Jobs",
    availableNear: "पास में उपलब्ध", seeAll: "सब देखें →",
    emptyJobs: "Job post करें — पास के Local Experts को notification मिलेगा",
    noJobsNear: "पास में jobs नहीं। बाद में check करें।",
    completeProfile: "Profile पूरी करें — ज़्यादा calls मिलेंगे",
    profilePct: (n) => `${n}% complete`,
    responses: "Responses", workersNear: "Experts पास में",
    openJobs: "Open Jobs", dashboard: "Dashboard →",
    reviewNow: "अभी देखें →",
    interested: (n) => `${n} expert interested`,
    interestedSub: "एक Local Expert ने आपके job पर response दिया",
    setLocation: "Location चुनें",
  },
};

// filterSkill maps to the SKILLS array in MarketplaceScreen
const CATS = [
  { label: { en: "Mason",       hi: "मिस्त्री" }, filterSkill: "mason",      icon: "construct-outline",       photo: getCategoryCardImage("mason") },
  { label: { en: "Electrician", hi: "बिजली"   }, filterSkill: "electrical",  icon: "flash-outline",           photo: getCategoryCardImage("electrical") },
  { label: { en: "Farming",     hi: "खेती"    }, filterSkill: "farm work",   icon: "leaf-outline",            photo: getCategoryCardImage("farm work") },
  { label: { en: "Cleaning",    hi: "सफाई"    }, filterSkill: "cleaning",    icon: "sparkles-outline",        photo: getCategoryCardImage("cleaning") },
  { label: { en: "Plumber",     hi: "प्लंबर"   }, filterSkill: "plumbing",   icon: "water-outline",           photo: getCategoryCardImage("plumbing") },
  { label: { en: "Carpenter",   hi: "बढ़ई"    }, filterSkill: "carpentry",   icon: "hammer-outline",          photo: getCategoryCardImage("carpentry") },
  { label: { en: "Painter",     hi: "पेंटर"   }, filterSkill: "painting",    icon: "color-palette-outline",   photo: getCategoryCardImage("painting") },
  { label: { en: "Driver",      hi: "ड्राइवर"  }, filterSkill: "driver",     icon: "car-outline",             photo: getCategoryCardImage("driver") },
  { label: { en: "Cook",        hi: "रसोइया"  }, filterSkill: "cooking",     icon: "restaurant-outline",      photo: getCategoryCardImage("cooking") },
];

const INDIGO = colors.primary;

const GUEST_HERO_CARDS = [
  {
    title: "Need an Expert?",
    subtitle: "Find verified local professionals",
    button: "Book Local Expert",
    image: CARD_IMAGES.landingHero.needExpert,
    kind: "solid",
    overlay: ["rgba(0,0,0,0.15)", "rgba(0,0,0,0.75)"],
  },
  {
    title: "Need Work?",
    subtitle: "Find premium jobs near you",
    button: "Join as Partner",
    image: CARD_IMAGES.landingHero.needWork,
    kind: "outline",
    overlay: ["rgba(0,0,0,0.25)", "rgba(0,0,0,0.85)"],
  },
];

/* ─── Location Picker Modal ────────────────────────────────────── */
function LocationPickerModal({ visible, onClose, onConfirm, initialPincode, lang }) {
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();
  const [gpsLoading, setGpsLoading] = useState(false);
  useEffect(() => { if (visible) setPincode(initialPincode || ""); }, [visible]);
  const canConfirm = pincode.length === 6 && status === "success" && result;
  const handleConfirm = () => {
    if (canConfirm) onConfirm({ pincode, district: result.district, state: result.state });
    else if (!pincode.length) onConfirm({ pincode: "", district: null, state: null });
  };
  const useCurrentLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location access denied", "Please allow location in Settings, or type your pincode manually.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en", "User-Agent": "KaamNow/1.0" } }
      );
      const data = await res.json();
      const pin = (data.address?.postcode || "").replace(/\s/g, "").slice(0, 6);
      if (pin.length === 6) {
        setPincode(pin);
      } else {
        Alert.alert("Location found", "Could not detect pincode automatically. Please type it.");
      }
    } catch {
      Alert.alert("Could not get location", "Please type your pincode manually.");
    } finally {
      setGpsLoading(false);
    }
  };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.modalBg} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
          <Pressable style={m.sheet} onPress={() => {}}>
            <View style={m.handle} />
            <View style={m.titleRow}>
              <Ionicons name="location" size={22} color={colors.primary} />
              <Text style={m.sheetTitle}>Where are you?</Text>
            </View>
            <View style={m.inputRow}>
              <Ionicons name="search-outline" size={18} color={colors.outline} />
              <TextInput
                style={m.input} placeholder="Search pincode..."
                placeholderTextColor={colors.outline} keyboardType="number-pad"
                maxLength={6} value={pincode}
                onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))} autoFocus
              />
              {status === "loading" && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
            <Pressable style={m.useLocationBtn} onPress={useCurrentLocation} disabled={gpsLoading}>
              {gpsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
              )}
              <Text style={m.useLocationText}>{gpsLoading ? "Detecting location..." : "Use current location"}</Text>
            </Pressable>
            {status === "success" && result && (
              <View style={m.locPreview}>
                <Ionicons name="checkmark-circle" size={18} color={colors.statusSuccess} />
                <Text style={m.locPreviewTxt}>{[result.district, result.state].filter(Boolean).join(", ") || `Pincode ${pincode}`}</Text>
              </View>
            )}
            {status === "error" && errorMsg && <Text style={m.locError}>{errorMsg}</Text>}
            <View style={m.sheetBtns}>
              {initialPincode ? (
                <Pressable style={m.btnClear} onPress={() => onConfirm({ pincode: "", district: null, state: null })}>
                  <Text style={m.btnClearTxt}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable style={[m.btnConfirm, !canConfirm && { opacity: 0.4 }]} onPress={handleConfirm} disabled={!canConfirm}>
                <Text style={m.btnConfirmTxt}>Search here</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function LandingScreen({ navigation }) {
  const { user }          = useAuth();
  const { lang, setLang } = useLanguage();
  const t = T[lang] || T.en;

  const isWorker = user?.has_service_profile === true;

  const [showWalkthrough, setShowWalkthrough] = useState(false);
  useEffect(() => {
    hasSeenOnboarding().then(seen => { if (!seen) setShowWalkthrough(true); });
  }, []);

  const [stats, setStats]             = useState({ workers: 0, villages: 0, completed_bookings: 0 });
  const [workers, setWorkers]         = useState([]);
  const [nearWorkers, setNearWorkers] = useState(null);
  const [nearJobs, setNearJobs]       = useState(null);
  const [incomingEngagements, setIncomingEngagements] = useState([]);
  const [sentEngagements, setSentEngagements]         = useState([]);
  const [myJobs, setMyJobs]           = useState([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [workerProfile, setWorkerProfile] = useState(null);
  const [previewJobs, setPreviewJobs]     = useState([]);
  const [available, setAvailable]         = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);
  const [filterPincode, setFilterPincode] = useState(user?.address?.pincode || "");
  const [filterLocation, setFilterLocation] = useState(
    user?.address?.district ? { district: user.address.district, state: user.address.state } : null
  );
  const [showLocPicker, setShowLocPicker] = useState(false);

  const load = useCallback(async () => {
    const locParam = filterPincode ? { pincode: filterPincode } : {};
    api.get("/stats").then(r => setStats(r.data)).catch(() => {});
    api.get("/service-profiles", { params: { available_only: true, ...locParam } }).then(r => {
      const raw = Array.isArray(r.data) ? r.data : [];
      const list = raw.map(sp => ({
        ...sp,
        name: sp.display_name || sp.name || "Local Expert",
        avg_rating: sp.rating_avg ?? 0,
        total_jobs: sp.completed_jobs ?? 0,
        is_available: sp.availability !== false,
        trust_tier: sp.trust_tier || 1,
        village: sp.village || sp.location_text,
      }));
      setWorkers(list.slice(0, 3));
      setNearWorkers(list.length);
    }).catch(() => {});
    if (user) {
      api.get("/jobs/feed", { params: locParam }).then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setNearJobs(list.length);
        setPreviewJobs(list.slice(0, 3));
      }).catch(() => {});
      api.get("/jobs/mine").then(r => {
        setMyJobs(Array.isArray(r.data) ? r.data.filter(j => j.status === "open") : []);
      }).catch(() => {});
      api.get("/work-requests/mine").then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        const pending = all.filter(e => (e.status || e.engagement_status) === "requested");
        setIncomingEngagements(pending.filter(e => e.direction === "received"));
        setSentEngagements(pending.filter(e => e.direction === "sent"));
      }).catch(() => {});
      if (user.has_service_profile) {
        api.get("/service-profiles/mine").then(r => {
          setWorkerProfile(r.data);
          setAvailable(r.data?.available !== false);
        }).catch(() => {});
      }
    }
    setRefreshing(false);
  }, [user?.id, user?.has_service_profile, filterPincode]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleAvailability = async (val) => {
    setAvailable(val);
    setTogglingAvail(true);
    try {
      await api.patch("/service-profiles/mine/availability", { is_available: val });
    } catch { setAvailable(!val); }
    finally { setTogglingAvail(false); }
  };

  const onLocConfirm = ({ pincode, district, state }) => {
    setFilterPincode(pincode);
    setFilterLocation(district ? { district, state } : null);
    setShowLocPicker(false);
  };

  const firstName = user ? (user.name || "").split(" ")[0] : null;
  const guestNearCount = nearWorkers ?? 0;
  const guestLocationSet = !!filterLocation;
  const guestPincodeOnly = !!filterPincode && !filterLocation;

  /* ══ GUEST ══════════════════════════════════════════════════ */
  if (!user) return (
    <AppScreen edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <OnboardingWalkthrough visible={showWalkthrough}
        onDone={() => { setShowWalkthrough(false); markOnboardingSeen(); }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.guestScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={s.guestHeaderRow}>
          <View style={s.guestLogoRow}>
            <Image source={require("../../assets/icon.png")} style={s.guestLogoSm} resizeMode="contain" />
            <Text style={s.guestBrand}>KaamNow</Text>
          </View>
          <Pressable
            onPress={() => {
              const order = ["en", "hi", "bho", "mai"];
              const next = order[(order.indexOf(lang) + 1) % order.length];
              setLang(next);
            }}
            style={s.langBtn}
          >
            <Text style={s.langTxt}>
              {{ en: "EN", hi: "हिं", bho: "भोज", mai: "मैथ" }[lang] || "EN"}
            </Text>
          </Pressable>
        </View>

        <Pressable
          style={[s.nearPill, !guestLocationSet && !guestPincodeOnly && s.nearPromptPill]}
          onPress={() => setShowLocPicker(true)}
        >
          {guestLocationSet || guestPincodeOnly ? (
            <>
              <View style={s.greenDot} />
              <Text style={s.nearTxt}>
                {guestLocationSet
                  ? `${guestNearCount} experts in ${filterLocation.district}`
                  : `${guestNearCount} experts near you`}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="location" size={15} color={colors.onPrimary} />
              <Text style={s.nearPromptTxt}>Enter pincode or use current location</Text>
            </>
          )}
          <Ionicons
            name="chevron-forward"
            size={14}
            color={guestLocationSet || guestPincodeOnly ? colors.outline : colors.onPrimary}
          />
        </Pressable>

        <View style={s.guestHeroStack}>
          {GUEST_HERO_CARDS.map((card, index) => (
            <ImageBackground key={card.title} source={card.image} resizeMode="cover" style={s.guestHeroCard} imageStyle={s.guestHeroImage}>
              <LinearGradient colors={card.overlay} style={s.guestHeroOverlay}>
                <View style={s.guestHeroCopy}>
                  <Text style={s.guestHeroTitle}>{card.title}</Text>
                  <Text style={s.guestHeroSub}>{card.subtitle}</Text>
                </View>
                <Pressable
                  style={[s.guestHeroButton, card.kind === "outline" && s.guestHeroButtonOutline]}
                  onPress={() => navigation.navigate("Tabs", { screen: index === 0 ? "Browse" : "FindWork" })}
                >
                  <Text style={[s.guestHeroButtonText, card.kind === "outline" && s.guestHeroButtonTextOutline]}>{card.button}</Text>
                </Pressable>
              </LinearGradient>
            </ImageBackground>
          ))}
        </View>

        <View style={s.guestSection}>
          <Text style={s.catHeading}>Popular categories</Text>
          <View style={s.catChipRow}>
            {CATS.slice(0, 6).map(cat => (
              <Pressable key={cat.filterSkill} style={s.catCard}
                onPress={() => navigation.navigate("Tabs", { screen: "Browse", params: { skill: cat.filterSkill } })}>
                <View style={s.catIconCircle}>
                  <Ionicons name={cat.icon} size={22} color={colors.onPrimary} />
                </View>
                <Text style={s.catLabel} numberOfLines={1}>
                  {cat.label[lang] || cat.label.en}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={s.statsRow}>
          {[
            { v: `${stats.workers || "500"}+`,           l: t.statsW },
            { v: `${stats.villages || "45"}+`,           l: t.statsV },
            { v: `${stats.completed_bookings || "1K"}+`, l: t.statsJ },
          ].map((st, i) => (
            <View key={i} style={s.statItem}>
              <Text style={s.statVal}>{st.v}</Text>
              <Text style={s.statLabel}>{st.l}</Text>
            </View>
          ))}
        </View>

        <View style={s.authStack}>
          <Pressable style={s.authJoinBtn} onPress={() => navigation.navigate("PhoneSignup")}>
            <Text style={s.authJoinTxt}>{t.joinFree}</Text>
          </Pressable>
          <Pressable style={s.authLoginBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={s.authLoginTxt}>{t.login}</Text>
          </Pressable>
        </View>
      </ScrollView>

      <LocationPickerModal visible={showLocPicker} onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm} initialPincode={filterPincode} lang={lang} />
    </AppScreen>
  );

  /* ══ LOGGED IN — unified, every user sees both sides ══════════ */
  const workerName   = workerProfile?.name || user.name || firstName || "User";
  const workerSkills = Array.isArray(workerProfile?.skills) ? workerProfile.skills : [];
  const workerPhoto  = workerProfile?.photo_url
    ? (workerProfile.photo_url.startsWith("http") ? workerProfile.photo_url : `${API_URL}${workerProfile.photo_url}`)
    : (user.photo_url || null);
  const userInitials = workerName.split(" ").filter(Boolean).map(p => p[0]).slice(0, 2).join("").toUpperCase() || "K";

  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}>

        {/* ─── Header ─────────────────────────────────────────────── */}
        <LinearGradient colors={[INDIGO, colors.primaryContainer]} style={s.loggedHeader}>
          <Pressable onPress={() => setShowLocPicker(true)} style={s.locBar}>
            <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={s.locBarTxt} numberOfLines={1}>
              {filterLocation ? `${filterLocation.district}, ${filterLocation.state}` : filterPincode || t.setLocation}
            </Text>
            <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.5)" />
          </Pressable>

          <View style={s.identity}>
            <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Profile" })} style={s.avatarWrap}>
              {workerPhoto
                ? <Image source={{ uri: workerPhoto }} style={s.avatar} />
                : <View style={[s.avatar, s.avatarFallback]}>
                    <Text style={s.avatarInitials}>{userInitials}</Text>
                  </View>}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.identityName}>{t.greetCustomer(firstName || "there")}</Text>
              <Text style={s.identitySub} numberOfLines={1}>
                {workerSkills.length > 0 ? workerSkills.slice(0, 2).join(" · ") : "KaamNow Member"}
              </Text>
            </View>
          </View>

          <View style={s.headerStats}>
            {[
              { val: myJobs.length,       label: t.openJobs,    onPress: () => navigation.navigate("Activity", { initialTab: "posted" }) },
              { val: nearWorkers ?? "—",  label: t.workersNear, onPress: () => navigation.navigate("Tabs", { screen: "Browse" }) },
              { val: incomingEngagements.length, label: t.responses, onPress: () => navigation.navigate("Activity", { initialTab: "received" }) },
            ].map((st, i) => (
              <Pressable key={i} style={[s.headerStatItem, i < 2 && s.headerStatBorder]} onPress={st.onPress}>
                <Text style={[s.headerStatVal, i === 2 && incomingEngagements.length > 0 && { color: "#4ADE80" }]}>{st.val}</Text>
                <Text style={s.headerStatLabel}>{st.label}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        {/* ─── Engagement alerts (direction-aware) ─────────────────── */}
        {incomingEngagements.length > 0 && (
          <Pressable style={s.alertCard}
            onPress={() => navigation.navigate("Activity", { initialTab: "received" })}>
            <View style={s.alertIcon}><Ionicons name="people-outline" size={18} color={colors.warning} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.alertTitle}>{t.interested(incomingEngagements.length)} — {t.reviewNow}</Text>
              <Text style={s.alertSub}>{t.interestedSub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </Pressable>
        )}
        {sentEngagements.length > 0 && (
          <Pressable
            style={[s.alertCard, { backgroundColor: "#eff6ff", borderColor: "#93c5fd" }]}
            onPress={() => navigation.navigate("Activity", { initialTab: "sent" })}>
            <View style={[s.alertIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="paper-plane-outline" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: "#1d4ed8" }]}>
                {sentEngagements.length} request{sentEngagements.length > 1 ? "s" : ""} sent — Awaiting response
              </Text>
              <Text style={s.alertSub}>Tap to track your requests</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </Pressable>
        )}

        {/* ─── Dual CTA: Find Expert | Find Work ──────────────────── */}
        <View style={s.dualCta}>
          <Pressable style={s.ctaHalfExpert}
            onPress={() => navigation.navigate("Tabs", { screen: "Browse" })}>
            <View style={s.ctaHalfIcon}>
              <Ionicons name="search-outline" size={22} color={colors.primary} />
            </View>
            <Text style={s.ctaHalfTitle}>Find Expert</Text>
            <Text style={s.ctaHalfSub}>{nearWorkers ?? 0} near you</Text>
          </Pressable>
          <Pressable style={s.ctaHalfWork}
            onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
            <View style={[s.ctaHalfIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Ionicons name="briefcase-outline" size={22} color={colors.onPrimary} />
            </View>
            <Text style={[s.ctaHalfTitle, { color: colors.onPrimary }]}>Find Work</Text>
            <Text style={[s.ctaHalfSub, { color: "rgba(255,255,255,0.7)" }]}>{nearJobs ?? 0} jobs near</Text>
          </Pressable>
        </View>

        {/* ─── Post Job CTA ───────────────────────────────────────── */}
        <Pressable style={s.ctaCard} onPress={() => navigation.navigate("PostJob")}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={s.ctaGrad}>
            <View style={{ flex: 1 }}>
              <Text style={s.ctaTitle}>{t.postJob}</Text>
              <Text style={s.ctaSub}>Local Experts near you will be notified</Text>
            </View>
            <View style={s.ctaIcon}><Ionicons name="add-circle-outline" size={26} color={colors.onPrimary} /></View>
          </LinearGradient>
        </Pressable>

        {/* ─── Category chips ─────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {CATS.map(cat => (
            <Pressable key={cat.filterSkill} style={s.loggedCatChip}
              onPress={() => navigation.navigate("Tabs", { screen: "Browse", params: { skill: cat.filterSkill } })}>
              <View style={s.loggedCatIcon}>
                <Ionicons name={cat.icon} size={24} color={colors.primary} />
              </View>
              <Text style={s.loggedCatLabel} numberOfLines={1}>{cat.label[lang] || cat.label.en}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ─── My Posted Jobs ─────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{t.yourJobs}</Text>
            {myJobs.length > 0 && (
              <Pressable onPress={() => navigation.navigate("Activity", { initialTab: "posted" })} hitSlop={8}>
                <Text style={s.seeAll}>{t.seeAll}</Text>
              </Pressable>
            )}
          </View>
          {myJobs.length > 0 ? myJobs.slice(0, 2).map(j => (
            <Pressable key={j.id} style={s.rowCard}
              onPress={() => navigation.navigate("JobDetail", { jobId: j.id })}>
              <View style={s.jobIcon}>
                <Ionicons name={j.category === "farm" ? "leaf-outline" : "briefcase-outline"} size={19} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{j.title || j.skill || "Open job"}</Text>
                <Text style={s.rowMeta}>{j.job_date || "Date TBD"} · <Text style={{ color: colors.statusSuccess }}>₹{j.daily_rate || "—"}/day</Text></Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.outline} />
            </Pressable>
          )) : (
            <Pressable style={s.emptyJobCard} onPress={() => navigation.navigate("PostJob")}>
              <View style={s.jobIcon}><Ionicons name="add-outline" size={20} color={colors.primary} /></View>
              <Text style={s.emptyJobTxt}>{t.emptyJobs}</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {/* ─── Jobs Near You ───────────────────────────────────────── */}
        {previewJobs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Jobs Near You</Text>
              <Pressable onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })} hitSlop={8}>
                <Text style={s.seeAll}>{t.seeAll}</Text>
              </Pressable>
            </View>
            {previewJobs.map(j => (
              <JobCard key={j.id} job={j} compact lang={lang}
                onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })} />
            ))}
          </View>
        )}

      </ScrollView>

      <LocationPickerModal visible={showLocPicker} onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm} initialPincode={filterPincode} lang={lang} />
    </AppScreen>
  );
}

/* ─── Styles ───────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 48 },

  /* Guest layout */
  guestScroll: { paddingBottom: 36, backgroundColor: colors.background },
  guestHeaderRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  guestLogoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  guestLogoSm: { width: 34, height: 34, borderRadius: 10 },
  guestBrand: { fontFamily: fonts.display, fontSize: 22, color: colors.textHeading },
  langBtn: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
  },
  langTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  nearPill: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  nearTxt:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  nearPromptPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nearPromptTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onPrimary },
  guestHeroStack: { marginBottom: 20 },
  guestHeroCard: {
    height: 220,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surfaceContainer,
  },
  guestHeroImage: { borderRadius: 20 },
  guestHeroOverlay: {
    flex: 1,
    justifyContent: "space-between",
    padding: 20,
  },
  guestHeroCopy: { gap: 6 },
  guestHeroTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.onPrimary,
    lineHeight: 34,
  },
  guestHeroSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  guestHeroButton: {
    height: 44,
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    borderRadius: 12,
    paddingHorizontal: 18,
  },
  guestHeroButtonOutline: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: colors.onPrimary,
  },
  guestHeroButtonText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.primary,
  },
  guestHeroButtonTextOutline: { color: colors.onPrimary },
  guestSection: {
    marginBottom: 18,
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: INDIGO, borderRadius: 16, paddingVertical: 18,
  },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.onPrimary },
  outlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: colors.surfaceCard, borderRadius: 16, paddingVertical: 16,
    borderWidth: 2, borderColor: INDIGO,
  },
  outlineBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: INDIGO },

  /* Category grid */
  catHeading: {
    fontFamily: fonts.headlineLg,
    fontSize: 17,
    color: colors.textHeading,
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  catChipRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 2,
  },
  catCard: {
    width: "31.3%",
    aspectRatio: 1,
    justifyContent: "flex-end",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 10,
    overflow: "hidden",
    ...shadow.xs,
  },
  catIconCircle: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.onPrimary,
    textAlign: "left",
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: 18,
  },
  statItem:  {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
  },
  statVal:   { fontFamily: fonts.display, fontSize: 22, color: colors.textHeading },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.outline, marginTop: 2, textAlign: "center" },

  authStack: { gap: 10, paddingHorizontal: spacing.lg },
  authJoinBtn:  {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 14,
  },
  authJoinTxt:  { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onPrimary },
  authLoginBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
  },
  authLoginTxt: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textHeading },

  /* Logged-in header */
  loggedHeader: { paddingHorizontal: spacing.lg, paddingTop: 12, paddingBottom: 0 },
  locBar: {
    flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  locBarTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: "rgba(255,255,255,0.85)", maxWidth: 220 },

  identity:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatarWrap:    { position: "relative" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarFallback:{ alignItems: "center", justifyContent: "center" },
  avatarInitials:{ fontFamily: fonts.display, fontSize: 22, color: colors.onPrimary },
  avatarDot: {
    position: "absolute", right: 1, bottom: 1, width: 12, height: 12,
    borderRadius: 6, backgroundColor: "#4ADE80", borderWidth: 2, borderColor: INDIGO,
  },
  identityName: { fontFamily: fonts.display, fontSize: 21, color: colors.onPrimary },
  identitySub:  { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  profileBtn:   { width: 40, height: 40, alignItems: "center", justifyContent: "center" },

  availPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5 },
  availOn:   { borderColor: "#4ADE80", backgroundColor: "rgba(74,222,128,0.1)" },
  availOff:  { borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.06)" },
  availDot:  { width: 7, height: 7, borderRadius: 4 },
  availTxt:  { fontFamily: fonts.bodyBold, fontSize: 13 },

  headerStats: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)", marginTop: 4 },
  headerStatItem: { flex: 1, alignItems: "center", paddingVertical: 14 },
  headerStatBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.12)" },
  headerStatVal:   { fontFamily: fonts.display, fontSize: 22, color: colors.onPrimary },
  headerStatLabel: { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  /* Content */
  nudge: {
    flexDirection: "row", alignItems: "center", gap: 12,
    margin: spacing.lg,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    ...shadow.xs,
  },
  nudgeTitle:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  progressTrack: { height: 4, borderRadius: 999, backgroundColor: colors.surfaceContainerHigh, marginTop: 6, overflow: "hidden" },
  progressFill:  { height: 4, borderRadius: 999, backgroundColor: colors.primary },
  nudgePct:      { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 3 },

  dualCta: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: 10 },
  ctaHalfExpert: {
    flex: 1, backgroundColor: colors.surfaceCard, borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.borderSubtle, padding: 16, gap: 6, ...shadow.xs,
  },
  ctaHalfWork: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.xxl, padding: 16, gap: 6, ...shadow.sm },
  ctaHalfIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, alignItems: "center", justifyContent: "center" },
  ctaHalfTitle: { fontFamily: fonts.headlineMd, fontSize: 16, color: colors.textHeading },
  ctaHalfSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline },

  ctaCard: { marginHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.sm, borderRadius: radius.xxl, overflow: "hidden", ...shadow.sm },
  ctaGrad: { flexDirection: "row", alignItems: "center", padding: 20, minHeight: 88 },
  ctaTitle:{ fontFamily: fonts.display, fontSize: 22, color: colors.onPrimary },
  ctaSub:  { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.78)", marginTop: 4 },
  ctaIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  chipRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: spacing.sm },
  loggedCatChip: {
    width: 80,
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    ...shadow.xs,
  },
  loggedCatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  loggedCatLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textHeading,
    textAlign: "center",
  },

  section:      { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  sectionHead:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, minHeight: 36 },
  sectionTitle: { fontFamily: fonts.headlineMd, fontSize: 16, color: colors.textHeading },
  seeAll:       { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  rowCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceCard, borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, marginBottom: 8, ...shadow.sm,
  },
  rowDot:  { width: 10, height: 10, borderRadius: 5 },
  rowTitle:{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textHeading },
  rowMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },
  jobIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryFixed, alignItems: "center", justifyContent: "center" },

  alertCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    ...shadow.xs,
  },
  alertIcon:  { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceContainerLow, alignItems: "center", justifyContent: "center" },
  alertTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  alertSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  emptyJobCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surfaceContainerLow, borderRadius: radius.xxl,
    borderWidth: 1, borderColor: colors.borderSubtle, padding: 14,
  },
  emptyJobTxt: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
});

const m = StyleSheet.create({
  modalBg:   { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet:     { backgroundColor: colors.surfaceCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
  handle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderSubtle, alignSelf: "center", marginBottom: 20 },
  titleRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  sheetTitle:{ fontFamily: fonts.headlineLg, fontSize: 20, color: colors.textHeading },
  inputRow:  { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceCard, borderRadius: 16, borderWidth: 1, borderColor: colors.borderSubtle, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 18 },
  input:     { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textHeading },
  useLocationBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.surfaceContainerLow, borderRadius: 16, paddingVertical: 12, marginBottom: 18 },
  useLocationText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },
  locPreview:{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f0fdf4", borderRadius: 14, padding: 12, marginBottom: 4 },
  locPreviewTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#15803d" },
  locError:  { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginBottom: 4 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnClear:  { paddingVertical: 14, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderSubtle },
  btnClearTxt:{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textBody },
  btnConfirm: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
