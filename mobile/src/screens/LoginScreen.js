import { useRef, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Image,
  KeyboardAvoidingView, Platform, Alert,
  Pressable, Modal, TextInput, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Button from "../components/Button";
import AppScreen from "../components/AppScreen";
import PhoneInput from "../components/PhoneInput";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, radius, shadow, spacing } from "../theme";

function maskPhoneNumber(phone) {
  const digits = (phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone || "";
  return `XXXXX-${digits.slice(5)}`;
}

export default function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { lang } = useLanguage();
  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const { sendOTP, verifyOTP, loginComplete, completeSignup, otpFlow, resetOTPFlow } = useAuth();

  const [phone, setPhone]   = useState(initialPhone);
  const [otp, setOtp]       = useState("");
  const [name, setName]     = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);
  const [otpFocusedIndex, setOtpFocusedIndex] = useState(0);
  const otpRefs = useRef([]);

  const safePhone = phone || "";
  const fullPhone = safePhone.startsWith("+91") ? safePhone : `+91${safePhone.replace(/\D/g, "")}`;

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone))
      return Alert.alert(lang === "hi" ? "सही 10-अंक नंबर डालो" : "Enter a valid 10-digit number");
    setLoading(true);
    try {
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (!check.data.exists || check.data.expired) { setNotRegistered(true); return; }
      if (check.data.is_active === false) {
        Alert.alert(
          lang === "hi" ? "Account Deactivated" : "Account Deactivated",
          lang === "hi"
            ? "Aapka account deactivate hai. Kya aap ise reactivate karna chahte hain?"
            : "Your account has been deactivated. Would you like to reactivate it?",
          [
            { text: lang === "hi" ? "Nahi" : "Cancel", style: "cancel" },
            { text: lang === "hi" ? "Reactivate Karo" : "Reactivate", onPress: async () => {
              setLoading(true);
              try { await sendOTP(fullPhone); }
              catch (err) { Alert.alert("Error", formatApiError(err)); }
              finally { setLoading(false); }
            }},
          ]
        );
        return;
      }
      const res = await sendOTP(fullPhone);
      if (res?.requires_optin) setRequiresOptin(true);
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^[0-9]{6}$/.test(otp))
      return Alert.alert(lang === "hi" ? "6-अंक code डालो" : "Enter the 6-digit code");
    setLoading(true);
    try {
      const res = await verifyOTP(otpFlow.phone, otp);
      if (res.created_user) {
        await loginComplete(res.otp_token);
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
      }
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpBoxChange = (value, index) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setOtp((prev) => {
        const next = prev.padEnd(6, " ").split("");
        next[index] = " ";
        return next.join("").replace(/\s/g, "").slice(0, 6);
      });
      return;
    }

    if (digits.length > 1) {
      const nextOtp = digits.slice(0, 6);
      setOtp(nextOtp);
      const nextIndex = Math.min(nextOtp.length, 5);
      otpRefs.current[nextIndex]?.focus();
      setOtpFocusedIndex(nextIndex);
      return;
    }

    setOtp((prev) => {
      const next = prev.padEnd(6, " ").split("");
      next[index] = digits;
      return next.join("").replace(/\s/g, "").slice(0, 6);
    });

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
      setOtpFocusedIndex(index + 1);
    }
  };

  const handleOtpKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      setOtpFocusedIndex(index - 1);
    }
  };

  const handleSignupFallback = async () => {
    if (name.trim().length < 2)
      return Alert.alert(lang === "hi" ? "नाम डालो" : "Enter your name");
    setLoading(true);
    try {
      await completeSignup(name.trim(), gender || undefined);
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const step = otpFlow.step;
  const isOtpStep = step === 2;

  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Pressable style={s.backBtn} onPress={() => {
            if (step > 1) resetOTPFlow();
            else if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Home");
          }}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>

          <View style={[s.brand, isOtpStep && s.brandCompact]}>
            <Image source={require("../../assets/icon.png")} style={s.logoImg} resizeMode="contain" />
            <Text style={s.brandName}>KaamNow</Text>
            <Text style={s.tagline}>काम की बात KaamNow के साथ</Text>
          </View>

          <View style={s.titleBlock}>
            <Text style={s.title}>
              {step === 1 && "Log in"}
              {step === 2 && "Code dalein"}
              {step === 3 && (lang === "hi" ? "Account बनाओ" : "Finish signing up")}
            </Text>
            <Text style={s.subtitle}>
              {step === 1 && "Apna mobile number dalein"}
              {step === 2 && `6-digit code bheja: +91 ${maskPhoneNumber(otpFlow.phone)}`}
              {step === 3 && (lang === "hi" ? "अपना नाम बताओ।" : "Add your name to continue.")}
            </Text>
          </View>

          {/* ── Step 1 — Phone ────────────────────────────────────── */}
          {step === 1 && (
            <View style={s.form}>
              <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
              <Text style={s.hint}>
                OTP WhatsApp par aayega
              </Text>
              <PrimaryButton
                title="Code bhejo"
                onPress={handleSendOTP}
                loading={loading}
                disabled={phone.length !== 10}
                style={s.cta}
              />
              <Pressable onPress={() => navigation.replace("PhoneSignup")} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  Naya hai? <Text style={s.switchAccent}>Account banao</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 2 — OTP ──────────────────────────────────────── */}
          {step === 2 && (
            <View style={s.form}>
              {/* Sandbox opt-in nudge — only shown when requires_optin=true */}
              {requiresOptin && (
                <Pressable
                  style={s.optinBanner}
                  onPress={() => Linking.openURL("https://wa.me/917834811114?text=Hi")}
                >
                  <Ionicons name="logo-whatsapp" size={18} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.optinTitle}>
                      {lang === "hi" ? "OTP WhatsApp से आएगा" : "OTP arrives on WhatsApp"}
                    </Text>
                    <Text style={s.optinSub}>
                      {lang === "hi"
                        ? "पहली बार: नीचे टैप करो, 'Hi' भेजो, वापस आओ।"
                        : "First time: tap below, send 'Hi', come back."}
                    </Text>
                  </View>
                  <Text style={s.optinCta}>
                    {lang === "hi" ? "खोलो →" : "Open →"}
                  </Text>
                </Pressable>
              )}
              <View style={s.otpRow}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { otpRefs.current[index] = ref; }}
                    style={[
                      s.otpBox,
                      otpFocusedIndex === index && s.otpBoxFocused,
                      otp[index] && s.otpBoxFilled,
                    ]}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp[index] || ""}
                    onChangeText={(value) => handleOtpBoxChange(value, index)}
                    onKeyPress={(event) => handleOtpKeyPress(event, index)}
                    onFocus={() => setOtpFocusedIndex(index)}
                    selectTextOnFocus
                    autoFocus={index === 0}
                  />
                ))}
              </View>
              <Text style={s.hint}>
                WhatsApp par code check karein
              </Text>
              <PrimaryButton
                title="OTP confirm karo"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otp.length !== 6}
                style={s.cta}
              />
              <Pressable onPress={resetOTPFlow} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  Wrong number? <Text style={s.switchAccent}>Change</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 3 — Signup fallback ──────────────────────────── */}
          {step === 3 && (
            <View style={s.form}>
              <Text style={s.fieldLabel}>{lang === "hi" ? "पूरा नाम" : "Full name"}</Text>
              <TextInput
                style={s.textInput}
                placeholder={lang === "hi" ? "आपका नाम" : "Your full name"}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={[s.fieldLabel, { marginTop: 16 }]}>{lang === "hi" ? "लिंग (वैकल्पिक)" : "Gender (optional)"}</Text>
              <View style={s.genderRow}>
                {[
                  { v: "male",   label: lang === "hi" ? "पुरुष"  : "Male"   },
                  { v: "female", label: lang === "hi" ? "महिला"  : "Female" },
                  { v: "other",  label: lang === "hi" ? "अन्य"   : "Other"  },
                ].map((g) => (
                  <Pressable key={g.v} onPress={() => setGender(gender === g.v ? "" : g.v)} style={[s.genderBtn, gender === g.v && s.genderBtnOn]}>
                    <Text style={[s.genderBtnText, gender === g.v && s.genderBtnTextOn]}>{g.label}</Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton
                title={lang === "hi" ? "Account बनाओ" : "Create account"}
                onPress={handleSignupFallback}
                loading={loading}
                disabled={name.trim().length < 2}
                style={s.cta}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Not registered modal ──────────────────────────────────── */}
      <Modal transparent visible={notRegistered} animationType="fade" onRequestClose={() => setNotRegistered(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="phone-portrait-outline" size={28} color={colors.primary} /></View>
            <Text style={s.modalTitle}>{lang === "hi" ? "नंबर registered नहीं है" : "Number not registered"}</Text>
            <Text style={s.modalBody}>
              {lang === "hi"
                ? "यह नंबर हमारे पास registered नहीं है। पहले account बनाओ।"
                : "This mobile number isn't registered with us. Please sign up first."}
            </Text>
            <Button
              title={lang === "hi" ? "Register करो" : "Sign up"}
              onPress={() => { setNotRegistered(false); navigation.replace("PhoneSignup", { phone }); }}
            />
            <Pressable onPress={() => setNotRegistered(false)} style={s.modalCancel}>
              <Text style={s.modalCancelTxt}>{lang === "hi" ? "रद्द करो" : "Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 60 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: 2, marginBottom: 8, marginLeft: -10 },

  brand: { alignItems: "center", marginTop: 10, marginBottom: 34 },
  brandCompact: { marginTop: 0, marginBottom: 24 },
  logoImg: { width: 64, height: 64, borderRadius: 18 },
  brandName: { marginTop: 12, fontFamily: fonts.displayBold, fontSize: 24, color: colors.text },
  tagline: { marginTop: 3, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },

  titleBlock: { marginBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.text, lineHeight: 38, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },

  form: { gap: 0 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 4 },

  otpRow: { flexDirection: "row", justifyContent: "space-between", gap: 7 },
  otpBox: { flex: 1, height: 56, maxWidth: 48, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, textAlign: "center", fontFamily: fonts.displayBold, fontSize: 22, color: colors.text },
  otpBoxFocused: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  otpBoxFilled: { borderColor: colors.primary },
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.text, marginBottom: 4 },

  cta: { marginTop: 20 },
  switchLink: { marginTop: 20, alignItems: "center" },
  switchTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontFamily: fonts.bodyBold },

  genderRow:       { flexDirection: "row", gap: 8, marginBottom: 20 },
  genderBtn:       { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, alignItems: "center", backgroundColor: "#fff" },
  genderBtnOn:     { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderBtnText:   { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  genderBtnTextOn: { fontFamily: fonts.bodyBold, color: colors.primary },

  optinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.infoLight, borderRadius: radius.md, borderWidth: 1, borderColor: "#BAE6FD", padding: 12, marginBottom: 16 },
  optinTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.info },
  optinSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  optinCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.info },
  modalBg: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, alignItems: "center", gap: 10 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, textAlign: "center" },
  modalBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 6 },
  modalCancel: { marginTop: 8 },
  modalCancelTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
});
