import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, Alert, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const MAX_ITEMS = 6;

export default function PortfolioScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/service-profiles/mine");
      setItems(r.data?.photos || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pickAndUpload = async () => {
    if (items.length >= MAX_ITEMS) {
      Alert.alert(t("portfolio_max", { max: MAX_ITEMS }));
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert(t("permission_photos_denied")); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85,
    });
    if (result.canceled) return;

    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append("file", { uri, name: "portfolio.jpg", type: "image/jpeg" });
      await api.post("/service-profiles/mine/photos", formData, {
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
          try { await api.delete(`/service-profiles/mine/photos/${id}`); load(); } catch {}
        },
      },
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const data = [...items, ...(items.length < MAX_ITEMS ? [{ id: "__add" }] : [])];

  const renderItem = ({ item }) => {
    if (item.id === "__add") {
      return (
        <TouchableOpacity style={styles.addTile} onPress={pickAndUpload} disabled={uploading}>
          {uploading ? <ActivityIndicator color={colors.outline} /> : <Ionicons name="add" size={32} color={colors.outline} />}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.tile} onLongPress={() => remove(item.id)} activeOpacity={0.9}>
        <Image source={{ uri: item.image_url }} style={styles.img} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={data}
        numColumns={3}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 2, paddingBottom: insets.bottom + 16 }}
      />
      <Text style={styles.hint}>{t("portfolio_long_press_hint")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:  { flex: 1, justifyContent: "center", alignItems: "center" },
  tile:    { flex: 1, aspectRatio: 1, margin: 2 },
  img:     { width: "100%", height: "100%" },
  addTile: { flex: 1, aspectRatio: 1, margin: 2, justifyContent: "center", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.sm },
  hint:    { fontFamily: fonts.body, fontSize: 11, color: colors.outline, textAlign: "center", padding: spacing.xs },
});
