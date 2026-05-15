import { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
  Pressable, Modal, TextInput, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, spacing } from "../theme";

export default function LoginScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { lang } = useLanguage();
  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const { sendOTP, verifyOTP, loginComplete, completeSignup, otpFlow, resetOTPFlow } = useAuth();

  const [phone, setPhone]   = useState(initialPhone);
  const [otp, setOtp]       = useState("");
  const [name, setName]     = useState("");
  const [role, setRole]     = useState("customer");
  const [loading, setLoading] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);

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

  const handleSignupFallback = async () => {
    if (name.trim().length < 2)
      return Alert.alert(lang === "hi" ? "नाम डालो" : "Enter your name");
    setLoading(true);
    try {
      const user = await completeSignup(name.trim(), role);
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
            else navigation.navigate("Home");
          }}>
            <Ionicons name="arrow-back" size={18} color={colors.saffron} />
            <Text style={s.backTxt}>{lang === "hi" ? "वापस" : "Back"}</Text>
          </Pressable>

          {/* ── Brand + step dots ─────────────────────────────────── */}
          <View style={s.brand}>
            <View style={s.logoBadge}><Text style={s.logoK}>K</Text></View>
            <View style={s.stepDots}>
              {[1, 2].map(n => (
                <View key={n} style={[s.dot, step >= n && s.dotOn]} />
              ))}
            </View>
          </View>

          {/* ── Title ─────────────────────────────────────────────── */}
          <View style={s.titleBlock}>
            <Text style={s.step}>{lang === "hi" ? `चरण ${step} / 2` : `Step ${step} of 2`}</Text>
            <Text style={s.title}>
              {step === 1 && (lang === "hi" ? "Login करो" : "Log in")}
              {step === 2 && (lang === "hi" ? "Code डालो" : "Enter your code")}
              {step === 3 && (lang === "hi" ? "Account बनाओ" : "Finish signing up")}
            </Text>
            <Text style={s.subtitle}>
              {step === 1 && (lang === "hi" ? "अपना मोबाइल नंबर डालो।" : "Sign in with your mobile number.")}
              {step === 2 && (lang === "hi" ? `Code भेजा: ${otpFlow.phone}` : `Code sent to ${otpFlow.phone}`)}
              {step === 3 && (lang === "hi" ? "नाम और role बताओ।" : "Add your name and role to continue.")}
            </Text>
          </View>

          {/* ── Step 1 — Phone ────────────────────────────────────── */}
          {step === 1 && (
            <View style={s.form}>
              <Text style={s.fieldLabel}>{lang === "hi" ? "मोबाइल नंबर" : "Mobile number"}</Text>
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
              <Text style={s.hint}>
                {lang === "hi" ? "+91 अपने आप जुड़ जाएगा।" : "+91 is added automatically."}
              </Text>
              <Button
                title={lang === "hi" ? "OTP भेजो" : "Send code"}
                onPress={handleSendOTP}
                loading={loading}
                disabled={phone.length !== 10}
                style={s.cta}
              />
              <Pressable onPress={() => navigation.replace("PhoneSignup")} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  {lang === "hi" ? "नया हो? " : "New here? "}
                  <Text style={{ color: colors.saffron }}>
                    {lang === "hi" ? "Register करो →" : "Sign up →"}
                  </Text>
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
                  <Text style={s.optinCta}>
                    {lang === "hi" ? "खोलो →" : "Open →"}
                  </Text>
                </Pressable>
              )}
              <Text style={s.fieldLabel}>{lang === "hi" ? "6-अंक code" : "6-digit code"}</Text>
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
              <Text style={s.hint}>
                {lang === "hi" ? `${otpFlow.phone} पर भेजा गया।` : `Sent to ${otpFlow.phone}`}
              </Text>
              <Button
                title={lang === "hi" ? "Verify करो" : "Verify & log in"}
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otp.length !== 6}
                style={s.cta}
              />
              <Pressable onPress={resetOTPFlow} style={s.switchLink}>
                <Text style={s.switchTxt}>
                  {lang === "hi" ? "नंबर बदलना है? " : "Wrong number? "}
                  <Text style={{ color: colors.saffron }}>
                    {lang === "hi" ? "बदलो →" : "Change →"}
                  </Text>
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Step 3 — Signup fallback ──────────────────────────── */}
          {step === 3 && (
            <View style={s.form}>
              <Text style={s.fieldLabel}>{lang === "hi" ? "आप कौन हो?" : "I am a"}</Text>
              <View style={s.roleCards}>
                {[
                  { v: "customer", emoji: "🏠", title: lang === "hi" ? "काम देने वाला" : "Customer", sub: lang === "hi" ? "मुझे कारीगर चाहिए" : "I need workers" },
                  { v: "worker",   emoji: "💼", title: lang === "hi" ? "काम करने वाला" : "Worker",   sub: lang === "hi" ? "मुझे काम चाहिए"    : "I want jobs" },
                ].map(r => (
                  <Pressable key={r.v} onPress={() => setRole(r.v)} style={[s.roleCard, role === r.v && s.roleCardOn]}>
                    <Text style={s.roleEmoji}>{r.emoji}</Text>
                    <Text style={[s.roleTitle, role === r.v && s.roleTitleOn]}>{r.title}</Text>
                    <Text style={s.roleSub}>{r.sub}</Text>
                    {role === r.v && <View style={s.roleTick}><Ionicons name="checkmark" size={12} color="#fff" /></View>}
                  </Pressable>
                ))}
              </View>

              <Text style={s.fieldLabel}>{lang === "hi" ? "पूरा नाम" : "Full name"}</Text>
              <TextInput
                style={s.textInput}
                placeholder={lang === "hi" ? "आपका नाम" : "Your full name"}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Button
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
            <View style={s.modalIcon}><Ionicons name="phone-portrait-outline" size={28} color={colors.saffron} /></View>
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
  dot: { width: 28, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.saffron },

  titleBlock: { marginBottom: 28 },
  step: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: colors.saffron, marginBottom: 6 },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, lineHeight: 36, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

  form: { gap: 0 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 8, marginTop: 4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 4 },

  phoneRow: { flexDirection: "row", gap: 0 },
  prefixBox: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.saffron, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, paddingVertical: 14, paddingHorizontal: 14, justifyContent: "center", borderRightWidth: 0 },
  prefixTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.saffron },
  phoneInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.saffron, borderTopRightRadius: 12, borderBottomRightRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 18, color: colors.text, letterSpacing: 2 },

  otpInput: { backgroundColor: "#fff", borderWidth: 2, borderColor: colors.saffron, borderRadius: 14, paddingVertical: 18, paddingHorizontal: 20, fontFamily: fonts.display, fontSize: 32, color: colors.text, textAlign: "center", letterSpacing: 14, marginBottom: 4 },
  textInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.text, marginBottom: 4 },

  cta: { marginTop: 20, borderRadius: 14, paddingVertical: 16 },
  switchLink: { marginTop: 20, alignItems: "center" },
  switchTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondary },

  roleCards: { flexDirection: "row", gap: 12, marginBottom: 20 },
  roleCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, padding: 16, alignItems: "center", gap: 6, position: "relative" },
  roleCardOn: { borderColor: colors.saffron, backgroundColor: colors.saffronTint },
  roleEmoji: { fontSize: 28 },
  roleTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  roleTitleOn: { color: colors.saffron },
  roleSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, textAlign: "center" },
  roleTick: { position: "absolute", top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },

  optinBanner: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f0fdf4", borderRadius: 12, borderWidth: 1, borderColor: "#86efac", padding: 12, marginBottom: 14 },
  optinTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#15803d" },
  optinSub: { fontFamily: fonts.body, fontSize: 11, color: "#166534", marginTop: 2 },
  optinCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#16a34a" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, alignItems: "center", gap: 10 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, textAlign: "center" },
  modalBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 6 },
  modalCancel: { marginTop: 8 },
  modalCancelTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
});
