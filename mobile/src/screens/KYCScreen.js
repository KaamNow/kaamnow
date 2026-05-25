import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function KYCScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [initiating, setInitiating] = useState(false);

  const isVerified = user?.is_kyc_verified;

  const initiate = async () => {
    setInitiating(true);
    try {
      await api.post("/service-profiles/mine/kyc/initiate", { doc_type: "aadhaar" });
      Alert.alert(t("kyc_initiated_title"), t("kyc_initiated_body"));
      await refreshUser();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setInitiating(false);
    }
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KYC Verification</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: spacing.xl, paddingBottom: insets.bottom + 32, alignItems: "center", justifyContent: "center" }}
      >
        <View style={[styles.iconWrap, isVerified && styles.iconWrapVerified]}>
          <Ionicons
            name={isVerified ? "shield-checkmark" : "shield-outline"}
            size={48}
            color={isVerified ? colors.statusSuccess : colors.outline}
          />
        </View>

        <Text style={styles.title}>
          {isVerified ? t("kyc_verified_title") : t("kyc_unverified_title")}
        </Text>
        <Text style={styles.body}>
          {isVerified ? t("kyc_verified_body") : t("kyc_unverified_body")}
        </Text>

        {!isVerified && (
          <TouchableOpacity style={styles.btn} onPress={initiate} disabled={initiating}>
            {initiating
              ? <ActivityIndicator color={colors.onPrimary} />
              : <Text style={styles.btnText}>{t("kyc_start")}</Text>
            }
          </TouchableOpacity>
        )}

        {isVerified && user?.kyc_doc_type && (
          <View style={styles.docRow}>
            <Ionicons name="document-text-outline" size={16} color={colors.outline} />
            <Text style={styles.docText}>{user.kyc_doc_type.replace(/_/g, " ")}</Text>
            {user.kyc_verified_at && (
              <Text style={styles.docDate}>{new Date(user.kyc_verified_at).toLocaleDateString("en-IN")}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, marginLeft: 8, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  iconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  iconWrapVerified: { backgroundColor: colors.successLight },
  title:    { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading, textAlign: "center", marginBottom: spacing.sm },
  body:     { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: spacing.xl, maxWidth: 300 },
  btn:      { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 16, minHeight: 52, minWidth: 200, alignItems: "center", justifyContent: "center" },
  btnText:  { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  docRow:   { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  docText:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading, textTransform: "capitalize" },
  docDate:  { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
});
