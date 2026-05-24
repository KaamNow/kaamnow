import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius } from "../theme";
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
              if (step === "otp") { setStep("view"); return; }
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
          contentContainerStyle={s.body}
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
                  <Ionicons name="shield-checkmark-outline" size={14} color="#10b981" />
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="create-outline" size={18} color="#fff" />
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
                  ? <ActivityIndicator color="#fff" size="small" />
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
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={s.verifiedBannerTxt}>Identity verified — you can now edit</Text>
                </View>
              )}

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
                  <Text style={s.countryCodeTxt}>🇮🇳 +91</Text>
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
              <Text style={s.hint}>
                <Ionicons name="information-circle-outline" size={13} color={colors.outline} /> This person will be contacted in case of emergency.
              </Text>

              <TouchableOpacity
                style={[s.primaryBtn, (!name.trim() || phone.length !== 10) && s.btnDisabled]}
                onPress={save}
                disabled={saving || !name.trim() || phone.length !== 10}
              >
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="save-outline" size={18} color="#fff" />
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
  container: { flex: 1, backgroundColor: "#f5f5f7" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    flex: 1, textAlign: "center",
    fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading,
  },

  body: { padding: 20, paddingBottom: 48 },

  // ── View mode ──────────────────────────────────────────────────────────────
  infoCard: {
    backgroundColor: "#fff", borderRadius: 20,
    borderWidth: 1, borderColor: "#e8e8ed",
    padding: 24, alignItems: "center",
    marginBottom: 20,
  },
  infoIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  infoName:  { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 4 },
  infoPhone: { fontFamily: fonts.body, fontSize: 15, color: colors.outline, marginBottom: 12 },
  savedBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#d1fae5", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  savedBadgeTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#065f46" },

  editHint: {
    fontFamily: fonts.body, fontSize: 13, color: colors.outline,
    textAlign: "center", lineHeight: 20, marginBottom: 20,
  },

  // ── OTP mode ───────────────────────────────────────────────────────────────
  otpHeader: { alignItems: "center", marginBottom: 28 },
  otpIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#eef2ff", alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  otpTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading, marginBottom: 8 },
  otpSub:   { fontFamily: fonts.body, fontSize: 14, color: colors.outline, textAlign: "center", lineHeight: 22 },

  resendBtn: { alignItems: "center", marginTop: 16 },
  resendTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.primary },

  // ── Edit mode ──────────────────────────────────────────────────────────────
  verifiedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#d1fae5", borderRadius: 12,
    padding: 12, marginBottom: 20,
  },
  verifiedBannerTxt: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#065f46" },

  label: {
    fontFamily: fonts.bodyBold, fontSize: 13,
    color: colors.textBody, marginBottom: 8, marginTop: 16,
  },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 6, lineHeight: 18 },

  input: {
    backgroundColor: "#fff", borderRadius: 14,
    borderWidth: 1, borderColor: "#e8e8ed",
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
  },

  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: "#e8e8ed",
    borderRadius: 14, overflow: "hidden",
    backgroundColor: "#fff",
  },
  countryCode: {
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: "#f8f8f8",
    borderRightWidth: 1, borderRightColor: "#e8e8ed",
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
    borderRadius: 16, paddingVertical: 16, marginTop: 24,
  },
  btnDisabled:   { opacity: 0.4 },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
