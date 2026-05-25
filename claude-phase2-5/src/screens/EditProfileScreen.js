import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const GENDER_OPTIONS = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other" },
];

export default function EditProfileScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);

  const [name,    setName]    = useState(user?.name    || "");
  const [gender,  setGender]  = useState(user?.gender  || "");
  const [pincode, setPincode] = useState(user?.pincode || user?.address?.pincode || "");
  const [village, setVillage] = useState(user?.village || user?.address?.village || "");
  const [bio,     setBio]     = useState(user?.bio     || "");
  const [saving,  setSaving]  = useState(false);
  const [genBio,  setGenBio]  = useState(false);

  const startEdit = () => {
    // Sync latest user data into local state when opening edit mode
    setName(user?.name    || "");
    setGender(user?.gender || "");
    setPincode(user?.pincode || user?.address?.pincode || "");
    setVillage(user?.village || user?.address?.village || "");
    setBio(user?.bio || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const canSave = name.trim().length > 0;

  const generateBio = async () => {
    setGenBio(true);
    try {
      let skills = [], daily_rate = 0, total_jobs = 0, avg_rating = 0;
      try {
        const sp = await api.get("/service-profiles/mine");
        const d = sp.data || {};
        skills = [
          ...(d.categories || []),
          ...(d.skills || []),
          ...(Array.isArray(d.required_skills) ? d.required_skills.map(s => s.skill || s) : []),
        ].filter(Boolean).slice(0, 6);
        daily_rate = d.daily_rate || d.hourly_rate || 0;
        total_jobs = d.completed_jobs || d.total_jobs || 0;
        avg_rating = d.rating_avg || 0;
      } catch {}

      const r = await api.post("/ai/generate-bio", {
        skills, daily_rate, total_jobs, avg_rating,
        gender: gender || undefined,
        language: "en",
      });
      if (r.data?.bio) setBio(r.data.bio.slice(0, 300));
    } catch {
      Alert.alert("Could not generate bio", "Try again in a moment.");
    } finally {
      setGenBio(false);
    }
  };

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name:    name.trim(),
        gender:  gender || undefined,
        pincode: pincode.trim() || undefined,
        village: village.trim() || undefined,
        bio:     bio.trim(),
      });
      await refreshUser();
      setEditing(false);
    } catch (err) {
      Alert.alert("Could not save", err?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Read-only view ────────────────────────────────────────────────────────
  if (!editing) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity style={s.editBtn} onPress={startEdit}>
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          <Row label="Full Name"    value={user?.name} />
          <Row label="Phone"        value={user?.phone_primary || user?.phone} locked />
          <Row label="Gender"       value={user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : null} />
          <Row label="Pincode"      value={user?.pincode || user?.address?.pincode} />
          <Row label="Village / Area" value={user?.village || user?.address?.village} />
          <Row label="Bio"          value={user?.bio} multiline />
        </ScrollView>
      </View>
    );
  }

  // ── Edit mode ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={cancelEdit} style={s.backBtn}>
            <Ionicons name="close" size={22} color={colors.textHeading} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            onPress={save}
            disabled={!canSave || saving}
            style={[s.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <Text style={s.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.label}>Full Name *</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={colors.outline}
            returnKeyType="next"
            autoCapitalize="words"
          />

          <Text style={s.label}>Phone</Text>
          <View style={[s.input, s.inputReadOnly]}>
            <Text style={s.readOnlyText}>{user?.phone_primary || user?.phone || "—"}</Text>
            <Ionicons name="lock-closed-outline" size={14} color={colors.outline} />
          </View>
          <Text style={s.hint}>Phone number cannot be changed here.</Text>

          <Text style={s.label}>Gender</Text>
          <View style={s.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.genderChip, gender === opt.value && s.genderChipActive]}
                onPress={() => setGender(gender === opt.value ? "" : opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[s.genderChipText, gender === opt.value && s.genderChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Pincode</Text>
          <TextInput
            style={s.input}
            value={pincode}
            onChangeText={(v) => setPincode(v.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit pincode"
            placeholderTextColor={colors.outline}
            keyboardType="numeric"
            maxLength={6}
            returnKeyType="next"
          />

          <Text style={s.label}>Village / Area</Text>
          <TextInput
            style={s.input}
            value={village}
            onChangeText={setVillage}
            placeholder="e.g. Sector 12, Patna"
            placeholderTextColor={colors.outline}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: 6 }}>
            <Text style={[s.label, { marginTop: 0, marginBottom: 0 }]}>Bio</Text>
            <TouchableOpacity
              onPress={generateBio}
              disabled={genBio}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primaryLight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, minHeight: 32 }}
            >
              {genBio
                ? <ActivityIndicator size="small" color={colors.secondary} />
                : <Ionicons name="sparkles-outline" size={14} color={colors.secondary} />
              }
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.secondary }}>
                {genBio ? "Generating…" : "Generate with AI"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.hint}>A short intro shown on your public profile.</Text>
          <TextInput
            style={[s.input, s.inputMultiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="e.g. 5 years experience in house wiring and AC repair. Available across Pune."
            placeholderTextColor={colors.outline}
            multiline
            numberOfLines={4}
            maxLength={300}
            textAlignVertical="top"
            returnKeyType="default"
          />
          <Text style={s.charCount}>{bio.length} / 300</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, locked, multiline }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowValueWrap}>
        <Text style={[s.rowValue, !value && s.rowValueEmpty, multiline && { lineHeight: 22 }]}>
          {value || "Not set"}
        </Text>
        {locked && <Ionicons name="lock-closed-outline" size={13} color={colors.outline} style={{ marginLeft: 6 }} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 12,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  backBtn:     { padding: 4, marginRight: spacing.sm },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading },

  editBtn:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
  editBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },

  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10, minHeight: 40, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },

  // Read-only rows
  row:           { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  rowLabel:      { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted, letterSpacing: 0.8, marginBottom: 4, textTransform: "uppercase" },
  rowValueWrap:  { flexDirection: "row", alignItems: "center" },
  rowValue:      { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textHeading, flex: 1 },
  rowValueEmpty: { color: colors.textMuted, fontFamily: fonts.body },

  // Edit inputs
  label:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading, marginBottom: 8, marginTop: 20 },
  hint:     { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6 },

  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    minHeight: 52,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
  },
  inputReadOnly: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  readOnlyText:   { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  inputMultiline: { minHeight: 120, paddingTop: 14, textAlignVertical: "top" },
  charCount:      { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: "right", marginTop: 6 },

  genderRow:            { flexDirection: "row", gap: spacing.sm },
  genderChip:           { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderRadius: radius.md, minHeight: 48 },
  genderChipActive:     { backgroundColor: colors.primary },
  genderChipText:       { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textHeading },
  genderChipTextActive: { color: colors.onPrimary, fontFamily: fonts.bodyBold },
});
