import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts, radius, shadow } from "../theme";
import api from "../lib/api";

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar({ name, size = 46 }) {
  const letter = (name || "?")[0].toUpperCase();
  // Calm muted tones — no rainbow. Hue per letter, same lightness.
  const tones = ["#4A5568", "#5A4E7C", "#3F37C9", "#4D6A52", "#7C4E3D", "#6B4A6E"];
  const bg = tones[letter.charCodeAt(0) % tones.length];
  return (
    <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.38, color: "#fff" }}>{letter}</Text>
    </View>
  );
}

export default function ChatsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/work-requests/mine");
      const all = Array.isArray(r.data) ? r.data : (r.data?.engagements || []);
      setRequests(all);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (url, id) => {
    setActing(id);
    try { await api.post(url); await load(); } catch {}
    finally { setActing(null); }
  };

  // ── Categorise ────────────────────────────────────────────────────────────
  const incoming = requests.filter(e => e.status === "requested" && e.direction === "received");
  const active   = requests.filter(e => e.status === "accepted");
  const waiting  = requests.filter(e => e.status === "requested" && e.direction === "sent");
  const done     = requests.filter(e => ["completed", "cancelled", "rejected"].includes(e.status));

  const sections = [
    ...(incoming.length > 0 ? [{ key: "incoming", title: `Incoming Requests · ${incoming.length}`, data: incoming }] : []),
    ...(active.length   > 0 ? [{ key: "active",   title: "Active Chats",      data: active   }] : []),
    ...(waiting.length  > 0 ? [{ key: "waiting",  title: "My Applications",   data: waiting  }] : []),
    ...(done.length     > 0 ? [{ key: "done",     title: "Closed",            data: done     }] : []),
  ];

  // ── Row renderers ─────────────────────────────────────────────────────────
  const renderItem = ({ item, section }) => {
    const isSent    = item.direction === "sent";
    const otherName = isSent ? (item.requested_to_name || "—") : (item.requested_by_name || "—");
    const jobTitle  = item.job_summary?.title || item.request_type_label || "Work request";
    const lastMsg   = item.last_message;
    const timestamp = timeAgo(lastMsg?.created_at || item.updated_at || item.created_at);
    const isExpert  = item.request_type === "job_application" ? isSent : !isSent;
    const roleTag   = isExpert ? "Work I Do" : "You Posted";

    if (section.key === "incoming") {
      return (
        <View style={S.card}>
          <View style={{ position: "relative" }}>
            <Avatar name={otherName} />
            <View style={[S.dot, { backgroundColor: colors.warning }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <View style={S.jobRow}>
              <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
              <View style={S.roleChip}><Text style={S.roleChipText}>{roleTag}</Text></View>
            </View>
            {item.message ? (
              <Text style={S.preview} numberOfLines={1}>"{item.message}"</Text>
            ) : null}
            <View style={S.actionRow}>
              <TouchableOpacity
                style={S.acceptBtn}
                disabled={acting === item.id}
                onPress={() => act(`/work-requests/${item.id}/accept`, item.id)}
              >
                {acting === item.id
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <><Ionicons name="checkmark" size={14} color={colors.onPrimary} /><Text style={S.acceptBtnText}>Accept</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={S.declineBtn}
                disabled={acting === item.id}
                onPress={() => act(`/work-requests/${item.id}/reject`, item.id)}
              >
                <Text style={S.declineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={S.detailsBtn}
                onPress={() => navigation.navigate("EngagementDetail", { id: item.id })}
              >
                <Text style={S.detailsBtnText}>Details</Text>
                <Ionicons name="chevron-forward" size={11} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    if (section.key === "active") {
      return (
        <TouchableOpacity
          style={S.card}
          activeOpacity={0.75}
          onPress={() => navigation.navigate("Chat", { engagementId: item.id })}
        >
          <View style={{ position: "relative" }}>
            <Avatar name={otherName} />
            <View style={[S.dot, { backgroundColor: colors.success }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <View style={S.jobRow}>
              <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
              <View style={S.roleChip}><Text style={S.roleChipText}>{roleTag}</Text></View>
            </View>
            {lastMsg ? (
              <Text style={S.preview} numberOfLines={1}>
                {lastMsg.is_mine ? "You: " : ""}{lastMsg.text}
              </Text>
            ) : (
              <Text style={[S.preview, { fontStyle: "italic" }]}>Tap to open chat</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.outline} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      );
    }

    if (section.key === "waiting") {
      return (
        <TouchableOpacity
          style={[S.card, { opacity: 0.82 }]}
          activeOpacity={0.75}
          onPress={() => navigation.navigate("EngagementDetail", { id: item.id })}
        >
          <View style={{ position: "relative" }}>
            <Avatar name={otherName} size={44} />
            <View style={[S.dot, { backgroundColor: colors.textMuted }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <View style={S.jobRow}>
              <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
              <View style={S.roleChip}><Text style={S.roleChipText}>{roleTag}</Text></View>
            </View>
            <View style={[S.badge, { backgroundColor: colors.surface }]}>
              <Ionicons name="time-outline" size={10} color={colors.textSecondary} />
              <Text style={[S.badgeText, { color: colors.textSecondary }]}>Awaiting response</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.outline} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      );
    }

    // done
    return (
      <TouchableOpacity
        style={[S.card, { opacity: 0.8 }]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate("Chat", { engagementId: item.id })}
      >
        <Avatar name={otherName} size={44} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={S.rowTop}>
            <Text style={[S.name, { color: colors.outline }]} numberOfLines={1}>{otherName}</Text>
            <Text style={S.time}>{timestamp}</Text>
          </View>
          <View style={S.jobRow}>
            <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
            <View style={S.roleChip}><Text style={S.roleChipText}>{roleTag}</Text></View>
          </View>
          <View style={[S.badge, { backgroundColor: item.status === "completed" ? colors.successLight : colors.surface }]}>
            <Ionicons
              name={item.status === "completed" ? "checkmark-circle-outline" : "archive-outline"}
              size={10}
              color={item.status === "completed" ? colors.success : colors.textSecondary}
            />
            <Text style={[S.badgeText, { color: item.status === "completed" ? colors.success : colors.textSecondary }]}>
              {item.status === "completed" ? "Completed" : item.status === "rejected" ? "Declined" : "Cancelled"}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.outline} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={S.sectionHeader}>
      <Text style={S.sectionTitle}>{section.title}</Text>
    </View>
  );

  const isEmpty = sections.length === 0 && !loading;

  return (
    <View style={[S.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Messages</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : isEmpty ? (
        <View style={S.empty}>
          <View style={S.emptyIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.outline} />
          </View>
          <Text style={S.emptyTitle}>No conversations yet</Text>
          <Text style={S.emptySub}>
            When you apply to a job or someone requests you,{"\n"}chats appear here after acceptance.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={S.separator} />}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.bg,
  },
  headerBack:  { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading },

  sectionHeader: {
    paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8,
    backgroundColor: colors.bg,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1.2 },

  separator: { height: 1, backgroundColor: colors.borderSubtle, marginLeft: 78 },

  card: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.surfaceCard,
  },

  dot: {
    position: "absolute", bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2, borderColor: colors.surfaceCard,
  },

  rowTop:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  name:     { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, flex: 1, marginRight: 8 },
  time:     { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  jobRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  jobLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  roleChip: { backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  roleChipText: { fontFamily: fonts.bodyBold, fontSize: 9, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6 },
  preview:  { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  badge:     { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3 },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 12, minHeight: 44,
  },
  acceptBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.onPrimary },
  declineBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: radius.md, paddingVertical: 12, minHeight: 44,
    backgroundColor: colors.surface,
  },
  declineBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  detailsBtn: { flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 6, paddingVertical: 12 },
  detailsBtnText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary },

  empty:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle:{ fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 8 },
  emptySub:  { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },
});
