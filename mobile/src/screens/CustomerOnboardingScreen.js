import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "../components/Input";
import Button from "../components/Button";
import api, { formatApiError } from "../api";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, spacing, sizes } from "../theme";

export default function CustomerOnboardingScreen({ navigation }) {
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();
  const [village, setVillage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (status !== "success" || !result) {
      return Alert.alert("Please wait for the pincode lookup");
    }
    const villageName = village.trim();
    if (!villageName) return Alert.alert("Please enter your village or town name");

    setLoading(true);
    try {
      await api.patch("/auth/me", {
        pincode,
        village: villageName,
        address: {
          village: villageName,
          post: result.name,
          block: result.block || "",
          district: result.district,
          state: result.state,
          pincode,
        },
      });
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Where are you?</Text>
          <Text style={styles.subtitle}>
            Help us find the right jobs and workers in your area.
          </Text>

          <Input
            label="Pincode"
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))}
          />

          {status === "loading" && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.indigo} />
              <Text style={styles.loadingText}>Looking up pincode…</Text>
            </View>
          )}
          {status === "error" && errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          {result && status === "success" && (
            <View style={styles.autofill}>
              <Input
                label="Village / Town"
                placeholder="e.g. Ramnagar"
                value={village}
                onChangeText={setVillage}
              />
              <ReadOnlyField label="Post Office" value={result.name} />
              {!!result.block && <ReadOnlyField label="Block / Tehsil" value={result.block} />}
              <ReadOnlyField label="District" value={result.district} />
              <ReadOnlyField label="State" value={result.state} />
            </View>
          )}

          <Button
            title={loading ? "Saving..." : "Find jobs near me"}
            onPress={submit}
            loading={loading}
            disabled={status !== "success" || !village.trim()}
            style={{ marginTop: spacing.md }}
          />

          <Pressable onPress={skip} style={{ alignItems: "center", marginTop: spacing.lg }}>
            <Text style={styles.link}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.roLabel}>{label}</Text>
      <View style={styles.roBox}>
        <Text style={styles.roValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  title: {
    fontFamily: fonts.display,
    fontSize: sizes.h2,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.md,
  },
  loadingText: { fontFamily: fonts.body, color: colors.indigo, fontSize: sizes.small },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: sizes.small, marginBottom: spacing.md },
  autofill: {
    backgroundColor: colors.indigoTint,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  roLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  roBox: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  roValue: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  link: { fontFamily: fonts.bodySemi, color: colors.indigo },
});
