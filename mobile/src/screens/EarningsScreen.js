import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function EarningsScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/service-profiles/mine/earnings");
      setData(r.data);
    } catch {
      setData({ total_this_month: 0, total_all_time: 0, jobs_done: 0, avg_rating: null, engagements: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const engagements = data?.engagements || [];
  const avgRating = data?.avg_rating;
  const jobsDone = Number(data?.jobs_done || 0);
  const totalAllTime = Number(data?.total_all_time || 0);
  const avgPerJob = jobsDone > 0 ? Math.round(totalAllTime / jobsDone) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("earnings_title")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>This Month</Text>
          <Text style={styles.heroAmount}>
            ₹{(data?.total_this_month || 0).toLocaleString("en-IN")}
          </Text>
          {(data?.total_all_time || 0) > 0 && (
            <Text style={styles.heroSub}>
              ₹{(data.total_all_time).toLocaleString("en-IN")} total earned
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Ionicons name="briefcase-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statNum}>{jobsDone}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="star-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statNum}>{avgRating ? avgRating.toFixed(1) : "—"}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Ionicons name="trending-up-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.statNum}>
                {avgPerJob
                  ? `₹${avgPerJob.toLocaleString("en-IN")}`
                  : "—"}
              </Text>
              <Text style={styles.statLabel}>Per Job</Text>
            </View>
          </View>
        </View>

        {/* Recent jobs */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Recent Jobs</Text>

          {engagements.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={36} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyText}>{t("earnings_empty")}</Text>
            </View>
          ) : (
            engagements.map((e, idx) => (
              <View key={e.id} style={[styles.engCard, idx === engagements.length - 1 && { marginBottom: 0 }]}>
                <View style={styles.engLeft}>
                  <View style={styles.engIconWrap}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.statusSuccess} />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.engTitle} numberOfLines={1}>{e.job_title || "Completed Job"}</Text>
                  <Text style={styles.engDate}>{e.job_date || ""}</Text>
                  {e.rating != null && (
                    <View style={styles.ratingRow}>
                      {[1,2,3,4,5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= e.rating ? "star" : "star-outline"}
                          size={12}
                          color={s <= e.rating ? "#f59e0b" : colors.outline}
                        />
                      ))}
                    </View>
                  )}
                </View>
                {e.payment_amount ? (
                  <Text style={styles.engAmount}>₹{Number(e.payment_amount).toLocaleString("en-IN")}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.bg,
  },
  headerBack: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },

  heroCard: {
    margin: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
  },
  heroLabel:  { fontFamily: fonts.bodyBold, fontSize: 11, color: "rgba(255,255,255,0.7)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 },
  heroAmount: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.onPrimary, letterSpacing: -1 },
  heroSub:    { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4, marginBottom: spacing.lg },

  statsRow:    { flexDirection: "row", width: "100%", marginTop: spacing.md },
  statBox:     { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 4 },
  statNum:     { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
  statLabel:   { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.7)" },

  section:       { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionHeader: {
    fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
    marginBottom: spacing.md, marginTop: spacing.xs,
  },

  empty:     { alignItems: "center", paddingVertical: spacing.xl },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.outline },

  engCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  engLeft:    { marginRight: spacing.sm },
  engIconWrap:{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.successLight, alignItems: "center", justifyContent: "center" },
  engTitle:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  engDate:    { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  ratingRow:  { flexDirection: "row", gap: 2, marginTop: 4 },
  engAmount:  { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.success, marginLeft: spacing.sm },
});
