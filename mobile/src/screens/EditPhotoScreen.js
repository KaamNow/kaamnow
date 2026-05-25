import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function EditPhotoScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.photo_url || null);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(t("permission_photos_denied"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append("file", { uri, name: "photo.jpg", type: "image/jpeg" });
      await api.post("/auth/me/photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(uri);
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarWrap}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{(user?.name || "?")[0].toUpperCase()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>Your photo</Text>
        <Text style={styles.subtitle}>
          Square photos look best. Show your face clearly — customers want to recognize who's coming.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
          {uploading
            ? <ActivityIndicator color={colors.onPrimary} />
            : <Text style={styles.btnText}>{t("edit_photo_pick")}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.bg },
  header:        { paddingHorizontal: spacing.lg, paddingVertical: 10 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  content:       { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  avatarWrap:    { marginBottom: spacing.xl },
  avatar:        { width: 160, height: 160, borderRadius: 80 },
  avatarFallback:{ backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.onPrimary, fontSize: 60, fontFamily: fonts.bodyBold },
  title:         { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading, marginBottom: spacing.sm },
  subtitle:      { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 20, maxWidth: 280, marginBottom: spacing.xxl },
  btn:           { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 28, paddingVertical: 16, minHeight: 52, minWidth: 200, alignItems: "center", justifyContent: "center" },
  btnText:       { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
