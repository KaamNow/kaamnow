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
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={hasVideo ? "videocam" : "videocam-outline"} size={64} color={hasVideo ? colors.statusSuccess : colors.outline} />
        <Text style={styles.statusText}>
          {hasVideo ? t("video_profile_exists") : t("video_profile_none")}
        </Text>
      </View>

      <Text style={styles.hint}>{t("video_profile_hint")}</Text>

      <TouchableOpacity style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>{hasVideo ? t("video_profile_change") : t("video_profile_add")}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  iconWrap:   { alignItems: "center", marginBottom: spacing.lg },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading, marginTop: spacing.sm },
  hint:       { fontFamily: fonts.body, fontSize: 13, color: colors.outline, textAlign: "center", marginBottom: spacing.xl },
  btn:        { backgroundColor: colors.primary, borderRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  btnText:    { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
