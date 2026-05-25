import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius } from "../theme";
import api, { formatApiError } from "../api";
import { track } from "../lib/analytics";

const SKILL_OPTIONS = [
  { key: "plumber",        label: "Plumber" },
  { key: "electrician",    label: "Electrician" },
  { key: "carpenter",      label: "Carpenter" },
  { key: "painter",        label: "Painter" },
  { key: "cleaner",        label: "Cleaner" },
  { key: "cook",           label: "Cook" },
  { key: "driver",         label: "Driver" },
  { key: "security_guard", label: "Security Guard" },
  { key: "gardener",       label: "Gardener" },
  { key: "tailor",         label: "Tailor" },
  { key: "welder",         label: "Welder" },
  { key: "mason",          label: "Mason" },
  { key: "ac_technician",  label: "AC Technician" },
  { key: "mobile_repair",  label: "Mobile Repair" },
  { key: "tutor",          label: "Tutor" },
];

const SKILL_KEYS = SKILL_OPTIONS.map(s => s.key);
const SKILL_LABEL = Object.fromEntries(SKILL_OPTIONS.map(s => [s.key, s.label]));
const formatSkill = key => SKILL_LABEL[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

export default function BecomeExpertScreen({ navigation, route }) {
  const editMode = route?.params?.editMode === true;
  const { refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading,     setLoading]     = useState(editMode);
  const [step,        setStep]        = useState(1);
  const [skills,      setSkills]      = useState([]);   // preset keys
  const [customSkill, setCustomSkill] = useState("");   // free-text input
  const [dailyRate,   setDailyRate]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    if (!editMode) return;
    api.get("/service-profiles/mine")
      .then(r => {
        const d = r.data || {};
        const presets = (d.skills || []).filter(s => SKILL_KEYS.includes(s));
        const customs = (d.skills || []).filter(s => !SKILL_KEYS.includes(s));
        setSkills(presets);
        setCustomSkill(customs.join(", "));
        setDailyRate(d.daily_rate ? String(d.daily_rate) : "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [editMode]);

  const toggleSkill = key => {
    setSkills(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addCustom = () => {
    const extras = customSkill.trim().split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    if (!extras.length) return;
    setSkills(prev => {
      const merged = [...prev];
      extras.forEach(e => { if (!SKILL_KEYS.includes(e) && !merged.includes(e)) merged.push(e); });
      return merged;
    });
    setCustomSkill("");
  };

  const allSkills = () => {
    const extras = customSkill.trim()
      ? customSkill.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];
    return [...new Set([...skills, ...extras])];
  };

  const next = () => {
    if (step === 1 && allSkills().length === 0) {
      Alert.alert("Select at least one skill");
      return;
    }
    if (step === 2 && (!dailyRate.trim() || isNaN(parseInt(dailyRate)))) {
      Alert.alert("Enter your daily rate");
      return;
    }
    setStep(s => s + 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        skills:     allSkills(),
        daily_rate: parseInt(dailyRate, 10),
      };
      if (editMode) {
        await api.patch("/service-profiles/mine", payload);
      } else {
        track("become_local_expert", payload);
        await api.post("/service-profiles", payload);
      }
      await refreshUser();
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(p => p - 1) : navigation.goBack()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{editMode ? "Update My Skills" : "Become a Local Expert"}</Text>
        <Text style={s.stepNum}>{step} / 2</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Step 1: Skills ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <Text style={s.stepTitle}>What skills do you offer?</Text>
            <Text style={s.stepSub}>Select all that apply — be thorough, it helps you get discovered.</Text>

            <View style={s.grid}>
              {SKILL_OPTIONS.map(({ key, label }) => {
                const active = skills.includes(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[s.chip, active && s.chipActive]}
                    onPress={() => toggleSkill(key)}
                    activeOpacity={0.75}
                  >
                    {active && <Ionicons name="checkmark" size={13} color={colors.onPrimary} style={{ marginRight: 4 }} />}
                    <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom skill */}
            <Text style={s.inputLabel}>Don't see your skill? Add it</Text>
            <View style={s.customRow}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={customSkill}
                onChangeText={setCustomSkill}
                placeholder="e.g. RCC work, pump repair, tiling…"
                placeholderTextColor={colors.outline}
                returnKeyType="done"
                onSubmitEditing={addCustom}
              />
              <TouchableOpacity style={s.addBtn} onPress={addCustom}>
                <Ionicons name="add" size={22} color={colors.onPrimary} />
              </TouchableOpacity>
            </View>

            {skills.filter(k => !SKILL_KEYS.includes(k)).length > 0 && (
              <View style={s.customChips}>
                {skills.filter(k => !SKILL_KEYS.includes(k)).map(k => (
                  <TouchableOpacity
                    key={k}
                    style={s.customChip}
                    onPress={() => setSkills(prev => prev.filter(x => x !== k))}
                  >
                    <Text style={s.customChipText}>{formatSkill(k)}</Text>
                    <Ionicons name="close-circle" size={14} color={colors.secondary} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Step 2: Daily Rate ─────────────────────────────────── */}
        {step === 2 && (
          <>
            <Text style={s.stepTitle}>What's your daily rate?</Text>
            <Text style={s.stepSub}>This is shown to employers. You can update it anytime.</Text>

            <View style={s.rateWrap}>
              <View style={s.ratePrefix}>
                <Text style={s.ratePrefixText}>₹</Text>
              </View>
              <TextInput
                style={s.rateInput}
                value={dailyRate}
                onChangeText={v => setDailyRate(v.replace(/\D/g, ""))}
                placeholder="500"
                keyboardType="numeric"
                placeholderTextColor={colors.outline}
                autoFocus
              />
              <Text style={s.rateSuffix}>/day</Text>
            </View>

            {/* Quick-pick suggestions */}
            <View style={s.suggestRow}>
              {[300, 500, 700, 1000].map(v => (
                <TouchableOpacity
                  key={v}
                  style={[s.suggest, dailyRate === String(v) && s.suggestActive]}
                  onPress={() => setDailyRate(String(v))}
                >
                  <Text style={[s.suggestText, dailyRate === String(v) && s.suggestTextActive]}>₹{v}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.rateHint}>Average: ₹400 – ₹800 / day for most trades in tier-2 cities.</Text>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[s.footer, { paddingBottom: insets.bottom + 8 }]}>
        {step < 2 ? (
          <TouchableOpacity style={s.nextBtn} onPress={next}>
            <Text style={s.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.nextBtn} onPress={submit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.onPrimary} />
              : <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.onPrimary} />
                  <Text style={s.nextBtnText}>{editMode ? "Save Changes" : "Create My Profile"}</Text>
                </>
            }
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  stepNum:     { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textMuted, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },

  stepTitle: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textHeading, marginBottom: 6, letterSpacing: -0.3 },
  stepSub:   { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  inputLabel:{ fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading, marginBottom: 8, marginTop: 24 },

  // Skill grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10,
    minHeight: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  chipActive:     { backgroundColor: colors.primary },
  chipText:       { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textHeading },
  chipTextActive: { color: colors.onPrimary },

  // Custom skill
  customRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn:    { width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    minHeight: 52,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
  },
  customChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  customChip:  {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 7,
    minHeight: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  customChipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.secondary },

  // Daily rate
  rateWrap:       { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden", marginTop: 4, minHeight: 64 },
  ratePrefix:     { width: 52, height: 64, alignItems: "center", justifyContent: "center" },
  ratePrefixText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading },
  rateInput:      { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontFamily: fonts.bodyBold, fontSize: 26, color: colors.textHeading, letterSpacing: 1 },
  rateSuffix:     { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, paddingRight: 16 },

  suggestRow:      { flexDirection: "row", gap: 10, marginTop: 16 },
  suggest:         { flex: 1, paddingVertical: 13, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", minHeight: 48 },
  suggestActive:   { backgroundColor: colors.primary },
  suggestText:     { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  suggestTextActive: { color: colors.onPrimary },
  rateHint:        { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 12, lineHeight: 18 },

  footer:     { backgroundColor: colors.surfaceCard, borderTopWidth: 1, borderTopColor: colors.borderSubtle, paddingTop: 12, paddingHorizontal: spacing.md },
  nextBtn:    { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 18, minHeight: 56 },
  nextBtnText:{ fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
});
