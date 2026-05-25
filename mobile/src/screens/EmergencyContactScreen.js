import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius, shadow } from "../theme";
import OTPInput from "../components/OTPInput";
import api from "../lib/api";
import { formatApiError } from "../api";

// step: "view" | "otp" | "edit"

function maskPhone(phone) {
  const d = (phone || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 XXXXX-${d.slice(5)}` : phone || "";
}

export default function EmergencyContactScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const existing = user?.emergency_contact;
  const userPhone = user?.phone_primary || user?.phone || "";

  const [step,    setStep]    = useState(existing ? "view" : "edit");
  const [otp,     setOtp]     = useState("");
  const [name,    setName]    = useState(existing?.name  || "");
  const [phone,   setPhone]   = useState(
    (existing?.phone || "").replace(/^\+91/, "")
  );
  const [sending,  setSending]  = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving,   setSaving]   = useState(false);

  // ── Step 1: send OTP to user's own phone ──────────────────────────────────
  const requestOTP = async () => {
    setSending(true);
    try {
      await api.post("/auth/send-otp", { phone: userPhone });
      setOtp("");
      setStep("otp");
    } catch (e) {
      Alert.alert("Could not send OTP", formatApiError(e));
    } finally {
      setSending(false);
    }
  };

  // ── Step 2: verify OTP → unlock form ──────────────────────────────────────
  const verifyOTP = async () => {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      await api.post("/auth/verify-otp", { phone: userPhone, otp });
      setStep("edit");
    } catch (e) {
      Alert.alert("Wrong code", "Enter the 6-digit code sent to your WhatsApp.");
    } finally {
      setVerifying(false);
    }
  };

  // ── Step 3: save ──────────────────────────────────────────────────────────
  const save = async () => {
    const trimName  = name.trim();
    const trimPhone = phone.replace(/\D/g, "").slice(-10);
    if (!trimName || trimPhone.length !== 10) {
      Alert.alert("", "Enter a valid name and 10-digit mobile number.");
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        emergency_contact: { name: trimName, phone: trimPhone },
      });
      await refreshUser();
      setStep("view");
    } catch (e) {
      Alert.alert("Could not save", formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[s.container, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === "otp") { setStep(existing ? "view" : "edit"); return; }
              if (step === "edit" && existing) { setStep("view"); return; }
              navigation.goBack();
            }}
            style={s.backBtn}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Emergency Contact</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 48 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── VIEW mode ────────────────────────────────────────────────── */}
          {step === "view" && existing && (
            <View>
              <View style={s.infoCard}>
                <View style={s.infoIcon}>
                  <Ionicons name="person-outline" size={26} color={colors.primary} />
                </View>
                <Text style={s.infoName}>{existing.name}</Text>
                <Text style={s.infoPhone}>{existing.phone}</Text>
                <View style={s.savedBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
                  <Text style={s.savedBadgeTxt}>Saved</Text>
                </View>
              </View>

              <Text style={s.editHint}>
                To change your emergency contact, we'll send a verification code to{" "}
                <Text style={{ fontFamily: fonts.bodyBold }}>{maskPhone(userPhone)}</Text>
              </Text>

              <TouchableOpacity
                style={s.primaryBtn}
                onPress={requestOTP}
                disabled={sending}
              >
                {sending
                  ? <ActivityIndicator color={colors.onPrimary} size="small" />
                  : <>
                      <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                      <Text style={s.primaryBtnTxt}>Edit Contact</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}

          {/* ── OTP mode ─────────────────────────────────────────────────── */}
          {step === "otp" && (
            <View>
              <View style={s.otpHeader}>
                <View style={s.otpIcon}>
                  <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
                </View>
                <Text style={s.otpTitle}>Verify it's you</Text>
                <Text style={s.otpSub}>
                  Enter the 6-digit code sent to your WhatsApp{"\n"}
                  <Text style={{ fontFamily: fonts.bodyBold }}>{maskPhone(userPhone)}</Text>
                </Text>
              </View>

              <OTPInput value={otp} onChange={setOtp} autoFocus />

              <TouchableOpacity
                style={[s.primaryBtn, otp.length !== 6 && s.btnDisabled]}
                onPress={verifyOTP}
                disabled={verifying || otp.length !== 6}
              >
                {verifying
                  ? <ActivityIndicator color={colors.onPrimary} size="small" />
                  : <Text style={s.primaryBtnTxt}>Verify & Continue</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={s.resendBtn}
                onPress={requestOTP}
                disabled={sending}
              >
                <Text style={s.resendTxt}>
                  {sending ? "Sending…" : "Resend code"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── EDIT mode ────────────────────────────────────────────────── */}
          {step === "edit" && (
            <View>
              {existing && (
                <View style={s.verifiedBanner}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={s.verifiedBannerTxt}>Identity verified — you can now edit</Text>
                </View>
              )}

              <View style={s.formCard}>
                <View style={s.formHeader}>
                  <View style={s.formIcon}>
                    <Ionicons name="shield-outline" size={22} color={colors.textHeading} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.formTitle}>Emergency contact</Text>
                    <Text style={s.formSub}>Add someone trusted who can be contacted quickly.</Text>
                  </View>
                </View>

                <Text style={s.label}>Contact Name *</Text>
                <TextInput
                  style={s.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Riya Sharma (Sister)"
                  placeholderTextColor={colors.outline}
                  autoCapitalize="words"
                  maxLength={100}
                  returnKeyType="next"
                />

                <Text style={s.label}>Mobile Number *</Text>
                <View style={s.phoneRow}>
                  <View style={s.countryCode}>
                    <Text style={s.countryCodeTxt}>+91</Text>
                  </View>
                  <TextInput
                    style={s.phoneInput}
                    value={phone}
                    onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit number"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    maxLength={10}
                    returnKeyType="done"
                  />
                </View>
                <View style={s.hintRow}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                  <Text style={s.hint}>This person will be contacted in case of emergency.</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[s.primaryBtn, (!name.trim() || phone.length !== 10) && s.btnDisabled]}
                onPress={save}
                disabled={saving || !name.trim() || phone.length !== 10}
              >
                {saving
                  ? <ActivityIndicator color={colors.onPrimary} size="small" />
                  : <>
                      <Ionicons name="save-outline" size={18} color={colors.onPrimary} />
                      <Text style={s.primaryBtnTxt}>Save Contact</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
    marginLeft: -8,
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading,
  },

  body: { padding: spacing.lg },

  // ── View mode ──────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.borderSubtle,
    padding: spacing.xl, alignItems: "center",
    marginBottom: spacing.lg,
    ...shadow.xs,
  },
  infoIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  infoName:  { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading, marginBottom: 4, letterSpacing: -0.3 },
  infoPhone: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, marginBottom: spacing.md },
  savedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: colors.successLight, borderRadius: radius.pill,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  savedBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success },

  editHint: {
    fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary,
    textAlign: "center", lineHeight: 21, marginBottom: spacing.lg,
  },

  // ── OTP mode ───────────────────────────────────────────────────────────────
  otpHeader: { alignItems: "center", marginBottom: 28, backgroundColor: colors.surfaceCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle, padding: spacing.xl, ...shadow.xs },
  otpIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.surface, alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  otpTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading, marginBottom: 8, letterSpacing: -0.3 },
  otpSub:   { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 22 },

  resendBtn: { alignItems: "center", marginTop: 16 },
  resendTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  // ── Edit mode ──────────────────────────────────────────────────────────────
  verifiedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.successLight, borderRadius: radius.md,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  verifiedBannerTxt: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.success },

  formCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.lg,
    ...shadow.xs,
  },
  formHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  formIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  formTitle: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, letterSpacing: -0.2 },
  formSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },

  label: {
    fontFamily: fonts.bodyBold, fontSize: 13,
    color: colors.textHeading, marginBottom: 8, marginTop: 16,
  },
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 8 },
  hint: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, lineHeight: 18 },

  input: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
    minHeight: 52,
  },

  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: radius.md, overflow: "hidden",
    backgroundColor: colors.surface,
    minHeight: 52,
  },
  countryCode: {
    paddingHorizontal: 14, paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: colors.borderSubtle,
  },
  countryCodeTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 14,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading, letterSpacing: 1,
  },

  // ── Shared ─────────────────────────────────────────────────────────────────
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 16, marginTop: spacing.xl,
    minHeight: 54,
  },
  btnDisabled:   { opacity: 0.4 },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
});
