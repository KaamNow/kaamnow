import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

export default function EarningsScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/workers/me/earnings");
      setData(r.data);
    } catch {
      // fallback: empty state
      setData({ total_this_month: 0, jobs_done: 0, avg_rating: null, engagements: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const downloadCert = async (engagementId) => {
    try {
      track("certificate_downloaded", { engagement_id: engagementId });
      await api.get(`/engagements/${engagementId}/certificate`, { responseType: "blob" });
      Alert.alert(t("earnings_cert_downloaded"));
    } catch {
      Alert.alert(t("err_generic"));
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("earnings_title")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}>
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryAmount}>₹{(data?.total_this_month || 0).toLocaleString("en-IN")}</Text>
          <Text style={styles.summaryLabel}>{t("earnings_this_month")}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>{data?.jobs_done || 0}</Text>
              <Text style={styles.summaryItemLabel}>{t("earnings_jobs_done")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryNum}>
                {data?.avg_rating ? data.avg_rating.toFixed(1) : "—"}
              </Text>
              <Text style={styles.summaryItemLabel}>{t("earnings_avg_rating")}</Text>
            </View>
          </View>
        </View>

        {/* Completed engagements */}
        <Text style={styles.sectionHeader}>{t("earnings_recent_jobs")}</Text>
        {(data?.engagements || []).length === 0
          ? <Text style={styles.emptyText}>{t("earnings_empty")}</Text>
          : (data.engagements || []).map((e) => (
            <View key={e.id} style={styles.engRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.engTitle}>{e.job_title}</Text>
                <Text style={styles.engMeta}>{e.job_date}</Text>
              </View>
              <View style={styles.engRight}>
                {e.payment_amount ? (
                  <Text style={styles.engAmount}>₹{e.payment_amount}</Text>
                ) : null}
                <TouchableOpacity onPress={() => downloadCert(e.id)} style={styles.certBtn}>
                  <Ionicons name="ribbon-outline" size={14} color={colors.indigo} />
                  <Text style={styles.certBtnText}>{t("earnings_cert")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },

  summaryCard: {
    backgroundColor: colors.indigo, borderRadius: radius.lg,
    padding: spacing.lg, alignItems: "center", marginBottom: spacing.md,
  },
  summaryAmount:    { fontFamily: fonts.display, fontSize: 36, color: "#fff", fontWeight: "700" },
  summaryLabel:     { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)", marginBottom: spacing.md },
  summaryRow:       { flexDirection: "row", width: "100%" },
  summaryItem:      { flex: 1, alignItems: "center" },
  summaryDivider:   { width: 1, backgroundColor: "rgba(255,255,255,0.25)", marginVertical: 4 },
  summaryNum:       { fontFamily: fonts.bodyBold, fontSize: 20, color: "#fff" },
  summaryItemLabel: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)" },

  sectionHeader: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.xs,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  engRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  engTitle:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  engMeta:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  engRight:  { alignItems: "flex-end", gap: 4 },
  engAmount: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.success },
  certBtn:   { flexDirection: "row", alignItems: "center", gap: 3 },
  certBtnText: { fontFamily: fonts.body, fontSize: 12, color: colors.indigo },
});
