import { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function VideoProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const hasVideo = !!user?.video_url;

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(t("permission_photos_denied")); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append("file", { uri, name: "video.mp4", type: "video/mp4" });
      await api.post("/service-profiles/mine/video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconCircle, hasVideo && styles.iconCircleActive]}>
          <Ionicons name={hasVideo ? "videocam" : "videocam-outline"} size={48} color={hasVideo ? colors.statusSuccess : colors.outline} />
        </View>
        <Text style={styles.statusText}>
          {hasVideo ? t("video_profile_exists") : t("video_profile_none")}
        </Text>

        <Text style={styles.hint}>{t("video_profile_hint")}</Text>

        <TouchableOpacity style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color={colors.onPrimary} />
            : <Text style={styles.btnText}>{hasVideo ? t("video_profile_change") : t("video_profile_add")}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  header:  { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: 10, backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, marginLeft: 8, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  content:    { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  iconCircleActive: { backgroundColor: colors.successLight },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: spacing.sm },
  hint:       { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 21, marginBottom: spacing.xl, maxWidth: 280 },
  btn:        { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: 16, minHeight: 52, minWidth: 200, alignItems: "center", justifyContent: "center" },
  btnText:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
