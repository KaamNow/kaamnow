import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function SavedAddressesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/auth/me/addresses");
      setAddresses(r.data?.addresses || r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = (id) => {
    Alert.alert(t("confirm_delete"), "", [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"), style: "destructive",
        onPress: async () => {
          try { await api.delete(`/auth/me/addresses/${id}`); load(); } catch {}
        },
      },
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Ionicons name="location-outline" size={20} color={colors.indigo} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.addr}>{[item.address?.street, item.address?.village, item.address?.pincode].filter(Boolean).join(", ")}</Text>
      </View>
      <TouchableOpacity onPress={() => remove(item.id)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;

  return (
    <FlatList
      data={addresses}
      keyExtractor={(a) => a.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("addresses_empty")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  row:       { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  label:     { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  addr:      { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  empty:     { alignItems: "center", marginTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
