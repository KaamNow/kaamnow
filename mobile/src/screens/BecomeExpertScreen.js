import { useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

const SKILL_OPTIONS = [
  "plumber", "electrician", "carpenter", "painter", "cleaner",
  "cook", "driver", "security_guard", "gardener", "tailor",
  "welder", "mason", "ac_technician", "mobile_repair", "tutor",
];

export default function BecomeExpertScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [skills, setSkills] = useState([]);
  const [dailyRate, setDailyRate] = useState("");
  const [bio, setBio] = useState("");
  const [pincode, setPincode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleSkill = (s) => {
    setSkills((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const next = () => {
    if (step === 1 && skills.length === 0) {
      Alert.alert(t("become_expert_skills_required"));
      return;
    }
    if (step === 2 && !dailyRate.trim()) {
      Alert.alert(t("become_expert_rate_required"));
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      track("become_local_expert", { skills, daily_rate: parseInt(dailyRate, 10) });
      await api.post("/workers/become-worker", {
        skills,
        daily_rate: parseInt(dailyRate, 10),
        bio: bio.trim() || undefined,
        pincode: pincode.trim() || undefined,
      });
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("become_expert_title")}</Text>
        <Text style={styles.stepNum}>{step}/3</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}>
        {step === 1 && (
          <>
            <Text style={styles.stepTitle}>{t("become_expert_step1_title")}</Text>
            <View style={styles.skillsGrid}>
              {SKILL_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.skillChip, skills.includes(s) && styles.skillChipActive]}
                  onPress={() => toggleSkill(s)}
                >
                  <Text style={[styles.skillText, skills.includes(s) && styles.skillTextActive]}>
                    {t(`skill_${s}`) || s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.stepTitle}>{t("become_expert_step2_title")}</Text>
            <Text style={styles.inputLabel}>{t("become_expert_daily_rate")}</Text>
            <TextInput
              style={styles.input}
              value={dailyRate}
              onChangeText={setDailyRate}
              placeholder="500"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={styles.inputLabel}>{t("become_expert_pincode")}</Text>
            <TextInput
              style={styles.input}
              value={pincode}
              onChangeText={setPincode}
              placeholder="800001"
              keyboardType="numeric"
              maxLength={6}
              placeholderTextColor={colors.textMuted}
            />
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.stepTitle}>{t("become_expert_step3_title")}</Text>
            <Text style={styles.inputLabel}>{t("become_expert_bio")}</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: "top" }]}
              value={bio}
              onChangeText={setBio}
              placeholder={t("become_expert_bio_placeholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
        {step < 3
          ? (
            <TouchableOpacity style={styles.nextBtn} onPress={next}>
              <Text style={styles.nextBtnText}>{t("next")}</Text>
            </TouchableOpacity>
          )
          : (
            <TouchableOpacity style={styles.nextBtn} onPress={submit} disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.nextBtnText}>{t("become_expert_submit")}</Text>
              }
            </TouchableOpacity>
          )
        }
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  stepNum:     { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  stepTitle:  { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text, marginBottom: spacing.md },
  inputLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: spacing.md },
  input:      { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.text },

  skillsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  skillChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff",
  },
  skillChipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  skillText:       { fontFamily: fonts.body, fontSize: 13, color: colors.text, textTransform: "capitalize" },
  skillTextActive: { color: "#fff" },

  footer:     { backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, paddingHorizontal: spacing.md },
  nextBtn:    { backgroundColor: colors.indigo, borderRadius: radius.lg, paddingVertical: 14, alignItems: "center" },
  nextBtnText:{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
});
