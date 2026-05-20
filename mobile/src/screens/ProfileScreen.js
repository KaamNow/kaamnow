import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Switch, Alert, Share, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

// ── Tier badge ────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const { t } = useTranslation();
  const labels = { 1: t("tier_1"), 2: t("tier_2"), 3: t("tier_3"), 4: t("tier_4") };
  const bgColors = { 1: "#e5e7eb", 2: "#d1fae5", 3: "#dbeafe", 4: "#fef9c3" };
  const textColors = { 1: "#6b7280", 2: "#065f46", 3: "#1d4ed8", 4: "#92400e" };
  return (
    <View style={[styles.tierBadge, { backgroundColor: bgColors[tier] || bgColors[1] }]}>
      <Text style={[styles.tierText, { color: textColors[tier] || textColors[1] }]}>
        {labels[tier] || labels[1]}
      </Text>
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ── Row item ───────────────────────────────────────────────────────────────
function RowItem({ icon, label, value, onPress, danger, rightElement }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textMuted} />
        <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {rightElement || <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [availableNow, setAvailableNow] = useState(
    user?.is_available_now || false
  );
  const [toggling, setToggling] = useState(false);

  const isWorker = user?.is_worker === true;

  const toggleAvailableNow = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      if (availableNow) {
        await api.delete("/workers/me/available-now");
        setAvailableNow(false);
      } else {
        await api.post("/workers/me/available-now");
        setAvailableNow(true);
      }
      await refreshUser();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setToggling(false);
    }
  }, [availableNow, toggling]);

  const handleLogout = () => {
    Alert.alert(
      t("profile_logout"),
      "",
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("profile_logout"), style: "destructive", onPress: logout },
      ]
    );
  };

  const shareReferral = async () => {
    if (!user?.referral_code) return;
    try {
      await Share.share({
        message: `Join KaamNow — India's local work marketplace! Use my code ${user.referral_code} and get ₹50 credits on your first booking. https://kaamnow.com/join?ref=${user.referral_code}`,
      });
    } catch {}
  };

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile header ─────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {user.photo_url ? (
            <Image source={{ uri: user.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>
                {(user.name || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.editAvatarBtn}
            onPress={() => navigation.navigate("EditPhoto")}
          >
            <Ionicons name="camera" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.phone}>{user.phone_primary}</Text>
        {isWorker && <TierBadge tier={user.trust_tier || 1} />}
      </View>

      {/* ── Become a Local Expert (if not yet) ─────────── */}
      {!isWorker && (
        <TouchableOpacity
          style={styles.becomeExpertCard}
          onPress={() => navigation.navigate("BecomeExpert")}
          activeOpacity={0.85}
        >
          <View style={styles.becomeExpertLeft}>
            <Text style={styles.becomeExpertTitle}>{t("become_expert_title")}</Text>
            <Text style={styles.becomeExpertSub}>{t("landing_become_expert_card_sub")}</Text>
          </View>
          <View style={styles.becomeExpertArrow}>
            <Ionicons name="arrow-forward-circle" size={32} color={colors.saffron} />
          </View>
        </TouchableOpacity>
      )}

      {/* ── Worker: availability + quick stats ─────────── */}
      {isWorker && (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>{user.total_jobs || 0}</Text>
              <Text style={styles.statLabel}>{t("earnings_jobs_done")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                {user.avg_rating ? user.avg_rating.toFixed(1) : "—"}
              </Text>
              <Text style={styles.statLabel}>{t("earnings_avg_rating")}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>
                ₹{user.daily_rate || "—"}
              </Text>
              <Text style={styles.statLabel}>{t("profile_per_day")}</Text>
            </View>
          </View>

          {/* ── Skill badges ── */}
          {(user.skill_badges || []).length > 0 && (
            <View style={styles.badgesRow}>
              {(user.skill_badges || []).map((b) => (
                <View key={b.id} style={styles.badge}>
                  <Text style={styles.badgeIcon}>{b.icon || "🏅"}</Text>
                  <Text style={styles.badgeLabel}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}

          <SectionHeader title={t("profile_expert_section")} />

          <RowItem
            icon="toggle-outline"
            label={t("profile_availability")}
            rightElement={
              <Switch
                value={availableNow}
                onValueChange={toggleAvailableNow}
                trackColor={{ false: colors.border, true: colors.success }}
                disabled={toggling}
              />
            }
          />
          <RowItem icon="images-outline" label={t("profile_portfolio")} onPress={() => navigation.navigate("Portfolio")} />
          <RowItem icon="ribbon-outline" label={t("profile_certifications")} onPress={() => navigation.navigate("Certifications")} />
          <RowItem icon="videocam-outline" label={t("profile_video")} onPress={() => navigation.navigate("VideoProfile")} />
          <RowItem icon="card-outline" label={t("profile_kyc")} value={user.is_kyc_verified ? t("profile_kyc_done") : undefined} onPress={() => navigation.navigate("KYC")} />
          <RowItem icon="cash-outline" label={t("profile_earnings_link")} onPress={() => navigation.navigate("Earnings")} />
          <RowItem icon="qr-code-outline" label={t("profile_qr_code")} onPress={() => navigation.navigate("QRCode")} />
        </>
      )}

      {/* ── Customer section ─────────────────────────────── */}
      <SectionHeader title={t("profile_customer_section")} />
      <RowItem icon="briefcase-outline" label={t("activity_jobs_posted")} value={String(user.jobs_posted || 0)} onPress={() => navigation.navigate("Activity", { initialTab: "posted" })} />
      <RowItem icon="heart-outline" label={t("profile_saved_workers")} onPress={() => navigation.navigate("SavedExperts")} />
      <RowItem icon="location-outline" label={t("profile_saved_addresses")} onPress={() => navigation.navigate("SavedAddresses")} />

      {/* ── Account ───────────────────────────────────────── */}
      <SectionHeader title="Account" />
      <RowItem icon="wallet-outline" label={t("profile_wallet_link")} value={user.wallet_balance > 0 ? `₹${user.wallet_balance}` : undefined} onPress={() => navigation.navigate("Wallet")} />
      <RowItem icon="gift-outline" label={t("profile_referral")} onPress={shareReferral} />
      <RowItem icon="warning-outline" label={t("profile_emergency_contact")} onPress={() => navigation.navigate("EmergencyContact")} />
      <RowItem icon="chatbubble-ellipses-outline" label={t("profile_support")} onPress={() => navigation.navigate("SupportChat")} />
      <RowItem icon="document-text-outline" label={t("profile_faq")} onPress={() => navigation.navigate("FAQ")} />
      <RowItem icon="shield-checkmark-outline" label={t("profile_terms")} onPress={() => navigation.navigate("Terms")} />
      <RowItem icon="lock-closed-outline" label={t("profile_privacy")} onPress={() => navigation.navigate("Privacy")} />
      <RowItem icon="log-out-outline" label={t("profile_logout")} onPress={handleLogout} danger />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarWrap: { position: "relative", marginBottom: spacing.sm },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarFallback: { backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: "#fff", fontSize: 32, fontFamily: fonts.display, fontWeight: "700" },
  editAvatarBtn: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: colors.indigo, borderRadius: 12,
    width: 24, height: 24, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  name: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text, marginBottom: 4 },
  phone: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs },
  tierBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, marginTop: spacing.xs },
  tierText: { fontFamily: fonts.bodyBold, fontSize: 12 },

  becomeExpertCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.indigo, marginHorizontal: spacing.md,
    borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md,
  },
  becomeExpertLeft: { flex: 1 },
  becomeExpertTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff", marginBottom: 4 },
  becomeExpertSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  becomeExpertArrow: { marginLeft: spacing.sm },

  statsRow: {
    flexDirection: "row", backgroundColor: "#fff",
    marginHorizontal: spacing.md, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  statBox: { flex: 1, alignItems: "center" },
  statNum: { fontFamily: fonts.display, fontSize: 20, color: colors.text, fontWeight: "700" },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  badge:     { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fef3c7", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  badgeIcon: { fontSize: 14 },
  badgeLabel:{ fontFamily: fonts.bodyBold, fontSize: 11, color: "#92400e" },

  sectionHeader: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowValue: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
