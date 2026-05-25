import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing } from "../theme";
import api from "../lib/api";

export default function PrivacyScreen() {
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/legal/privacy");
        setDoc(r.data);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  const content = lang === "en" ? doc?.content_en : doc?.content_hi || doc?.content_en;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
    >
      {doc ? (
        <>
          <Text style={styles.version}>{t("legal_version")} {doc.version} · {doc.effective_date}</Text>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.body}>{content}</Text>
        </>
      ) : (
        <Text style={styles.body}>{t("legal_unavailable")}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  version:   { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, marginBottom: spacing.md, letterSpacing: 0.8, textTransform: "uppercase" },
  title:     { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textHeading, marginBottom: spacing.md, letterSpacing: -0.2 },
  body:      { fontFamily: fonts.body, fontSize: 15, color: colors.textHeading, lineHeight: 24 },
});
