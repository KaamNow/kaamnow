import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, spacing, sizes } from "../theme";

/* ── Data ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  { v: "construction", icon: "🏗️", label: "Construction",   color: "#FEF3C7" },
  { v: "farm",         icon: "🌾", label: "Agriculture",    color: "#D1FAE5" },
  { v: "electrical",   icon: "⚡", label: "Electrical",     color: "#FDE8FF" },
  { v: "cleaning",     icon: "✨", label: "Cleaning",       color: "#E0F2FE" },
  { v: "transport",    icon: "🚛", label: "Transport",      color: "#FFF7ED" },
  { v: "mechanical",   icon: "🔧", label: "Mechanical",     color: "#EEF2FF" },
  { v: "home",         icon: "🏠", label: "Home Services",  color: "#FFF1F2" },
  { v: "tailoring",    icon: "✂️", label: "Tailoring",      color: "#F0FDF4" },
  { v: "other",        icon: "📦", label: "Other",          color: "#F9FAFB" },
];

const SKILLS = {
  construction: ["Mason", "Helper", "Painter", "Tiles worker", "Bar bender", "Plumber", "Welder", "Shuttering carpenter"],
  farm:         ["Harvester", "Farm helper", "Tractor driver", "Irrigation worker", "Pesticide spraying", "Weeder"],
  electrical:   ["House wiring", "Industrial electrician", "AC technician", "Motor repair", "Solar panel"],
  cleaning:     ["House cleaning", "Office cleaning", "Deep cleaning", "Bathroom cleaning", "Kitchen cleaning"],
  transport:    ["Truck driver", "Mini truck driver", "Loader", "Delivery helper", "Auto driver"],
  mechanical:   ["Auto repair", "Pump repair", "Welding", "Diesel mechanic", "Generator repair"],
  home:         ["Cook", "Housekeeping", "Babysitter", "Security guard", "Gardener", "Caretaker"],
  tailoring:    ["Blouse stitching", "Alteration", "Salwar kameez", "Embroidery", "Machine operator"],
  other:        [],
};

const RATES = {
  "mason": [600, 900], "helper": [350, 500], "painter": [450, 700], "plumber": [500, 800],
  "welder": [600, 900], "tiles worker": [600, 850], "bar bender": [550, 800],
  "harvester": [300, 450], "farm helper": [280, 400], "tractor driver": [700, 1000],
  "house wiring": [600, 900], "ac technician": [700, 1100], "motor repair": [500, 800],
  "house cleaning": [300, 500], "deep cleaning": [400, 650], "truck driver": [800, 1200],
  "loader": [350, 500], "auto repair": [500, 800], "pump repair": [450, 700],
  "cook": [400, 700], "housekeeping": [300, 500], "security guard": [400, 700], "gardener": [300, 500],
};

function getRateInsight(skill, rate) {
  if (!skill || !rate) return null;
  const range = RATES[skill.toLowerCase()];
  if (!range) return null;
  const [lo, hi] = range;
  if (rate < lo) return { emoji: "⚠️", color: "#D97706", msg: `Market rate ₹${lo}–₹${hi}/day. Low pay may reduce responses.` };
  if (rate > hi) return { emoji: "🚀", color: "#16A34A", msg: `Above market (₹${lo}–₹${hi}/day). You'll attract workers fast!` };
  return { emoji: "✅", color: "#16A34A", msg: `Good rate! Market average ₹${lo}–₹${hi}/day.` };
}

function buildDescription(form) {
  const cat = CATEGORIES.find(c => c.v === form.category);
  const skill = form.skill || (cat?.label || "worker");
  const n = form.workers_needed || 1;
  const loc = form.village || (form.pincode ? `pincode ${form.pincode} area` : "nearby");
  const rate = form.daily_rate ? `₹${form.daily_rate}` : "competitive";
  return `Need ${n} experienced ${skill}${n > 1 ? "s" : ""} for ${cat?.label?.toLowerCase() || "work"} near ${loc}. Daily wage ${rate}/day.`;
}

const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/* ── Component ────────────────────────────────────────────────────────── */
export default function PostJobScreen({ navigation }) {
  const { user } = useAuth();
  const { pincode: pcVal, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: null, categoryLabel: null,
    skill: null, customSkill: "",
    workers_needed: 1,
    daily_rate: "",
    job_date: TOMORROW,
    pincode: "", village: "",
    description: "",
  });

  // Sync pincode hook → form
  useEffect(() => setForm(f => ({ ...f, pincode: pcVal })), [pcVal]);

  // Auto-fill village from pincode
  useEffect(() => {
    if (pinResult?.name) setForm(f => ({ ...f, village: pinResult.name }));
  }, [pinResult]);

  // Auto-build description
  useEffect(() => {
    setForm(f => ({ ...f, description: buildDescription(f) }));
  }, [form.category, form.skill, form.workers_needed, form.daily_rate, form.village, form.pincode]);

  const effectiveSkill = form.skill || form.customSkill;
  const rateInsight = getRateInsight(effectiveSkill, form.daily_rate ? Number(form.daily_rate) : null);
  const cat = CATEGORIES.find(c => c.v === form.category);

  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!(form.skill || form.customSkill.trim());
    if (step === 3) return form.workers_needed >= 1 && Number(form.daily_rate) >= 100 && form.job_date && form.pincode.length === 6;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      const hints = ["", "Pick a category", "Pick or type a skill", "Fill workers, rate, date and pincode", ""];
      Alert.alert(hints[step] || "Please fill required fields");
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setStep(s => Math.min(s + 1, 4));
  };

  const back = () => { scrollRef.current?.scrollTo({ y: 0, animated: true }); setStep(s => Math.max(s - 1, 1)); };

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/jobs", {
        title: `Need ${form.workers_needed} ${effectiveSkill} — ${form.categoryLabel}`,
        category: form.category,
        description: form.description,
        workers_needed: Number(form.workers_needed),
        daily_rate: Number(form.daily_rate),
        job_date: form.job_date,
        village: form.village,
        lat: pinResult?.lat || 22.97,
        lng: pinResult?.lng || 78.66,
        address: {
          village: form.village,
          post: pinResult?.name || "",
          block: pinResult?.block || "",
          district: pinResult?.district || "",
          state: pinResult?.state || "",
          pincode: form.pincode,
        },
        required_skills: [{ category: form.categoryLabel, skill: effectiveSkill }],
      });
      Alert.alert("🎉 Job posted!", "Workers nearby will be notified.", [
        { text: "OK", onPress: () => navigation.navigate("Tabs", { screen: "Workers" }) },
      ]);
    } catch (e) {
      Alert.alert("Failed", formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === "worker") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body, color: colors.textMuted }}>Only customers can post jobs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* ── Progress ────────────────────────────────────────────────── */}
        <View style={styles.progressRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={[styles.progressBar, step >= i && styles.progressBarDone]} />
          ))}
        </View>
        <Text style={styles.stepLabel}>
          Step {step} of 4 · {["Category", "Skill", "Details", "Review"][step - 1]}
        </Text>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ STEP 1: Category ══════════════════════════════════════════ */}
          {step === 1 && (
            <View>
              <Text style={styles.h1}>What type of work?</Text>
              <Text style={styles.sub}>Pick the category that best matches your need.</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <Pressable
                    key={cat.v}
                    style={[styles.catCard, { backgroundColor: cat.color }, form.category === cat.v && styles.catCardActive]}
                    onPress={() => { setForm(f => ({ ...f, category: cat.v, categoryLabel: cat.label, skill: null, customSkill: "" })); setTimeout(() => { scrollRef.current?.scrollTo({ y: 0 }); setStep(2); }, 180); }}
                  >
                    <Text style={styles.catEmoji}>{cat.icon}</Text>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                    {form.category === cat.v && (
                      <View style={styles.catCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.indigo} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* ══ STEP 2: Skill ════════════════════════════════════════════ */}
          {step === 2 && (
            <View>
              <View style={styles.catPill}>
                <Text style={styles.catPillText}>{cat?.icon} {form.categoryLabel}</Text>
              </View>
              <Text style={styles.h1}>Which skill?</Text>
              <Text style={styles.sub}>Pick the specific role you need.</Text>
              <View style={styles.chipGrid}>
                {(SKILLS[form.category] || []).map(sk => (
                  <Pressable
                    key={sk}
                    style={[styles.skillChip, form.skill === sk && styles.skillChipActive]}
                    onPress={() => setForm(f => ({ ...f, skill: sk, customSkill: "" }))}
                  >
                    <Text style={[styles.skillChipText, form.skill === sk && { color: "#fff" }]}>{sk}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.orDivider}>— or describe your own —</Text>
              <TextInput
                style={[styles.input, form.customSkill ? styles.inputFocus : null]}
                placeholder="e.g. RCC shuttering expert"
                placeholderTextColor={colors.textMuted}
                value={form.customSkill}
                onChangeText={v => setForm(f => ({ ...f, customSkill: v, skill: null }))}
              />
            </View>
          )}

          {/* ══ STEP 3: Details ══════════════════════════════════════════ */}
          {step === 3 && (
            <View>
              <View style={styles.catPill}>
                <Text style={styles.catPillText}>{cat?.icon} {effectiveSkill}</Text>
              </View>
              <Text style={styles.h1}>Job details</Text>
              <Text style={styles.sub}>Set the numbers — workers will see this.</Text>

              {/* Workers needed */}
              <Label text="Workers needed" />
              <View style={styles.counter}>
                <Pressable style={styles.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.max(1, f.workers_needed - 1) }))}>
                  <Ionicons name="remove" size={20} color={colors.indigo} />
                </Pressable>
                <Text style={styles.counterVal}>{form.workers_needed}</Text>
                <Pressable style={styles.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.min(20, f.workers_needed + 1) }))}>
                  <Ionicons name="add" size={20} color={colors.indigo} />
                </Pressable>
              </View>

              {/* Daily rate */}
              <Label text="Daily rate (₹)" />
              {RATES[effectiveSkill?.toLowerCase()] && (
                <View style={styles.rateHint}>
                  <Ionicons name="trending-up-outline" size={13} color={colors.indigo} />
                  <Text style={styles.rateHintText}>
                    Market rate: ₹{RATES[effectiveSkill.toLowerCase()][0]}–₹{RATES[effectiveSkill.toLowerCase()][1]}/day
                  </Text>
                </View>
              )}
              <TextInput
                style={[styles.input, styles.inputFocus]}
                placeholder="e.g. 500"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                value={String(form.daily_rate)}
                onChangeText={v => setForm(f => ({ ...f, daily_rate: v.replace(/\D/g, "") }))}
              />
              {rateInsight && (
                <View style={[styles.insightBox, { borderColor: rateInsight.color + "50" }]}>
                  <Text style={styles.insightText}>{rateInsight.emoji}  {rateInsight.msg}</Text>
                </View>
              )}

              {/* Date */}
              <Label text="Work date" />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                value={form.job_date}
                onChangeText={v => setForm(f => ({ ...f, job_date: v }))}
              />

              {/* Pincode */}
              <Label text="Pincode" />
              <View style={styles.pincodeRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pcVal}
                  onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                />
                {pinStatus === "loading" && <ActivityIndicator color={colors.indigo} style={{ marginLeft: 10 }} />}
                {pinStatus === "success" && <Ionicons name="checkmark-circle" size={22} color="#16A34A" style={{ marginLeft: 10 }} />}
              </View>
              {pinStatus === "success" && pinResult && (
                <View style={styles.pinSuccessBox}>
                  <Ionicons name="location" size={13} color="#15803d" />
                  <Text style={styles.pinSuccessText}>
                    {form.village} · {pinResult.district} · {pinResult.state}
                  </Text>
                </View>
              )}
              {pinStatus === "error" && pinError && (
                <Text style={styles.errorText}>{pinError}</Text>
              )}
            </View>
          )}

          {/* ══ STEP 4: Review ═══════════════════════════════════════════ */}
          {step === 4 && (
            <View>
              <Text style={styles.h1}>Review your job</Text>
              <Text style={styles.sub}>Looks good? Hit post and workers will be notified instantly.</Text>

              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewEmoji}>{cat?.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTitle}>
                      Need {form.workers_needed} {effectiveSkill}
                    </Text>
                    <Text style={styles.reviewCat}>{form.categoryLabel}</Text>
                  </View>
                </View>

                <View style={styles.reviewDivider} />

                {[
                  { icon: "people-outline",    val: `${form.workers_needed} worker${form.workers_needed > 1 ? "s" : ""} needed` },
                  { icon: "cash-outline",       val: `₹${form.daily_rate} per day` },
                  { icon: "calendar-outline",   val: form.job_date },
                  { icon: "location-outline",   val: `${form.village}${pinResult?.district ? `, ${pinResult.district}` : ""}` },
                ].map(r => (
                  <View key={r.icon} style={styles.reviewRow}>
                    <Ionicons name={r.icon} size={16} color={colors.indigo} />
                    <Text style={styles.reviewRowText}>{r.val}</Text>
                  </View>
                ))}

                <View style={styles.reviewDivider} />
                <Text style={styles.reviewDescLabel}>Auto-generated description</Text>
                <Text style={styles.reviewDesc}>{form.description}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Footer nav ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {step > 1 && (
            <Pressable style={styles.backBtn} onPress={back}>
              <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          )}
          {step < 4 ? (
            <Pressable style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]} onPress={next}>
              <Text style={styles.nextBtnText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable style={[styles.submitBtn, saving && { opacity: 0.7 }]} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Post Job</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Label({ text }) {
  return (
    <Text style={{
      fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4,
      textTransform: "uppercase", color: colors.textSecondary,
      marginBottom: 8, marginTop: 16,
    }}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  progressRow: { flexDirection: "row", gap: 5, paddingHorizontal: spacing.lg, paddingTop: 12 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  progressBarDone: { backgroundColor: colors.indigo },
  stepLabel: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, paddingHorizontal: spacing.lg, marginTop: 6, marginBottom: 2 },
  h1: { fontFamily: fonts.display, fontSize: 26, color: colors.text, marginBottom: 6 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  // Step 1
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catCard: { width: "47%", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 2, borderColor: "transparent", position: "relative" },
  catCardActive: { borderColor: colors.indigo },
  catEmoji: { fontSize: 32, marginBottom: 8 },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, textAlign: "center" },
  catCheck: { position: "absolute", top: 8, right: 8 },
  // Step 2
  catPill: { backgroundColor: colors.indigoTint, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  catPillText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.indigo },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  skillChipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  skillChipText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.textSecondary },
  orDivider: { textAlign: "center", fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginVertical: 16 },
  // Inputs
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.body, color: colors.text, marginBottom: 4 },
  inputFocus: { borderColor: colors.indigo },
  // Step 3
  counter: { flexDirection: "row", alignItems: "center", gap: 0, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, alignSelf: "flex-start", marginBottom: 4 },
  counterBtn: { padding: 14 },
  counterVal: { fontFamily: fonts.display, fontSize: 22, color: colors.text, paddingHorizontal: 20, minWidth: 60, textAlign: "center" },
  rateHint: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8 },
  rateHintText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.indigo },
  insightBox: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 6, backgroundColor: "#fafaf7" },
  insightText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  pincodeRow: { flexDirection: "row", alignItems: "center" },
  pinSuccessBox: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#f0fdf4", borderRadius: 8, padding: 10, marginTop: 6 },
  pinSuccessText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#15803d" },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginTop: 4 },
  // Step 4 - Review
  reviewCard: { backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  reviewEmoji: { fontSize: 40 },
  reviewTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  reviewCat: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.indigo, marginTop: 2 },
  reviewDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  reviewRowText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  reviewDescLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 8 },
  reviewDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  // Footer
  footer: { flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.lg, backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.border },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border },
  backText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.indigo, paddingVertical: 15, borderRadius: 14 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
  submitBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 15, borderRadius: 14 },
});
