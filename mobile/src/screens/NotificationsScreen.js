import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const KIND_ICON = {
  new_request:     "briefcase-outline",
  accepted:        "checkmark-circle-outline",
  rejected:        "close-circle-outline",
  completed:       "ribbon-outline",
  new_message:     "chatbubble-outline",
  payment_received:"card-outline",
  wallet_credited: "wallet-outline",
};

export default function NotificationsScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/notifications");
      setItems(r.data?.items || r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    try { await api.post("/notifications/read-all"); load(); } catch {}
  };

  const handleTap = (item) => {
    if (!item.deep_link) return;
    const [, path] = item.deep_link.split("kaamnow://");
    if (!path) return;
    if (path.startsWith("engagement/")) navigation.navigate("EngagementDetail", { id: path.split("/")[1] });
    else if (path.startsWith("chat/"))        navigation.navigate("Chat", { engagementId: path.split("/")[1] });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={[styles.row, !item.read && styles.rowUnread]} onPress={() => handleTap(item)} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Ionicons name={KIND_ICON[item.kind] || "notifications-outline"} size={20} color={colors.indigo} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
      {!item.read && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("notifications_title")}</Text>
        <TouchableOpacity onPress={markAllRead}>
          <Text style={styles.markRead}>{t("notifications_mark_all_read")}</Text>
        </TouchableOpacity>
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>
        : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyText}>{t("notifications_empty")}</Text>
              </View>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text },
  markRead:    { fontFamily: fonts.body, fontSize: 13, color: colors.indigo },

  row: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  rowUnread:  { backgroundColor: "#f0f4ff" },
  iconWrap:   { width: 36, height: 36, borderRadius: 18, backgroundColor: "#e0e7ff", justifyContent: "center", alignItems: "center" },
  textWrap:   { flex: 1 },
  title:      { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 2 },
  body:       { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 3 },
  time:       { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.indigo, marginTop: 6 },

  empty: { alignItems: "center", marginTop: 100, gap: spacing.sm },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
