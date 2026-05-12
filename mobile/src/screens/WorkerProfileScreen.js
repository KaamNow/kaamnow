import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError, API_URL } from "../api";
const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing } from "../theme";
import Overline from "../components/Overline";
import Button from "../components/Button";
import TrustBadge from "../components/TrustBadge";

export default function WorkerProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myJobs, setMyJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    api.get(`/workers/${id}`).then((r) => setWorker(r.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === "customer") {
      api.get("/jobs/mine").then((r) => setMyJobs(r.data.filter((j) => j.status === "open"))).catch(() => {});
    }
  }, [user]);

  const book = async () => {
    if (!selectedJob) return Alert.alert("Pick a job", "Select one of your open jobs first.");
    setBooking(true);
    try {
      await api.post("/bookings", { job_id: selectedJob, worker_id: id });
      Alert.alert("✅ Booking sent!", "Worker will respond shortly.");
      navigation.navigate("Dashboard");
    } catch (err) {
      Alert.alert("Booking failed", formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  if (loading || !worker) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Pressable
        testID="back-to-marketplace"
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            {worker.photo_url ? (
              <Image source={{ uri: fullUrl(worker.photo_url) }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, { alignItems: "center", justifyContent: "center" }]}>
                <Ionicons name="person" size={42} color={colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{worker.name || "Worker"}</Text>
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.meta}>
                  {[worker.village, worker.state].filter(Boolean).join(", ") || "—"}
                </Text>
              </View>
              <View style={{ marginTop: 8 }}>
                <TrustBadge tier={worker.trust_tier} />
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color={colors.saffron} />
                <Text style={styles.ratingText}>{(worker.avg_rating || 0).toFixed(1)}</Text>
                <Text style={styles.jobsText}>· {worker.total_jobs} jobs done</Text>
              </View>
              <Text style={styles.rate}>₹{worker.daily_rate}<Text style={styles.rateUnit}>/day</Text></Text>
            </View>
          </View>

          <Overline style={{ marginTop: spacing.lg }}>Skills</Overline>
          <View style={styles.skillsRow}>
            {(worker.skills || []).map((s) => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillText}>{s}</Text>
              </View>
            ))}
          </View>

          <Overline style={{ marginTop: spacing.lg }}>About</Overline>
          <Text style={styles.bio}>{worker.bio}</Text>

          <View style={styles.statsRow}>
            <Stat label="Jobs" value={worker.total_jobs} />
            <Stat label="Rating" value={(worker.avg_rating || 0).toFixed(1)} />
            <Stat label="Trust" value={`Tier ${worker.trust_tier}`} />
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionH}>Book {(worker.name || "this worker").split(" ")[0]}</Text>

          {!user && (
            <Button
              testID="login-to-book"
              title="Log in to book"
              onPress={() => navigation.navigate("Login")}
              style={{ marginTop: 12 }}
            />
          )}

          {user?.role === "worker" && (
            <Text style={styles.note}>Workers can&apos;t book other workers.</Text>
          )}

          {user?.role === "customer" && (
            <>
              {myJobs.length === 0 ? (
                <>
                  <Text style={styles.note}>You don&apos;t have any open jobs yet.</Text>
                  <Button
                    testID="post-job-link"
                    title="Post a job first"
                    onPress={() => navigation.navigate("PostJob")}
                    style={{ marginTop: 12 }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.note}>Pick one of your open jobs:</Text>
                  {myJobs.map((j) => (
                    <Pressable
                      key={j.id}
                      testID={`job-pick-${j.id}`}
                      onPress={() => setSelectedJob(j.id)}
                      style={[styles.jobOption, selectedJob === j.id && styles.jobOptionActive]}
                    >
                      <Text style={styles.jobOptionTitle}>{j.title}</Text>
                      <Text style={styles.jobOptionMeta}>{j.job_date} · {j.village}</Text>
                    </Pressable>
                  ))}
                  <Button
                    testID="confirm-booking"
                    title={booking ? "Sending…" : "Send booking request"}
                    loading={booking}
                    disabled={!selectedJob}
                    onPress={book}
                    style={{ marginTop: 12 }}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  value: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  label: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.lg, paddingBottom: 8 },
  backText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 18 },
  headerRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  photo: { width: 92, height: 92, borderRadius: radius.lg, backgroundColor: colors.border },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  meta: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  ratingText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  jobsText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  rate: { fontFamily: fonts.display, fontSize: 24, color: colors.indigo, marginTop: 8 },
  rateUnit: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  skillChip: { backgroundColor: "#F3F4F6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  skillText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary },
  bio: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border },
  sectionH: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  note: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 8 },
  jobOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, marginTop: 8 },
  jobOptionActive: { borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  jobOptionTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  jobOptionMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  empty: { flex: 1, padding: 40, alignItems: "center", justifyContent: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted },
});
