import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

const STATUS_COLORS = {
  requested:  { bg: "#fef3c7", text: "#92400e" },
  accepted:   { bg: "#d1fae5", text: "#065f46" },
  completed:  { bg: "#dbeafe", text: "#1d4ed8" },
  rejected:   { bg: "#fee2e2", text: "#991b1b" },
  cancelled:  { bg: "#f3f4f6", text: "#6b7280" },
};

export default function EngagementDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/engagements/${id}`);
      setEngagement(r.data);
    } catch {
      Alert.alert(t("err_generic"));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const act = async (action) => {
    if (acting) return;
    setActing(true);
    try {
      if (action === "accept")   { track("accept_booking", { engagement_id: id }); await api.post(`/engagements/${id}/accept`); }
      if (action === "reject")   await api.post(`/engagements/${id}/reject`);
      if (action === "cancel")   await api.post(`/engagements/${id}/cancel`);
      if (action === "complete") await api.post(`/engagements/${id}/complete`);
      await load();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  if (!engagement) return null;

  const isWorker   = engagement.worker_id && user?.id === engagement.worker_id;
  const isCustomer = !isWorker;
  const status     = engagement.status;
  const sc         = STATUS_COLORS[status] || STATUS_COLORS.requested;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("engagement_detail_title")}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{t(`status_${status}`) || status}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}>
        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{engagement.job_title}</Text>
          {engagement.job_date ? (
            <Text style={styles.meta}>
              <Ionicons name="calendar-outline" size={13} /> {engagement.job_date}
            </Text>
          ) : null}
          {engagement.daily_rate ? (
            <Text style={styles.meta}>
              <Ionicons name="cash-outline" size={13} /> ₹{engagement.daily_rate}{t("profile_per_day_suffix")}
            </Text>
          ) : null}
        </View>

        {/* Other party */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {isWorker ? t("engagement_customer") : t("engagement_local_expert")}
          </Text>
          <Text style={styles.partyName}>
            {isWorker ? engagement.customer_name : engagement.worker_name}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsWrap}>
          {status === "requested" && !isWorker && (
            <>
              <ActionBtn label={t("engagement_accept")} onPress={() => act("accept")} color={colors.success} loading={acting} />
              <ActionBtn label={t("engagement_reject")} onPress={() => act("reject")} color={colors.danger}  loading={acting} outline />
            </>
          )}
          {status === "accepted" && (
            <>
              <ActionBtn
                label={t("chat_open")}
                icon="chatbubble-outline"
                onPress={() => navigation.navigate("Chat", { engagementId: id })}
                color={colors.indigo}
              />
              {isWorker && (
                <ActionBtn label={t("engagement_complete")} onPress={() => act("complete")} color={colors.success} loading={acting} />
              )}
              <ActionBtn label={t("engagement_cancel")} onPress={() => act("cancel")} color={colors.danger} loading={acting} outline />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ActionBtn({ label, onPress, color, outline, loading, icon }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, outline ? { backgroundColor: "#fff", borderWidth: 1.5, borderColor: color } : { backgroundColor: color }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {icon ? <Ionicons name={icon} size={16} color={outline ? color : "#fff"} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.actionBtnText, { color: outline ? color : "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusText:  { fontFamily: fonts.bodyBold, fontSize: 12 },

  card: {
    backgroundColor: "#fff", borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  jobTitle:     { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text, marginBottom: 6 },
  meta:         { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 3 },
  sectionLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  partyName:    { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },

  actionsWrap: { gap: spacing.sm },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: radius.lg, paddingVertical: 14,
  },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
