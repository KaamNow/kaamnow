import { useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../api";
import { colors, fonts, spacing, radius } from "../theme";
import Button from "../components/Button";
import Input from "../components/Input";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const u = await login(email, password);
      Alert.alert("Welcome back", `Hi ${u.name}!`);
      navigation.navigate("Tabs");
    } catch (err) {
      Alert.alert("Login failed", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>
          kaamnow<Text style={{ color: colors.saffron }}>.com</Text>
        </Text>
        <View style={styles.card}>
          <Text style={styles.h1}>Welcome back</Text>
          <Text style={styles.lead}>Log in to manage workers, jobs and bookings.</Text>

          <Input
            testID="login-email"
            label="Email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <Input
            testID="login-password"
            label="Password"
            placeholder="Your password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button testID="login-submit" title="Log in" loading={loading} onPress={submit} />

          <Pressable
            testID="login-to-signup"
            onPress={() => navigation.navigate("Signup")}
            style={{ marginTop: 16 }}
          >
            <Text style={styles.altLink}>
              New to KaamNow? <Text style={{ color: colors.indigo, fontFamily: fonts.bodyBold }}>Create account</Text>
            </Text>
          </Pressable>

          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Demo logins</Text>
            <Text style={styles.demoText}>customer@kaamnow.com / customer123</Text>
            <Text style={styles.demoText}>worker@kaamnow.com / worker123</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, justifyContent: "center", flexGrow: 1 },
  brand: { fontFamily: fonts.display, fontSize: 22, textAlign: "center", marginBottom: 24, color: colors.text },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24 },
  h1: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 20 },
  altLink: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  demoBox: { backgroundColor: "#F9FAFB", borderRadius: radius.md, padding: 12, marginTop: 18, borderWidth: 1, borderColor: colors.border },
  demoTitle: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textMuted, marginBottom: 4 },
  demoText: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
