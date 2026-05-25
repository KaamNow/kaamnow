import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Share,
} from "react-native";
import { Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api, { API_URL } from "../api";

export default function QRCodeScreen({ navigation }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [qrUri, setQrUri] = useState(null);
  const [profileUrl, setProfileUrl] = useState(null);
  const [error] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    // Direct PNG URL — avoids data: URI rendering issues in Expo
    setQrUri(`${API_URL}/api/service-profiles/user/${user.id}/qr-png`);
    // Fetch profile URL separately for the share button
    (async () => {
      try {
        const resp = await api.get("/service-profiles/mine");
        setProfileUrl(resp.data?.id ? `https://kaamnow.com/local-expert/${resp.data.id}` : null);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  const shareProfile = async () => {
    const url = profileUrl || (user?.id ? `https://kaamnow.com/users/${user.id}` : "");
    if (!url) return;
    try {
      await Share.share({
        message: `Find me on KaamNow! ${url}`,
      });
    } catch {}
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR Code</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.name}</Text>
          {qrUri ? (
            <View style={styles.qrFrame}>
              <Image
                source={{ uri: qrUri }}
                style={styles.qr}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={80} color={colors.outline} />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
          <Text style={styles.hint}>{t("qr_hint")}</Text>
        </View>

        <TouchableOpacity style={styles.shareBtn} onPress={shareProfile}>
          <Ionicons name="share-outline" size={18} color={colors.onPrimary} />
          <Text style={styles.shareBtnText}>{t("qr_share")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, marginLeft: 8, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },

  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: "center", width: "100%", maxWidth: 320,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  name:          { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: spacing.md },
  qrFrame:       { width: 220, height: 220, backgroundColor: "#fff", padding: 12 },
  qr:            { width: "100%", height: "100%" },
  qrPlaceholder: { width: 220, height: 220, justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.sm },
  errorText:     { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: spacing.sm, textAlign: "center" },
  hint:          { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: spacing.md, textAlign: "center" },

  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: 16, marginTop: spacing.lg,
    minHeight: 52, justifyContent: "center",
  },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
