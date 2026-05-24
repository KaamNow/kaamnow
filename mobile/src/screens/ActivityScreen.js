import { useState, useCallback } from "react";
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { colors, fonts } from "../theme";
import api from "../lib/api";

const STATUS_META = {
  requested: { label: "Pending",   bg: "#fef3c7", text: "#92400e" },
  accepted:  { label: "Active",    bg: "#d1fae5", text: "#065f46" },
  completed: { label: "Completed", bg: "#dbeafe", text: "#1d4ed8" },
  rejected:  { label: "Declined",  bg: "#fee2e2", text: "#991b1b" },
  cancelled: { label: "Cancelled", bg: "#f3f4f6", text: "#6b7280" },
};

const AVATAR_COLORS = ["#7c3aed", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

function Avatar({ name }) {
  const letter = (name || "?")[0].toUpperCase();
  const bg = AVATAR_COLORS[letter.charCodeAt(0) % AVATAR_COLORS.length];
  return (
    <View style={[S.avatar, { backgroundColor: bg }]}>
      <Text style={S.avatarLetter}>{letter}</Text>
    </View>
  );
}

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

export default function ActivityScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [acting, setActing]           = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/work-requests/mine").catch(() => ({ data: [] }));
      setEngagements(Array.isArray(r.data) ? r.data : (r.data?.engagements || []));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (endpoint, id) => {
    setActing(id);
    try { await api.post(endpoint); await load(); } catch {}
    finally { setActing(null); }
  };

  // ── Section buckets ───────────────────────────────────────────────────────
  const actionNeeded = engagements.filter(e => e.status === "requested" && e.direction === "received");
  const inProgress   = engagements.filter(e => e.status === "accepted");
  const waiting      = engagements.filter(e => e.status === "requested" && e.direction === "sent");
  const done         = engagements.filter(e => ["completed", "rejected", "cancelled"].includes(e.status));

  const sections = [
    ...(actionNeeded.length ? [{ key: "action",   title: "Action Needed",  subtitle: "These people want to hire you", icon: "notifications-outline",  iconColor: "#f59e0b", data: actionNeeded }] : []),
    ...(inProgress.length   ? [{ key: "active",   title: "In Progress",    subtitle: "Work that's currently active",  icon: "flash-outline",           iconColor: "#10b981", data: inProgress   }] : []),
    ...(waiting.length      ? [{ key: "waiting",  title: "Waiting",        subtitle: "You applied — waiting for reply", icon: "time-outline",           iconColor: "#6366f1", data: waiting      }] : []),
    ...(done.length         ? [{ key: "done",     title: "Completed",      subtitle: "Past work and closed requests",  icon: "checkmark-circle-outline", iconColor: "#6b7280", data: done         }] : []),
  ];

  // ── Card ─────────────────────────────────────────────────────────────────
  const renderItem = ({ item, section }) => {
    const status    = item.status || "requested";
    const sm        = STATUS_META[status] || STATUS_META.cancelled;
    const isSent    = item.direction === "sent";
    const otherName = isSent ? (item.requested_to_name || "—") : (item.requested_by_name || "—");
    const jobTitle  = item.job_summary?.title || item.job_title || "Work Request";
    const rate      = item.job_summary?.budget_max ? `₹${item.job_summary.budget_max}/day` : null;
    const preview   = item.last_message?.text || item.message || null;
    const timestamp = timeAgo(item.updated_at || item.created_at);

    return (
      <TouchableOpacity
        style={[S.card, section.key === "done" && S.cardDone]}
        onPress={() => navigation.navigate("EngagementDetail", { id: item.id })}
        activeOpacity={0.75}
      >
        {/* Top: avatar + name + time + status pill */}
        <View style={S.cardTop}>
          <Avatar name={otherName} />
          <View style={S.cardTopMid}>
            <Text style={S.personName} numberOfLines={1}>{otherName}</Text>
            <Text style={S.timestamp}>{timestamp}</Text>
          </View>
          <View style={[S.pill, { backgroundColor: sm.bg }]}>
            <Text style={[S.pillText, { color: sm.text }]}>{sm.label}</Text>
          </View>
        </View>

        {/* Job title + rate */}
        <View style={S.jobRow}>
          <Ionicons name="briefcase-outline" size={13} color={colors.outline} />
          <Text style={S.jobTitle} numberOfLines={1}>{jobTitle}</Text>
          {rate ? <Text style={S.rate}>{rate}</Text> : null}
        </View>

        {/* Message / application note preview */}
        {preview ? (
          <Text style={S.preview} numberOfLines={2}>"{preview}"</Text>
        ) : null}

        {/* Accept / Decline for action-needed */}
        {section.key === "action" && (
          <View style={S.actions}>
            <TouchableOpacity
              style={S.btnAccept}
              disabled={acting === item.id}
              onPress={() => act(`/work-requests/${item.id}/accept`, item.id)}
            >
              {acting === item.id
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="checkmark" size={14} color="#fff" /><Text style={S.btnAcceptTxt}>Accept</Text></>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={S.btnDecline}
              disabled={acting === item.id}
              onPress={() => act(`/work-requests/${item.id}/reject`, item.id)}
            >
              <Text style={S.btnDeclineTxt}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Open Chat for in-progress */}
        {section.key === "active" && (
          <TouchableOpacity
            style={S.chatBtn}
            onPress={() => navigation.navigate("Chat", { engagementId: item.id })}
          >
            <Ionicons name="chatbubble-outline" size={13} color={colors.primary} />
            <Text style={S.chatBtnText}>Open Chat</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={S.sectionHeader}>
      <View style={[S.sectionIconWrap, { backgroundColor: section.iconColor + "1a" }]}>
        <Ionicons name={section.icon} size={15} color={section.iconColor} />
      </View>
      <View>
        <Text style={S.sectionTitle}>{section.title}</Text>
        <Text style={S.sectionSub}>{section.subtitle}</Text>
      </View>
      <View style={S.sectionCount}>
        <Text style={[S.sectionCountText, { color: section.iconColor }]}>{section.data.length}</Text>
      </View>
    </View>
  );

  const isEmpty = !loading && sections.length === 0;

  return (
    <View style={[S.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>My Activity</Text>
        {actionNeeded.length > 0 ? (
          <View style={S.headerBadge}>
            <Text style={S.headerBadgeText}>{actionNeeded.length}</Text>
          </View>
        ) : <View style={{ width: 36 }} />}
      </View>

      {loading ? (
        <View style={S.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : isEmpty ? (
        <View style={S.empty}>
          <View style={S.emptyIcon}>
            <Ionicons name="file-tray-outline" size={34} color={colors.outline} />
          </View>
          <Text style={S.emptyTitle}>No activity yet</Text>
          <Text style={S.emptySub}>
            When you apply for work or someone requests you,{"\n"}it will appear here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 10, marginHorizontal: 16 }} />}
          SectionSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f7" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  headerBack: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading,
  },
  headerBadge: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center",
  },
  headerBadgeText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

  // ── Section header ───────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10,
  },
  sectionIconWrap: {
    width: 32, height: 32, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },
  sectionTitle:     { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  sectionSub:       { fontFamily: fonts.body, fontSize: 11, color: colors.outline, marginTop: 1 },
  sectionCount:     { marginLeft: "auto", backgroundColor: "#f0f0f5", borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  sectionCountText: { fontFamily: fonts.bodyBold, fontSize: 12 },

  // ── Card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18, marginHorizontal: 16,
    padding: 16,
    borderWidth: 1, borderColor: "#e8e8ed",
  },
  cardDone: { opacity: 0.75 },

  avatar:       { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarLetter: { fontFamily: fonts.bodyBold, fontSize: 17, color: "#fff" },

  cardTop:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  cardTopMid: { flex: 1 },
  personName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
  timestamp:  { fontFamily: fonts.body, fontSize: 11, color: colors.outline, marginTop: 1 },

  pill:     { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11 },

  jobRow:   { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  jobTitle: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textHeading },
  rate:     { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },

  preview: {
    fontFamily: fonts.body, fontSize: 13, color: colors.outline,
    fontStyle: "italic", lineHeight: 19,
    borderLeftWidth: 2, borderLeftColor: "#e8e8ed",
    paddingLeft: 10, marginBottom: 4,
  },

  // Accept / Decline
  actions: {
    flexDirection: "row", gap: 10, marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f5",
  },
  btnAccept: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: "#10b981",
  },
  btnAcceptTxt:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  btnDecline:    { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb" },
  btnDeclineTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.outline },

  // Open Chat
  chatBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    marginTop: 12, paddingTop: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: "#f0f0f5",
  },
  chatBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  // Empty
  empty:      { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyIcon:  { width: 72, height: 72, borderRadius: 22, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, marginBottom: 8 },
  emptySub:   { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 22 },
});
