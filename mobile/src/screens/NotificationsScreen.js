import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts } from "../theme";
import api from "../lib/api";

// Map notification type/kind → icon + color
const KIND_CONFIG = {
  new_message:       { icon: "chatbubble-outline",        color: "#6366f1", bg: "#eef2ff" },
  new_request:       { icon: "briefcase-outline",         color: "#f59e0b", bg: "#fef3c7" },
  booking_request:   { icon: "briefcase-outline",         color: "#f59e0b", bg: "#fef3c7" },
  accepted:          { icon: "checkmark-circle-outline",  color: "#10b981", bg: "#d1fae5" },
  booking_accepted:  { icon: "checkmark-circle-outline",  color: "#10b981", bg: "#d1fae5" },
  rejected:          { icon: "close-circle-outline",      color: "#ef4444", bg: "#fee2e2" },
  booking_rejected:  { icon: "close-circle-outline",      color: "#ef4444", bg: "#fee2e2" },
  cancelled:         { icon: "close-circle-outline",      color: "#6b7280", bg: "#f3f4f6" },
  completed:         { icon: "ribbon-outline",            color: "#3b82f6", bg: "#dbeafe" },
  payment_received:  { icon: "card-outline",              color: "#10b981", bg: "#d1fae5" },
  wallet_credited:   { icon: "wallet-outline",            color: "#6366f1", bg: "#eef2ff" },
  job_alert:         { icon: "location-outline",          color: "#f59e0b", bg: "#fef3c7" },
  work_request:      { icon: "briefcase-outline",         color: "#f59e0b", bg: "#fef3c7" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/notifications/mine");
      setItems(r.data?.items || r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markAllRead = async () => {
    try { await api.post("/notifications/read-all"); load(); } catch {}
  };

  const handleTap = async (item) => {
    // Mark as read
    if (!item.read) {
      try { await api.post(`/notifications/${item.id}/read`); } catch {}
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
    }

    // Route based on type/kind + ref
    const kind = item.type || item.kind || "";
    const refId = item.work_request_id || item.ref_id;

    // job_alert ref_id is a job_id (no detail screen); wallet_credited ref_id is a tx id
    if (!refId || kind === "job_alert" || kind === "wallet_credited") return;

    if (kind === "new_message" || kind === "accepted" || kind === "booking_accepted") {
      navigation.navigate("Chat", { engagementId: refId });
    } else {
      navigation.navigate("EngagementDetail", { id: refId });
    }
  };

  const unreadCount = items.filter(n => !n.read).length;

  const renderItem = ({ item }) => {
    const kind   = item.type || item.kind || "";
    const cfg    = KIND_CONFIG[kind] || { icon: "notifications-outline", color: colors.primary, bg: "#eef2ff" };
    const hasRef = !!(item.work_request_id || item.ref_id) && kind !== "job_alert" && kind !== "wallet_credited";

    return (
      <TouchableOpacity
        style={[S.row, !item.read && S.rowUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={hasRef ? 0.7 : 1}
      >
        {/* Icon */}
        <View style={[S.iconWrap, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>

        {/* Text */}
        <View style={S.textWrap}>
          <Text style={S.rowTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={S.rowBody} numberOfLines={2}>{item.body}</Text>
          <View style={S.rowMeta}>
            <Text style={S.rowTime}>{timeAgo(item.created_at)}</Text>
            {hasRef && (
              <View style={S.tapHint}>
                <Text style={[S.tapHintText, { color: cfg.color }]}>Tap to open</Text>
              </View>
            )}
          </View>
        </View>

        {/* Unread dot */}
        {!item.read && <View style={[S.dot, { backgroundColor: cfg.color }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={S.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 70 }} />}
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={S.separator} />}
          ListEmptyComponent={
            <View style={S.empty}>
              <View style={S.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={34} color={colors.outline} />
              </View>
              <Text style={S.emptyTitle}>No notifications yet</Text>
              <Text style={S.emptySub}>We'll let you know when something{"\n"}needs your attention.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading,
  },
  markAll: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary, width: 70, textAlign: "right" },

  // Row
  row: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowUnread: { backgroundColor: "#fafbff" },
  separator: { height: 1, backgroundColor: "#f0f0f5", marginLeft: 68 },

  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },

  textWrap: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading, marginBottom: 3 },
  rowBody:  { fontFamily: fonts.body, fontSize: 13, color: colors.outline, lineHeight: 18, marginBottom: 5 },
  rowMeta:  { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTime:  { fontFamily: fonts.body, fontSize: 11, color: colors.outline },
  tapHint:  { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: "#f0f0f5" },
  tapHintText: { fontFamily: fonts.bodySemi, fontSize: 10 },

  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  // Empty
  empty:      { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, marginBottom: 8 },
  emptySub:   { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 22 },
});
