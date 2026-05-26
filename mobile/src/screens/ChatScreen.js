import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

const STATUS_CONFIG = {
  requested: { label: "Pending",   bg: colors.warningLight, text: colors.warning },
  accepted:  { label: "Active",    bg: colors.successLight, text: colors.success },
  completed: { label: "Completed", bg: colors.surface, text: colors.textSecondary },
  rejected:  { label: "Declined",  bg: colors.dangerLight, text: colors.danger },
  cancelled: { label: "Cancelled", bg: colors.surface, text: colors.textSecondary },
};

// Contextual quick replies — poster sees worker-facing Qs, worker sees poster-facing Qs
const QUICK_REPLIES = {
  // direction === "received" → I'm the job poster, they applied to me
  received: [
    "When can you start?",
    "What's your experience?",
    "Share your location",
    "Can you bring tools?",
    "I'll confirm by EOD",
  ],
  // direction === "sent" → I'm the worker, I applied
  sent: [
    "I'm available ✓",
    "Ready to start 👍",
    "Please share site address",
    "What tools do I need?",
    "Is the rate negotiable?",
  ],
};

export default function ChatScreen({ route, navigation }) {
  const { engagementId } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [messages,   setMessages]   = useState([]);
  const [engagement, setEngagement] = useState(null);
  const [text,       setText]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [loading,    setLoading]    = useState(true);

  const listRef = useRef(null);
  const pollRef = useRef(null);

  const loadEngagement = useCallback(async () => {
    try {
      const r = await api.get(`/work-requests/${engagementId}`);
      setEngagement(r.data);
    } catch {}
  }, [engagementId]);

  const loadMessages = useCallback(async (quiet = false) => {
    try {
      const r = await api.get(`/chat/${engagementId}/messages`);
      setMessages(r.data || []);
      // Mark all messages read whenever we load (silently)
      api.post(`/chat/${engagementId}/read-all`).catch(() => {});
    } catch {}
    finally { if (!quiet) setLoading(false); }
  }, [engagementId]);

  useEffect(() => {
    Promise.all([loadEngagement(), loadMessages()]);
    pollRef.current = setInterval(() => loadMessages(true), 4000);
    return () => clearInterval(pollRef.current);
  }, [loadEngagement, loadMessages]);

  const sendText = async (msg) => {
    const trimmed = (msg ?? text).trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      track("chat_message_sent", { engagement_id: engagementId });
      await api.post(`/chat/${engagementId}/send`, { text: trimmed });
      await loadMessages(true);
    } catch {
      if (!msg) setText(trimmed); // restore only if it was from the input
    } finally {
      setSending(false);
    }
  };

  const isClosed = ["completed", "cancelled", "rejected"].includes(engagement?.status);
  const canChat   = engagement?.status === "accepted";
  const otherName = engagement
    ? (engagement.direction === "sent" ? engagement.requested_to_name : engagement.requested_by_name)
    : "…";
  const jobTitle  = engagement?.job_summary?.title;
  const jobId     = engagement?.job_summary?.id;
  const statusCfg = STATUS_CONFIG[engagement?.status] || STATUS_CONFIG.requested;
  const quickReplies = QUICK_REPLIES[engagement?.direction] || QUICK_REPLIES.sent;

  // Last message from me — for Delivered/Read label
  const lastMineId = [...messages].reverse().find(m => m.sender_id === user?.id)?.id ?? null;

  const renderItem = ({ item }) => {
    const mine    = item.sender_id === user?.id;
    const timeStr = new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const isLastMine = mine && item.id === lastMineId;

    return (
      <View style={mine ? S.rowMine : S.rowOther}>
        <View style={[S.bubble, mine ? S.bubbleMine : S.bubbleOther]}>
          <Text style={[S.bubbleText, mine && S.bubbleTextMine]}>
            {item.image_url ? "📷 Photo" : item.voice_url ? "🎤 Voice message" : item.text}
          </Text>
          <View style={S.bubbleMeta}>
            <Text style={[S.time, mine && S.timeMine]}>{timeStr}</Text>
            {mine && (
              <Ionicons
                name="checkmark-done"
                size={13}
                color={item.read ? colors.success : "rgba(255,255,255,0.5)"}
                style={{ marginLeft: 3 }}
              />
            )}
          </View>
        </View>
        {/* Delivered / Read label — only under the very last sent message */}
        {isLastMine && (
          <Text style={[S.receiptLabel, item.read && S.receiptLabelRead]}>
            {item.read ? "Read" : "Delivered"}
          </Text>
        )}
      </View>
    );
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = () => (
    <View style={S.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBack} hitSlop={8}>
        <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={S.headerName} numberOfLines={1}>{otherName}</Text>
        {jobTitle ? <Text style={S.headerSub} numberOfLines={1}>{jobTitle}</Text> : null}
      </View>
      {engagement && (
        <View style={[S.statusBadge, { backgroundColor: statusCfg.bg }]}>
          <Text style={[S.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[S.safe, { paddingTop: insets.top }]}>
        <Header />
        <View style={S.center}><ActivityIndicator color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[S.safe, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <Header />

      {/* Job banner — tappable → JobDetail */}
      {engagement?.job_summary && (
        <TouchableOpacity
          style={S.jobBanner}
          activeOpacity={0.8}
          onPress={() => jobId && navigation.navigate("JobDetail", { jobId })}
        >
          <View style={S.jobBannerIcon}>
            <Ionicons name="briefcase-outline" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.jobBannerTitle} numberOfLines={1}>{engagement.job_summary.title}</Text>
            {engagement.job_summary.budget_max
              ? <Text style={S.jobBannerSub}>₹{engagement.job_summary.budget_max}/day · tap to view</Text>
              : <Text style={S.jobBannerSub}>Tap to view job details</Text>}
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.outline} />
        </TouchableOpacity>
      )}

      {/* Cover message — shown when no messages yet */}
      {engagement?.message && messages.length === 0 && (
        <View style={S.coverMsg}>
          <Text style={S.coverMsgLabel}>APPLICATION MESSAGE</Text>
          <Text style={S.coverMsgText}>"{engagement.message}"</Text>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={S.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={S.emptyWrap}>
            <Ionicons
              name={canChat ? "chatbubble-outline" : isClosed ? "archive-outline" : "lock-closed-outline"}
              size={32} color={colors.outline}
              style={{ marginBottom: 10 }}
            />
            <Text style={S.emptyText}>
              {canChat
                ? "Send your first message"
                : isClosed
                  ? "No chat messages were sent before this chat was closed"
                  : "Chat opens after the request is accepted"}
            </Text>
          </View>
        }
      />

      {canChat ? (
        <>
          {/* Quick reply pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={S.quickBar}
            contentContainerStyle={S.quickBarContent}
          >
            {quickReplies.map((reply) => (
              <TouchableOpacity
                key={reply}
                style={S.quickPill}
                activeOpacity={0.75}
                onPress={() => sendText(reply)}
                disabled={sending}
              >
                <Text style={S.quickPillText}>{reply}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input bar */}
          <View style={[S.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={S.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message…"
              placeholderTextColor={colors.outline}
              multiline
              maxLength={2000}
              onSubmitEditing={() => sendText()}
            />
            <TouchableOpacity
              style={[S.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
              onPress={() => sendText()}
              disabled={!text.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color={colors.onPrimary} />
                : <Ionicons name="send" size={18} color={colors.onPrimary} />
              }
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[S.lockedBar, { paddingBottom: insets.bottom + 14 }]}>
          <Ionicons name="lock-closed-outline" size={15} color={colors.outline} />
          <Text style={S.lockedText}>
            {isClosed
              ? "This chat is closed. Chat history is read-only."
              : "Chat unlocks after acceptance"}
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  headerBack:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerName:      { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },
  headerSub:       { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 1 },
  statusBadge:     { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.3 },

  // ── Job banner
  jobBanner: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  jobBannerIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  jobBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  jobBannerSub:   { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  // ── Cover message
  coverMsg: {
    marginHorizontal: 16, marginTop: 12,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: 14,
  },
  coverMsgLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textMuted, letterSpacing: 0.8, marginBottom: 4, textTransform: "uppercase" },
  coverMsgText:  { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textHeading, fontStyle: "italic", lineHeight: 20 },

  // ── Messages
  messageList: { paddingHorizontal: 16, paddingVertical: 12 },

  rowMine:  { alignItems: "flex-end",   marginBottom: 8 },
  rowOther: { alignItems: "flex-start", marginBottom: 8 },

  bubble: { maxWidth: "78%", borderRadius: 18, padding: 12 },
  bubbleMine:  { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.surfaceCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.borderSubtle },

  bubbleText:     { fontFamily: fonts.body, fontSize: 15, color: colors.textHeading, lineHeight: 21 },
  bubbleTextMine: { color: colors.onPrimary },
  bubbleMeta:     { flexDirection: "row", alignItems: "center", marginTop: 4, alignSelf: "flex-end" },
  time:     { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  timeMine: { color: "rgba(255,255,255,0.65)" },

  receiptLabel:     { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 2, marginRight: 4 },
  receiptLabelRead: { color: colors.success },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center", paddingHorizontal: 32 },

  // ── Quick reply pills
  quickBar: {
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    maxHeight: 56,
  },
  quickBarContent: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  quickPill: {
    paddingHorizontal: 14, paddingVertical: 9, minHeight: 36,
    borderRadius: radius.pill, backgroundColor: colors.surface,
  },
  quickPillText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textHeading },

  // ── Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16, paddingTop: 10, gap: 10,
  },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
    maxHeight: 100, minHeight: 44, paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: colors.surface, borderRadius: 22,
  },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 22,
    width: 44, height: 44, justifyContent: "center", alignItems: "center",
  },

  // ── Locked bar
  lockedBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    paddingHorizontal: 16, paddingTop: 16,
  },
  lockedText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textMuted },
});
