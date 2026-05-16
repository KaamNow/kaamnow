import { useState } from "react";
import {
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
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import { formatApiError } from "../api";

const LANGUAGES = [
  { v: "en", l: "EN", full: "English" },
  { v: "hi", l: "हिं", full: "हिंदी" },
  { v: "mr", l: "मर", full: "मराठी" },
  { v: "gu", l: "ગુ", full: "ગુજરાતી" },
  { v: "ta", l: "த", full: "தமிழ்" },
  { v: "te", l: "తె", full: "తెలుగు" },
];

const ROLE_CARDS = {
  customer: {
    icon: "home-outline",
    title: "Kaam Dene Wale",
    subtitle: "Mujhe worker chahiye",
    chips: ["Mason", "Cook", "Driver", "More"],
    button: "Customer ke roop mein join karo",
  },
  worker: {
    icon: "briefcase-outline",
    title: "Kaam Karne Wale",
    subtitle: "Mujhe kaam chahiye",
    chips: ["₹400-800/day tak kaam mil sakta hai"],
    button: "Worker ke roop mein join karo",
  },
};

export default function RoleSelectionScreen({ navigation }) {
  const { completeSignup, resetOTPFlow } = useAuth();
  const { lang, setLang } = useLanguage();
  const [name, setName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState(lang || "hi");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [loadingRole, setLoadingRole] = useState(null);

  const goBack = () => {
    resetOTPFlow();
    navigation.replace("PhoneSignup");
  };

  const complete = async (role) => {
    if (name.trim().length < 2) {
      setSelectedRole(role);
      return Alert.alert("Naam dalein", "Account banane ke liye poora naam zaroori hai.");
    }

    setSelectedRole(role);
    setLoadingRole(role);
    try {
      const user = await completeSignup(name.trim(), role, undefined, preferredLanguage);
      setLang(preferredLanguage);
      navigation.reset({
        index: 0,
        routes: [{ name: user.role === "worker" ? "WorkerOnboarding" : "CustomerOnboarding" }],
      });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoK}>K</Text>
            </View>
            <Text style={styles.brandName}>KaamNow</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>Aap kaun hain?</Text>
            <Text style={styles.subtitle}>Apna kaam chunein</Text>
          </View>

          <InputField
            label="Poora naam"
            placeholder="e.g. Ramesh Kumar"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />

          <Text style={styles.sectionLabel}>Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroller}>
            <View style={styles.langRow}>
              {LANGUAGES.map((language) => (
                <Pressable
                  key={language.v}
                  onPress={() => setPreferredLanguage(language.v)}
                  style={[
                    styles.langChip,
                    preferredLanguage === language.v && styles.langChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.langChipText,
                      preferredLanguage === language.v && styles.langChipTextActive,
                    ]}
                  >
                    {language.l}
                  </Text>
                  {preferredLanguage === language.v ? (
                    <Text style={styles.langFull}>{language.full}</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View style={styles.cards}>
            <RoleCard
              role="customer"
              selected={selectedRole === "customer"}
              loading={loadingRole === "customer"}
              disabled={!!loadingRole}
              onSelect={() => setSelectedRole("customer")}
              onJoin={() => complete("customer")}
            />
            <RoleCard
              role="worker"
              selected={selectedRole === "worker"}
              loading={loadingRole === "worker"}
              disabled={!!loadingRole}
              onSelect={() => setSelectedRole("worker")}
              onJoin={() => complete("worker")}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function RoleCard({ role, selected, loading, disabled, onSelect, onJoin }) {
  const data = ROLE_CARDS[role];
  const isWorker = role === "worker";

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.roleCard,
        selected && styles.roleCardSelected,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roleTop}>
        <View style={[styles.roleIcon, isWorker && styles.workerIcon]}>
          <Ionicons name={data.icon} size={28} color={isWorker ? colors.money : colors.primary} />
        </View>
        {selected ? (
          <View style={styles.selectedDot}>
            <Ionicons name="checkmark" size={13} color="#fff" />
          </View>
        ) : null}
      </View>

      <Text style={styles.roleTitle}>{data.title}</Text>
      <Text style={styles.roleSubtitle}>{data.subtitle}</Text>

      <View style={styles.chipRow}>
        {data.chips.map((chip) => (
          <View key={chip} style={[styles.infoChip, isWorker && styles.workerChip]}>
            <Text style={[styles.infoChipText, isWorker && styles.workerChipText]}>{chip}</Text>
          </View>
        ))}
      </View>

      <PrimaryButton
        title={data.button}
        onPress={onJoin}
        loading={loading}
        disabled={disabled && !loading}
        style={styles.joinButton}
        textStyle={styles.joinButtonText}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 48 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 8,
    marginLeft: -10,
  },
  brand: { alignItems: "center", marginBottom: 26 },
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
  titleBlock: { marginBottom: 18 },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },
  subtitle: { marginTop: 4, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.textSecondary },
  sectionLabel: {
    marginTop: 2,
    marginBottom: 8,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  languageScroller: { marginBottom: 14 },
  langRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  langChip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  langChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  langChipText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  langChipTextActive: { color: colors.primary },
  langFull: { fontFamily: fonts.body, fontSize: 12, color: colors.primary },
  cards: { gap: 14 },
  roleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.xs,
  },
  roleCardSelected: { borderColor: colors.primary },
  pressed: { opacity: 0.94 },
  roleTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  roleIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  workerIcon: { backgroundColor: colors.warningLight },
  selectedDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: colors.text },
  roleSubtitle: { marginTop: 4, fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  infoChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  workerChip: { backgroundColor: colors.warningLight },
  infoChipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  workerChipText: { color: colors.money },
  joinButton: { marginTop: 16 },
  joinButtonText: { fontSize: 14 },
});
