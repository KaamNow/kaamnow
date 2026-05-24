import { useRef, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, TextInput,
  KeyboardAvoidingView, Platform, Alert, Modal, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import AppScreen from "../components/AppScreen";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, radius, spacing } from "../theme";
import { LinearGradient } from "expo-linear-gradient";

const INDIGO = colors.primary;

const T = {
  en: {
    step1Title: "Welcome back 👋",
    step1Sub: "Enter your mobile number",
    step2Title: "Enter the code",
    step2Sub: (phone) => `We sent a 6-digit code to ${phone}`,
    step3Title: "One last step",
    step3Sub: "Tell us your name to continue",
    phonePlaceholder: "10-digit mobile number",
    phoneHint: "OTP will arrive on WhatsApp",
    sendOtp: "Send OTP",
    sending: "Sending…",
    verifyOtp: "Verify & Sign In",
    verifying: "Verifying…",
    wrongNumber: "Wrong number?",
    change: "Change",
    newHere: "New here?",
    signUp: "Create an account",
    namePlaceholder: "Your full name",
    nameLabel: "Full name",
    genderLabel: "Gender (optional)",
    male: "Male", female: "Female", other: "Other",
    createAccount: "Create Account",
    creating: "Creating…",
    notRegisteredTitle: "Number not registered",
    notRegisteredBody: "This number isn't registered with us. Please sign up first.",
    signUpBtn: "Sign Up",
    cancel: "Cancel",
    otpOptinTitle: "OTP arrives on WhatsApp",
    otpOptinSub: "First time: tap below, send 'Hi', then come back.",
    otpOptinOpen: "Open →",
    deactivatedTitle: "Account Deactivated",
    deactivatedBody: "Your account has been deactivated. Would you like to reactivate it?",
    reactivate: "Reactivate",
    invalidPhone: "Enter a valid 10-digit number",
    invalidOtp: "Enter the 6-digit code",
    enterName: "Please enter your name",
  },
  hi: {
    step1Title: "वापस आए 👋",
    step1Sub: "अपना मोबाइल नंबर डालें",
    step2Title: "Code डालें",
    step2Sub: (phone) => `6-digit code भेजा: ${phone}`,
    step3Title: "बस एक कदम",
    step3Sub: "आगे बढ़ने के लिए नाम बताएं",
    phonePlaceholder: "10-अंक मोबाइल नंबर",
    phoneHint: "OTP WhatsApp पर आएगा",
    sendOtp: "OTP भेजें",
    sending: "भेज रहे हैं…",
    verifyOtp: "Verify करें",
    verifying: "Verify हो रहा है…",
    wrongNumber: "गलत नंबर?",
    change: "बदलें",
    newHere: "नए हैं?",
    signUp: "Account बनाएं",
    namePlaceholder: "आपका पूरा नाम",
    nameLabel: "पूरा नाम",
    genderLabel: "लिंग (वैकल्पिक)",
    male: "पुरुष", female: "महिला", other: "अन्य",
    createAccount: "Account बनाएं",
    creating: "बन रहा है…",
    notRegisteredTitle: "नंबर registered नहीं है",
    notRegisteredBody: "यह नंबर registered नहीं है। पहले account बनाएं।",
    signUpBtn: "Sign Up",
    cancel: "रद्द करें",
    otpOptinTitle: "OTP WhatsApp पर आएगा",
    otpOptinSub: "पहली बार: नीचे tap करें, 'Hi' भेजें, वापस आएं।",
    otpOptinOpen: "खोलें →",
    deactivatedTitle: "Account बंद है",
    deactivatedBody: "आपका account बंद है। Reactivate करना चाहते हैं?",
    reactivate: "Reactivate करें",
    invalidPhone: "सही 10-अंक नंबर डालें",
    invalidOtp: "6-अंक code डालें",
    enterName: "कृपया नाम डालें",
  },
};

function maskPhone(phone) {
  const d = (phone || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 XXXXX-${d.slice(5)}` : phone || "";
}

export default function LoginScreen() {
  const navigation  = useNavigation();
  const route       = useRoute();
  const { lang }    = useLanguage();
  const t = T[lang] || T.en;
  const { sendOTP, verifyOTP, loginComplete, completeSignup, otpFlow, resetOTPFlow } = useAuth();

  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const [phone, setPhone]     = useState(initialPhone);
  const [otp, setOtp]         = useState("");
  const [name, setName]       = useState("");
  const [gender, setGender]   = useState("");
  const [loading, setLoading] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);
  const [focusedOtp, setFocusedOtp]       = useState(0);
  const otpRefs = useRef([]);

  const fullPhone = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "")}`;
  const step = otpFlow.step;

  const goBack = () => {
    if (step > 1) resetOTPFlow();
    else if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Tabs");
  };

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone)) return Alert.alert("", t.invalidPhone);
    setLoading(true);
    try {
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (!check.data.exists || check.data.expired) { setNotRegistered(true); return; }
      if (check.data.is_active === false) {
        Alert.alert(t.deactivatedTitle, t.deactivatedBody, [
          { text: t.cancel, style: "cancel" },
          { text: t.reactivate, onPress: async () => {
            setLoading(true);
            try { await sendOTP(fullPhone); } catch (e) { Alert.alert("", formatApiError(e)); } finally { setLoading(false); }
          }},
        ]);
        return;
      }
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
      }
    } catch (e) { Alert.alert("", formatApiError(e)); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (val, i) => {
    const d = val.replace(/\D/g, "");
    if (!d) {
      setOtp(prev => { const a = prev.padEnd(6," ").split(""); a[i]=" "; return a.join("").replace(/\s/g,"").slice(0,6); });
      return;
    }
    if (d.length > 1) {
      const next = d.slice(0, 6);
      setOtp(next);
      const ni = Math.min(next.length, 5);
      otpRefs.current[ni]?.focus();
      setFocusedOtp(ni);
      return;
    }
    setOtp(prev => { const a = prev.padEnd(6," ").split(""); a[i]=d; return a.join("").replace(/\s/g,"").slice(0,6); });
    if (i < 5) { otpRefs.current[i+1]?.focus(); setFocusedOtp(i+1); }
  };

  const handleOtpKey = (e, i) => {
    if (e.nativeEvent.key === "Backspace" && !otp[i] && i > 0) {
      otpRefs.current[i-1]?.focus(); setFocusedOtp(i-1);
    }
  };

  const handleSignupFallback = async () => {
    if (name.trim().length < 2) return Alert.alert("", t.enterName);
    setLoading(true);
    try {
      await completeSignup(name.trim(), gender || undefined);
      navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
    } catch (e) { Alert.alert("", formatApiError(e)); }
    finally { setLoading(false); }
  };

  const topTitle = step === 1 ? t.step1Title : step === 2 ? t.step2Title : t.step3Title;
  const topSub   = step === 1 ? t.step1Sub : step === 2 ? t.step2Sub(maskPhone(otpFlow.phone)) : t.step3Sub;

  return (
    <AppScreen edges={["top"]} style={{ flex: 1, backgroundColor: INDIGO }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Top — brand + step heading */}
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
                <Text style={s.switchTxt}>{t.newHere} </Text>
                <Pressable onPress={() => navigation.replace("PhoneSignup", { phone })} hitSlop={8}>
                  <Text style={s.switchLink}>{t.signUp}</Text>
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

              <View style={s.otpRow}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TextInput
                    key={i}
                    ref={r => { otpRefs.current[i] = r; }}
                    style={[s.otpBox, focusedOtp === i && s.otpBoxFocused, otp[i] && s.otpBoxFilled]}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp[i] || ""}
                    onChangeText={v => handleOtpChange(v, i)}
                    onKeyPress={e => handleOtpKey(e, i)}
                    onFocus={() => setFocusedOtp(i)}
                    selectTextOnFocus
                    autoFocus={i === 0}
                  />
                ))}
              </View>
              <Text style={s.hint}>Check your WhatsApp for the code</Text>

              <Pressable style={[s.primaryBtn, otp.length !== 6 && s.btnDisabled]}
                onPress={handleVerifyOTP} disabled={loading || otp.length !== 6}>
                <Text style={s.primaryBtnTxt}>{loading ? t.verifying : t.verifyOtp}</Text>
              </Pressable>

              <View style={s.switchRow}>
                <Text style={s.switchTxt}>{t.wrongNumber} </Text>
                <Pressable onPress={resetOTPFlow} hitSlop={8}>
                  <Text style={s.switchLink}>{t.change}</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Step 3 — Name */}
          {step === 3 && (
            <>
              <Text style={s.fieldLabel}>{t.nameLabel}</Text>
              <TextInput
                style={s.textInput}
                placeholder={t.namePlaceholder}
                placeholderTextColor={colors.outline}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoFocus
              />

              <Text style={[s.fieldLabel, { marginTop: 18 }]}>{t.genderLabel}</Text>
              <View style={s.genderRow}>
                {[{ v: "male", l: t.male }, { v: "female", l: t.female }, { v: "other", l: t.other }].map(g => (
                  <Pressable key={g.v} onPress={() => setGender(gender === g.v ? "" : g.v)}
                    style={[s.genderBtn, gender === g.v && s.genderBtnOn]}>
                    <Text style={[s.genderBtnTxt, gender === g.v && s.genderBtnTxtOn]}>{g.l}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={[s.primaryBtn, { marginTop: 8 }, name.trim().length < 2 && s.btnDisabled]}
                onPress={handleSignupFallback} disabled={loading || name.trim().length < 2}>
                <Text style={s.primaryBtnTxt}>{loading ? t.creating : t.createAccount}</Text>
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Not registered modal */}
      <Modal transparent visible={notRegistered} animationType="fade" onRequestClose={() => setNotRegistered(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}><Ionicons name="phone-portrait-outline" size={28} color={colors.primary} /></View>
            <Text style={s.modalTitle}>{t.notRegisteredTitle}</Text>
            <Text style={s.modalBody}>{t.notRegisteredBody}</Text>
            <Pressable style={s.modalBtn}
              onPress={() => { setNotRegistered(false); navigation.replace("PhoneSignup", { phone }); }}>
              <Text style={s.modalBtnTxt}>{t.signUpBtn}</Text>
            </Pressable>
            <Pressable onPress={() => setNotRegistered(false)} style={s.modalCancel} hitSlop={8}>
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

  /* Phone input */
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

  /* OTP */
  otpRow:       { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 10 },
  otpBox:       { flex: 1, height: 58, maxWidth: 50, backgroundColor: colors.surfaceContainerLow, borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: 12, textAlign: "center", fontFamily: fonts.display, fontSize: 22, color: colors.textHeading },
  otpBoxFocused:{ borderColor: INDIGO, backgroundColor: colors.primaryFixed },
  otpBoxFilled: { borderColor: INDIGO },

  /* Name / gender */
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody, marginBottom: 8 },
  textInput: {
    borderWidth: 1.5, borderColor: colors.borderSubtle, borderRadius: radius.xxl,
    paddingVertical: 16, paddingHorizontal: 16,
    fontFamily: fonts.body, fontSize: 16, color: colors.textHeading, marginBottom: 4,
  },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderSubtle, alignItems: "center", backgroundColor: colors.surfaceCard },
  genderBtnOn: { borderColor: INDIGO, backgroundColor: colors.primaryFixed },
  genderBtnTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.outline },
  genderBtnTxtOn: { fontFamily: fonts.bodyBold, color: INDIGO },

  /* CTA */
  primaryBtn: {
    backgroundColor: INDIGO, borderRadius: 16,
    paddingVertical: 19, alignItems: "center", marginTop: 4,
  },
  btnDisabled:   { opacity: 0.4 },
  primaryBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.onPrimary },

  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  switchTxt:  { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textBody },
  switchLink: { fontFamily: fonts.bodyBold, fontSize: 15, color: INDIGO },

  /* Opt-in banner */
  optinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F0FDF4", borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0", padding: 12, marginBottom: 16 },
  optinTitle:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#166534" },
  optinSub:    { fontFamily: fonts.body, fontSize: 12, color: colors.textBody, marginTop: 2 },
  optinCta:    { fontFamily: fonts.bodyBold, fontSize: 12, color: "#166534" },

  /* Modal */
  modalBg:      { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard:    { backgroundColor: colors.surfaceCard, borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 10 },
  modalIcon:    { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryFixed, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle:   { fontFamily: fonts.display, fontSize: 20, color: colors.textHeading, textAlign: "center" },
  modalBody:    { fontFamily: fonts.body, fontSize: 14, color: colors.textBody, textAlign: "center", lineHeight: 20, marginBottom: 4 },
  modalBtn:     { backgroundColor: INDIGO, borderRadius: radius.xxl, paddingVertical: 15, paddingHorizontal: 32, alignItems: "center", width: "100%" },
  modalBtnTxt:  { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.onPrimary },
  modalCancel:  { marginTop: 4 },
  modalCancelTxt:{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.outline },
});
