import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts } from "../theme";
import api from "../lib/api";

// Map notification type/kind → icon + color (using theme tokens only)
const KIND_CONFIG = {
  new_message:       { icon: "chatbubble-outline",        color: colors.secondary,     bg: colors.primaryLight },
  new_request:       { icon: "briefcase-outline",         color: colors.warning,        bg: colors.warningLight },
  booking_request:   { icon: "briefcase-outline",         color: colors.warning,        bg: colors.warningLight },
  accepted:          { icon: "checkmark-circle-outline",  color: colors.success,        bg: colors.successLight },
  booking_accepted:  { icon: "checkmark-circle-outline",  color: colors.success,        bg: colors.successLight },
  rejected:          { icon: "close-circle-outline",      color: colors.danger,         bg: colors.dangerLight },
  booking_rejected:  { icon: "close-circle-outline",      color: colors.danger,         bg: colors.dangerLight },
  cancelled:         { icon: "close-circle-outline",      color: colors.textSecondary,  bg: colors.surface },
  completed:         { icon: "ribbon-outline",            color: colors.success,        bg: colors.successLight },
  payment_received:  { icon: "card-outline",              color: colors.success,        bg: colors.successLight },
  wallet_credited:   { icon: "wallet-outline",            color: colors.secondary,      bg: colors.primaryLight },
  job_alert:         { icon: "location-outline",          color: colors.warning,        bg: colors.warningLight },
  work_request:      { icon: "briefcase-outline",         color: colors.warning,        bg: colors.warningLight },
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
    const cfg    = KIND_CONFIG[kind] || { icon: "notifications-outline", color: colors.primary, bg: colors.primaryLight };
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
        ) : <View style={{ width: 90 }} />}
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
                <Ionicons name="notifications-off-outline" size={32} color={colors.textMuted} />
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
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginLeft: -8,
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading,
  },
  markAll: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading, width: 90, textAlign: "right" },

  // Row
  row: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowUnread: { backgroundColor: colors.primaryLight },
  separator: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 68 },

  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },

  textWrap: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading, marginBottom: 3 },
  rowBody:  { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: 6 },
  rowMeta:  { flexDirection: "row", alignItems: "center", gap: 10 },
  rowTime:  { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  tapHint:  { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: colors.surface },
  tapHintText: { fontFamily: fonts.bodyBold, fontSize: 10 },

  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 8 },

  // Empty
  empty:      { alignItems: "center", justifyContent: "center", marginTop: 100 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 8 },
  emptySub:   { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
