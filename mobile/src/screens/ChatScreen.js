import { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

export default function ChatScreen({ route, navigation }) {
  const { engagementId } = route.params || {};
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const listRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async (quiet = false) => {
    try {
      const r = await api.get(`/chat/${engagementId}/messages`);
      setMessages(r.data || []);
      if (!quiet) setLoading(false);
    } catch {
      if (!quiet) setLoading(false);
    }
  }, [engagementId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 4000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText("");
    try {
      track("chat_message_sent", { engagement_id: engagementId });
      await api.post(`/chat/${engagementId}/send`, { text: trimmed });
      await load(true);
    } catch {
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const mine = item.sender_id === user?.id;
    return (
      <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.time, mine && styles.timeMine]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {mine && (
            <Ionicons
              name={item.read ? "checkmark-done" : "checkmark"}
              size={12}
              color={item.read ? colors.success : "rgba(255,255,255,0.6)"}
              style={{ marginLeft: 2 }}
            />
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top + 44}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.sm }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>{t("chat_empty")}</Text>
          </View>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t("chat_placeholder")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.4 }]}
          onPress={send}
          disabled={!text.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="send" size={18} color="#fff" />
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  bubble: {
    maxWidth: "78%", borderRadius: radius.lg, padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  bubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: colors.indigo,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  bubbleText:     { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  bubbleTextMine: { color: "#fff" },
  bubbleMeta:     { flexDirection: "row", alignItems: "center", marginTop: 3, alignSelf: "flex-end" },
  time:     { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
  timeMine: { color: "rgba(255,255,255,0.65)" },

  emptyWrap: { alignItems: "center", marginTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  inputBar: {
    flexDirection: "row", alignItems: "flex-end",
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm,
  },
  input: {
    flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text,
    maxHeight: 100, paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: colors.indigo, borderRadius: 20,
    width: 36, height: 36, justifyContent: "center", alignItems: "center",
  },
});
