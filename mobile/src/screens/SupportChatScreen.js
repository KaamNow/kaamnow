import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius } from "../theme";

const CHATWOOT_URL = process.env.EXPO_PUBLIC_CHATWOOT_URL || "https://dev.kaamnow.com/support";

export default function SupportChatScreen({ navigation }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const params = user
    ? `?user_name=${encodeURIComponent(user.name || "")}&identifier=${encodeURIComponent(user.phone_primary || user.id || "")}`
    : "";

  const uri = `${CHATWOOT_URL}${params}`;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerClose} hitSlop={8}>
          <Ionicons name="close" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KaamNow Support</Text>
      </View>
      <WebView
        source={{ uri }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  webview:   { flex: 1 },
});
