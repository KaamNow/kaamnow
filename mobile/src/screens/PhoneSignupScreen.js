import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Alert, Modal, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../components/AppScreen";
import OTPInput from "../components/OTPInput";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, radius } from "../theme";

const INDIGO = colors.primary;

const T = {
  en: {
    step1Title: "Create account 🙏",
    step1Sub: "Enter your mobile number to get started",
    step2Title: "Enter the code",
    step2Sub: (phone) => `We sent a 6-digit code to ${phone}`,
    phonePlaceholder: "10-digit mobile number",
    phoneHint: "OTP will arrive on WhatsApp",
    sendOtp: "Send OTP",
    sending: "Sending…",
    verifyOtp: "Verify & Continue",
    verifying: "Verifying…",
    alreadyMember: "Already have an account?",
    signIn: "Sign In",
    wrongNumber: "Wrong number?",
    change: "Change",
    alreadyTitle: "Already registered",
    alreadyBody: "This number is already registered. Please log in instead.",
    loginBtn: "Log In",
    cancel: "Cancel",
    otpOptinTitle: "OTP arrives on WhatsApp",
    otpOptinSub: "First time: tap below, send 'Hi', then come back.",
    otpOptinOpen: "Open →",
    invalidPhone: "Enter a valid 10-digit number",
    invalidOtp: "Enter the 6-digit code",
  },
  hi: {
    step1Title: "Account बनाएं 🙏",
    step1Sub: "शुरू करने के लिए मोबाइल नंबर डालें",
    step2Title: "Code डालें",
    step2Sub: (phone) => `6-digit code भेजा: ${phone}`,
    phonePlaceholder: "10-अंक मोबाइल नंबर",
    phoneHint: "OTP WhatsApp पर आएगा",
    sendOtp: "OTP भेजें",
    sending: "भेज रहे हैं…",
    verifyOtp: "Verify करें",
    verifying: "Verify हो रहा है…",
    alreadyMember: "पहले से account है?",
    signIn: "Login करें",
    wrongNumber: "गलत नंबर?",
    change: "बदलें",
    alreadyTitle: "नंबर पहले से है",
    alreadyBody: "यह नंबर पहले से registered है। Login करें।",
    loginBtn: "Login करें",
    cancel: "रद्द करें",
    otpOptinTitle: "OTP WhatsApp पर आएगा",
    otpOptinSub: "पहली बार: नीचे tap करें, 'Hi' भेजें, वापस आएं।",
    otpOptinOpen: "खोलें →",
    invalidPhone: "सही 10-अंक नंबर डालें",
    invalidOtp: "6-अंक code डालें",
  },
};

function maskPhone(phone) {
  const d = (phone || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 XXXXX-${d.slice(5)}` : phone || "";
}

export default function PhoneSignupScreen({ navigation, route }) {
  const { sendOTP, verifyOTP, loginComplete, otpFlow, resetOTPFlow } = useAuth();
  const { lang } = useLanguage();
  const t = T[lang] || T.en;

  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const [phone, setPhone]             = useState(initialPhone);
  const [otp, setOtp]                 = useState("");
  const [loading, setLoading]         = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);

  const fullPhone = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
  const step = otpFlow.step;

  const goBack = () => {
    if (step > 1) { setOtp(""); resetOTPFlow(); return; }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Tabs");
  };

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone)) return Alert.alert("", t.invalidPhone);
    setLoading(true);
    try {
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (check.data.exists && !check.data.expired) { setAlreadyExists(true); return; }
      const res = await sendOTP(fullPhone);
      if (res?.requires_optin) setRequiresOptin(true);
    } catch (e) { Alert.alert("", formatApiError(e)); }
    finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    if (!/^[0-9]{6}$/.test(otp)) return Alert.alert("", t.invalidOtp);
    setLoading(true);
    try {
      const res = await verifyOTP(otpFlow.phone, otp);
      if (res.created_user) {
        await loginComplete(res.otp_token);
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
        return;
      }
      navigation.replace("Login");
    } catch (e) { Alert.alert("", formatApiError(e)); }
    finally { setLoading(false); }
  };

  const topTitle = step === 1 ? t.step1Title : t.step2Title;
  const topSub   = step === 1 ? t.step1Sub   : t.step2Sub(maskPhone(otpFlow.phone));

  return (
    <AppScreen edges={["top"]} style={{ flex: 1, backgroundColor: INDIGO }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Top */}
        <View style={s.top}>
          <Pressable onPress={goBack} style={s.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Text style={s.brand}>KaamNow</Text>
          <Text style={s.topTitle}>{topTitle}</Text>
          <Text style={s.topSub}>{topSub}</Text>
        </View>

        {/* Bottom — white card */}
        <View style={s.card}>

          {/* Step 1 — Phone */}
          {step === 1 && (
            <>
              <View style={s.phoneRow}>
                <View style={s.countryCode}>
                  <Text style={s.countryCodeTxt}>🇮🇳 +91</Text>
                </View>
                <TextInput
                  style={s.phoneInput}
                  placeholder={t.phonePlaceholder}
                  placeholderTextColor={colors.outline}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={v => setPhone(v.replace(/\D/g, "").slice(0, 10))}
                  autoFocus
                />
              </View>
              <Text style={s.hint}><Ionicons name="logo-whatsapp" size={13} color="#25D366" /> {t.phoneHint}</Text>

              <Pressable style={[s.primaryBtn, phone.length !== 10 && s.btnDisabled]}
                onPress={handleSendOTP} disabled={loading || phone.length !== 10}>
                <Text style={s.primaryBtnTxt}>{loading ? t.sending : t.sendOtp}</Text>
              </Pressable>

              <View style={s.switchRow}>
                <Text style={s.switchTxt}>{t.alreadyMember} </Text>
                <Pressable onPress={() => navigation.replace("Login", { phone })} hitSlop={8}>
                  <Text style={s.switchLink}>{t.signIn}</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <>
              {requiresOptin && (
                <Pressable style={s.optinBanner}
                  onPress={() => Linking.openURL("https://wa.me/917834811114?text=Hi")}>
                  <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
                  <View style={{ flex: 1 }}>
                    <Text style={s.optinTitle}>{t.otpOptinTitle}</Text>
                    <Text style={s.optinSub}>{t.otpOptinSub}</Text>
                  </View>
                  <Text style={s.optinCta}>{t.otpOptinOpen}</Text>
                </Pressable>
              )}

              <OTPInput value={otp} onChange={setOtp} autoFocus />
              <Text style={s.hint}>Check your WhatsApp for the code</Text>

              <Pressable style={[s.primaryBtn, otp.length !== 6 && s.btnDisabled]}
                onPress={handleVerifyOTP} disabled={loading || otp.length !== 6}>
                <Text style={s.primaryBtnTxt}>{loading ? t.verifying : t.verifyOtp}</Text>
              </Pressable>

              <View style={s.switchRow}>
                <Text style={s.switchTxt}>{t.wrongNumber} </Text>
                <Pressable onPress={goBack} hitSlop={8}>
                  <Text style={s.switchLink}>{t.change}</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Already exists modal */}
      <Modal transparent visible={alreadyExists} animationType="fade" onRequestClose={() => setAlreadyExists(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="phone-portrait-outline" size={28} color={colors.primary} /></View>
            <Text style={s.modalTitle}>{t.alreadyTitle}</Text>
            <Text style={s.modalBody}>{t.alreadyBody}</Text>
            <Pressable style={s.modalBtn}
              onPress={() => { setAlreadyExists(false); navigation.replace("Login", { phone }); }}>
              <Text style={s.modalBtnTxt}>{t.loginBtn}</Text>
            </Pressable>
            <Pressable onPress={() => setAlreadyExists(false)} style={s.modalCancel} hitSlop={8}>
              <Text style={s.modalCancelTxt}>{t.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  top: {
    backgroundColor: INDIGO,
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  brand:    { fontFamily: fonts.bodyBold, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 12, letterSpacing: 1 },
  topTitle: { fontFamily: fonts.display, fontSize: 30, color: colors.onPrimary, letterSpacing: -0.5, marginBottom: 6 },
  topSub:   { fontFamily: fonts.body, fontSize: 15, color: "rgba(255,255,255,0.65)", lineHeight: 22 },

  card: {
    flex: 1, backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40,
  },

  phoneRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: colors.borderSubtle,
    borderRadius: radius.xxl, overflow: "hidden", marginBottom: 8,
  },
  countryCode: {
    paddingHorizontal: 14, paddingVertical: 17,
    backgroundColor: colors.surfaceContainerLow,
    borderRightWidth: 1.5, borderRightColor: colors.borderSubtle,
  },
  countryCodeTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
  phoneInput: {
    flex: 1, paddingHorizontal: 14, paddingVertical: 17,
    fontFamily: fonts.body, fontSize: 17, color: colors.textHeading, letterSpacing: 1,
  },

  hint: { fontFamily: fonts.body, fontSize: 13, color: colors.outline, marginBottom: 20 },

  primaryBtn: {
    backgroundColor: INDIGO, borderRadius: 16,
    paddingVertical: 19, alignItems: "center", marginTop: 4,
  },
  btnDisabled:   { opacity: 0.4 },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.onPrimary },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchTxt:  { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textBody },
  switchLink: { fontFamily: fonts.bodyBold, fontSize: 15, color: INDIGO },

  optinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", padding: 12, marginBottom: 16 },
  optinTitle:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#166534" },
  optinSub:    { fontFamily: fonts.body, fontSize: 12, color: colors.textBody, marginTop: 2 },
  optinCta:    { fontFamily: fonts.bodyBold, fontSize: 12, color: "#166534" },

  modalBg:       { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard:     { backgroundColor: colors.surfaceCard, borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 10 },
  modalIcon:     { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryFixed, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle:    { fontFamily: fonts.display, fontSize: 20, color: colors.textHeading, textAlign: "center" },
  modalBody:     { fontFamily: fonts.body, fontSize: 14, color: colors.textBody, textAlign: "center", lineHeight: 20, marginBottom: 4 },
  modalBtn:      { backgroundColor: INDIGO, borderRadius: radius.xxl, paddingVertical: 15, width: "100%", alignItems: "center" },
  modalBtnTxt:   { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
  modalCancel:   { marginTop: 4 },
  modalCancelTxt:{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.outline },
});
