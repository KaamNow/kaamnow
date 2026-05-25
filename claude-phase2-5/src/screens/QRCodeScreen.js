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

export default function QRCodeScreen() {
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.name}</Text>
        {qrUri ? (
          <Image
            source={{ uri: qrUri }}
            style={styles.qr}
            resizeMode="contain"
          />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: "center", width: "100%", maxWidth: 320,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  name:          { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: spacing.md },
  qr:            { width: 220, height: 220 },
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
