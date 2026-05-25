import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function CertificationsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/service-profiles/mine");
      setCerts(r.data?.certifications || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(t("permission_photos_denied")); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append("file", { uri, name: "cert.jpg", type: "image/jpeg" });
      formData.append("skill", "general");
      formData.append("cert_name", "Certificate");
      await api.post("/service-profiles/mine/certifications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await load();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setUploading(false);
    }
  };

  const remove = (id) => {
    Alert.alert(t("confirm_delete"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"), style: "destructive",
        onPress: async () => {
          try { await api.delete(`/service-profiles/mine/certifications/${id}`); load(); } catch {}
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.certName}>{item.cert_name}</Text>
        <Text style={styles.certSkill}>{item.skill}</Text>
        {item.issued_by ? <Text style={styles.certMeta}>{item.issued_by}{item.year ? ` · ${item.year}` : ""}</Text> : null}
      </View>
      <View style={styles.cardRight}>
        {item.verified
          ? <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>{t("cert_verified")}</Text></View>
          : <View style={styles.pendingBadge}><Text style={styles.pendingText}>{t("cert_pending")}</Text></View>
        }
        <TouchableOpacity onPress={() => remove(item.id)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={certs}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 80 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t("certs_empty")}</Text>
          </View>
        }
      />

      <View style={[styles.addBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.addBtn} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color={colors.onPrimary} />
            : <><Ionicons name="add" size={20} color={colors.onPrimary} /><Text style={styles.addBtnText}>{t("certs_add")}</Text></>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  card:    { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderSubtle, gap: spacing.sm },
  certName:{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  certSkill:{ fontFamily: fonts.body, fontSize: 12, color: colors.outline, textTransform: "capitalize" },
  certMeta:{ fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  cardRight: { alignItems: "flex-end", gap: 8 },
  verifiedBadge: { backgroundColor: colors.successLight, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText:  { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },
  pendingBadge:  { backgroundColor: colors.warningLight, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  pendingText:   { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.warning },
  empty:    { alignItems: "center", marginTop: 60 },
  emptyText:{ fontFamily: fonts.body, fontSize: 14, color: colors.outline },
  addBar:   { backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  addBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 16, minHeight: 52 },
  addBtnText:{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
