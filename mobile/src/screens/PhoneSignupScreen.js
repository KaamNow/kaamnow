import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppScreen from "../components/AppScreen";
import Button from "../components/Button";
import OTPInput from "../components/OTPInput";
import PhoneInput from "../components/PhoneInput";
import PrimaryButton from "../components/PrimaryButton";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, shadow, spacing } from "../theme";

function maskPhoneNumber(phone) {
  const digits = (phone || "").replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone || "";
  return `XXXXX-${digits.slice(5)}`;
}

export default function PhoneSignupScreen({ navigation, route }) {
  const { sendOTP, verifyOTP, loginComplete, otpFlow, resetOTPFlow } = useAuth();
  const { lang } = useLanguage();

  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [requiresOptin, setRequiresOptin] = useState(false);

  const safePhone = phone || "";
  const fullPhone = safePhone.startsWith("+91") ? safePhone : `+91${safePhone.replace(/\D/g, "")}`;
  const step = otpFlow.step;

  const goBack = () => {
    if (step > 1) {
      setOtp("");
      resetOTPFlow();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Tabs");
  };

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone)) {
      return Alert.alert(lang === "hi" ? "सही 10-अंक नंबर डालो" : "Enter a valid 10-digit number");
    }

    setLoading(true);
    try {
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (check.data.exists && !check.data.expired) {
        setAlreadyExists(true);
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
    if (!/^[0-9]{6}$/.test(otp)) {
      return Alert.alert(lang === "hi" ? "6-अंक code डालो" : "Enter the 6-digit code");
    }

    setLoading(true);
    try {
      const res = await verifyOTP(otpFlow.phone, otp);
      if (res.created_user) {
        await loginComplete(res.otp_token);
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
        return;
      }
      navigation.replace("RoleSelection");
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable style={styles.backBtn} onPress={goBack}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>

          <View style={[styles.brand, step === 2 && styles.brandCompact]}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoK}>K</Text>
            </View>
            <Text style={styles.brandName}>KaamNow</Text>
            <Text style={styles.tagline}>काम की बात KaamNow के साथ</Text>
          </View>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>{step === 2 ? "Code confirm karo" : "Account banao"}</Text>
            <Text style={styles.subtitle}>
              {step === 2
                ? `6-digit code bheja: +91 ${maskPhoneNumber(otpFlow.phone)}`
                : "Mobile number se shuru karein"}
            </Text>
          </View>

          {step === 1 && (
            <View>
              <PhoneInput value={phone} onChangeText={setPhone} autoFocus />
              <Text style={styles.hint}>OTP WhatsApp par aayega</Text>

              <PrimaryButton
                title="Code bhejo"
                onPress={handleSendOTP}
                loading={loading}
                disabled={phone.length !== 10}
                style={styles.cta}
              />

              <Pressable onPress={() => navigation.replace("Login", { phone })} style={styles.switchLink}>
                <Text style={styles.switchTxt}>
                  Already account hai? <Text style={styles.switchAccent}>Log in</Text>
                </Text>
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View>
              {requiresOptin && (
                <Pressable
                  style={styles.optinBanner}
                  onPress={() => Linking.openURL("https://wa.me/917834811114?text=Hi")}
                >
                  <Ionicons name="logo-whatsapp" size={18} color={colors.info} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optinTitle}>
                      {lang === "hi" ? "OTP WhatsApp से आएगा" : "OTP arrives on WhatsApp"}
                    </Text>
                    <Text style={styles.optinSub}>
                      {lang === "hi"
                        ? "पहली बार: नीचे टैप करो, 'Hi' भेजो, वापस आओ।"
                        : "First time: tap below, send 'Hi', come back."}
                    </Text>
                  </View>
                  <Text style={styles.optinCta}>{lang === "hi" ? "खोलो →" : "Open →"}</Text>
                </Pressable>
              )}

              <OTPInput value={otp} onChange={setOtp} autoFocus />
              <Text style={styles.hint}>WhatsApp par code check karein</Text>

              <PrimaryButton
                title="OTP confirm karo"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otp.length !== 6}
                style={styles.cta}
              />

              <Pressable onPress={goBack} style={styles.switchLink}>
                <Text style={styles.switchTxt}>
                  Wrong number? <Text style={styles.switchAccent}>Change</Text>
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={alreadyExists} animationType="fade" onRequestClose={() => setAlreadyExists(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>{lang === "hi" ? "नंबर पहले से है" : "Already registered"}</Text>
            <Text style={styles.modalBody}>
              {lang === "hi"
                ? "यह नंबर पहले से registered है। Login karo."
                : "This number is already registered. Please log in."}
            </Text>
            <Button
              title={lang === "hi" ? "Login karo" : "Log in"}
              onPress={() => { setAlreadyExists(false); navigation.replace("Login", { phone }); }}
              fullWidth
            />
            <Pressable onPress={() => setAlreadyExists(false)} style={styles.modalCancel}>
              <Text style={styles.modalCancelTxt}>{lang === "hi" ? "रद्द करो" : "Cancel"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 60 },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 8,
    marginLeft: -10,
  },
  brand: { alignItems: "center", marginTop: 10, marginBottom: 34 },
  brandCompact: { marginTop: 0, marginBottom: 24 },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  logoK: { fontFamily: fonts.display, fontSize: 34, color: "#fff" },
  brandName: { marginTop: 12, fontFamily: fonts.displayBold, fontSize: 24, color: colors.text },
  tagline: { marginTop: 3, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  titleBlock: { marginBottom: 22 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.text, lineHeight: 38, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6, marginBottom: 4 },
  cta: { marginTop: 20 },
  switchLink: { marginTop: 20, alignItems: "center" },
  switchTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontFamily: fonts.bodyBold },
  optinBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.infoLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 12,
    marginBottom: 16,
  },
  optinTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.info },
  optinSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 },
  optinCta: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.info },
  modalBg: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 28, width: "100%", maxWidth: 360, alignItems: "center", gap: 10 },
  modalIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, textAlign: "center" },
  modalBody: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 6 },
  modalCancel: { marginTop: 8 },
  modalCancelTxt: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textMuted },
});
