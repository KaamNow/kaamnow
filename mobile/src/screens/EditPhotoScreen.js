import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.avatarWrap}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{(user?.name || "?")[0].toUpperCase()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.btn} onPress={pickAndUpload} disabled={uploading}>
        {uploading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>{t("edit_photo_pick")}</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  avatarWrap:    { marginBottom: spacing.xl },
  avatar:        { width: 120, height: 120, borderRadius: 60 },
  avatarFallback:{ backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  avatarInitial: { color: colors.onPrimary, fontSize: 48, fontFamily: fonts.display, fontWeight: "700" },
  btn:           { backgroundColor: colors.primary, borderRadius: radius.xxl, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  btnText:       { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.onPrimary },
});
