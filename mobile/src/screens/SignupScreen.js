import { useState } from "react";
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../api";
import { colors, fonts, spacing, radius } from "../theme";
import Button from "../components/Button";
import Input from "../components/Input";

export default function SignupScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
    village: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (k) => (v) => setForm({ ...form, [k]: v });

  const submit = async () => {
    if (!form.name || !form.email || form.password.length < 6) {
      return Alert.alert("Missing info", "Name, email and password (6+ chars) are required.");
    }
    setLoading(true);
    try {
      const u = await register(form);
      Alert.alert(`Welcome to KaamNow!`, `Hi ${u.name}!`);
      navigation.navigate("Tabs");
    } catch (err) {
      Alert.alert("Signup failed", formatApiError(err));
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
          <Text style={styles.h1}>Create your account</Text>
          <Text style={styles.lead}>Free for workers. ₹30 per booking for customers.</Text>

          <View style={styles.roleRow}>
            {[
              { v: "customer", l: "I need workers" },
              { v: "worker", l: "I am a worker" },
            ].map((r) => (
              <Pressable
                key={r.v}
                testID={`role-${r.v}`}
                onPress={() => setForm({ ...form, role: r.v })}
                style={[styles.roleBtn, form.role === r.v && styles.roleBtnActive]}
              >
                <Text style={[styles.roleText, form.role === r.v && { color: "#fff" }]}>{r.l}</Text>
              </Pressable>
            ))}
          </View>

          <Input testID="signup-name" label="Full name" value={form.name} onChangeText={update("name")} />
          <Input testID="signup-email" label="Email" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={update("email")} />
          <Input testID="signup-password" label="Password (min 6)" secureTextEntry value={form.password} onChangeText={update("password")} />
          <Input testID="signup-village" label="Village (optional)" value={form.village} onChangeText={update("village")} />
          <Input testID="signup-phone" label="Phone (optional)" keyboardType="phone-pad" value={form.phone} onChangeText={update("phone")} />

          <Button testID="signup-submit" title="Create account" loading={loading} onPress={submit} />

          <Pressable
            testID="signup-to-login"
            onPress={() => navigation.navigate("Login")}
            style={{ marginTop: 14 }}
          >
            <Text style={styles.altLink}>
              Already a member? <Text style={{ color: colors.indigo, fontFamily: fonts.bodyBold }}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: 60, flexGrow: 1 },
  brand: { fontFamily: fonts.display, fontSize: 22, textAlign: "center", marginVertical: 16, color: colors.text },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 24 },
  h1: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 4, marginBottom: 16 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  roleBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.md, backgroundColor: "#F3F4F6", alignItems: "center" },
  roleBtnActive: { backgroundColor: colors.indigo },
  roleText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  altLink: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
