import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  Pressable, Modal, TextInput, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, spacing } from "../theme";

const LANGUAGES = [
  { v: "en", l: "EN",  full: "English"             },
  { v: "hi", l: "हिं", full: "हिंदी"                },
  { v: "mr", l: "मर",  full: "मराठी"               },
  { v: "gu", l: "ગુ",  full: "ગુજરાતી"             },
  { v: "ta", l: "த",   full: "தமிழ்"               },
  { v: "te", l: "తె",  full: "తెలుగు"              },
];

export default function PhoneSignupScreen({ navigation, route }) {
  const { sendOTP, verifyOTP, completeSignup, loginComplete, otpFlow, resetOTPFlow } = useAuth();
  const { lang, setLang } = useLanguage();

  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const [phone, setPhone]               = useState(initialPhone);
  const [otp, setOtp]                   = useState("");
  const [name, setName]                 = useState("");
  const [role, setRole]                 = useState("customer");
  const [preferredLanguage, setPreferredLanguage] = useState("hi");
  const [loading, setLoading]           = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);

  const safePhone = phone || "";
  const fullPhone = safePhone.startsWith("+91") ? safePhone : `+91${safePhone.replace(/\D/g, "")}`;

  const T = {
    back:       lang === "hi" ? "वापस"             : "Back",
    step:       (n) => lang === "hi" ? `चरण ${n} / 3` : `Step ${n} of 3`,
    t1:         lang === "hi" ? "KaamNow जुड़ो"    : "Join KaamNow",
    s1:         lang === "hi" ? "Phone-first signup। सबसे तेज़ और सुरक्षित।" : "Phone-first signup. Fast & secure.",
    t2:         lang === "hi" ? "Code डालो"        : "Enter your code",
    s2:         (p) => lang === "hi" ? `Code भेजा: ${p}` : `Code sent to ${p}`,
    t3:         lang === "hi" ? "अपना परिचय दो"    : "Tell us about you",
    s3:         lang === "hi" ? "ताकि सही लोग आप तक पहुँचें।" : "So the right people can find you.",
    phone:      lang === "hi" ? "मोबाइल नंबर"      : "Mobile number",
    hint:       lang === "hi" ? "+91 अपने आप जुड़ेगा।" : "+91 is added automatically.",
    send:       lang === "hi" ? "OTP भेजो"         : "Send OTP",
    alreadyReg: lang === "hi" ? "पहले से registered हो? " : "Already registered? ",
    login:      lang === "hi" ? "Login करो →"      : "Log in →",
    code:       lang === "hi" ? "6-अंक OTP"        : "6-digit OTP",
    sentTo:     (p) => lang === "hi" ? `${p} पर भेजा गया।` : `Sent to ${p}`,
    verify:     lang === "hi" ? "Verify करो"       : "Verify OTP",
    change:     lang === "hi" ? "नंबर बदलना है? "  : "Wrong number? ",
    changeCta:  lang === "hi" ? "बदलो →"           : "Change →",
    whoAreYou:  lang === "hi" ? "आप कौन हो?"       : "Who are you?",
    fullName:   lang === "hi" ? "पूरा नाम"         : "Full name",
    namePh:     lang === "hi" ? "आपका नाम"         : "Your full name",
    language:   lang === "hi" ? "भाषा"             : "Language",
    join:       lang === "hi" ? "KaamNow जुड़ो"    : "Join KaamNow",
    creating:   lang === "hi" ? "बन रहा है…"       : "Creating…",
    alrTitle:   lang === "hi" ? "नंबर पहले से है"  : "Already registered",
    alrBody:    lang === "hi" ? "यह नंबर पहले से registered है। Login करो।" : "This number is already registered. Please log in.",
    loginBtn:   lang === "hi" ? "Login करो"        : "Log in",
    cancel:     lang === "hi" ? "रद्द करो"         : "Cancel",
  };

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone))
      return Alert.alert(lang === "hi" ? "सही 10-अंक नंबर डालो" : "Enter a valid 10-digit number");
    setLoading(true);
    try {
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (check.data.exists && !check.data.expired) { setAlreadyExists(true); return; }
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

  const handleComplete = async () => {
    if (name.trim().length < 2)
      return Alert.alert(lang === "hi" ? "नाम डालो" : "Enter your full name");
    setLoading(true);
    try {
      const user = await completeSignup(name.trim(), role, undefined, preferredLanguage);
      setLang(preferredLanguage);
      navigation.reset({ index: 0, routes: [{ name: user.role === "worker" ? "WorkerOnboarding" : "CustomerOnboarding" }] });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const step = otpFlow.step;

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Back ──────────────────────────────────────────────── */}
          <Pressable style={s.backBtn} onPress={() => {
            if (step > 1) resetOTPFlow();
            else if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate("Tabs");
          }}>
            <Ionicons name="arrow-back" size={18} color={colors.saffron} />
            <Text style={s.backTxt}>{T.back}</Text>
          </Pressable>

          {/* ── Brand + step dots ─────────────────────────────────── */}
          <View style={s.brand}>
            <View style={s.logoBadge}><Text style={s.logoK}>K</Text></View>
            <View style={s.stepDots}>
              {[1, 2, 3].map(n => (
                <View key={n} style={[s.dot, step >= n && s.dotOn]} />
              ))}
            </View>
          </View>

          {/* ── Title block ───────────────────────────────────────── */}
          <View style={s.titleBlock}>
            <Text style={s.stepTxt}>{T.step(step)}</Text>
            <Text style={s.title}>
              {step === 1 && T.t1}
              {step === 2 && T.t2}
              {step === 3 && T.t3}
            </Text>
            <Text style={s.subtitle}>
              {step === 1 && T.s1}
              {step === 2 && T.s2(otpFlow.phone)}
              {step === 3 && T.s3}
            </Text>
          </View>

          {/* ── Step 1 — Phone ────────────────────────────────────── */}
          {step === 1 && (
            <View>
              <Text style={s.fieldLabel}>{T.phone}</Text>
              <View style={s.phoneRow}>
                <View style={s.prefixBox}>
                  <Text style={s.prefixTxt}>+91</Text>
                </View>
                <TextInput
                  style={s.phoneInput}
                  placeholder="9876543210"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={v => setPhone(v.replace(/\D/g, ""))}
                  autoFocus
                />
              </View>
              <Text style={s.hint}>{T.hint}</Text>

              <Button
                title={T.send}
                onPress={handleSendOTP}
                loading={loading}
                disabled={phone.length !== 10}
                style={s.cta}
              />
              <Pressable onPress={() => navigation.replace("Login")} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  {T.alreadyReg}
                  <Text style={{ color: colors.saffron }}>{T.login}</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 2 — OTP ──────────────────────────────────────── */}
          {step === 2 && (
            <View>
              {requiresOptin && (
                <Pressable
                  style={s.optinBanner}
                  onPress={() => Linking.openURL("https://wa.me/917834811114?text=Hi")}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
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
                  <Text style={s.optinCta}>{lang === "hi" ? "खोलो →" : "Open →"}</Text>
                </Pressable>
              )}
              <Text style={s.fieldLabel}>{T.code}</Text>
              <TextInput
                style={s.otpInput}
                placeholder="● ● ● ● ● ●"
                placeholderTextColor={colors.border}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={v => setOtp(v.replace(/\D/g, ""))}
                autoFocus
              />
              <Text style={s.hint}>{T.sentTo(otpFlow.phone)}</Text>

              <Button
                title={T.verify}
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otp.length !== 6}
                style={s.cta}
              />
              <Pressable onPress={resetOTPFlow} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  {T.change}
                  <Text style={{ color: colors.saffron }}>{T.changeCta}</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 3 — Profile ──────────────────────────────────── */}
          {step === 3 && (
            <View>
              {/* Role cards */}
              <Text style={s.fieldLabel}>{T.whoAreYou}</Text>
              <View style={s.roleCards}>
                {[
                  { v: "customer", emoji: "🏠", title: lang === "hi" ? "काम देने वाला" : "Customer", sub: lang === "hi" ? "मुझे कारीगर चाहिए" : "I need workers" },
                  { v: "worker",   emoji: "💼", title: lang === "hi" ? "काम करने वाला" : "Worker",   sub: lang === "hi" ? "मुझे काम चाहिए"    : "I want jobs"   },
                ].map(r => (
                  <Pressable key={r.v} onPress={() => setRole(r.v)} style={[s.roleCard, role === r.v && s.roleCardOn]}>
                    <Text style={s.roleEmoji}>{r.emoji}</Text>
                    <Text style={[s.roleTitle, role === r.v && s.roleTitleOn]}>{r.title}</Text>
                    <Text style={s.roleSub}>{r.sub}</Text>
                    {role === r.v && (
                      <View style={s.roleTick}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>

              {/* Name */}
              <Text style={[s.fieldLabel, { marginTop: 8 }]}>{T.fullName}</Text>
              <TextInput
                style={s.textInput}
                placeholder={T.namePh}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              {/* Language */}
              <Text style={[s.fieldLabel, { marginTop: 12 }]}>{T.language}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={s.langRow}>
                  {LANGUAGES.map(l => (
                    <Pressable
                      key={l.v}
                      onPress={() => setPreferredLanguage(l.v)}
                      style={[s.langChip, preferredLanguage === l.v && s.langChipOn]}
                    >
                      <Text style={[s.langChipTxt, preferredLanguage === l.v && s.langChipTxtOn]}>
                        {l.l}
                      </Text>
                      {preferredLanguage === l.v && (
                        <Text style={s.langFull}>{l.full}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Button
                title={loading ? T.creating : T.join}
                onPress={handleComplete}
                loading={loading}
                disabled={name.trim().length < 2}
                style={s.cta}
              />
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Already exists modal ──────────────────────────────────── */}
      <Modal transparent visible={alreadyExists} animationType="fade" onRequestClose={() => setAlreadyExists(false)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <View style={s.modalIcon}>
              <Ionicons name="phone-portrait-outline" size={28} color={colors.saffron} />
            </View>
            <Text style={s.modalTitle}>{T.alrTitle}</Text>
            <Text style={s.modalBody}>{T.alrBody}</Text>
            <Button
              title={T.loginBtn}
              onPress={() => { setAlreadyExists(false); navigation.replace("Login", { phone }); }}
            />
            <Pressable onPress={() => setAlreadyExists(false)} style={s.modalCancel}>
              <Text style={s.modalCancelTxt}>{T.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 60 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 12, marginBottom: 4 },
  backTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.saffron },

  brand: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  logoBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  logoK: { fontFamily: fonts.display, fontSize: 22, color: "#fff" },
  stepDots: { flexDirection: "row", gap: 8 },
  dot: { width: 24, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.saffron },

  titleBlock: { marginBottom: 28 },
  stepTxt: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.saffron, marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, lineHeight: 36, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 8 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 4 },

  phoneRow: { flexDirection: "row" },
  prefixBox: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.saffron, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingVertical: 14, paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 0 },
  prefixTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.saffron },
  phoneInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.saffron, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 18, color: colors.text, letterSpacing: 2 },

  otpInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.saffron, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 20, fontFamily: fonts.display, fontSize: 32, color: colors.text, textAlign: "center", letterSpacing: 14 },
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.text },

  cta: { marginTop: 20, borderRadius: 14, paddingVertical: 16 },
  switchLink: { marginTop: 20, alignItems: "center" },
  switchTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondary },

  roleCards: { flexDirection: "row", gap: 12, marginBottom: 8 },
  roleCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 16, alignItems: "center", gap: 6, position: "relative" },
  roleCardOn: { borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  roleEmoji: { fontSize: 28 },
  roleTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, textAlign: "center" },
  roleTitleOn: { color: colors.saffron },
  roleSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: "center" },
  roleTick: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },

  langRow: { flexDirection: "row", gap: 8, paddingBottom: 8 },
  langChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  langChipOn: { borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  langChipTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  langChipTxtOn: { color: colors.saffron },
  langFull: { fontFamily: fonts.body, fontSize: 12, color: colors.saffron },

  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, alignItems: "center", gap: 10 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, textAlign: "center" },
  modalBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 6 },
  modalCancel: { marginTop: 8 },
  modalCancelTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
  optinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f0fdf4", borderRadius: 12, borderWidth: 1, borderColor: "#86efac", padding: 12, marginBottom: 14 },
  optinTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#15803d" },
  optinSub: { fontFamily: fonts.body, fontSize: 11, color: "#166534", marginTop: 2 },
  optinCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#16a34a" },
});
