import { useEffect, useState } from "react";
import {
  ScrollView, View, Text, Image, StyleSheet,
  Pressable, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError, API_URL } from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import PrimaryButton from "../components/PrimaryButton";
import RatingTrustRow from "../components/RatingTrustRow";
import TrustBadge from "../components/TrustBadge";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";

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
    if (!user?.is_worker) {
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
      <AppScreen style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingTxt}>Loading worker profile...</Text>
        </View>
      </AppScreen>
    );
  }

  if (!worker) {
    return (
      <AppScreen style={s.safe}>
        <EmptyState
          icon="person-outline"
          title={lang === "hi" ? "Worker nahi mila" : "Worker not found"}
          subtitle={lang === "hi" ? "Profile dobara load karein ya worker list mein wapas jaayein." : "Try again or go back to the worker list."}
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </AppScreen>
    );
  }

  const photo = fullUrl(worker.photo_url);
  const initials = (worker.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const firstName = (worker.name || "Worker").split(" ")[0];
  const tier = worker.trust_tier || 1;
  const skills = Array.isArray(worker.skills) ? worker.skills : [];
  const rating = Number(worker.avg_rating || worker.rating || 0);
  const totalJobs = Number(worker.total_jobs || worker.jobs_done || worker.completed_jobs || 0);
  const dailyRate = worker.daily_rate || worker.dailyRate || worker.rate;
  const locationText = [worker.village, worker.district, worker.state, worker.pincode].filter(Boolean).slice(0, 3).join(", ");
  const hasLocation = Boolean(locationText);
  const hasPhone = Boolean(worker.phone || worker.phone_number || worker.mobile || worker.user?.phone);

  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <View style={s.topBar}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.backBtn, pressed && s.pressed]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.hero}>
          <View style={s.heroBlob} />

          <View style={[s.availBadge, worker.is_available === false && s.availBadgeOff]}>
            <View style={[s.availDot, worker.is_available === false && s.availDotOff]} />
            <Text style={s.availTxt}>
              {worker.is_available === false ? (lang === "hi" ? "Busy" : "Busy") : (lang === "hi" ? "Available" : "Available")}
            </Text>
          </View>

          <View style={s.avatarRing}>
            {photo
              ? <Image source={{ uri: photo }} style={s.avatarImg} />
              : <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>}
          </View>

          <Text style={s.heroName}>{worker.name || "Worker"}</Text>

          <View style={s.heroRating}>
            {rating > 0 ? <Ionicons name="star" size={14} color="#FCD34D" /> : null}
            <Text style={s.heroRatingTxt}>{rating > 0 ? rating.toFixed(1) : "New worker"}</Text>
            {totalJobs > 0 ? (
              <Text style={s.heroJobsTxt}>· {totalJobs} {lang === "hi" ? "jobs" : "jobs"}</Text>
            ) : null}
          </View>

          <TrustBadge tier={tier} />

          <View style={s.heroPills}>
            <View style={s.heroPill}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroPillTxt}>
                {locationText || "Location not added"}
              </Text>
            </View>
            <View style={[s.heroPill, s.ratePill]}>
              <Text style={s.rateValue}>₹{dailyRate || "—"}</Text>
              <Text style={s.rateUnit}>{lang === "hi" ? "/दिन" : "/day"}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={s.statsCard}>
            <StatBox
              icon="briefcase-outline"
              val={totalJobs}
              label={lang === "hi" ? "काम" : "Jobs done"}
            />
            <View style={s.statDivider} />
            <StatBox
              icon="star-outline"
              val={rating > 0 ? rating.toFixed(1) : "New"}
              label={lang === "hi" ? "Rating" : "Rating"}
              star
            />
            <View style={s.statDivider} />
            <StatBox
              icon="cash-outline"
              val={`₹${dailyRate || "—"}`}
              label={lang === "hi" ? "प्रति दिन" : "Per day"}
              money
            />
          </View>

          <View style={s.sectionCard}>
            <SectionHead icon="construct-outline" title={lang === "hi" ? "Skills" : "Skills"} />
            {skills.length > 0 ? (
              <View style={s.skillsRow}>
                {skills.map(sk => (
                  <View key={sk} style={s.skillChip}>
                    <Text style={s.skillTxt}>{sk}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.mutedText}>Skills not added yet</Text>
            )}
          </View>

          <View style={s.sectionCard}>
            <SectionHead icon="person-outline" title={lang === "hi" ? "About" : "About"} />
            <Text style={s.bio}>{worker.bio || "Profile details abhi add nahi kiye gaye."}</Text>
          </View>

          <View style={s.trustCard}>
            <SectionHead icon="shield-checkmark-outline" title="Trust signals" />
            <TrustSignal icon="call-outline" label="Phone verified" active={hasPhone} />
            <TrustSignal icon="location-outline" label="Location added" active={hasLocation} />
            <TrustSignal icon="person-circle-outline" label={tier >= 2 ? "Verified worker" : "Profile created"} active />
            <TrustSignal icon="briefcase-outline" label={`${totalJobs} jobs completed`} active={totalJobs > 0} />
            <View style={s.trustRowFooter}>
              <RatingTrustRow rating={rating} totalJobs={totalJobs} tier={tier} />
            </View>
          </View>

          <View style={s.bookCard}>
            <Text style={s.bookTitle}>
              {lang === "hi" ? `${firstName} ko kaam do` : `Book ${firstName}`}
            </Text>

            {!user && (
              <View style={s.bookingState}>
                <Text style={s.note}>{lang === "hi" ? "Booking ke liye login karein" : "Log in to send a booking request."}</Text>
                <PrimaryButton title={lang === "hi" ? "Login" : "Login"} onPress={() => navigation.navigate("Login")} />
              </View>
            )}

            {user?.is_worker === true && (
              <View style={s.infoCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={s.note}>
                  {lang === "hi" ? "Aap apni profile dekh rahe hain" : "Aap apni profile dekh rahe hain"}
                </Text>
              </View>
            )}

            {!user?.is_worker && (
              <View style={s.bookingState}>
                {myJobs.length === 0 ? (
                  <>
                    <Text style={s.note}>
                      {lang === "hi" ? "Pehle job post karein" : "You don't have any open jobs yet."}
                    </Text>
                    <PrimaryButton
                      title={lang === "hi" ? "Post a Job" : "Post a Job"}
                      onPress={() => navigation.navigate("PostJob")}
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
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </Pressable>
                    ))}
                    <PrimaryButton
                      title={booking ? (lang === "hi" ? "Sending..." : "Sending...") : (lang === "hi" ? "Booking request bhejo" : "Booking request bhejo")}
                      loading={booking}
                      disabled={!selectedJob}
                      onPress={book}
                    />
                  </>
                )}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </AppScreen>
  );
}

function SectionHead({ icon, title }) {
  return (
    <View style={s.sectionHead}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={s.sectionHeadText}>{title}</Text>
    </View>
  );
}

function StatBox({ val, label, money }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statVal, money && { color: colors.money }]}>{val}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function TrustSignal({ icon, label, active }) {
  return (
    <View style={s.trustSignal}>
      <View style={[s.trustSignalIcon, active ? s.trustSignalIconOn : s.trustSignalIconOff]}>
        <Ionicons name={active ? "checkmark" : icon} size={13} color={active ? colors.success : colors.textMuted} />
      </View>
      <Text style={[s.trustSignalText, !active && { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 14 },
  topBar: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  backBtn: {
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
  pressed: { opacity: 0.92 },
  scrollContent: { paddingBottom: 100 },

  // Hero
  hero: { marginHorizontal: spacing.lg, borderRadius: radius.xl, padding: 24, alignItems: "center", overflow: "hidden", marginBottom: 20, ...shadow.sm },
  heroBlob: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -50 },
  availBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(74,222,128,0.2)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 16, borderWidth: 1, borderColor: "rgba(74,222,128,0.4)" },
  availBadgeOff: { backgroundColor: "rgba(255,255,255,0.1)", borderColor: "rgba(255,255,255,0.2)" },
  availDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ADE80" },
  availDotOff: { backgroundColor: "rgba(255,255,255,0.5)" },
  availTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },
  avatarRing: { width: 120, height: 120, borderRadius: 26, borderWidth: 4, borderColor: "rgba(255,255,255,0.45)", alignItems: "center", justifyContent: "center", marginBottom: 14, backgroundColor: "rgba(255,255,255,0.12)" },
  avatarImg: { width: 110, height: 110, borderRadius: 22 },
  avatarFallback: { width: 110, height: 110, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontFamily: fonts.display, fontSize: 40, color: "#fff" },
  heroName: { fontFamily: fonts.display, fontSize: 28, color: "#fff", marginBottom: 8, textAlign: "center" },
  heroRating: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 14 },
  heroRatingTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  heroJobsTxt: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  heroPills: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 14 },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  heroPillTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: "#fff" },
  ratePill: { backgroundColor: "rgba(180,83,9,0.25)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)" },
  rateValue: { fontFamily: fonts.display, fontSize: 18, color: "#FCD34D" },
  rateUnit: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.75)" },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.xs,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  sectionHeadText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { backgroundColor: colors.primaryLight, paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: "#CCFBF1" },
  skillTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  bio: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  mutedText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  // Stats card
  statsCard: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, overflow: "hidden", ...shadow.xs },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16 },
  statVal: { fontFamily: fonts.display, fontSize: 22, color: colors.primary },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, marginTop: 3, textAlign: "center" },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Trust
  trustCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.xs,
  },
  trustSignal: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  trustSignalIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  trustSignalIconOn: { backgroundColor: colors.successLight },
  trustSignalIconOff: { backgroundColor: colors.surface2 },
  trustSignalText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textSecondary },
  trustRowFooter: { marginTop: 10 },

  // Booking card
  bookCard: { backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: 20, ...shadow.xs },
  bookTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  bookingState: { gap: 10, marginTop: 12 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: colors.primaryLight, borderRadius: radius.md, borderWidth: 1, borderColor: "#CCFBF1", padding: 12 },
  pickLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  jobOption: { minHeight: 64, flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: 13 },
  jobOptionOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  jobOptionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  jobOptionMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
