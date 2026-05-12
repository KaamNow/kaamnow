import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Input from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import api, { formatApiError } from "../api";
import { colors, fonts, spacing, sizes } from "../theme";

const LANGUAGES = [
  { v: "en", l: "English" },
  { v: "hi", l: "हिंदी (Hindi)" },
  { v: "mr", l: "मराठी (Marathi)" },
  { v: "gu", l: "ગુજરાતી (Gujarati)" },
  { v: "ta", l: "தமிழ் (Tamil)" },
  { v: "te", l: "తెలుగు (Telugu)" },
];

export default function PhoneSignupScreen({ navigation, route }) {
  const { sendOTP, verifyOTP, completeSignup, loginComplete, otpFlow, resetOTPFlow } = useAuth();
  const { setLang } = useLanguage();

  const initialPhone = (route?.params?.phone || "").replace(/\D/g, "").slice(-10);
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  const safePhone = phone || "";
  const fullPhone = safePhone.startsWith("+91") ? safePhone : `+91${safePhone.replace(/\D/g, "")}`;

  const handleSendOTP = async () => {
    if (!/^\+91[0-9]{10}$/.test(fullPhone)) {
      return Alert.alert("Enter a valid 10-digit Indian mobile number");
    }
    setLoading(true);
    try {
      // Web-style precheck: if already registered, push to login
      const check = await api.get("/auth/check-phone", { params: { phone: fullPhone } });
      if (check.data.exists && !check.data.expired) {
        setAlreadyExists(true);
        setLoading(false);
        return;
      }
      await sendOTP(fullPhone);
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!/^[0-9]{6}$/.test(otp)) return Alert.alert("Enter the 6-digit code");
    setLoading(true);
    try {
      const res = await verifyOTP(otpFlow.phone, otp);
      if (res.created_user) {
        // Existing user (created_user=true means already exists in backend's naming)
        await loginComplete(res.otp_token);
        navigation.reset({ index: 0, routes: [{ name: "Tabs" }] });
      }
      // else: AuthContext bumped step to 3 → profile form renders
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (name.trim().length < 2) return Alert.alert("Please enter your name");
    setLoading(true);
    try {
      const user = await completeSignup(name.trim(), role, undefined, preferredLanguage);
      setLang(preferredLanguage);
      const target = user.role === "worker" ? "WorkerOnboarding" : "CustomerOnboarding";
      navigation.reset({ index: 0, routes: [{ name: target }] });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const langLabel = LANGUAGES.find((l) => l.v === preferredLanguage)?.l || "English";

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              if (otpFlow.step > 1) resetOTPFlow();
              else if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate("Tabs");
            }}
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.stepHeader}>
            <Text style={styles.stepIndicator}>Step {otpFlow.step} of 3</Text>
            <Text style={styles.title}>
              {otpFlow.step === 1 && "Join KaamNow"}
              {otpFlow.step === 2 && "Verify OTP"}
              {otpFlow.step === 3 && "Your Profile"}
            </Text>
            <Text style={styles.subtitle}>
              {otpFlow.step === 1 && "Phone-first signup. Faster & safer for everyone."}
              {otpFlow.step === 2 && `Code sent to ${otpFlow.phone}`}
              {otpFlow.step === 3 && "Tell us who you are."}
            </Text>
          </View>

          {/* Step 1 — Phone */}
          {otpFlow.step === 1 && (
            <View>
              <Input
                label="Phone number"
                placeholder="9876543210"
                keyboardType="number-pad"
                maxLength={10}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, ""))}
              />
              <Text style={styles.hint}>10-digit number, +91 added automatically</Text>
              <Button
                title={loading ? "Sending..." : "Send OTP"}
                onPress={handleSendOTP}
                loading={loading}
                disabled={phone.length !== 10}
                style={{ marginTop: spacing.md }}
              />
              <Pressable onPress={() => navigation.replace("Login")} style={{ marginTop: spacing.lg, alignItems: "center" }}>
                <Text style={styles.link}>Already registered? Log in</Text>
              </Pressable>
            </View>
          )}

          {/* Step 2 — OTP */}
          {otpFlow.step === 2 && (
            <View>
              <Input
                label="6-digit OTP"
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(v) => setOtp(v.replace(/\D/g, ""))}
                style={{ textAlign: "center", fontSize: 24, letterSpacing: 8 }}
              />
              <Button
                title="Verify OTP"
                onPress={handleVerifyOTP}
                loading={loading}
                disabled={otp.length !== 6}
              />
              <Pressable onPress={resetOTPFlow} style={{ marginTop: spacing.md, alignItems: "center" }}>
                <Text style={styles.link}>Change number</Text>
              </Pressable>
            </View>
          )}

          {/* Step 3 — Profile */}
          {otpFlow.step === 3 && (
            <View>
              <Text style={styles.fieldLabel}>Who are you?</Text>
              <View style={styles.roleRow}>
                {[
                  { v: "customer", l: "I need workers" },
                  { v: "worker", l: "I am a worker" },
                ].map((r) => (
                  <Pressable
                    key={r.v}
                    onPress={() => setRole(r.v)}
                    style={[styles.roleChip, role === r.v && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleChipText, role === r.v && styles.roleChipTextActive]}>
                      {r.l}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Input
                label="Full name"
                placeholder="Your name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />

              <Text style={styles.fieldLabel}>Language</Text>
              <Pressable style={styles.selectBox} onPress={() => setLangPickerOpen(true)}>
                <Text style={styles.selectText}>{langLabel}</Text>
                <Text style={styles.selectChevron}>▾</Text>
              </Pressable>

              <Button
                title={loading ? "Creating..." : "Create Account"}
                onPress={handleComplete}
                loading={loading}
                disabled={name.trim().length < 2}
                style={{ marginTop: spacing.md }}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Already registered modal */}
      <Modal transparent visible={alreadyExists} animationType="fade" onRequestClose={() => setAlreadyExists(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>📱</Text>
            <Text style={styles.modalTitle}>Number already registered</Text>
            <Text style={styles.modalBody}>
              This mobile number is already registered with us. Please log in to continue.
            </Text>
            <Button
              title="Log in"
              onPress={() => {
                setAlreadyExists(false);
                navigation.replace("Login", { phone });
              }}
            />
            <Pressable onPress={() => setAlreadyExists(false)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Language picker modal */}
      <Modal transparent visible={langPickerOpen} animationType="fade" onRequestClose={() => setLangPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangPickerOpen(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose language</Text>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.v}
                style={[styles.langRow, preferredLanguage === l.v && styles.langRowActive]}
                onPress={() => {
                  setPreferredLanguage(l.v);
                  setLangPickerOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.langRowText,
                    preferredLanguage === l.v && styles.langRowTextActive,
                  ]}
                >
                  {l.l}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  backBtn: { paddingVertical: 8, marginBottom: 8, alignSelf: "flex-start" },
  backText: { fontFamily: fonts.bodySemi, color: colors.indigo, fontSize: sizes.body },
  stepHeader: { marginBottom: spacing.xl },
  stepIndicator: {
    fontFamily: fonts.bodyBold,
    color: colors.saffron,
    fontSize: sizes.tiny,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  title: { fontFamily: fonts.display, fontSize: sizes.h2, color: colors.text, marginBottom: 6 },
  subtitle: { fontFamily: fonts.body, fontSize: sizes.body, color: colors.textSecondary },
  hint: { fontFamily: fonts.body, fontSize: sizes.tiny, color: colors.textMuted, marginTop: -6, marginBottom: 6 },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  roleRow: { gap: 10, marginBottom: spacing.lg },
  roleChip: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleChipActive: { backgroundColor: colors.indigoTint, borderColor: colors.indigo },
  roleChipText: { fontFamily: fonts.bodySemi, color: colors.textSecondary },
  roleChipTextActive: { color: colors.indigo },
  link: { fontFamily: fonts.bodySemi, color: colors.indigo },
  selectBox: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  selectText: { fontFamily: fonts.body, fontSize: 15, color: colors.text },
  selectChevron: { fontSize: 16, color: colors.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalEmoji: { fontSize: 32, textAlign: "center", marginBottom: 8 },
  modalTitle: {
    fontFamily: fonts.display,
    fontSize: sizes.h3,
    color: colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  modalBody: {
    fontFamily: fonts.body,
    fontSize: sizes.small,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 18,
  },
  langRow: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#fafaf7",
    marginBottom: 8,
  },
  langRowActive: { backgroundColor: colors.indigoTint },
  langRowText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  langRowTextActive: { color: colors.indigo },
});
