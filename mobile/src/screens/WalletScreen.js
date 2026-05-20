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
    return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
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
                  <Ionicons name="share-outline" size={16} color="#fff" />
                  <Text style={styles.shareBtnText}>{t("wallet_share")}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <Ionicons name="gift-outline" size={40} color={colors.saffron} />
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
                <View style={[styles.txIcon, { backgroundColor: isCredit ? "#d1fae5" : "#fee2e2" }]}>
                  <Ionicons
                    name={isCredit ? "arrow-down-outline" : "arrow-up-outline"}
                    size={16}
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
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },

  balanceCard: {
    backgroundColor: colors.indigo, margin: spacing.md, borderRadius: radius.xl,
    padding: spacing.lg, alignItems: "center",
  },
  balanceLabel:  { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)" },
  balanceAmount: { fontFamily: fonts.display, fontSize: 40, color: "#fff", fontWeight: "700", marginVertical: 4 },
  balanceSub:    { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.55)" },

  referCard: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", marginHorizontal: spacing.md, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  referTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginBottom: 2 },
  referSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  codeRow:    { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  code:       { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.indigo, letterSpacing: 1.5 },
  shareBtn:   { flexDirection: "row", alignItems: "center", backgroundColor: colors.indigo, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 5, gap: 4 },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },

  sectionHeader: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.8,
    paddingHorizontal: spacing.md, marginBottom: spacing.xs, marginTop: spacing.xs,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, paddingHorizontal: spacing.md },

  txRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  txIcon:   { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  txReason: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  txDate:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  txExpiry: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  txAmount: { fontFamily: fonts.bodyBold, fontSize: 15 },
});
