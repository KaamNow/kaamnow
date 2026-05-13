import { useEffect, useState } from "react";
import {
  ScrollView, View, Text, Image, StyleSheet,
  Pressable, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, spacing } from "../theme";
import Button from "../components/Button";

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;

export default function WorkerProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const { lang } = useLanguage();

  const [worker, setWorker]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [myJobs, setMyJobs]       = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [booking, setBooking]     = useState(false);

  useEffect(() => {
    api.get(`/workers/${id}`).then(r => setWorker(r.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "customer") {
      api.get("/jobs/mine")
        .then(r => setMyJobs(Array.isArray(r.data) ? r.data.filter(j => j.status === "open") : []))
        .catch(() => {});
    }
  }, [user]);

  const book = async () => {
    if (!selectedJob) return Alert.alert(
      lang === "hi" ? "Job चुनो" : "Pick a job",
      lang === "hi" ? "पहले अपनी कोई open job चुनो।" : "Select one of your open jobs first."
    );
    setBooking(true);
    try {
      await api.post("/bookings", { job_id: selectedJob, worker_id: id });
      Alert.alert(
        lang === "hi" ? "Booking भेजी!" : "Booking sent!",
        lang === "hi" ? "कारीगर जल्द ही जवाब देगा।" : "Worker will respond shortly."
      );
      navigation.navigate("Dashboard");
    } catch (err) {
      Alert.alert(lang === "hi" ? "Booking नहीं हुई" : "Booking failed", formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.saffron} />
        </View>
      </SafeAreaView>
    );
  }

  if (!worker) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Ionicons name="person-outline" size={40} color={colors.textMuted} />
          <Text style={s.loadingTxt}>{lang === "hi" ? "कारीगर नहीं मिला।" : "Worker not found."}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photo = fullUrl(worker.photo_url);
  const initials = (worker.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = (worker.name || "").split(" ")[0];

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Back button ───────────────────────────────────────────── */}
      <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
        <Ionicons name="arrow-back" size={18} color={colors.saffron} />
        <Text style={s.backTxt}>{lang === "hi" ? "वापस" : "Back"}</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* ── Gradient hero ─────────────────────────────────────────── */}
        <LinearGradient colors={["#0F766E", "#0D5F59"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.hero}>
          <View style={s.heroBlob} />

          {/* Availability badge */}
          {worker.is_available !== undefined && (
            <View style={[s.availBadge, !worker.is_available && s.availBadgeOff]}>
              <View style={[s.availDot, !worker.is_available && s.availDotOff]} />
              <Text style={s.availTxt}>
                {worker.is_available
                  ? (lang === "hi" ? "उपलब्ध" : "Available")
                  : (lang === "hi" ? "व्यस्त" : "Busy")}
              </Text>
            </View>
          )}

          {/* Photo / initials */}
          <View style={s.avatarRing}>
            {photo
              ? <Image source={{ uri: photo }} style={s.avatarImg} />
              : <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>}
          </View>

          <Text style={s.heroName}>{worker.name || "Worker"}</Text>

          {/* Rating row */}
          <View style={s.heroRating}>
            <Ionicons name="star" size={14} color="#FCD34D" />
            <Text style={s.heroRatingTxt}>{(worker.avg_rating || 0).toFixed(1)}</Text>
            {worker.total_jobs > 0 && (
              <Text style={s.heroJobsTxt}>· {worker.total_jobs} {lang === "hi" ? "काम" : "jobs"}</Text>
            )}
          </View>

          {/* Pills row */}
          <View style={s.heroPills}>
            <View style={s.heroPill}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroPillTxt}>
                {[worker.village, worker.state].filter(Boolean).join(", ") || "—"}
              </Text>
            </View>
            <View style={[s.heroPill, s.ratePill]}>
              <Text style={s.rateValue}>₹{worker.daily_rate}</Text>
              <Text style={s.rateUnit}>{lang === "hi" ? "/दिन" : "/day"}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg }}>

          {/* ── Skills ──────────────────────────────────────────────── */}
          {(worker.skills || []).length > 0 && (
            <View style={s.section}>
              <SectionHead icon="construct-outline" title={lang === "hi" ? "Skills" : "Skills"} />
              <View style={s.skillsRow}>
                {worker.skills.map(sk => (
                  <View key={sk} style={s.skillChip}>
                    <Text style={s.skillTxt}>{sk}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* ── Stats ───────────────────────────────────────────────── */}
          <View style={s.statsCard}>
            <StatBox
              icon="briefcase-outline"
              val={worker.total_jobs || 0}
              label={lang === "hi" ? "काम" : "Jobs done"}
            />
            <View style={s.statDivider} />
            <StatBox
              icon="star-outline"
              val={(worker.avg_rating || 0).toFixed(1)}
              label={lang === "hi" ? "Rating" : "Rating"}
              star
            />
            <View style={s.statDivider} />
            <StatBox
              icon="cash-outline"
              val={`₹${worker.daily_rate}`}
              label={lang === "hi" ? "प्रति दिन" : "Per day"}
              money
            />
          </View>

          {/* ── About / Bio ─────────────────────────────────────────── */}
          {!!worker.bio && (
            <View style={s.section}>
              <SectionHead icon="person-outline" title={lang === "hi" ? "परिचय" : "About"} />
              <Text style={s.bio}>{worker.bio}</Text>
            </View>
          )}

          {/* ── Booking section ─────────────────────────────────────── */}
          <View style={s.bookCard}>
            <Text style={s.bookTitle}>
              {lang === "hi" ? `${firstName} को काम दो` : `Book ${firstName}`}
            </Text>

            {/* Guest */}
            {!user && (
              <View style={{ gap: 10, marginTop: 12 }}>
                <Text style={s.note}>
                  {lang === "hi" ? "Booking के लिए login करो।" : "Log in to send a booking request."}
                </Text>
                <Button title={lang === "hi" ? "Login करो" : "Log in to book"} onPress={() => navigation.navigate("Login")} />
              </View>
            )}

            {/* Worker viewing another worker */}
            {user?.role === "worker" && (
              <Text style={s.note}>
                {lang === "hi" ? "Workers दूसरे workers को book नहीं कर सकते।" : "Workers can't book other workers."}
              </Text>
            )}

            {/* Customer */}
            {user?.role === "customer" && (
              <View style={{ marginTop: 12, gap: 8 }}>
                {myJobs.length === 0 ? (
                  <>
                    <Text style={s.note}>
                      {lang === "hi" ? "पहले कोई job post करो।" : "You don't have any open jobs yet."}
                    </Text>
                    <Button
                      title={lang === "hi" ? "Job post करो" : "Post a job first"}
                      onPress={() => navigation.navigate("PostJob")}
                      style={{ marginTop: 4 }}
                    />
                  </>
                ) : (
                  <>
                    <Text style={s.pickLabel}>
                      {lang === "hi" ? "कौनसी job के लिए?" : "Which job?"}
                    </Text>
                    {myJobs.map(j => (
                      <Pressable
                        key={j.id}
                        onPress={() => setSelectedJob(j.id)}
                        style={[s.jobOption, selectedJob === j.id && s.jobOptionOn]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.jobOptionTitle}>{j.title}</Text>
                          <Text style={s.jobOptionMeta}>
                            {j.job_date}{j.village ? ` · ${j.village}` : ""}
                          </Text>
                        </View>
                        {selectedJob === j.id && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.saffron} />
                        )}
                      </Pressable>
                    ))}
                    <Button
                      title={booking ? (lang === "hi" ? "भेज रहे हैं…" : "Sending…") : (lang === "hi" ? "Booking भेजो" : "Send booking request")}
                      loading={booking}
                      disabled={!selectedJob}
                      onPress={book}
                      style={{ marginTop: 4 }}
                    />
                  </>
                )}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHead({ icon, title }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }}>
      <Ionicons name={icon} size={15} color={colors.saffron} />
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.3, textTransform: "uppercase", color: colors.textSecondary }}>
        {title}
      </Text>
    </View>
  );
}

function StatBox({ icon, val, label, star, money }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statVal, money && { color: colors.money }]}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  backTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.saffron },

  // Hero
  hero: { marginHorizontal: spacing.lg, borderRadius: 20, padding: 24, alignItems: "center", overflow: "hidden", marginBottom: 20 },
  heroBlob: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -50 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(74,222,128,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: "rgba(74,222,128,0.4)" },
  availBadgeOff: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" },
  availDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  availDotOff: { backgroundColor: "rgba(255,255,255,0.5)" },
  availTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },
  avatarRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarImg: { width: 94, height: 94, borderRadius: 47 },
  avatarFallback: { width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontFamily: fonts.display, fontSize: 36, color: "#fff" },
  heroName: { fontFamily: fonts.display, fontSize: 26, color: "#fff", marginBottom: 8 },
  heroRating: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14 },
  heroRatingTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  heroJobsTxt: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  heroPills: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  heroPillTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#fff" },
  ratePill: { backgroundColor: "rgba(180,83,9,0.25)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  rateValue: { fontFamily: fonts.display, fontSize: 18, color: "#FCD34D" },
  rateUnit: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.75)" },

  // Sections
  section: { marginBottom: 20 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { backgroundColor: colors.saffronTint, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  skillTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.saffron },
  bio: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },

  // Stats card
  statsCard: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20, overflow: "hidden" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statVal: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Booking card
  bookCard: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, marginBottom: 20 },
  bookTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  pickLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  jobOption: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 13 },
  jobOptionOn: { borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  jobOptionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  jobOptionMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
