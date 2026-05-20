import { useCallback, useEffect, useState } from "react";
import {
  View, Text, Image, StyleSheet, Pressable,
  ScrollView, RefreshControl, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
  Linking, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { API_URL } from "../api";
import AppHeader from "../components/AppHeader";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import JobCard from "../components/JobCard";
import LocationBarComponent from "../components/LocationBar";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import ServiceCategoryCard from "../components/ServiceCategoryCard";
import WorkerCard from "../components/WorkerCard";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import OnboardingWalkthrough, { hasSeenOnboarding, markOnboardingSeen } from "../components/OnboardingWalkthrough";

/* ─────────────────────────────────────────────
   Copy
───────────────────────────────────────────── */
const KAAMNOW_WA_NUMBER = "917834811114"; // Gupshup sandbox source number

function openKaamNowWhatsApp() {
  const url = "https://wa.me/" + KAAMNOW_WA_NUMBER + "?text=Hi%20KaamNow";
  Linking.openURL(url).catch(() => {
    Alert.alert(
      "WhatsApp nahi khula",
      "WhatsApp install karein ya +91 78348 11114 par manually message karein."
    );
  });
}

const C = {
  en: {
    tagline: "Bihar's trusted work marketplace",
    heroLine1: "Need workers?",
    heroLine2: "Need work?",
    heroSub: "Direct. No middlemen. No commission.",
    pathCustomer: "Find Workers",
    pathCustomerSub: "Hire mason, cook, driver & more",
    pathWorker: "Find Work",
    pathWorkerSub: "Farm, construction, home & more",
    waBtn: "WhatsApp se shuru karein",
    waSub: "Bot par message karein — register bhi, kaam bhi",
    statsW: "Workers",
    statsV: "Villages",
    statsJ: "Jobs done",
    workerNear: "Available near you",
    signUp: "Join free",
    login: "Log in",
  },
  hi: {
    tagline: "बिहार का भरोसेमंद काम का मंच",
    heroLine1: "कारीगर चाहिए?",
    heroLine2: "काम चाहिए?",
    heroSub: "सीधा सम्पर्क। कोई बिचौलिया नहीं। कोई कमीशन नहीं।",
    pathCustomer: "कारीगर ढूंढो",
    pathCustomerSub: "मिस्त्री, रसोइया, ड्राइवर और भी बहुत",
    pathWorker: "काम ढूंढो",
    pathWorkerSub: "खेती, निर्माण, घर और भी बहुत",
    waBtn: "WhatsApp से शुरू करें",
    waSub: "Bot पर message करें — registration और काम दोनों यहीं",
    statsW: "कारीगर",
    statsV: "गाँव",
    statsJ: "काम हुए",
    workerNear: "पास में उपलब्ध",
    signUp: "मुफ्त जुड़ो",
    login: "Login करो",
  },
};

/* ─────────────────────────────────────────────
   Category chips
───────────────────────────────────────────── */
const CATS = [
  { icon: "🏗️", label: { en: "Mason", hi: "मिस्त्री" }, skill: "mason" },
  { icon: "🌾", label: { en: "Farm",  hi: "खेती"   }, skill: "harvesting" },
  { icon: "⚡", label: { en: "Elec",  hi: "बिजली"  }, skill: "electrical" },
  { icon: "✨", label: { en: "Clean", hi: "सफाई"   }, skill: "cleaning" },
  { icon: "🚛", label: { en: "Drive", hi: "ड्राइवर" }, skill: "driver" },
  { icon: "🏠", label: { en: "Home",  hi: "घर"     }, skill: "cooking" },
];

const GUEST_CATS = [
  { icon: "construct-outline", label: { en: "Mason", hi: "मिस्त्री" }, skill: "mason" },
  { icon: "leaf-outline", label: { en: "Farm", hi: "खेती" }, skill: "harvesting" },
  { icon: "flash-outline", label: { en: "Electrician", hi: "बिजली" }, skill: "electrical" },
  { icon: "sparkles-outline", label: { en: "Cleaning", hi: "सफाई" }, skill: "cleaning" },
  { icon: "car-outline", label: { en: "Driver", hi: "ड्राइवर" }, skill: "driver" },
  { icon: "home-outline", label: { en: "Home", hi: "घर" }, skill: "cooking" },
];

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function LandingScreen({ navigation }) {
  const { user }       = useAuth();
  const { lang, setLang } = useLanguage();
  const t = C[lang] || C.en;

  const isWorker   = user?.is_worker === true;
  const isCustomer = !user?.is_worker;

  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    hasSeenOnboarding().then((seen) => { if (!seen) setShowWalkthrough(true); });
  }, []);

  const handleWalkthroughDone = () => {
    setShowWalkthrough(false);
    markOnboardingSeen();
  };

  const [stats, setStats]         = useState({ workers: 0, villages: 0, completed_bookings: 0 });
  const [workers, setWorkers]     = useState([]);
  const [nearJobs, setNearJobs]   = useState(null);
  const [nearWorkers, setNearWorkers] = useState(null);
  const [engagements, setEngagements] = useState([]);
  const [myJobs, setMyJobs]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Worker-specific
  const [workerProfile, setWorkerProfile] = useState(null);
  const [previewJobs, setPreviewJobs]     = useState([]);
  const [available, setAvailable]         = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);
  // Location filter
  const [filterPincode, setFilterPincode] = useState(
    user?.address?.pincode || user?.pincode || ""
  );
  const [filterLocation, setFilterLocation] = useState(
    user?.address?.district
      ? { district: user.address.district, state: user.address.state }
      : null
  );
  const [showLocPicker, setShowLocPicker] = useState(false);

  const load = useCallback(async () => {
    const locParam = filterPincode ? { pincode: filterPincode } : {};

    api.get("/stats").then(r => setStats(r.data)).catch(() => {});

    api.get("/workers/search", { params: { available_only: true, ...locParam } }).then(r => {
      const list = Array.isArray(r.data) ? r.data : (r.data?.workers || []);
      setWorkers(list.slice(0, 4));
      setNearWorkers(list.length);
    }).catch(() => {});

    if (isWorker) {
      api.get("/jobs/feed", { params: locParam }).then(r => {
        const list = Array.isArray(r.data) ? r.data : [];
        setNearJobs(list.length);
        setPreviewJobs(list.slice(0, 3));
      }).catch(() => {});
      api.get("/workers/me/profile").then(r => {
        setWorkerProfile(r.data);
        setAvailable(r.data?.available !== false);
      }).catch(() => {});
      api.get("/engagements/mine").then(r => {
        const active = Array.isArray(r.data) ? r.data.filter(e => ["requested","accepted"].includes(e.engagement_status||e.status)) : [];
        setEngagements(active);
      }).catch(() => {});
    }
    if (isCustomer) {
      api.get("/jobs/mine").then(r => {
        setMyJobs(Array.isArray(r.data) ? r.data.filter(j => j.status === "open") : []);
      }).catch(() => {});
      api.get("/engagements/mine").then(r => {
        const pend = Array.isArray(r.data) ? r.data.filter(e => (e.engagement_status||e.status) === "requested") : [];
        setEngagements(pend);
      }).catch(() => {});
    }
    setRefreshing(false);
  }, [isWorker, isCustomer, filterPincode]);

  useEffect(() => { load(); }, [load]);

  const toggleAvailability = async (val) => {
    setAvailable(val);
    setTogglingAvail(true);
    try {
      await api.patch("/workers/me/availability", { availability_status: val ? "available" : "not_available" });
    } catch {
      setAvailable(!val);
    } finally {
      setTogglingAvail(false);
    }
  };

  const hour = new Date().getHours();
  const greet = lang === "hi"
    ? (hour < 12 ? "सुप्रभात 🙏" : hour < 17 ? "नमस्ते 🙏" : "शुभ संध्या 🙏")
    : (hour < 12 ? "Good morning 🙏" : hour < 17 ? "Namaste 🙏" : "Good evening 🙏");
  const firstName = user ? (user.name || "").split(" ")[0] : null;

  const onLocConfirm = ({ pincode, district, state }) => {
    setFilterPincode(pincode);
    setFilterLocation(district ? { district, state } : null);
    setShowLocPicker(false);
  };

  const clearLocation = () => {
    setFilterPincode("");
    setFilterLocation(null);
  };

  /* ── Shared header ──────────────────────────────────────────── */
  const Header = () => (
    <View style={s.header}>
      <View style={s.logoRow}>
        <Image source={require("../../assets/icon.png")} style={s.logoImg} resizeMode="contain" />
        <View>
          <Text style={s.logoText}>KaamNow</Text>
          <Text style={s.logoTagline}>{t.tagline}</Text>
        </View>
      </View>
      <Pressable onPress={() => setLang(lang === "hi" ? "en" : "hi")} style={s.langPill}>
        <Ionicons name="language-outline" size={14} color={colors.saffron} />
        <Text style={s.langTxt}>{lang === "hi" ? "EN" : "हिं"}</Text>
      </Pressable>
    </View>
  );

  /* ── Location bar ───────────────────────────────────────────── */
  const LocationBar = () => (
    <Pressable style={s.locBar} onPress={() => setShowLocPicker(true)}>
      <Ionicons name="location" size={15} color={colors.saffron} />
      {filterLocation ? (
        <Text style={s.locBarTxt} numberOfLines={1}>
          {filterLocation.district}, {filterLocation.state}
          {filterPincode ? ` · ${filterPincode}` : ""}
        </Text>
      ) : filterPincode ? (
        <Text style={s.locBarTxt}>{filterPincode}</Text>
      ) : (
        <Text style={s.locBarPlaceholder}>
          {lang === "hi" ? "Location चुनो" : "Set location"}
        </Text>
      )}
      <Ionicons name="chevron-down" size={13} color={colors.textMuted} style={{ marginLeft: 2 }} />
      {filterPincode ? (
        <Pressable onPress={(e) => { e.stopPropagation(); clearLocation(); }} style={s.locClearBtn} hitSlop={10}>
          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </Pressable>
  );

  /* ══ GUEST ══════════════════════════════════════════════════════ */
  if (!user) return (
    <AppScreen edges={["top"]} style={s.safe}>
      <OnboardingWalkthrough visible={showWalkthrough} onDone={handleWalkthroughDone} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.guestScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <AppHeader
          lang={lang}
          onLangToggle={() => setLang(lang === "hi" ? "en" : "hi")}
          showNotifBell={false}
          style={s.guestHeader}
        />

        <View style={s.guestLocationRow}>
          <LocationBarComponent
            pincode={filterPincode}
            district={filterLocation?.district}
            state={filterLocation?.state}
            label="Workers near you"
            onPress={() => setShowLocPicker(true)}
            style={s.guestLocationBar}
          />
          {filterPincode ? (
            <Pressable onPress={clearLocation} style={s.guestLocationClear} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* ── Hero ───────────────────────────────────────────────── */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.guestHeroNew}>
          <View style={s.heroIcon}>
            <Ionicons name="briefcase-outline" size={24} color="#fff" />
          </View>
          <Text style={s.heroTitleNew}>Kaam chahiye ya worker?</Text>
          <Text style={s.heroSubNew}>KaamNow par trusted workers aur nearby jobs dono milte hain.</Text>
          <View style={s.nearPillNew}>
            <View style={s.greenDot} />
            <Text style={s.nearTxtNew}>
              {nearWorkers !== null ? `${nearWorkers} workers near you` : "Trusted workers near you"}
            </Text>
          </View>
        </LinearGradient>

        {/* ── Two main paths ─────────────────────────────────────── */}
        <View style={s.guestPathStack}>
          <Pressable style={({ pressed }) => [s.primaryPathCard, pressed && s.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
            <View style={s.pathCopy}>
              <View style={s.pathIconPrimary}>
                <Ionicons name="search-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.primaryPathTitle}>Find Workers</Text>
                <Text style={s.primaryPathSub}>Mason, driver, cook aur more</Text>
              </View>
            </View>
            <View style={s.pathArrowPrimary}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </Pressable>

          <Pressable style={({ pressed }) => [s.secondaryPathCard, pressed && s.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
            <View style={s.pathCopy}>
              <View style={s.pathIconSecondary}>
                <Ionicons name="briefcase-outline" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.secondaryPathTitle}>Find Work</Text>
                <Text style={s.secondaryPathSub}>Nearby kaam dekhein</Text>
              </View>
            </View>
            <View style={s.pathArrowPrimary}>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* ── Category quick-browse ──────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.guestCatRow}>
          {GUEST_CATS.map(cat => (
            <ServiceCategoryCard
              key={cat.skill}
              size="chip"
              label={cat.label[lang] || cat.label.en}
              icon={cat.icon}
              onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
            </ServiceCategoryCard>
          ))}
        </ScrollView>

        {/* ── Stats strip ────────────────────────────────────────── */}
        <View style={s.guestStatsStrip}>
          {[
            { v: `${stats.workers || "1K"}+`,      l: t.statsW },
            { v: `${stats.villages || "200"}+`,    l: t.statsV },
            { v: `${stats.completed_bookings || "5K"}+`, l: t.statsJ },
          ].map(st => (
            <View key={st.l} style={s.guestStatItem}>
              <Text style={s.guestStatV}>{st.v}</Text>
              <Text style={s.guestStatL}>{st.l}</Text>
            </View>
          ))}
        </View>

        {/* ── Available workers preview ──────────────────────────── */}
        {workers.length > 0 && (
          <View style={s.guestSection}>
            <View style={s.guestSectionHeadRow}>
              <Text style={s.guestSectionHead}>Available near you</Text>
              <Pressable onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
                <Text style={s.guestSeeAllTxt}>See all workers →</Text>
              </Pressable>
            </View>
            {workers.slice(0, 3).map(w => (
              <WorkerCard
                key={w.id}
                worker={w}
                size="compact"
                showTrustBadge
                onPress={() => navigation.navigate("WorkerProfile", { id: w.id })}
              />
            ))}
            <Pressable style={s.guestSeeAllBtn} onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}>
              <Text style={s.guestSeeAllTxt}>{lang === "hi" ? "सभी कारीगर देखो →" : "See all workers →"}</Text>
            </Pressable>
          </View>
        )}

        {/* ── WhatsApp CTA ────────────────────────────────────────── */}
        <Pressable style={s.waCard} onPress={openKaamNowWhatsApp}>
          <View style={s.waIcon}><Ionicons name="logo-whatsapp" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.waTitle}>{t.waBtn}</Text>
            <Text style={s.waSub}>{t.waSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* ── Auth CTA ────────────────────────────────────────────── */}
        <View style={s.guestAuthCard}>
          <PrimaryButton title="Join free" onPress={() => navigation.navigate("PhoneSignup")} />
          <SecondaryButton
            title="Already registered? Log in"
            onPress={() => navigation.navigate("Login")}
            style={s.guestLoginButton}
          />
        </View>
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </AppScreen>
  );

  /* ══ WORKER ═════════════════════════════════════════════════════ */
  if (isWorker) {
    const workerName = workerProfile?.name || user?.name || firstName || "Worker";
    const workerSkills = Array.isArray(workerProfile?.skills) ? workerProfile.skills : [];
    const workerSkillSummary = workerSkills.length > 0 ? workerSkills.slice(0, 2).join(" · ") : (lang === "hi" ? "Skills add karein" : "Add your skills");
    const workerPhoto = workerProfile?.photo_url
      ? (workerProfile.photo_url.startsWith("http") ? workerProfile.photo_url : `${API_URL}${workerProfile.photo_url}`)
      : null;
    const workerInitials = workerName
      .split(" ")
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "K";
    const completionItems = [
      Boolean(workerProfile?.photo_url),
      Boolean(workerProfile?.bio),
      workerSkills.length > 0,
      Boolean(workerProfile?.village || workerProfile?.address?.village || workerProfile?.pincode || user?.address?.pincode),
    ];
    const completedItems = completionItems.filter(Boolean).length;
    const completionPct = Math.round((completedItems / completionItems.length) * 100);
    const needsProfileNudge = workerProfile && completedItems < completionItems.length;

    return (
    <AppScreen edges={["top"]} style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.workerPremiumScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <AppHeader
          lang={lang}
          onLangToggle={() => setLang(lang === "hi" ? "en" : "hi")}
          showNotifBell={engagements.length > 0}
          notifCount={engagements.length}
          onNotifPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
          style={s.workerPremiumHeader}
        />

        <View style={s.workerLocationRow}>
          <LocationBarComponent
            pincode={filterPincode}
            district={filterLocation?.district}
            state={filterLocation?.state}
            label="Jobs near you"
            onPress={() => setShowLocPicker(true)}
            style={s.workerLocationBar}
          />
          {filterPincode ? (
            <Pressable onPress={clearLocation} style={s.workerLocationClear} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.workerIdentityCard}>
          <View style={s.workerAvatarWrap}>
            {workerPhoto ? (
              <Image source={{ uri: workerPhoto }} style={s.workerAvatar} />
            ) : (
              <View style={[s.workerAvatar, s.workerAvatarFallback]}>
                <Text style={s.workerAvatarInitials}>{workerInitials}</Text>
              </View>
            )}
            {available ? <View style={s.workerAvatarDot} /> : null}
          </View>
          <View style={s.workerIdentityCopy}>
            <Text style={s.workerHello} numberOfLines={1}>{greet}, {workerName.split(" ")[0]}</Text>
            <Text style={s.workerSkillSummary} numberOfLines={1}>{workerSkillSummary}</Text>
          </View>
          <Pressable
            onPress={() => toggleAvailability(!available)}
            disabled={togglingAvail}
            style={({ pressed }) => [
              s.workerAvailabilityPill,
              available ? s.workerAvailabilityOn : s.workerAvailabilityOff,
              togglingAvail && { opacity: 0.6 },
              pressed && !togglingAvail && s.pressed,
            ]}
          >
            <View style={[s.workerAvailabilityDot, { backgroundColor: available ? colors.success : colors.textMuted }]} />
            <Text style={[s.workerAvailabilityText, { color: available ? colors.success : colors.textMuted }]}>
              {available ? (lang === "hi" ? "Available" : "Available") : (lang === "hi" ? "Busy" : "Busy")}
            </Text>
          </Pressable>
        </View>

        {workerProfile && (
          <View style={s.workerPremiumStatsRow}>
            <Pressable style={({ pressed }) => [s.workerPremiumStatCard, pressed && s.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}>
              <Text style={s.workerPremiumStatValue}>{(workerProfile.avg_rating || 0).toFixed(1)}</Text>
              <Text style={s.workerPremiumStatLabel}>Rating</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.workerPremiumStatCard, pressed && s.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}>
              <Text style={s.workerPremiumStatValue}>{workerProfile.total_jobs || 0}</Text>
              <Text style={s.workerPremiumStatLabel}>{lang === "hi" ? "Jobs Done" : "Jobs Done"}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [s.workerPremiumStatCard, pressed && s.pressed]} onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}>
              <Text style={[s.workerPremiumStatValue, { color: colors.money }]}>₹{workerProfile.daily_rate || 0}</Text>
              <Text style={s.workerPremiumStatLabel}>{lang === "hi" ? "Per Day" : "Per Day"}</Text>
            </Pressable>
          </View>
        )}

        {needsProfileNudge && (
          <Pressable
            style={({ pressed }) => [s.workerProfileNudgeCard, pressed && s.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
          >
            <View style={s.workerProfileNudgeIcon}>
              <Ionicons name="shield-checkmark-outline" size={19} color={colors.warning} />
            </View>
            <View style={s.workerProfileNudgeCopy}>
              <Text style={s.workerProfileNudgeTitle}>
                {lang === "hi" ? "Profile aur strong banao — zyada calls milenge" : "Profile aur strong banao — zyada calls milenge"}
              </Text>
              <View style={s.workerProgressTrack}>
                <View style={[s.workerProgressFill, { width: `${completionPct}%` }]} />
              </View>
              <Text style={s.workerProfileNudgeMeta}>{completionPct}% complete</Text>
            </View>
            <Text style={s.workerProfileNudgeCta}>Complete Profile</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [s.workerFindJobsCard, pressed && s.pressed]}
          onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.workerFindJobsGradient}>
            <View style={s.workerFindJobsCopy}>
              <Text style={s.workerFindJobsTitle}>{lang === "hi" ? "Find Jobs Near You" : "Find Jobs Near You"}</Text>
              <Text style={s.workerFindJobsSub}>
                {nearJobs !== null ? `${nearJobs} ${lang === "hi" ? "jobs available" : "jobs available"}` : "Aapke area ke kaam dekhein"}
              </Text>
            </View>
            <View style={s.workerFindJobsIcon}>
              <Ionicons name="briefcase-outline" size={28} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.workerCategoryRow}>
          {GUEST_CATS.map(cat => (
            <ServiceCategoryCard
              key={cat.skill}
              size="chip"
              label={cat.label[lang] || cat.label.en}
              icon={cat.icon}
              onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}
            />
          ))}
        </ScrollView>

        {engagements.length > 0 && (
          <View style={s.workerPremiumSection}>
            <View style={s.workerSectionHeadRow}>
              <Text style={s.workerSectionHead}>{lang === "hi" ? "Chal rahe kaam" : "Active jobs"}</Text>
              <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Profile" })} style={({ pressed }) => [s.workerSeeAllBtn, pressed && s.pressed]}>
                <Text style={s.workerSeeAllText}>Dashboard →</Text>
              </Pressable>
            </View>
            {engagements.slice(0, 2).map(e => (
              <Pressable
                key={e.id}
                style={({ pressed }) => [s.workerActiveJobCard, pressed && s.pressed]}
                onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
              >
                <View style={[s.workerActiveStatusDot, { backgroundColor: (e.engagement_status||e.status) === "accepted" ? colors.success : colors.warning }]} />
                <View style={s.workerActiveJobCopy}>
                  <Text style={s.workerActiveJobTitle} numberOfLines={1}>{e.job_title || "Active job"}</Text>
                  <Text style={s.workerActiveJobMeta} numberOfLines={1}>
                    {e.job_date || "Date not set"} · <Text style={s.workerMoney}>₹{e.daily_rate || "—"}/day</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {previewJobs.length > 0 && (
          <View style={s.workerPremiumSection}>
            <View style={s.workerSectionHeadRow}>
              <View>
                <Text style={s.workerSectionHead}>{lang === "hi" ? "Aapke liye kaam" : "Aapke liye kaam"}</Text>
                <Text style={s.workerSectionSub}>
                  {previewJobs.length} {lang === "hi" ? "matching jobs" : "matching jobs"}
                </Text>
              </View>
              <Pressable onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })} style={({ pressed }) => [s.workerSeeAllBtn, pressed && s.pressed]}>
                <Text style={s.workerSeeAllText}>See all →</Text>
              </Pressable>
            </View>
            {previewJobs.map(j => (
              <JobCard
                key={j.id}
                job={j}
                compact
                lang={lang}
                onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}
              />
            ))}
          </View>
        )}

        {engagements.length === 0 && previewJobs.length === 0 && (
          <EmptyState
            icon="briefcase-outline"
            title={lang === "hi" ? "Abhi nearby kaam nahin" : "Abhi nearby kaam nahin"}
            subtitle={lang === "hi" ? "Pincode update karo ya baad mein check karo" : "Pincode update karo ya baad mein check karo"}
            actionLabel="Refresh"
            onAction={load}
          />
        )}
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </AppScreen>
    );
  }

  /* ══ CUSTOMER ════════════════════════════════════════════════════ */
  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.customerScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <AppHeader
          lang={lang}
          onLangToggle={() => setLang(lang === "hi" ? "en" : "hi")}
          showNotifBell
          notifCount={engagements.length}
          onNotifPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "pending" } })}
          style={s.customerHeader}
        />

        <View style={s.customerLocationRow}>
          <LocationBarComponent
            pincode={filterPincode}
            district={filterLocation?.district}
            state={filterLocation?.state}
            label="Workers near you"
            onPress={() => setShowLocPicker(true)}
            style={s.customerLocationBar}
          />
          {filterPincode ? (
            <Pressable onPress={clearLocation} style={s.customerLocationClear} hitSlop={8}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={s.customerGreeting}>
          <View style={s.customerGreetingCopy}>
            <Text style={s.customerGreetingTitle} numberOfLines={1}>{greet}, {firstName}</Text>
            <Text style={s.customerGreetingSub}>
              {lang === "hi" ? "आज कौनसा काम करवाना है?" : "Aaj kaunsa kaam karwana hai?"}
            </Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Tabs", { screen: "Profile" })}
            style={({ pressed }) => [s.customerProfileButton, pressed && s.pressed]}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.primary} />
          </Pressable>
        </View>

        {engagements.length > 0 && (
          <Pressable
            style={({ pressed }) => [s.customerAlertCard, pressed && s.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "pending" } })}
          >
            <View style={s.customerAlertIcon}>
              <Ionicons name="people-outline" size={19} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.customerAlertTitle}>
                {engagements.length} {lang === "hi" ? "workers interested — abhi dekhein" : `worker${engagements.length > 1 ? "s" : ""} interested — Review now`}
              </Text>
              <Text style={s.customerAlertSub}>
                {lang === "hi" ? "Aapke posted kaam par response aaya hai" : "A worker has responded to your posted job"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.warning} />
          </Pressable>
        )}

        <View style={s.customerStatsRow}>
          <Pressable
            style={({ pressed }) => [s.customerStatCard, pressed && s.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "jobs" } })}
          >
            <Text style={s.customerStatValue}>{myJobs.length}</Text>
            <Text style={s.customerStatLabel}>{lang === "hi" ? "Open Jobs" : "Open Jobs"}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.customerStatCard, pressed && s.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "pending" } })}
          >
            <Text style={[s.customerStatValue, engagements.length > 0 && { color: colors.money }]}>{engagements.length}</Text>
            <Text style={s.customerStatLabel}>Responses</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.customerStatCard, pressed && s.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "FindWork", params: { filterPincode } })}
          >
            <Text style={s.customerStatValue}>{nearWorkers ?? "—"}</Text>
            <Text style={s.customerStatLabel}>{lang === "hi" ? "Workers Near" : "Workers Near"}</Text>
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.customerPostCard, pressed && s.pressed]}
          onPress={() => navigation.navigate("Tabs", { screen: "PostJob" })}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.customerPostGradient}>
            <View style={s.customerPostCopy}>
              <Text style={s.customerPostTitle}>{lang === "hi" ? "Post a Job" : "Post a Job"}</Text>
              <Text style={s.customerPostSub}>
                {lang === "hi" ? "60 second mein kaam post karein" : "60 second mein kaam post karein"}
              </Text>
            </View>
            <View style={s.customerPostIcon}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.customerCategoryRow}>
          {GUEST_CATS.map(cat => (
            <ServiceCategoryCard
              key={cat.skill}
              size="chip"
              label={cat.label[lang] || cat.label.en}
              icon={cat.icon}
              onPress={() => navigation.navigate("Tabs", { screen: "FindWork" })}
            />
          ))}
        </ScrollView>

        {workers.length > 0 && (
          <View style={s.customerSection}>
            <View style={s.customerSectionHeadRow}>
              <Text style={s.customerSectionHead}>{lang === "hi" ? "Available near you" : "Available near you"}</Text>
              <Pressable
                onPress={() => navigation.navigate("Tabs", { screen: "FindWork", params: { filterPincode } })}
                style={({ pressed }) => [s.customerSeeAllBtn, pressed && s.pressed]}
              >
                <Text style={s.customerSeeAllText}>{lang === "hi" ? "See all →" : "See all →"}</Text>
              </Pressable>
            </View>
            {workers.slice(0, 3).map(w => (
              <WorkerCard
                key={w.id}
                worker={w}
                size="compact"
                showTrustBadge
                onPress={() => navigation.navigate("WorkerProfile", { id: w.id })}
              />
            ))}
          </View>
        )}

        <View style={s.customerSection}>
          <View style={s.customerSectionHeadRow}>
            <Text style={s.customerSectionHead}>{lang === "hi" ? "Your open jobs" : "Your open jobs"}</Text>
            {myJobs.length > 0 ? (
              <Pressable
                onPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "jobs" } })}
                style={({ pressed }) => [s.customerSeeAllBtn, pressed && s.pressed]}
              >
                <Text style={s.customerSeeAllText}>Dashboard →</Text>
              </Pressable>
            ) : null}
          </View>

          {myJobs.length > 0 ? (
            myJobs.slice(0, 2).map(j => (
              <Pressable
                key={j.id}
                style={({ pressed }) => [s.customerJobCard, pressed && s.pressed]}
                onPress={() => navigation.navigate("Tabs", { screen: "Profile", params: { initialTab: "jobs" } })}
              >
                <View style={s.customerJobIcon}>
                  <Ionicons name={j.category === "farm" ? "leaf-outline" : j.category === "construction" ? "construct-outline" : "briefcase-outline"} size={20} color={colors.primary} />
                </View>
                <View style={s.customerJobCopy}>
                  <Text style={s.customerJobTitle} numberOfLines={1}>{j.title || j.skill || "Open job"}</Text>
                  <Text style={s.customerJobMeta} numberOfLines={1}>
                    {j.job_date || j.work_date || "Date not set"} · <Text style={s.customerMoney}>₹{j.daily_rate || j.rate || "—"}/day</Text>
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))
          ) : (
            <Pressable
              style={({ pressed }) => [s.customerEmptyJobCard, pressed && s.pressed]}
              onPress={() => navigation.navigate("Tabs", { screen: "PostJob" })}
            >
              <View style={s.customerEmptyIcon}>
                <Ionicons name="add-outline" size={21} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.customerEmptyTitle}>
                  {lang === "hi" ? "Aaj apna pehla kaam post karo" : "Aaj apna pehla kaam post karo"}
                </Text>
                <Text style={s.customerEmptySub}>
                  {lang === "hi" ? "Nearby workers ko turant notification milega" : "Nearby workers ko turant notification milega"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </AppScreen>
  );
}

/* ── Worker preview card ──────────────────────────────────────────── */
function WorkerPreviewCard({ w, lang, onPress }) {
  const photoUri = w.photo_url
    ? (w.photo_url.startsWith("http") ? w.photo_url : `${API_URL}${w.photo_url}`)
    : null;
  return (
    <Pressable style={s.wCard} onPress={onPress}>
      {photoUri
        ? <Image source={{ uri: photoUri }} style={s.wPhoto} />
        : <View style={[s.wPhoto, s.wPhotoFallback]}><Ionicons name="person" size={22} color={colors.textMuted} /></View>}
      <View style={{ flex: 1 }}>
        <Text style={s.wName}>{w.name}</Text>
        <Text style={s.wSkills} numberOfLines={1}>{(w.skills || []).slice(0, 2).join(" · ")}</Text>
        <View style={s.wMeta}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={s.wRating}>{(w.avg_rating || 0).toFixed(1)}</Text>
          <Text style={s.wDot}>·</Text>
          <Text style={s.wRate}><Text style={{ color: colors.money, fontFamily: fonts.bodyBold }}>₹{w.daily_rate}</Text>/day</Text>
          {w.village && <><Text style={s.wDot}>·</Text><Ionicons name="location-outline" size={10} color={colors.textMuted} /><Text style={s.wVillage}>{w.village}</Text></>}
        </View>
      </View>
      <View style={s.wAvailDot} />
    </Pressable>
  );
}

/* ── Location Picker Modal ───────────────────────────────────────── */
function LocationPickerModal({ visible, onClose, onConfirm, initialPincode, lang }) {
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();

  useEffect(() => {
    if (visible) setPincode(initialPincode || "");
  }, [visible]);

  const canConfirm = pincode.length === 6 && status === "success" && result;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm({ pincode, district: result.district, state: result.state });
    } else if (pincode.length === 0) {
      onConfirm({ pincode: "", district: null, state: null });
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.modalBg} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ width: "100%" }}>
          <Pressable style={s.locSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={s.sheetHandle} />

            <Text style={s.sheetTitle}>
              {lang === "hi" ? "Location चुनो" : "Set location"}
            </Text>
            <Text style={s.sheetSub}>
              {lang === "hi"
                ? "Pincode डालो — उस area के workers/jobs दिखेंगे।"
                : "Enter a pincode to filter workers and jobs in that area."}
            </Text>

            {/* Pincode input */}
            <View style={s.sheetInputRow}>
              <Ionicons name="location-outline" size={18} color={colors.saffron} />
              <TextInput
                style={s.sheetInput}
                placeholder={lang === "hi" ? "6-अंक pincode" : "6-digit pincode"}
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                autoFocus
              />
              {status === "loading" && <ActivityIndicator size="small" color={colors.saffron} />}
              {status === "success" && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
            </View>

            {/* Location preview */}
            {status === "success" && result && (
              <View style={s.locPreview}>
                <Ionicons name="location" size={14} color={colors.success} />
                <Text style={s.locPreviewTxt}>
                  {result.name} · {result.block ? `${result.block} · ` : ""}{result.district} · {result.state}
                </Text>
              </View>
            )}
            {status === "error" && errorMsg && (
              <Text style={s.locError}>{errorMsg}</Text>
            )}

            {/* Buttons */}
            <View style={s.sheetBtns}>
              {initialPincode ? (
                <Pressable style={s.sheetBtnClear} onPress={() => onConfirm({ pincode: "", district: null, state: null })}>
                  <Text style={s.sheetBtnClearTxt}>
                    {lang === "hi" ? "Filter हटाओ" : "Clear filter"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[s.sheetBtnConfirm, !canConfirm && { opacity: 0.4 }]}
                onPress={handleConfirm}
                disabled={!canConfirm}
              >
                <Ionicons name="search-outline" size={16} color="#fff" />
                <Text style={s.sheetBtnConfirmTxt}>
                  {lang === "hi" ? "यहाँ खोजो" : "Search here"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

/* ── Worker stat box ─────────────────────────────────────────────── */
function WStatBox({ icon, val, label, money }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={[s.wStatVal, money && { color: colors.money }]}>{val}</Text>
      <Text style={s.wStatLabel}>{label}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────
   Styles
───────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 8 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  logoImg: { width: 36, height: 36, borderRadius: 10 },
  logoText: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  logoTagline: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  langPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.saffronTint, borderWidth: 1, borderColor: colors.border },
  langTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.saffron },

  // Guest premium home
  guestScroll: { paddingBottom: 36 },
  guestHeader: { backgroundColor: colors.bg },
  guestLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  guestLocationBar: { flex: 1 },
  guestLocationClear: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  guestHeroNew: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.sm,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitleNew: {
    fontFamily: fonts.display,
    fontSize: 31,
    lineHeight: 37,
    color: "#fff",
    marginBottom: 8,
  },
  heroSubNew: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: "rgba(255,255,255,0.84)",
    marginBottom: 16,
  },
  nearPillNew: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  nearTxtNew: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  guestPathStack: { gap: 10, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  primaryPathCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.lg,
    ...shadow.xs,
  },
  secondaryPathCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.xs,
  },
  pressed: { opacity: 0.94 },
  pathCopy: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  pathIconPrimary: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pathIconSecondary: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryPathTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  primaryPathSub: { marginTop: 3, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  secondaryPathTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  secondaryPathSub: { marginTop: 3, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  pathArrowPrimary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  guestCatRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 6, marginBottom: spacing.md },
  guestStatsStrip: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  guestStatItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: "center",
    ...shadow.xs,
  },
  guestStatV: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
  guestStatL: { marginTop: 3, fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, textAlign: "center" },
  guestSection: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  guestSectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  guestSectionHead: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  guestSeeAllBtn: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  guestSeeAllTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  guestAuthCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    gap: 10,
  },
  guestLoginButton: { borderColor: colors.border },

  // Guest hero
  guestHero: { marginHorizontal: spacing.lg, borderRadius: 20, padding: 22, marginBottom: 12, overflow: "hidden" },
  heroBlob1: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -50 },
  heroBlob2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 30 },
  heroLine1: { fontFamily: fonts.display, fontSize: 30, color: "#fff", lineHeight: 36 },
  heroLine2: { fontFamily: fonts.display, fontSize: 30, color: "rgba(255,255,255,0.75)", lineHeight: 36, marginBottom: 10 },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 14 },
  nearPill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.18)", alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  nearTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },

  // Two paths
  pathRow: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, marginBottom: 14 },
  pathCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1.5, borderColor: colors.saffron, padding: 16, gap: 8 },
  pathIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  pathEmoji: { fontSize: 22 },
  pathTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  pathSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  pathArrow: { alignSelf: "flex-end" },

  // Categories
  catRow: { paddingHorizontal: spacing.lg, gap: 8, paddingBottom: 4 },
  catChip: { alignItems: "center", gap: 4, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 10, minWidth: 60 },
  catEmoji: { fontSize: 20 },
  catEmojiSm: { fontSize: 22, marginRight: 4 },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3, color: colors.textSecondary },

  // Stats
  statsStrip: { flexDirection: "row", marginHorizontal: spacing.lg, marginTop: 14, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  statItem: { flex: 1, alignItems: "center", borderRightWidth: 1, borderRightColor: colors.border },
  statV: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  statL: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },

  // Section
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  sectionHead: { fontFamily: fonts.bodyBold, fontSize: 13, letterSpacing: 0.5, color: colors.text, marginBottom: 10 },
  seeAllBtn: { paddingVertical: 12, alignItems: "center" },
  seeAllTxt: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.saffron },

  // Worker preview card
  wCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 8 },
  wPhoto: { width: 52, height: 52, borderRadius: 12 },
  wPhotoFallback: { backgroundColor: colors.soft, alignItems: "center", justifyContent: "center" },
  wName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  wSkills: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  wMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  wRating: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text },
  wDot: { fontSize: 11, color: colors.textMuted },
  wRate: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  wVillage: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  wAvailDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#4ADE80" },

  // WhatsApp
  waCard: { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: "#16A34A", borderRadius: 16, padding: 16 },
  waIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  waTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
  waSub: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 },

  // Auth
  authRow: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  signUpBtn: { flex: 2, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  signUpTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
  loginBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  loginTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },

  // Worker/Customer home
  workerGreetBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  workerGreetTxt: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  workerSubTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  nearJobsBadge: { backgroundColor: colors.saffronTint, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 8, alignItems: "center" },
  nearJobsNum: { fontFamily: fonts.display, fontSize: 24, color: colors.saffron },
  nearJobsLbl: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },

  workerMainCTA: { marginHorizontal: spacing.lg, marginBottom: 12, borderRadius: 18, overflow: "hidden" },
  customerMainCTA: { marginHorizontal: spacing.lg, marginBottom: 12, borderRadius: 18, overflow: "hidden" },
  workerMainGrad: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20 },
  workerMainLeft: { flex: 1 },
  workerMainTitle: { fontFamily: fonts.display, fontSize: 22, color: "#fff" },
  workerMainSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  workerMainIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },

  // Worker premium home
  workerPremiumScroll: { paddingBottom: 48 },
  workerPremiumHeader: { backgroundColor: colors.bg },
  workerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  workerLocationBar: { flex: 1 },
  workerLocationClear: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  workerIdentityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.xs,
  },
  workerAvatarWrap: { position: "relative" },
  workerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.surface2,
  },
  workerAvatarFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  workerAvatarInitials: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.primary,
  },
  workerAvatarDot: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  workerIdentityCopy: { flex: 1, minWidth: 0 },
  workerHello: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  workerSkillSummary: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  workerAvailabilityPill: {
    minHeight: 48,
    minWidth: 112,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  workerAvailabilityOn: {
    backgroundColor: colors.successLight,
    borderColor: "#BBF7D0",
  },
  workerAvailabilityOff: {
    backgroundColor: colors.surface2,
    borderColor: colors.border,
  },
  workerAvailabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  workerAvailabilityText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  workerPremiumStatsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  workerPremiumStatCard: {
    flex: 1,
    minHeight: 82,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    ...shadow.xs,
  },
  workerPremiumStatValue: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.primary,
  },
  workerPremiumStatLabel: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  workerProfileNudgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
  },
  workerProfileNudgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  workerProfileNudgeCopy: { flex: 1, minWidth: 0 },
  workerProfileNudgeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#92400E",
  },
  workerProgressTrack: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "#FDE68A",
    overflow: "hidden",
    marginTop: 8,
  },
  workerProgressFill: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.warning,
  },
  workerProfileNudgeMeta: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: "#A16207",
  },
  workerProfileNudgeCta: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.warning,
  },
  workerFindJobsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.sm,
  },
  workerFindJobsGradient: {
    minHeight: 128,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  workerFindJobsCopy: { flex: 1, minWidth: 0 },
  workerFindJobsTitle: {
    fontFamily: fonts.display,
    fontSize: 25,
    color: "#fff",
  },
  workerFindJobsSub: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.84)",
  },
  workerFindJobsIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  workerCategoryRow: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: 6,
    marginBottom: spacing.md,
  },
  workerPremiumSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  workerSectionHeadRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  workerSectionHead: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  workerSectionSub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  workerSeeAllBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.md,
  },
  workerSeeAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  workerActiveJobCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.xs,
  },
  workerActiveStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  workerActiveJobCopy: { flex: 1, minWidth: 0 },
  workerActiveJobTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
  },
  workerActiveJobMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  workerMoney: {
    fontFamily: fonts.bodyBold,
    color: colors.money,
  },

  // Customer premium home
  customerScroll: { paddingBottom: 48 },
  customerHeader: { backgroundColor: colors.bg },
  customerLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  customerLocationBar: { flex: 1 },
  customerLocationClear: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customerGreeting: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  customerGreetingCopy: { flex: 1, minWidth: 0 },
  customerGreetingTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
  },
  customerGreetingSub: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  customerProfileButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.xs,
  },
  customerAlertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
  },
  customerAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAlertTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#92400E",
  },
  customerAlertSub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#A16207",
  },
  customerStatsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  customerStatCard: {
    flex: 1,
    minHeight: 82,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    ...shadow.xs,
  },
  customerStatValue: {
    fontFamily: fonts.display,
    fontSize: 23,
    color: colors.primary,
  },
  customerStatLabel: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
  },
  customerPostCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.xl,
    overflow: "hidden",
    ...shadow.sm,
  },
  customerPostGradient: {
    minHeight: 128,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xl,
  },
  customerPostCopy: { flex: 1, minWidth: 0 },
  customerPostTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: "#fff",
  },
  customerPostSub: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.84)",
  },
  customerPostIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  customerCategoryRow: {
    paddingHorizontal: spacing.lg,
    gap: 8,
    paddingBottom: 6,
    marginBottom: spacing.md,
  },
  customerSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  customerSectionHeadRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  customerSectionHead: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
  },
  customerSeeAllBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.md,
  },
  customerSeeAllText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  customerJobCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.xs,
  },
  customerJobIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  customerJobCopy: { flex: 1, minWidth: 0 },
  customerJobTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
  },
  customerJobMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  customerMoney: {
    fontFamily: fonts.bodyBold,
    color: colors.money,
  },
  customerEmptyJobCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: spacing.md,
  },
  customerEmptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  customerEmptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.text,
  },
  customerEmptySub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },

  // Customer greeting
  custGreet: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 12, gap: 12 },
  custGreetAccent: { width: 4, height: 40, borderRadius: 2, backgroundColor: colors.saffron },
  custProfileBtn: { padding: 4 },
  custGreetName: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  custGreetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  custStatsStrip: { flexDirection: "row", marginHorizontal: spacing.lg, marginBottom: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  custStat: { flex: 1, alignItems: "center", paddingVertical: 12 },
  custStatVal: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  custStatLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },
  custStatSep: { width: 1, backgroundColor: colors.border },
  // Alert banner
  alertBanner: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: spacing.lg, marginBottom: 12, backgroundColor: "#FFFBEB", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", padding: 14 },
  alertDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#F59E0B" },
  alertTxt: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: "#92400E" },

  // Engagement card
  engCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 8 },
  engDot: { width: 10, height: 10, borderRadius: 5 },
  engTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  engMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  // Empty nudge
  emptyNudge: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyNudgeTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },

  footer: { alignItems: "center", paddingTop: spacing.xl },
  footerTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },

  // Location bar
  locBar: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: spacing.lg, marginBottom: 10, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 14 },
  locBarTxt: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  locBarPlaceholder: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  locClearBtn: { padding: 2 },

  // Location picker modal
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  locSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 6 },
  sheetSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginBottom: 20, lineHeight: 18 },
  sheetInputRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f9f8f5", borderRadius: 14, borderWidth: 1.5, borderColor: colors.saffron, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  sheetInput: { flex: 1, fontFamily: fonts.body, fontSize: 18, color: colors.text, letterSpacing: 2 },
  locPreview: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f0fdf4", borderRadius: 10, padding: 12, marginBottom: 4 },
  locPreviewTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#15803d", flex: 1 },
  locError: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginBottom: 4 },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  sheetBtnClear: { paddingVertical: 13, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, justifyContent: "center" },
  sheetBtnClearTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  sheetBtnConfirm: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 12 },
  sheetBtnConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },

  // Worker status card
  statusCard: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: 12 },
  availToggle: { alignItems: "center", gap: 3 },
  availTxt: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.5 },

  // Worker stats strip
  wStatsStrip: { flexDirection: "row", marginHorizontal: spacing.lg, marginBottom: 14, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingVertical: 14 },
  wStatVal: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  wStatLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },
  wStatSep: { width: 1, backgroundColor: colors.border },

  // Section head row (with "see all" link)
  sectionHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },

  // Job preview cards
  jobPreviewCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 8 },
  jobPreviewBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  jobPreviewTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  jobPreviewMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  jobPreviewRate: { fontFamily: fonts.display, fontSize: 16, color: colors.money },

  // Profile nudge
  profileNudge: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: spacing.lg, marginTop: 4, backgroundColor: "#FFFBEB", borderRadius: 12, borderWidth: 1, borderColor: "#FDE68A", padding: 12 },
  profileNudgeTxt: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: "#92400E" },
});
