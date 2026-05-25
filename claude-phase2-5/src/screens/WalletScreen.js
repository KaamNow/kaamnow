import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

export default function WalletScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [txr] = await Promise.all([
        api.get("/wallet/transactions"),
        refreshUser(),
      ]);
      setTransactions(txr.data?.items || txr.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shareReferral = async () => {
    if (!user?.referral_code) return;
    track("referral_shared", { code: user.referral_code });
    try {
      await Share.share({
        message: `Join KaamNow — India's local work marketplace! Use my code ${user.referral_code} and get ₹50 credits on your first booking. https://kaamnow.com/join?ref=${user.referral_code}`,
      });
    } catch {}
  };

  const daysLeft = (expiresAt) => {
    if (!expiresAt) return null;
    const diff = Math.ceil((new Date(expiresAt) - new Date()) / 86400000);
    return diff > 0 ? diff : 0;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("wallet_title")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t("wallet_balance_label")}</Text>
          <Text style={styles.balanceAmount}>₹{(user?.wallet_balance || 0).toLocaleString("en-IN")}</Text>
          <Text style={styles.balanceSub}>{t("wallet_credits_note")}</Text>
        </View>

        {/* Referral card */}
        <View style={styles.referCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.referTitle}>{t("wallet_refer_title")}</Text>
            <Text style={styles.referSub}>{t("wallet_refer_sub")}</Text>
            {user?.referral_code ? (
              <View style={styles.codeRow}>
                <Text style={styles.code}>{user.referral_code}</Text>
                <TouchableOpacity onPress={shareReferral} style={styles.shareBtn}>
                  <Ionicons name="share-outline" size={14} color={colors.onPrimary} />
                  <Text style={styles.shareBtnText}>{t("wallet_share")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <Ionicons name="gift-outline" size={36} color={colors.textHeading} />
        </View>

        {/* Transactions */}
        <Text style={styles.sectionHeader}>{t("wallet_transactions_title")}</Text>
        {transactions.length === 0
          ? <Text style={styles.emptyText}>{t("wallet_empty")}</Text>
          : transactions.map((tx) => {
            const isCredit = tx.type === "credit";
            const days = daysLeft(tx.expires_at);
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: isCredit ? colors.successLight : colors.dangerLight }]}>
                  <Ionicons
                    name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
                    size={18}
                    color={isCredit ? colors.success : colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txReason}>{t(`wallet_reason_${tx.reason}`) || tx.reason}</Text>
                  <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString("en-IN")}</Text>
                  {isCredit && days !== null && (
                    <Text style={[styles.txExpiry, days < 15 && { color: colors.danger }]}>
                      {days > 0 ? t("wallet_expires_in", { days }) : t("wallet_expired")}
                    </Text>
                  )}
                </View>
                <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.danger }]}>
                  {isCredit ? "+" : "−"}₹{tx.amount}
                </Text>
              </View>
            );
          })
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
    backgroundColor: colors.bg,
  },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },

  balanceCard: {
    backgroundColor: colors.primary, margin: spacing.md, borderRadius: radius.lg,
    padding: spacing.xl, alignItems: "center",
  },
  balanceLabel:  { fontFamily: fonts.bodyBold, fontSize: 11, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 },
  balanceAmount: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.onPrimary, letterSpacing: -1, marginVertical: 6 },
  balanceSub:    { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.6)" },

  referCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceCard, marginHorizontal: spacing.md, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  referTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 2 },
  referSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  codeRow:    { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  code:       { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading, letterSpacing: 1.5, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  shareBtn:   { flexDirection: "row", alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, gap: 5, minHeight: 36 },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.onPrimary },

  sectionHeader: {
    fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1.2,
    paddingHorizontal: spacing.md, marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.md, paddingVertical: spacing.lg, textAlign: "center" },

  txRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceCard, paddingHorizontal: spacing.md, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, gap: spacing.md,
  },
  txIcon:   { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  txReason: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  txDate:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  txExpiry: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
