import { useEffect, useState } from "react";
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
import SecondaryButton from "../components/SecondaryButton";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, sizes, spacing } from "../theme";

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

function rateTone(rateText) {
  const rate = parseInt(rateText, 10);
  if (!rate) return { color: colors.info, bg: colors.infoLight, text: "Example: 500" };
  if (rate < 250) return { color: colors.warning, bg: colors.warningLight, text: "Rate thoda low lag raha hai. Area ke hisaab se check kar lein." };
  if (rate > 1200) return { color: colors.warning, bg: colors.warningLight, text: "High rate hai. Customers ko skill aur experience clear dikhna chahiye." };
  return { color: colors.primary, bg: colors.primaryLight, text: "Yeh rate customers ko profile par dikhega." };
}

export default function WorkerOnboardingScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || "");
  const [dailyRate, setDailyRate] = useState("350");
  const [skills, setSkills] = useState([]);
  const [showMoreAddress, setShowMoreAddress] = useState(false);
  const [address, setAddress] = useState({
    village: "",
    post: "",
    block: "",
    district: "",
    state: "",
    pincode: "",
  });
  const [saving, setSaving] = useState(false);

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

  const toggleSkill = (skill) =>
    setSkills((prev) => (prev.includes(skill) ? prev.filter((x) => x !== skill) : [...prev, skill]));

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
      if (step === 0) Alert.alert("Naam aur sahi roz ki kamai dalein", "Rate ₹100 se ₹5000 ke beech hona chahiye.");
      else if (step === 1) Alert.alert("Location complete karein", "Village / Area aur 6-digit pincode zaroori hai.");
      else Alert.alert("Skills chunein", "Kam se kam ek skill select karein.");
      return;
    }
    if (step < 2) return setStep((s) => s + 1);

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
    <AppScreen edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={back}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>

          <Progress step={step} />

          {step === 0 && (
            <StepOne
              name={name}
              setName={setName}
              dailyRate={dailyRate}
              setDailyRate={setDailyRate}
            />
          )}

          {step === 1 && (
            <StepTwo
              pincode={pincode}
              setPincode={setPincode}
              status={status}
              result={result}
              errorMsg={errorMsg}
              address={address}
              setAddress={setAddress}
              showMoreAddress={showMoreAddress}
              setShowMoreAddress={setShowMoreAddress}
            />
          )}

          {step === 2 && (
            <StepThree skills={skills} toggleSkill={toggleSkill} />
          )}

          <View style={styles.footer}>
            {step > 0 ? (
              <SecondaryButton title="Back" onPress={back} style={styles.footerBack} />
            ) : null}
            <PrimaryButton
              title={saving ? "Saving..." : step === 2 ? "Profile ready karo" : "Continue"}
              onPress={next}
              loading={saving}
              disabled={!canContinue() || saving}
              style={styles.footerPrimary}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function Progress({ step }) {
  return (
    <View style={styles.progressBlock}>
      <View style={styles.progressRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.progressBar,
              i <= step && styles.progressBarActive,
            ]}
          />
        ))}
      </View>
      <View style={styles.stepPill}>
        <Text style={styles.stepPillText}>Step {step + 1} of 3</Text>
      </View>
    </View>
  );
}

function StepOne({ name, setName, dailyRate, setDailyRate }) {
  const insight = rateTone(dailyRate);

  return (
    <View>
      <Text style={styles.title}>Apna naam aur rate batao</Text>
      <Text style={styles.subtitle}>Customers yahi dekhenge - honest rahein</Text>

      <View style={styles.motivationCard}>
        <View style={styles.cardIcon}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
        </View>
        <Text style={styles.motivationText}>Poora naam aur sahi rate se zyada booking milti hai</Text>
      </View>

      <InputField
        label="Poora naam"
        placeholder="e.g. Ramesh Kumar"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
      />
      <InputField
        label="Roz ki kamai (₹)"
        placeholder="500"
        keyboardType="number-pad"
        value={dailyRate}
        onChangeText={(v) => setDailyRate(v.replace(/\D/g, ""))}
        helperText="Example: 500"
      />
      <View style={[styles.infoCard, { backgroundColor: insight.bg, borderColor: insight.color }]}>
        <Ionicons name="information-circle-outline" size={18} color={insight.color} />
        <Text style={[styles.infoText, { color: insight.color }]}>{insight.text}</Text>
      </View>
    </View>
  );
}

function StepTwo({
  pincode,
  setPincode,
  status,
  result,
  errorMsg,
  address,
  setAddress,
  showMoreAddress,
  setShowMoreAddress,
}) {
  return (
    <View>
      <Text style={styles.title}>Aap kahan kaam karte hain?</Text>
      <Text style={styles.subtitle}>Pincode se nearby jobs milenge</Text>

      <InputField
        label="Pincode"
        placeholder="6-digit pincode"
        keyboardType="number-pad"
        maxLength={6}
        value={pincode}
        onChangeText={(v) => {
          const d = v.replace(/\D/g, "").slice(0, 6);
          setPincode(d);
          setAddress((a) => ({ ...a, pincode: d }));
        }}
        helperText="Apne area ka pincode dalein"
      />

      {status === "loading" && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={styles.loadingText}>Pincode check ho raha hai...</Text>
        </View>
      )}
      {status === "error" && errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      {status === "success" && result ? (
        <View style={styles.pinPreview}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.pinPreviewText}>{result.district} district, {result.state}</Text>
        </View>
      ) : null}

      <InputField
        label="Village / Area"
        placeholder="e.g. Ramnagar"
        value={address.village}
        onChangeText={(v) => setAddress({ ...address, village: v })}
      />

      <View style={styles.row2}>
        <View style={styles.col}>
          <InputField
            label="District"
            placeholder="Auto-filled"
            value={address.district}
            onChangeText={(v) => setAddress({ ...address, district: v })}
          />
        </View>
        <View style={styles.col}>
          <InputField
            label="State"
            placeholder="Auto-filled"
            value={address.state}
            onChangeText={(v) => setAddress({ ...address, state: v })}
          />
        </View>
      </View>

      <Pressable
        style={styles.moreAddressToggle}
        onPress={() => setShowMoreAddress((v) => !v)}
      >
        <Text style={styles.moreAddressText}>More address details</Text>
        <Ionicons
          name={showMoreAddress ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.primary}
        />
      </Pressable>

      {showMoreAddress ? (
        <View style={styles.optionalCard}>
          <InputField
            label="Post office"
            placeholder="Optional"
            value={address.post}
            onChangeText={(v) => setAddress({ ...address, post: v })}
          />
          <InputField
            label="Block / Tehsil"
            placeholder="Optional"
            value={address.block}
            onChangeText={(v) => setAddress({ ...address, block: v })}
            style={{ marginBottom: 0 }}
          />
        </View>
      ) : null}
    </View>
  );
}

function StepThree({ skills, toggleSkill }) {
  return (
    <View>
      <Text style={styles.title}>Aap kya kaam kar sakte hain?</Text>
      <Text style={styles.subtitle}>Jitni skills, utni zyada calls</Text>

      <View style={styles.selectedCard}>
        <Ionicons name="construct-outline" size={18} color={colors.primary} />
        <Text style={styles.selectedText}>
          {skills.length} skill{skills.length === 1 ? "" : "s"} selected
        </Text>
      </View>

      {SKILL_CATEGORIES.map((cat) => (
        <View key={cat.category} style={styles.categoryBlock}>
          <Text style={styles.catLabel}>{cat.category}</Text>
          <View style={styles.chipWrap}>
            {cat.skills.map((skill) => {
              const selected = skills.includes(skill);
              return (
                <Pressable
                  key={skill}
                  onPress={() => toggleSkill(skill)}
                  style={({ pressed }) => [
                    styles.chip,
                    selected && styles.chipSelected,
                    pressed && styles.chipPressed,
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{skill}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
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
  progressBlock: { marginBottom: spacing.xl },
  progressRow: { flexDirection: "row", gap: 7, marginBottom: spacing.md },
  progressBar: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  progressBarActive: { backgroundColor: colors.primary },
  stepPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
    paddingVertical: 6,
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
  motivationCard: {
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
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  motivationText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: 2,
  },
  infoText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 17 },
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
  pinPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: -4,
    marginBottom: spacing.md,
  },
  pinPreviewText: { fontFamily: fonts.bodyBold, color: colors.success, fontSize: 13 },
  row2: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  moreAddressToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginTop: 2,
  },
  moreAddressText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  optionalCard: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: spacing.lg,
  },
  selectedText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },
  categoryBlock: { marginBottom: spacing.lg },
  catLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipPressed: { opacity: 0.9 },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  chipTextSelected: { color: "#fff", fontFamily: fonts.bodyBold },
  footer: { flexDirection: "row", gap: 10, marginTop: spacing.xl },
  footerBack: { flex: 1 },
  footerPrimary: { flex: 2 },
});
