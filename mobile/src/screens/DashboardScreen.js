import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing } from "../theme";
import Button from "../components/Button";
import Overline from "../components/Overline";

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState("bookings");
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    if (!user) return;
    try {
      const b = await api.get("/bookings/mine");
      setBookings(b.data);
      if (user.role === "customer") {
        const j = await api.get("/jobs/mine");
        setJobs(j.data);
      }
    } catch {}
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const onRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  const accept = async (id) => {
    try {
      await api.post(`/bookings/${id}/accept`);
      Alert.alert("Accepted!");
      reload();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const complete = async (id) => {
    try {
      await api.post(`/bookings/${id}/complete`);
      Alert.alert("Marked completed");
      reload();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const rate = (id) => {
    Alert.alert("Rate worker", "Tap a star count", [
      { text: "1 ⭐", onPress: () => sendRating(id, 1) },
      { text: "2 ⭐", onPress: () => sendRating(id, 2) },
      { text: "3 ⭐", onPress: () => sendRating(id, 3) },
      { text: "4 ⭐", onPress: () => sendRating(id, 4) },
      { text: "5 ⭐", onPress: () => sendRating(id, 5) },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const sendRating = async (id, r) => {
    try {
      await api.post("/bookings/rate", { booking_id: id, rating: r, comment: "" });
      Alert.alert("Thanks for rating!");
      reload();
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    }
  };

  const doLogout = async () => {
    await logout();
    navigation.navigate("Tabs", { screen: "Home" });
  };

  if (!user) return null;

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Overline>Dashboard</Overline>
            <Text style={styles.h1}>Hi {user.name.split(" ")[0]}</Text>
            <Text style={styles.subtitle}>{user.role === "worker" ? "Your jobs" : "Your hires"}</Text>
          </View>
          <Pressable testID="logout-btn" onPress={doLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>

        {user.role === "customer" && (
          <Button
            testID="post-job-cta"
            title="Post a new job"
            icon={<Ionicons name="add" size={16} color="#fff" />}
            onPress={() => navigation.navigate("PostJob")}
            style={{ marginTop: 14 }}
          />
        )}

        <View style={styles.tabs}>
          <Pressable
            testID="tab-bookings"
            onPress={() => setTab("bookings")}
            style={[styles.tab, tab === "bookings" && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === "bookings" && { color: "#fff" }]}>
              Bookings ({bookings.length})
            </Text>
          </Pressable>
          {user.role === "customer" && (
            <Pressable
              testID="tab-jobs"
              onPress={() => setTab("jobs")}
              style={[styles.tab, tab === "jobs" && styles.tabActive]}
            >
              <Text style={[styles.tabText, tab === "jobs" && { color: "#fff" }]}>
                My jobs ({jobs.length})
              </Text>
            </Pressable>
          )}
        </View>

        {tab === "bookings" && (
          <View style={{ marginTop: 14, gap: 10 }}>
            {bookings.length === 0 && <Empty msg="No bookings yet." />}
            {bookings.map((b) => (
              <View key={b.id} style={styles.card}>
                <Text style={styles.cardTitle}>{b.job_title}</Text>
                <Text style={styles.cardMeta}>
                  📅 {b.job_date} · ₹{b.daily_rate}/day · {user.role === "worker" ? `Customer: ${b.customer_name}` : `Worker: ${b.worker_name}`}
                </Text>
                <View style={styles.cardFooter}>
                  <View style={[styles.statusBadge, statusBg(b.status)]}>
                    <Text style={[styles.statusText, statusFg(b.status)]}>{b.status}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {user.role === "worker" && b.status === "pending" && (
                      <Button testID={`accept-${b.id}`} title="Accept" variant="indigo" onPress={() => accept(b.id)} style={smallBtn} />
                    )}
                    {b.status === "confirmed" && user.role === "customer" && (
                      <Button testID={`complete-${b.id}`} title="Mark done" variant="outline" onPress={() => complete(b.id)} style={smallBtn} />
                    )}
                    {b.status === "completed" && !b.rating && user.role === "customer" && (
                      <Button testID={`rate-${b.id}`} title="Rate" onPress={() => rate(b.id)} style={smallBtn} />
                    )}
                    {b.rating && (
                      <View style={styles.ratingShown}>
                        <Ionicons name="star" size={12} color={colors.saffron} />
                        <Text style={styles.ratingShownText}>{b.rating}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "jobs" && user.role === "customer" && (
          <View style={{ marginTop: 14, gap: 10 }}>
            {jobs.length === 0 && <Empty msg="No jobs posted yet." />}
            {jobs.map((j) => (
              <View key={j.id} style={styles.card}>
                <Text style={styles.cardTitle}>{j.title}</Text>
                <Text style={styles.cardMeta}>
                  📅 {j.job_date} · {j.village} · {j.workers_needed} worker(s) · ₹{j.daily_rate}/day
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const smallBtn = { paddingVertical: 8, paddingHorizontal: 12 };

function Empty({ msg }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{msg}</Text>
    </View>
  );
}

function statusBg(s) {
  if (s === "completed") return { backgroundColor: "#D1FAE5" };
  if (s === "confirmed") return { backgroundColor: colors.indigo };
  return { backgroundColor: "#F3F4F6" };
}
function statusFg(s) {
  if (s === "completed") return { color: "#065F46" };
  if (s === "confirmed") return { color: "#fff" };
  return { color: colors.text };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  h1: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: 8 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.indigo, marginTop: 2 },
  logoutBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  tabs: { flexDirection: "row", gap: 8, marginTop: 18 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  ratingShown: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.saffronTint, borderRadius: 4 },
  ratingShownText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  empty: { padding: 24, alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 13 },
});
