import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Overline from "../components/Overline";

export default function FindWorkScreen({ navigation }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pub, mine] = await Promise.all([
        api.get("/jobs/public").catch(() => ({ data: [] })),
        user?.role === "worker"
          ? api.get("/engagements/mine").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setJobs(Array.isArray(pub.data) ? pub.data : []);
      setEngagements(Array.isArray(mine.data) ? mine.data : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const engagementFor = (jobId) =>
    engagements.find((e) => e.job_id === jobId && ["requested", "accepted"].includes(e.status));

  const onApply = async (jobId) => {
    if (!user) {
      Alert.alert("Log in required", "Sign up or log in as a worker to apply.", [
        { text: "Cancel", style: "cancel" },
        { text: "Log in", onPress: () => navigation.navigate("Login") },
      ]);
      return;
    }
    if (user.role !== "worker") {
      Alert.alert("Workers only", "Only worker accounts can apply for jobs.");
      return;
    }
    try {
      await api.post(`/jobs/${jobId}/interest`);
      Alert.alert("Applied", "Customer will be notified.");
      load();
    } catch (err) {
      Alert.alert("Could not apply", formatApiError(err));
    }
  };

  const withdraw = async (engId) => {
    try {
      await api.post(`/engagements/${engId}/cancel`);
      load();
    } catch (err) {
      Alert.alert("Failed", formatApiError(err));
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.head}>
        <Overline>Find Work</Overline>
        <Text style={styles.h1}>Open jobs across India</Text>
        <Text style={styles.subtitle}>
          {jobs.length} open {jobs.length === 1 ? "job" : "jobs"}
        </Text>
      </View>

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator color={colors.indigo} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const eng = engagementFor(item.id);
            return (
              <View style={styles.card}>
                <Text style={styles.title}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.meta}>
                    {item.village || item.address?.village || "—"}
                  </Text>
                  <Text style={styles.dot}>·</Text>
                  <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.meta}>{item.job_date}</Text>
                </View>
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
                <View style={styles.bottomRow}>
                  <Text style={styles.rate}>
                    ₹{item.daily_rate}
                    <Text style={styles.rateUnit}>/day</Text>
                  </Text>
                  <Text style={styles.workers}>
                    {item.workers_needed} worker{item.workers_needed > 1 ? "s" : ""}
                  </Text>
                </View>

                {eng ? (
                  eng.status === "accepted" ? (
                    <View style={styles.acceptedBox}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.acceptedText}>You're hired!</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.btnSecondary} onPress={() => withdraw(eng.id)}>
                      <Text style={styles.btnSecondaryText}>Withdraw application</Text>
                    </Pressable>
                  )
                ) : (
                  <Pressable style={styles.btnPrimary} onPress={() => onApply(item.id)}>
                    <Text style={styles.btnPrimaryText}>
                      {user?.role === "worker" ? "Apply now" : "Log in to apply"}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No open jobs right now.</Text>
              <Text style={styles.emptyHint}>Pull down to refresh.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: {
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 2 },
  subtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, flexWrap: "wrap" },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  dot: { color: colors.textMuted, marginHorizontal: 4 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  rate: { fontFamily: fonts.display, fontSize: 20, color: colors.indigo },
  rateUnit: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  workers: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  btnPrimary: {
    backgroundColor: colors.saffron,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 14,
  },
  btnPrimaryText: { fontFamily: fonts.bodyBold, color: "#fff", fontSize: 14 },
  btnSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: 14,
  },
  btnSecondaryText: { fontFamily: fonts.bodyBold, color: colors.textSecondary, fontSize: 14 },
  acceptedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: radius.md,
    marginTop: 14,
  },
  acceptedText: { fontFamily: fonts.bodySemi, color: "#15803d", fontSize: 13 },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted, fontSize: sizes.body },
  emptyHint: { fontFamily: fonts.body, color: colors.textMuted, fontSize: sizes.small, marginTop: 4 },
});
