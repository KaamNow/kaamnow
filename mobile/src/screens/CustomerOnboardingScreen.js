import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../components/AppScreen";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import api, { formatApiError } from "../api";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, sizes, spacing } from "../theme";

export default function CustomerOnboardingScreen({ navigation }) {
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();
  const [village, setVillage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (status !== "success" || !result) {
      return Alert.alert("Pincode check hone dein", "Valid pincode dalne ke baad area details dikhenge.");
    }
    const villageName = village.trim();
    if (!villageName) return Alert.alert("Village / Area dalein", "Nearby workers dikhane ke liye area zaroori hai.");

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

  const back = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Tabs");
  };

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={back}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoK}>K</Text>
            </View>
            <Text style={styles.brandName}>KaamNow</Text>
          </View>

          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>Location setup</Text>
          </View>

          <Text style={styles.title}>Aap kahan hain?</Text>
          <Text style={styles.subtitle}>Nearby workers dikhane ke liye location zaroori hai</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>Pincode se hum aapke area ke workers dikhayenge</Text>
          </View>

          <InputField
            label="Pincode"
            placeholder="6-digit pincode"
            keyboardType="number-pad"
            maxLength={6}
            value={pincode}
            onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))}
            helperText="Apne ghar ya kaam ke area ka pincode dalein"
          />

          {status === "loading" && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.loadingText}>Pincode check ho raha hai...</Text>
            </View>
          )}
          {status === "error" && errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {result && status === "success" ? (
            <View style={styles.locationCard}>
              <View style={styles.successPreview}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={styles.successPreviewText}>{result.district}, {result.state}</Text>
              </View>

              <InputField
                label="Village / Area"
                placeholder="e.g. Ramnagar"
                value={village}
                onChangeText={setVillage}
              />

              <View style={styles.row2}>
                <View style={styles.col}>
                  <ReadOnlyField label="District" value={result.district} />
                </View>
                <View style={styles.col}>
                  <ReadOnlyField label="State" value={result.state} />
                </View>
              </View>

              <View style={styles.mutedDetails}>
                <ReadOnlyField label="Post Office" value={result.name} compact />
                {!!result.block && <ReadOnlyField label="Block / Tehsil" value={result.block} compact />}
              </View>
            </View>
          ) : null}

          <PrimaryButton
            title={loading ? "Saving..." : "Workers dekhein"}
            onPress={submit}
            loading={loading}
            disabled={status !== "success" || !village.trim()}
            style={styles.cta}
          />

          <Pressable onPress={skip} style={styles.skipLink}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function ReadOnlyField({ label, value, compact = false }) {
  return (
    <View style={[styles.readOnlyWrap, compact && styles.readOnlyCompact]}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyValue} numberOfLines={1}>{value || "-"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 8,
    marginLeft: -10,
  },
  brand: { alignItems: "center", marginBottom: 22 },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  logoK: { fontFamily: fonts.display, fontSize: 30, color: "#fff" },
  brandName: { marginTop: 10, fontFamily: fonts.displayBold, fontSize: 22, color: colors.text },
  stepPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: spacing.md,
  },
  stepPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },
  title: {
    fontFamily: fonts.display,
    fontSize: sizes.h2,
    lineHeight: 34,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.xs,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  loadingText: { fontFamily: fonts.body, color: colors.primary, fontSize: sizes.small },
  errorText: {
    fontFamily: fonts.bodySemi,
    color: colors.danger,
    fontSize: sizes.small,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    ...shadow.xs,
  },
  successPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  successPreviewText: { fontFamily: fonts.bodyBold, color: colors.success, fontSize: 13 },
  row2: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  mutedDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  readOnlyWrap: { marginBottom: 12 },
  readOnlyCompact: { marginBottom: 8 },
  readOnlyLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  readOnlyBox: {
    minHeight: 44,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  readOnlyValue: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  cta: { marginTop: spacing.xl },
  skipLink: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  skipText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textMuted },
});
