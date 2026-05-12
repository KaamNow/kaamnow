import { useEffect, useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, spacing, sizes } from "../theme";

const SKILL_CATEGORIES = [
  { category: "Construction", skills: ["mason", "tile work", "carpentry", "painting", "plumbing", "electrical", "welding"] },
  { category: "Farm", skills: ["harvesting", "weeding", "transplanting", "irrigation"] },
  { category: "Home", skills: ["cleaning", "cooking", "domestic help"] },
  { category: "Transport", skills: ["driver", "loading", "shifting"] },
  { category: "Other", skills: ["helper", "digging", "sweeping"] },
];

function skillCategory(skill) {
  for (const c of SKILL_CATEGORIES) if (c.skills.includes(skill)) return c.category;
  return "Other";
}

export default function WorkerOnboardingScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || "");
  const [dailyRate, setDailyRate] = useState("350");
  const [skills, setSkills] = useState([]);
  const [address, setAddress] = useState({
    village: "",
    post: "",
    block: "",
    district: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = useState(false);

  // Auto-fill from pincode lookup
  useEffect(() => {
    if (result && status === "success") {
      setAddress((prev) => ({
        ...prev,
        district: prev.district || result.district,
        state: prev.state || result.state,
        pincode,
        post: prev.post || result.name,
        block: prev.block || result.block || "",
      }));
    }
  }, [result, pincode, status]);

  const toggleSkill = (s) =>
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const canContinue = () => {
    if (step === 0) {
      const rate = parseInt(dailyRate, 10);
      return name.trim().length >= 2 && rate >= 100 && rate <= 5000;
    }
    if (step === 1) return (address.village || "").trim().length >= 2 && pincode.length === 6;
    if (step === 2) return skills.length >= 1;
    return false;
  };

  const next = async () => {
    if (!canContinue()) {
      if (step === 0) Alert.alert("Please enter your name and a valid daily rate (₹100–₹5000)");
      else if (step === 1) Alert.alert("Please fill village and a 6-digit pincode");
      else Alert.alert("Pick at least one skill");
      return;
    }
    if (step < 2) return setStep((s) => s + 1);

    // Final step → save
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name: name.trim(),
        village: address.village,
        pincode: address.pincode,
        address,
      });
      await api.post("/workers/profile", {
        daily_rate: Number(dailyRate),
        village: address.village,
        district: address.district || "",
        state: address.state || "",
        address,
        skills,
        structured_skills: skills.map((s) => ({ category: skillCategory(s), skill: s })),
      });
      await refreshUser();
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (step === 0) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate("Tabs");
    } else {
      setStep((s) => s - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.tag}>Worker Onboarding · {step + 1} of 3</Text>

          {/* Progress bar */}
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i < step && { backgroundColor: colors.saffron },
                  i === step && { backgroundColor: colors.indigo },
                ]}
              />
            ))}
          </View>

          {/* Step 0 — Name + Daily rate */}
          {step === 0 && (
            <View>
              <Text style={styles.title}>Your Name</Text>
              <Text style={styles.subtitle}>Tell us your full name so customers can trust you.</Text>

              <Input
                label="Full name"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
              <Input
                label="Daily rate (₹)"
                placeholder="350"
                keyboardType="number-pad"
                value={dailyRate}
                onChangeText={(v) => setDailyRate(v.replace(/\D/g, ""))}
              />
              <Text style={styles.hint}>This is what customers will see as your expected pay.</Text>
            </View>
          )}

          {/* Step 1 — Address */}
          {step === 1 && (
            <View>
              <Text style={styles.title}>Your Address</Text>
              <Text style={styles.subtitle}>
                Enter your pincode — district, state, and post office fill automatically. Type your village.
              </Text>

              <Input
                label="Pincode *"
                placeholder="6-digit pincode"
                keyboardType="number-pad"
                maxLength={6}
                value={pincode}
                onChangeText={(v) => {
                  const d = v.replace(/\D/g, "").slice(0, 6);
                  setPincode(d);
                  setAddress((a) => ({ ...a, pincode: d }));
                }}
              />
              {status === "loading" && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={colors.indigo} />
                  <Text style={styles.loadingText}>Looking up pincode…</Text>
                </View>
              )}
              {status === "error" && errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
              {status === "success" && result && (
                <View style={styles.pinPill}>
                  <Text style={styles.pinPillText}>
                    ✓ {result.district} district · {result.state}
                  </Text>
                </View>
              )}

              <Input
                label="Village / Town *"
                placeholder="e.g. Ramnagar"
                value={address.village}
                onChangeText={(v) => setAddress({ ...address, village: v })}
              />

              <View style={styles.row2}>
                <View style={styles.col}>
                  <Input
                    label="District"
                    placeholder="Auto-filled"
                    value={address.district}
                    onChangeText={(v) => setAddress({ ...address, district: v })}
                  />
                </View>
                <View style={styles.col}>
                  <Input
                    label="State"
                    placeholder="Auto-filled"
                    value={address.state}
                    onChangeText={(v) => setAddress({ ...address, state: v })}
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={styles.col}>
                  <Input
                    label="Post office"
                    placeholder="Optional"
                    value={address.post}
                    onChangeText={(v) => setAddress({ ...address, post: v })}
                  />
                </View>
                <View style={styles.col}>
                  <Input
                    label="Block / Tehsil"
                    placeholder="Optional"
                    value={address.block}
                    onChangeText={(v) => setAddress({ ...address, block: v })}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Step 2 — Skills */}
          {step === 2 && (
            <View>
              <Text style={styles.title}>What can you do?</Text>
              <Text style={styles.subtitle}>
                Pick all the skills you offer. You can update these later.
              </Text>

              {SKILL_CATEGORIES.map((cat) => (
                <View key={cat.category} style={{ marginBottom: spacing.md }}>
                  <Text style={styles.catLabel}>{cat.category}</Text>
                  <View style={styles.chipWrap}>
                    {cat.skills.map((skill) => {
                      const on = skills.includes(skill);
                      return (
                        <Pressable
                          key={skill}
                          onPress={() => toggleSkill(skill)}
                          style={[styles.chip, on && styles.chipOn]}
                        >
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{skill}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Text style={styles.hint}>
                Selected: {skills.length} skill{skills.length === 1 ? "" : "s"}
              </Text>
            </View>
          )}

          {/* Footer nav */}
          <View style={styles.footer}>
            <Button
              title={step === 0 ? "Exit" : "Back"}
              variant="outline"
              onPress={back}
              style={{ flex: 1 }}
            />
            <Button
              title={saving ? "Saving..." : step === 2 ? "Finish & See Jobs" : "Continue"}
              onPress={next}
              loading={saving}
              disabled={!canContinue() || saving}
              style={{ flex: 2 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  tag: {
    fontFamily: fonts.bodyBold,
    color: colors.textMuted,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: spacing.xl },
  progressDot: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e5e7eb",
  },
  title: { fontFamily: fonts.display, fontSize: sizes.h2, color: colors.text, marginBottom: 6 },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: sizes.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  hint: { fontFamily: fonts.body, fontSize: sizes.tiny, color: colors.textMuted, marginTop: 4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  loadingText: { fontFamily: fonts.body, color: colors.indigo, fontSize: sizes.small },
  errorText: { fontFamily: fonts.body, color: colors.danger, fontSize: sizes.small, marginBottom: spacing.md },
  pinPill: {
    backgroundColor: "#f0fdf4",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: spacing.md,
  },
  pinPillText: { fontFamily: fonts.bodyBold, color: "#15803d", fontSize: sizes.tiny },
  row2: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  footer: { flexDirection: "row", gap: 10, marginTop: spacing.md },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.indigoTint, borderColor: colors.indigo },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textSecondary },
  chipTextOn: { color: colors.indigo },
});
