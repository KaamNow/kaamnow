import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function TermsScreen({ route, navigation }) {
  const { showAccept } = route.params || {};
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/legal/terms");
        setDoc(r.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const accept = async () => {
    setAccepting(true);
    try {
      await api.post("/auth/accept-terms");
      navigation.goBack();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const content = lang === "en" ? doc?.content_en : doc?.content_hi || doc?.content_en;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + (showAccept ? 80 : 32) }}>
        {doc ? (
          <>
            <Text style={styles.version}>{t("legal_version")} {doc.version} · {doc.effective_date}</Text>
            <Text style={styles.title}>Terms of Service</Text>
            <Text style={styles.body}>{content}</Text>
          </>
        ) : (
          <Text style={styles.body}>{t("legal_unavailable")}</Text>
        )}
      </ScrollView>

      {showAccept && (
        <View style={[styles.acceptBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity style={styles.acceptBtn} onPress={accept} disabled={accepting}>
            <Text style={styles.acceptBtnText}>
              {accepting ? t("loading") : t("terms_accept")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  version:   { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, marginBottom: spacing.md, letterSpacing: 0.8, textTransform: "uppercase" },
  title:     { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textHeading, marginBottom: spacing.md, letterSpacing: -0.2 },
  body:      { fontFamily: fonts.body, fontSize: 15, color: colors.textHeading, lineHeight: 24 },

  acceptBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm, paddingHorizontal: spacing.md,
  },
  acceptBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, alignItems: "center", justifyContent: "center", minHeight: 52,
  },
  acceptBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
});
