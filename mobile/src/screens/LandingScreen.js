import { useCallback, useEffect, useState } from "react";
import {
  View, Text, Image, StyleSheet, Pressable,
  ScrollView, RefreshControl, Switch, Modal,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, spacing } from "../theme";

/* ─────────────────────────────────────────────
   Copy
───────────────────────────────────────────── */
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
    waBtn: "Book via WhatsApp",
    waSub: "No app needed",
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
    waBtn: "WhatsApp पर बुक करो",
    waSub: "App की ज़रूरत नहीं",
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

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export default function LandingScreen({ navigation }) {
  const { user }       = useAuth();
  const { lang, setLang } = useLanguage();
  const t = C[lang] || C.en;

  const isWorker   = user?.role === "worker";
  const isCustomer = user?.role === "customer";

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
        <View style={s.logoBadge}><Text style={s.logoK}>K</Text></View>
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
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.saffron} />}
      >
        <Header />
        <LocationBar />

        {/* ── Hero ───────────────────────────────────────────────── */}
        <LinearGradient colors={["#0F766E", "#0A5C56"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.guestHero}>
          <View style={s.heroBlob1} />
          <View style={s.heroBlob2} />
          <Text style={s.heroLine1}>{t.heroLine1}</Text>
          <Text style={s.heroLine2}>{t.heroLine2}</Text>
          <Text style={s.heroSub}>{t.heroSub}</Text>
          {nearWorkers !== null && (
            <View style={s.nearPill}>
              <View style={s.greenDot} />
              <Text style={s.nearTxt}>{nearWorkers} {t.workerNear}</Text>
            </View>
          )}
        </LinearGradient>

        {/* ── Two main paths ─────────────────────────────────────── */}
        <View style={s.pathRow}>
          {/* Customer path */}
          <Pressable style={[s.pathCard, { flex: 1 }]} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
            <View style={[s.pathIconWrap, { backgroundColor: "#F0FDFA" }]}>
              <Text style={s.pathEmoji}>🔍</Text>
            </View>
            <Text style={s.pathTitle}>{t.pathCustomer}</Text>
            <Text style={s.pathSub}>{t.pathCustomerSub}</Text>
            <View style={s.pathArrow}>
              <Ionicons name="arrow-forward" size={14} color={colors.saffron} />
            </View>
          </Pressable>

          {/* Worker path */}
          <Pressable style={[s.pathCard, { flex: 1, borderColor: colors.border }]} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
            <View style={[s.pathIconWrap, { backgroundColor: "#F0FDFA" }]}>
              <Text style={s.pathEmoji}>💼</Text>
            </View>
            <Text style={s.pathTitle}>{t.pathWorker}</Text>
            <Text style={s.pathSub}>{t.pathWorkerSub}</Text>
            <View style={s.pathArrow}>
              <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* ── Category quick-browse ──────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATS.map(cat => (
            <Pressable key={cat.skill} style={s.catChip}
              onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
              <Text style={s.catEmoji}>{cat.icon}</Text>
              <Text style={s.catLabel}>{cat.label[lang] || cat.label.en}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Stats strip ────────────────────────────────────────── */}
        <View style={s.statsStrip}>
          {[
            { v: `${stats.workers || "1K"}+`,      l: t.statsW },
            { v: `${stats.villages || "200"}+`,    l: t.statsV },
            { v: `${stats.completed_bookings || "5K"}+`, l: t.statsJ },
          ].map(st => (
            <View key={st.l} style={s.statItem}>
              <Text style={s.statV}>{st.v}</Text>
              <Text style={s.statL}>{st.l}</Text>
            </View>
          ))}
        </View>

        {/* ── Available workers preview ──────────────────────────── */}
        {workers.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionHead}>{t.workerNear}</Text>
            {workers.slice(0, 3).map(w => <WorkerPreviewCard key={w.id} w={w} lang={lang} onPress={() => navigation.navigate("WorkerProfile", { id: w.id })} />)}
            <Pressable style={s.seeAllBtn} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
              <Text style={s.seeAllTxt}>{lang === "hi" ? "सभी कारीगर देखो →" : "See all workers →"}</Text>
            </Pressable>
          </View>
        )}

        {/* ── WhatsApp CTA ────────────────────────────────────────── */}
        <Pressable style={s.waCard} onPress={() => navigation.navigate("Tabs", { screen: "Chat" })}>
          <View style={s.waIcon}><Ionicons name="logo-whatsapp" size={28} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.waTitle}>{t.waBtn}</Text>
            <Text style={s.waSub}>{t.waSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>

        {/* ── Auth CTA ────────────────────────────────────────────── */}
        <View style={s.authRow}>
          <Pressable style={s.signUpBtn} onPress={() => navigation.navigate("PhoneSignup")}>
            <Text style={s.signUpTxt}>{t.signUp}</Text>
          </Pressable>
          <Pressable style={s.loginBtn} onPress={() => navigation.navigate("Login")}>
            <Text style={s.loginTxt}>{t.login}</Text>
          </Pressable>
        </View>

        <View style={s.footer}>
          <Text style={s.footerTxt}>KaamNow · Bihar se shuru 🙏</Text>
        </View>
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </SafeAreaView>
  );

  /* ══ WORKER ═════════════════════════════════════════════════════ */
  const CAT_EMOJI = { construction:"🏗️", farm:"🌾", electrical:"⚡", cleaning:"✨", transport:"🚛", home:"🏠" };

  if (isWorker) return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.saffron} />}
      >
        <Header />
        <LocationBar />

        {/* ── Status card: greeting + availability toggle ──────────── */}
        <View style={s.statusCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.workerGreetTxt}>{greet}, {firstName}</Text>
            <Text style={s.workerSubTxt}>{lang === "hi" ? "आज का काम तैयार है क्या?" : "Ready for today's work?"}</Text>
          </View>
          <View style={s.availToggle}>
            <Switch
              value={available}
              onValueChange={toggleAvailability}
              disabled={togglingAvail}
              trackColor={{ false: colors.border, true: "#4ADE80" }}
              thumbColor="#fff"
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
            <Text style={[s.availTxt, { color: available ? colors.success : colors.textMuted }]}>
              {available ? (lang === "hi" ? "उपलब्ध" : "Available") : (lang === "hi" ? "व्यस्त" : "Busy")}
            </Text>
          </View>
        </View>

        {/* ── Stats strip ──────────────────────────────────────────── */}
        {workerProfile && (
          <View style={s.wStatsStrip}>
            <WStatBox icon="star" val={(workerProfile.avg_rating || 0).toFixed(1)} label={lang === "hi" ? "Rating" : "Rating"} />
            <View style={s.wStatSep} />
            <WStatBox icon="briefcase-outline" val={workerProfile.total_jobs || 0} label={lang === "hi" ? "काम" : "Jobs done"} />
            <View style={s.wStatSep} />
            <WStatBox icon="cash-outline" val={`₹${workerProfile.daily_rate || 0}`} label={lang === "hi" ? "प्रति दिन" : "Per day"} money />
          </View>
        )}

        {/* ── Big Find Jobs CTA ─────────────────────────────────────── */}
        <Pressable style={s.workerMainCTA} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
          <LinearGradient colors={["#0F766E", "#0A5C56"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.workerMainGrad}>
            <View style={s.workerMainLeft}>
              <Text style={s.workerMainTitle}>{lang === "hi" ? "पास के काम देखो" : "Find Jobs Near You"}</Text>
              <Text style={s.workerMainSub}>
                {nearJobs !== null ? `${nearJobs} ${lang === "hi" ? "काम मिले" : "jobs available"}` : (lang === "hi" ? "अभी देखो" : "Browse now")}
              </Text>
            </View>
            <View style={s.workerMainIcon}>
              <Ionicons name="briefcase-outline" size={28} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Category chips ────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATS.map(cat => (
            <Pressable key={cat.skill} style={s.catChip} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
              <Text style={s.catEmoji}>{cat.icon}</Text>
              <Text style={s.catLabel}>{cat.label[lang] || cat.label.en}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Active jobs ───────────────────────────────────────────── */}
        {engagements.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionHead}>{lang === "hi" ? "चल रहे काम" : "Active jobs"}</Text>
            {engagements.slice(0, 2).map(e => (
              <Pressable key={e.id} style={s.engCard} onPress={() => navigation.navigate("Tabs", { screen: "Account" })}>
                <View style={[s.engDot, { backgroundColor: (e.engagement_status||e.status) === "accepted" ? colors.success : "#F59E0B" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.engTitle}>{e.job_title}</Text>
                  <Text style={s.engMeta}>{e.job_date} · <Text style={{ color: colors.money, fontFamily: fonts.bodyBold }}>₹{e.daily_rate}/day</Text></Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Job previews when no active work ─────────────────────── */}
        {engagements.length === 0 && previewJobs.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHeadRow}>
              <Text style={s.sectionHead}>{lang === "hi" ? "आपके लिए काम" : "Jobs matching you"}</Text>
              <Pressable onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
                <Text style={s.seeAllTxt}>{lang === "hi" ? "सभी देखो →" : "See all →"}</Text>
              </Pressable>
            </View>
            {previewJobs.map(j => (
              <Pressable key={j.id} style={s.jobPreviewCard} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
                <View style={s.jobPreviewBadge}>
                  <Text style={{ fontSize: 22 }}>{CAT_EMOJI[j.category] || "💼"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.jobPreviewTitle} numberOfLines={1}>{j.title}</Text>
                  <Text style={s.jobPreviewMeta} numberOfLines={1}>
                    {j.village || j.address?.village || "—"}{j.job_date ? ` · ${j.job_date}` : ""}
                  </Text>
                </View>
                <Text style={s.jobPreviewRate}>
                  ₹{j.daily_rate}<Text style={{ fontSize: 10, color: colors.textMuted }}>/day</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Profile nudge ─────────────────────────────────────────── */}
        {workerProfile && (!workerProfile.photo_url || !workerProfile.bio) && (
          <Pressable style={s.profileNudge} onPress={() => navigation.navigate("Tabs", { screen: "Account" })}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.money} />
            <Text style={s.profileNudgeTxt} numberOfLines={1}>
              {lang === "hi" ? "Profile पूरा करो — 2× ज़्यादा calls मिलेंगी" : "Complete profile — get 2× more job calls"}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.money} />
          </Pressable>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {engagements.length === 0 && previewJobs.length === 0 && (
          <View style={s.emptyNudge}>
            <Ionicons name="briefcase-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyNudgeTxt}>{lang === "hi" ? "अभी कोई काम नहीं। ऊपर से ढूंढो।" : "No active jobs yet. Browse above."}</Text>
          </View>
        )}
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </SafeAreaView>
  );

  /* ══ CUSTOMER ════════════════════════════════════════════════════ */
  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.saffron} />}
      >
        <Header />
        <LocationBar />

        {/* ── Customer greeting ────────────────────────────────────── */}
        <View style={s.custGreet}>
          <View style={s.custGreetAccent} />
          <View style={{ flex: 1 }}>
            <Text style={s.custGreetName}>{greet}, {firstName}</Text>
            <Text style={s.custGreetSub}>{lang === "hi" ? "आज कौनसा काम करवाना है?" : "What do you need done today?"}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate("CustomerProfile")} style={s.custProfileBtn}>
            <Ionicons name="person-circle-outline" size={28} color={colors.saffron} />
          </Pressable>
        </View>

        {/* Quick stats strip — each card is tappable */}
        <View style={s.custStatsStrip}>
          <Pressable
            style={s.custStat}
            onPress={() => navigation.navigate("Tabs", { screen: "Account", params: { initialTab: "jobs" } })}
          >
            <Text style={s.custStatVal}>{myJobs.length}</Text>
            <Text style={s.custStatLabel}>{lang === "hi" ? "Open Jobs" : "Open jobs"}</Text>
          </Pressable>
          <View style={s.custStatSep} />
          <Pressable
            style={s.custStat}
            onPress={() => navigation.navigate("Tabs", { screen: "Account", params: { initialTab: "pending" } })}
          >
            <Text style={[s.custStatVal, engagements.length > 0 && { color: colors.money }]}>{engagements.length}</Text>
            <Text style={s.custStatLabel}>{lang === "hi" ? "Responses" : "Responses"}</Text>
          </Pressable>
          <View style={s.custStatSep} />
          <Pressable
            style={s.custStat}
            onPress={() => navigation.navigate("Tabs", { screen: "Workers", params: { filterPincode } })}
          >
            <Text style={s.custStatVal}>{nearWorkers ?? "—"}</Text>
            <Text style={s.custStatLabel}>{lang === "hi" ? "कारीगर पास" : "Workers near"}</Text>
          </Pressable>
        </View>

        {/* Pending responses alert */}
        {engagements.length > 0 && (
          <Pressable style={s.alertBanner} onPress={() => navigation.navigate("Tabs", { screen: "Account" })}>
            <View style={s.alertDot} />
            <Text style={s.alertTxt}>
              {engagements.length} {lang === "hi" ? "कारीगर ने interest दिखाया — अभी देखो" : `worker${engagements.length > 1 ? "s" : ""} interested — review now`}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.saffron} />
          </Pressable>
        )}

        {/* Primary CTA — Post Job */}
        <Pressable style={s.customerMainCTA} onPress={() => navigation.navigate("PostJob")}>
          <LinearGradient colors={["#0F766E", "#0A5C56"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.workerMainGrad}>
            <View style={s.workerMainLeft}>
              <Text style={s.workerMainTitle}>{lang === "hi" ? "काम दो" : "Post a Job"}</Text>
              <Text style={s.workerMainSub}>{lang === "hi" ? "60 सेकंड में पोस्ट करो" : "Post in 60 seconds"}</Text>
            </View>
            <View style={s.workerMainIcon}>
              <Ionicons name="add-circle-outline" size={28} color="#fff" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Category quick browse */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catRow}>
          {CATS.map(cat => (
            <Pressable key={cat.skill} style={s.catChip} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
              <Text style={s.catEmoji}>{cat.icon}</Text>
              <Text style={s.catLabel}>{cat.label[lang] || cat.label.en}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Available workers preview */}
        {workers.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionHead}>
              {lang === "hi" ? "पास में उपलब्ध कारीगर" : "Available workers near you"}
            </Text>
            {workers.slice(0, 3).map(w => (
              <WorkerPreviewCard key={w.id} w={w} lang={lang} onPress={() => navigation.navigate("WorkerProfile", { id: w.id })} />
            ))}
            <Pressable style={s.seeAllBtn} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
              <Text style={s.seeAllTxt}>{lang === "hi" ? "सभी कारीगर देखो →" : "See all workers →"}</Text>
            </Pressable>
          </View>
        )}

        {/* My open jobs */}
        {myJobs.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionHead}>{lang === "hi" ? "आपके खुले काम" : "Your open jobs"}</Text>
            {myJobs.slice(0, 2).map(j => (
              <Pressable key={j.id} style={s.engCard} onPress={() => navigation.navigate("Tabs", { screen: "Account" })}>
                <Text style={s.catEmojiSm}>{j.category === "construction" ? "🏗️" : j.category === "farm" ? "🌾" : "💼"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.engTitle}>{j.title}</Text>
                  <Text style={s.engMeta}>{j.job_date} · <Text style={{ color: colors.money, fontFamily: fonts.bodyBold }}>₹{j.daily_rate}/day</Text></Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <LocationPickerModal
        visible={showLocPicker}
        onClose={() => setShowLocPicker(false)}
        onConfirm={onLocConfirm}
        initialPincode={filterPincode}
        lang={lang}
      />
    </SafeAreaView>
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
  logoBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  logoK: { fontFamily: fonts.display, fontSize: 19, color: "#fff" },
  logoText: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  logoTagline: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  langPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.saffronTint, borderWidth: 1, borderColor: colors.border },
  langTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.saffron },

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
