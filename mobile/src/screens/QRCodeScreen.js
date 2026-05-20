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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await api.get("/workers/me/qr-code");
        setQrUri(`${API_URL}/api/workers/me/qr-code`);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const shareProfile = async () => {
    if (!user?.id) return;
    try {
      await Share.share({
        message: `Book me on KaamNow! https://kaamnow.com/local-expert/${user.id}`,
      });
    } catch {}
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;
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
            <Ionicons name="qr-code-outline" size={80} color={colors.textMuted} />
          </View>
        )}
        <Text style={styles.hint}>{t("qr_hint")}</Text>
      </View>

      <TouchableOpacity style={styles.shareBtn} onPress={shareProfile}>
        <Ionicons name="share-outline" size={18} color="#fff" />
        <Text style={styles.shareBtnText}>{t("qr_share")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.xl,
    alignItems: "center", width: "100%", maxWidth: 320,
    borderWidth: 1, borderColor: colors.border,
  },
  name:          { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  qr:            { width: 220, height: 220 },
  qrPlaceholder: { width: 220, height: 220, justifyContent: "center", alignItems: "center" },
  hint:          { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.md, textAlign: "center" },

  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: colors.indigo, borderRadius: radius.lg,
    paddingHorizontal: spacing.xl, paddingVertical: 14, marginTop: spacing.lg,
  },
  shareBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
});
