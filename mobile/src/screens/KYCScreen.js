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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32, alignItems: "center" }}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={isVerified ? "shield-checkmark" : "shield-outline"}
          size={64}
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
            ? <ActivityIndicator color="#fff" />
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
  );
}

const styles = StyleSheet.create({
  iconWrap: { marginVertical: spacing.xl },
  title:    { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading, textAlign: "center", marginBottom: spacing.sm },
  body:     { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 22, marginBottom: spacing.xl, paddingHorizontal: spacing.md },
  btn:      { backgroundColor: colors.primary, borderRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  btnText:  { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
  docRow:   { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.md },
  docText:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading, textTransform: "capitalize" },
  docDate:  { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
});
