import { View, StyleSheet, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../theme";

const CHATWOOT_URL = process.env.EXPO_PUBLIC_CHATWOOT_URL || "https://dev.kaamnow.com/support";

export default function SupportChatScreen() {
  const { user } = useAuth();

  const params = user
    ? `?user_name=${encodeURIComponent(user.name || "")}&identifier=${encodeURIComponent(user.phone_primary || user.id || "")}`
    : "";

  const uri = `${CHATWOOT_URL}${params}`;

  return (
    <View style={styles.container}>
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
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  webview:   { flex: 1 },
});
