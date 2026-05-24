import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import api from "../lib/api";
import { colors, fonts, spacing, radius, shadow } from "../theme";

const LABEL_ICONS = { Home: "home-outline", Work: "briefcase-outline", Site: "construct-outline" };

export default function SavedAddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState([]);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/auth/me/addresses");
      setAddresses(r.data?.addresses || r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  // Refresh whenever this screen comes into focus (after add/edit/back)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = (id) => {
    Alert.alert("Remove address?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/auth/me/addresses/${id}`);
            load();
          } catch {
            Alert.alert("Could not remove", "Please try again.");
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const icon = LABEL_ICONS[item.label] || "location-outline";
    const addressLine = [item.address?.street, item.address?.village, item.address?.district, item.address?.pincode]
      .filter(Boolean).join(", ");

    return (
      <View style={S.card}>
        {/* Icon */}
        <View style={S.iconWrap}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>

        {/* Text */}
        <View style={{ flex: 1 }}>
          <View style={S.labelRow}>
            <Text style={S.label}>{item.label}</Text>
            {item.is_default && (
              <View style={S.defaultBadge}>
                <Ionicons name="star" size={10} color="#059669" />
                <Text style={S.defaultBadgeText}>DEFAULT</Text>
              </View>
            )}
          </View>
          {addressLine ? (
            <Text style={S.addr} numberOfLines={2}>{addressLine}</Text>
          ) : (
            <Text style={S.addrEmpty}>No address details</Text>
          )}
        </View>

        {/* Actions */}
        <View style={S.actions}>
          <TouchableOpacity
            style={S.actionBtn}
            onPress={() => navigation.navigate("AddressForm", { address: item })}
            hitSlop={6}
          >
            <Ionicons name="pencil-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.actionBtn, S.actionBtnDanger]}
            onPress={() => remove(item.id)}
            hitSlop={6}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[S.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Saved Addresses</Text>
        <TouchableOpacity
          style={S.addBtn}
          onPress={() => navigation.navigate("AddressForm")}
          hitSlop={8}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={[S.list, { paddingBottom: insets.bottom + 20 }]}
          ListEmptyComponent={
            <View style={S.empty}>
              <View style={S.emptyIcon}>
                <Ionicons name="location-outline" size={40} color={colors.outline} />
              </View>
              <Text style={S.emptyTitle}>No saved addresses yet</Text>
              <Text style={S.emptySub}>Tap + to add your home, work or job site — it auto-fills when you post a job.</Text>
              <TouchableOpacity style={S.emptyBtn} onPress={() => navigation.navigate("AddressForm")}>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={S.emptyBtnText}>Add First Address</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9f9fe" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  headerBack:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: fonts.headlineSm, fontSize: 18, color: colors.textHeading },
  addBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  list: { padding: 16, gap: 12 },

  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#ffffff", borderRadius: 18,
    borderWidth: 1, borderColor: "#f0f0f5",
    padding: 16, ...shadow.xs,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: "#f0f0f5",
    alignItems: "center", justifyContent: "center",
  },
  labelRow:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 3 },
  label:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  defaultBadge:{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#ECFDF5", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  defaultBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#059669", letterSpacing: 0.5 },
  addr:        { fontFamily: fonts.body, fontSize: 12, color: colors.outline, lineHeight: 17 },
  addrEmpty:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline, fontStyle: "italic" },

  actions:       { gap: 6 },
  actionBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  actionBtnDanger: { backgroundColor: "#FEE2E2" },

  empty:     { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 8 },
  emptySub:   { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyBtn:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
