import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts, shadow } from "../theme";
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
  const hues = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  const bg = hues[letter.charCodeAt(0) % hues.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
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
  const done     = requests.filter(e => e.status === "completed");

  const sections = [
    ...(incoming.length > 0 ? [{ key: "incoming", title: `Incoming Requests · ${incoming.length}`, data: incoming }] : []),
    ...(active.length   > 0 ? [{ key: "active",   title: "Active Chats",      data: active   }] : []),
    ...(waiting.length  > 0 ? [{ key: "waiting",  title: "My Applications",   data: waiting  }] : []),
    ...(done.length     > 0 ? [{ key: "done",     title: "Completed",         data: done     }] : []),
  ];

  // ── Row renderers ─────────────────────────────────────────────────────────
  const renderItem = ({ item, section }) => {
    const isSent    = item.direction === "sent";
    const otherName = isSent ? (item.requested_to_name || "—") : (item.requested_by_name || "—");
    const jobTitle  = item.job_summary?.title || item.request_type_label || "Work request";
    const lastMsg   = item.last_message;
    const timestamp = timeAgo(lastMsg?.created_at || item.updated_at || item.created_at);

    if (section.key === "incoming") {
      return (
        <View style={S.card}>
          <View style={{ position: "relative" }}>
            <Avatar name={otherName} />
            <View style={[S.dot, { backgroundColor: "#f59e0b" }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
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
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><Ionicons name="checkmark" size={13} color="#fff" /><Text style={S.acceptBtnText}>Accept</Text></>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={S.declineBtn}
                disabled={acting === item.id}
                onPress={() => act(`/work-requests/${item.id}/reject`, item.id)}
              >
                <Text style={S.declineBtnText}>Decline</Text>
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
            <View style={[S.dot, { backgroundColor: "#10b981" }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
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
        <View style={[S.card, { opacity: 0.72 }]}>
          <View style={{ position: "relative" }}>
            <Avatar name={otherName} size={44} />
            <View style={[S.dot, { backgroundColor: "#9ca3af" }]} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={S.rowTop}>
              <Text style={S.name} numberOfLines={1}>{otherName}</Text>
              <Text style={S.time}>{timestamp}</Text>
            </View>
            <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
            <View style={[S.badge, { backgroundColor: "#f3f4f6" }]}>
              <Ionicons name="time-outline" size={10} color="#6b7280" />
              <Text style={[S.badgeText, { color: "#6b7280" }]}>Awaiting response</Text>
            </View>
          </View>
        </View>
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
          <Text style={S.jobLabel} numberOfLines={1}>{jobTitle}</Text>
          <View style={[S.badge, { backgroundColor: "#dbeafe" }]}>
            <Ionicons name="checkmark-circle-outline" size={10} color="#1d4ed8" />
            <Text style={[S.badgeText, { color: "#1d4ed8" }]}>Completed</Text>
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
  safe:   { flex: 1, backgroundColor: "#f9f9fe" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  headerBack:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: fonts.headlineSm, fontSize: 18, color: colors.textHeading },

  sectionHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6,
    backgroundColor: "#f9f9fe",
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, textTransform: "uppercase", letterSpacing: 1 },

  separator: { height: 1, backgroundColor: "#f0f0f5", marginLeft: 78 },

  card: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff",
  },

  dot: {
    position: "absolute", bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 5.5,
    borderWidth: 2, borderColor: "#ffffff",
  },

  rowTop:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  name:     { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, flex: 1, marginRight: 8 },
  time:     { fontFamily: fonts.body, fontSize: 11, color: colors.outline },
  jobLabel: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary, marginBottom: 3 },
  preview:  { fontFamily: fonts.body, fontSize: 13, color: colors.outline },

  badge:     { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginTop: 5 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 0.3 },

  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: "#10b981", borderRadius: 10, paddingVertical: 9,
  },
  acceptBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  declineBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 10, paddingVertical: 9,
    borderWidth: 1.5, borderColor: "#e5e7eb",
  },
  declineBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.outline },

  empty:     { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyTitle:{ fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, marginBottom: 8 },
  emptySub:  { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 22 },
});
