import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import api from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing } from "../theme";

const SESSION_KEY = "kn_wa_session";
const WHATSAPP_GREEN = "#075E54";
const WHATSAPP_LIGHT = "#DCF8C6";

function getSessionId(user) {
  // Logged-in users: use their id as session — backend injects identity via JWT
  return user?.id ? `app-${user.id}` : null;
}

export default function WhatsAppDemoScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const sessionId = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      // Prefer real phone for logged-in users; fall back to stored random for guests
      let sid = getSessionId(user);
      if (!sid) {
        sid = await SecureStore.getItemAsync(SESSION_KEY);
        if (!sid) {
          sid = "wa-" + Math.random().toString(36).slice(2, 12);
          await SecureStore.setItemAsync(SESSION_KEY, sid);
        }
      }
      sessionId.current = sid;
      setMessages([]);
      send("hi", true);
    })();
  }, [user?.id]); // re-init when user logs in/out

  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => scrollRef.current.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const send = async (textOverride, hideUser) => {
    const text = textOverride ?? input;
    if (!text.trim() || !sessionId.current) return;
    setSending(true);
    if (!hideUser) setMessages((m) => [...m, { from: "user", text }]);
    setInput("");
    try {
      const r = await api.post("/whatsapp/message", {
        session_id: sessionId.current,
        message: text,
      });
      setMessages((m) => [...m, { from: "bot", text: r.data.reply }]);
    } catch {
      setMessages((m) => [...m, { from: "bot", text: "Sorry, something went wrong." }]);
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    if (!getSessionId(user)) {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      const sid = "wa-" + Math.random().toString(36).slice(2, 12);
      await SecureStore.setItemAsync(SESSION_KEY, sid);
      sessionId.current = sid;
    }
    setMessages([]);
    setTimeout(() => send("MENU", true), 200);
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.chatHeader}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
          <Image source={require("../../assets/icon.png")} style={styles.botAvatar} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.botName}>KaamNow Bot</Text>
            <Text style={styles.botStatus}>{user ? `online · ${user.name}` : "online · guest"}</Text>
          </View>
          <Pressable testID="reset-chat" onPress={reset}>
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          testID="chat-messages"
          style={styles.chatBg}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        >
          {messages.map((m, i) => (
            <View
              key={i}
              style={[
                styles.bubble,
                m.from === "user" ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text style={styles.bubbleText}>{m.text}</Text>
            </View>
          ))}
          {sending && (
            <View style={[styles.bubble, styles.bubbleBot, { opacity: 0.6 }]}>
              <Text style={styles.bubbleText}>typing…</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            testID="chat-input"
            value={input}
            onChangeText={setInput}
            placeholder="Type a message…"
            placeholderTextColor={colors.outline}
            style={styles.chatInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
          />
          <Pressable testID="chat-send" onPress={() => send()} style={styles.sendBtn}>
            <Ionicons name={input.trim() ? "send" : "mic"} size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: WHATSAPP_GREEN },
  head: { padding: spacing.lg, paddingBottom: 8 },
  h1: { fontFamily: fonts.display, fontSize: 24, color: colors.textHeading, marginTop: 6 },
  lead: { fontFamily: fonts.body, fontSize: 13, color: colors.textBody, marginTop: 6, lineHeight: 18 },
  code: { fontFamily: "Courier", backgroundColor: colors.surface, paddingHorizontal: 4, fontSize: 12 },
  chatHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: WHATSAPP_GREEN },
  botAvatar: { width: 40, height: 40, borderRadius: 20 },
  botName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },
  botStatus: { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.8)" },
  resetText: { color: colors.onPrimary, fontFamily: fonts.bodyBold, fontSize: 12, textDecorationLine: "underline" },
  chatBg: { flex: 1, backgroundColor: "#F5F4EF" },
  bubble: { maxWidth: "80%", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16 },
  bubbleBot: { backgroundColor: "#fff", alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: WHATSAPP_LIGHT, alignSelf: "flex-end", borderBottomRightRadius: 4 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.textHeading, lineHeight: 20 },
  inputRow: { flexDirection: "row", padding: 10, gap: 8, backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  chatInput: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.textHeading },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: WHATSAPP_GREEN, alignItems: "center", justifyContent: "center" },
});
