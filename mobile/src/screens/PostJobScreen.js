import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable, Switch,
  Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import api, { formatApiError } from "../api";
import { track } from "../lib/analytics";
import AppScreen from "../components/AppScreen";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import ServiceCategoryCard from "../components/ServiceCategoryCard";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, spacing } from "../theme";

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
  if (rate < lo) return { tone: "warning", color: colors.warning, msg: `Market rate ₹${lo}–₹${hi}/day. Low pay may reduce responses.` };
  if (rate > hi) return { tone: "success", color: colors.success, msg: `Above market (₹${lo}–₹${hi}/day). You may attract workers faster.` };
  return { tone: "success", color: colors.success, msg: `Good rate. Market average ₹${lo}–₹${hi}/day.` };
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
const THIS_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

/* ── Component ────────────────────────────────────────────────────────── */
export default function PostJobScreen({ navigation }) {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { pincode: pcVal, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [form, setForm] = useState({
    category: null, categoryLabel: null,
    skill: null, customSkill: "",
    workers_needed: 1,
    daily_rate: "",
    job_date: TOMORROW,
    pincode: "", village: "",
    description: "",
    urgency: "normal",
    recurrence: "once",
    is_anonymous: false,
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

  // GPS → reverse geocode → auto-fill pincode + village via Nominatim (free, no API key)
  const useGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location access denied", "Please allow location in Settings, or type your pincode manually.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;

      // Reverse geocode using OpenStreetMap Nominatim — free, no API key needed
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en", "User-Agent": "KaamNow/1.0" } }
      );
      const data = await res.json();
      const pin = (data.address?.postcode || "").replace(/\s/g, "").slice(0, 6);
      const vil = data.address?.village || data.address?.suburb || data.address?.city_district || data.address?.city || "";

      if (pin.length === 6) {
        setPincode(pin);
        setForm(f => ({ ...f, pincode: pin, village: vil, lat: latitude, lng: longitude }));
      } else {
        // Store coords even if we couldn't get pincode
        setForm(f => ({ ...f, lat: latitude, lng: longitude }));
        Alert.alert("Location set", "Could not detect pincode automatically. Please type it.");
      }
    } catch {
      Alert.alert("Could not get location", "Check your internet and try again, or type your pincode.");
    } finally {
      setGpsLoading(false);
    }
  };

  // Voice recording — hold mic button → records from microphone → sends to Gemini via /ai/voice-to-job
  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("Microphone access denied", "Allow microphone in Settings."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch {
      Alert.alert("Could not start recording", "Check microphone permissions.");
    }
  };

  const stopRecordingAndProcess = async () => {
    if (!recording) return;
    setIsRecording(false);
    setAiLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);

      const formData = new FormData();
      formData.append("file", { uri, name: "voice.m4a", type: "audio/m4a" });
      const r = await api.post("/ai/voice-to-job", formData, { headers: { "Content-Type": "multipart/form-data" } });

      const fields = r.data?.job_fields || {};
      if (fields.category) {
        setForm(f => ({
          ...f,
          category: fields.category,
          categoryLabel: fields.category,
          skill: fields.skill || f.skill,
          daily_rate: fields.daily_rate ? String(fields.daily_rate) : f.daily_rate,
          description: fields.description || f.description,
          urgency: fields.urgency || f.urgency,
        }));
        if (step === 1) setStep(2); // advance past category
      }
      Alert.alert(
        "Heard you!",
        r.data?.transcript ? `"${r.data.transcript}"\n\nForm filled — check the details.` : "Form filled — review and continue."
      );
    } catch {
      Alert.alert("Voice failed", "Could not process audio. Please type manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const photoToJob = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Photo permission denied."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    setAiLoading(true);
    try {
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append("file", { uri, name: "job_photo.jpg", type: "image/jpeg" });
      const r = await api.post("/ai/photo-to-job", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const fields = r.data || {};
      if (fields.category) setForm(f => ({ ...f, category: fields.category, categoryLabel: fields.category, skill: fields.skill || f.skill, description: fields.description || f.description }));
      Alert.alert("Photo analyzed", "Review the auto-filled fields and continue.");
    } catch {
      Alert.alert("Photo analysis failed. Please fill the form manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    try {
      track("post_job", { category: form.category, urgency: form.urgency, recurrence: form.recurrence, ai_generated: form.ai_generated || false });
      await api.post("/jobs", {
        title: `Need ${form.workers_needed} ${effectiveSkill} — ${form.categoryLabel}`,
        category: form.category,
        description: form.description,
        workers_needed: Number(form.workers_needed),
        daily_rate: Number(form.daily_rate),
        job_date: form.job_date,
        village: form.village,
        lat: form.lat || pinResult?.lat || 22.97,
        lng: form.lng || pinResult?.lng || 78.66,
        urgency: form.urgency,
        recurrence: form.recurrence,
        is_anonymous: form.is_anonymous,
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
      Alert.alert("Job posted!", "Local Experts nearby will be notified.", [
        { text: "OK", onPress: () => navigation.navigate("Tabs", { screen: "FindWork" }) },
      ]);
    } catch (e) {
      Alert.alert("Failed", formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topArea}>
          <View style={styles.progressRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.progressBar, step >= i && styles.progressBarDone]} />
            ))}
          </View>
          <View style={styles.stepPill}>
            <Text style={styles.stepPillText}>Step {step} of 4</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ══ STEP 1: Category ══════════════════════════════════════════ */}
          {step === 1 && (
            <View>
              <Text style={styles.h1}>What work do you need?</Text>
              <Text style={styles.sub}>Pick a category, or use AI to fill the form</Text>

              {/* ── AI quick-fill buttons ── */}
              <View style={styles.aiRow}>
                {/* Hold to record voice → Gemini fills form */}
                <TouchableOpacity
                  style={[styles.aiBtn, isRecording && styles.aiBtnRecording]}
                  onPressIn={startRecording}
                  onPressOut={stopRecordingAndProcess}
                  disabled={aiLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isRecording ? "mic" : "mic-outline"} size={16} color={isRecording ? "#fff" : colors.indigo} />
                  <Text style={[styles.aiBtnText, isRecording && { color: "#fff" }]}>
                    {isRecording ? "Release to send" : "Hold to speak"}
                  </Text>
                </TouchableOpacity>
                {/* Photo → Gemini fills form */}
                <TouchableOpacity style={styles.aiBtn} onPress={photoToJob} disabled={aiLoading || isRecording}>
                  <Ionicons name="camera-outline" size={16} color={colors.indigo} />
                  <Text style={styles.aiBtnText}>Photo</Text>
                </TouchableOpacity>
                {aiLoading && <ActivityIndicator color={colors.saffron} style={{ marginLeft: 8 }} />}
              </View>

              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <View key={cat.v} style={styles.catGridItem}>
                    <ServiceCategoryCard
                      size="grid"
                      label={cat.label}
                      icon={cat.icon}
                      color={cat.color}
                      selected={form.category === cat.v}
                      onPress={() => { setForm(f => ({ ...f, category: cat.v, categoryLabel: cat.label, skill: null, customSkill: "" })); setTimeout(() => { scrollRef.current?.scrollTo({ y: 0 }); setStep(2); }, 180); }}
                    />
                  </View>
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
              <Text style={styles.h1}>{lang === "hi" ? "Kaunsi skill chahiye?" : "Kaunsi skill chahiye?"}</Text>
              <Text style={styles.sub}>{lang === "hi" ? "Specific kaam chunein" : "Pick the specific role you need."}</Text>
              <View style={styles.chipGrid}>
                {(SKILLS[form.category] || []).map(sk => (
                  <Pressable
                    key={sk}
                    style={[styles.skillChip, form.skill === sk && styles.skillChipActive]}
                    onPress={() => setForm(f => ({ ...f, skill: sk, customSkill: "" }))}
                  >
                    {form.skill === sk ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
                    <Text style={[styles.skillChipText, form.skill === sk && { color: "#fff" }]}>{sk}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.separatorRow}>
                <View style={styles.separatorLine} />
                <Text style={styles.separatorText}>Ya apni zaroorat likho</Text>
                <View style={styles.separatorLine} />
              </View>
              <InputField
                label="Custom skill"
                placeholder="e.g. RCC shuttering expert"
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
              <Text style={styles.h1}>{lang === "hi" ? "Kaam ki jankari" : "Kaam ki jankari"}</Text>
              <Text style={styles.sub}>{lang === "hi" ? "Workers yahi details dekhenge" : "Workers will see these details."}</Text>

              <Label text="Workers needed" />
              <View style={styles.counter}>
                <Pressable style={styles.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.max(1, f.workers_needed - 1) }))}>
                  <Ionicons name="remove" size={20} color={colors.primary} />
                </Pressable>
                <Text style={styles.counterVal}>{form.workers_needed}</Text>
                <Pressable style={styles.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.min(20, f.workers_needed + 1) }))}>
                  <Ionicons name="add" size={20} color={colors.primary} />
                </Pressable>
              </View>

              {RATES[effectiveSkill?.toLowerCase()] && (
                <View style={styles.rateHint}>
                  <Ionicons name="trending-up-outline" size={14} color={colors.primary} />
                  <Text style={styles.rateHintText}>
                    Market rate: ₹{RATES[effectiveSkill.toLowerCase()][0]}–₹{RATES[effectiveSkill.toLowerCase()][1]}/day
                  </Text>
                </View>
              )}

              <InputField
                label="Daily rate (₹)"
                placeholder="e.g. 500"
                keyboardType="number-pad"
                value={String(form.daily_rate)}
                onChangeText={v => setForm(f => ({ ...f, daily_rate: v.replace(/\D/g, "") }))}
                helperText="Yeh customers aur workers dono dekhenge"
              />
              {rateInsight && (
                <View style={[styles.insightBox, { borderColor: rateInsight.color + "50", backgroundColor: rateInsight.tone === "warning" ? colors.warningLight : colors.successLight }]}>
                  <Ionicons name={rateInsight.tone === "warning" ? "alert-circle-outline" : "checkmark-circle-outline"} size={16} color={rateInsight.color} />
                  <Text style={[styles.insightText, { color: rateInsight.color }]}>{rateInsight.msg}</Text>
                </View>
              )}

              <Label text="Kaam kab chahiye?" />
              <View style={styles.dateChipRow}>
                {[
                  { label: "Kal", value: TOMORROW },
                  { label: "Is hafte", value: THIS_WEEK },
                  { label: "Manual date", value: null },
                ].map(option => (
                  <Pressable
                    key={option.label}
                    style={[styles.dateChip, option.value && form.job_date === option.value && styles.dateChipActive]}
                    onPress={() => option.value ? setForm(f => ({ ...f, job_date: option.value })) : null}
                  >
                    <Text style={[styles.dateChipText, option.value && form.job_date === option.value && styles.dateChipTextActive]}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
              <InputField
                placeholder="YYYY-MM-DD"
                value={form.job_date}
                onChangeText={v => setForm(f => ({ ...f, job_date: v }))}
                helperText="Format: YYYY-MM-DD"
                leftIcon={<Ionicons name="calendar-outline" size={17} color={colors.textMuted} />}
              />

              {/* ── Urgency ── */}
              <Label text="How urgent?" />
              <View style={styles.chipRow}>
                {[{ v:"normal", label:"Normal" }, { v:"urgent", label:"Urgent" }, { v:"asap", label:"Need Today" }].map(u => (
                  <Pressable key={u.v} style={[styles.optChip, form.urgency === u.v && styles.optChipActive]} onPress={() => setForm(f => ({ ...f, urgency: u.v }))}>
                    <Text style={[styles.optChipText, form.urgency === u.v && styles.optChipTextActive]}>{u.label}</Text>
                  </Pressable>
                ))}
              </View>

              {/* ── Recurrence ── */}
              <Label text="How often?" />
              <View style={styles.chipRow}>
                {[{ v:"once", label:"One Time" }, { v:"weekly", label:"Every Week" }, { v:"monthly", label:"Every Month" }].map(r => (
                  <Pressable key={r.v} style={[styles.optChip, form.recurrence === r.v && styles.optChipActive]} onPress={() => setForm(f => ({ ...f, recurrence: r.v }))}>
                    <Text style={[styles.optChipText, form.recurrence === r.v && styles.optChipTextActive]}>{r.label}</Text>
                  </Pressable>
                ))}
              </View>

              <InputField
                label="Pincode"
                placeholder="6-digit pincode"
                keyboardType="number-pad"
                maxLength={6}
                value={pcVal}
                onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                leftIcon={<Ionicons name="location-outline" size={17} color={colors.textMuted} />}
                rightElement={pinStatus === "loading"
                  ? <ActivityIndicator color={colors.primary} size="small" />
                  : pinStatus === "success"
                    ? <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    : null}
                successText={pinStatus === "success" && pinResult ? `${form.village} · ${pinResult.district} · ${pinResult.state}` : undefined}
                errorText={pinStatus === "error" ? pinError : undefined}
              />

              {/* ── GPS button ── */}
              <TouchableOpacity style={styles.gpsBtn} onPress={useGPS} disabled={gpsLoading}>
                {gpsLoading
                  ? <ActivityIndicator size="small" color={colors.indigo} />
                  : <Ionicons name="locate-outline" size={16} color={colors.indigo} />
                }
                <Text style={styles.gpsBtnText}>Use my location</Text>
              </TouchableOpacity>

              {/* ── Anonymous ── */}
              <View style={styles.anonRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.anonLabel}>Post anonymously</Text>
                  <Text style={styles.anonSub}>Your name won't be shown until you accept</Text>
                </View>
                <Switch
                  value={form.is_anonymous}
                  onValueChange={v => setForm(f => ({ ...f, is_anonymous: v }))}
                  trackColor={{ false: colors.border, true: colors.success }}
                />
              </View>
            </View>
          )}

          {/* ══ STEP 4: Review ═══════════════════════════════════════════ */}
          {step === 4 && (
            <View>
              <Text style={styles.h1}>{lang === "hi" ? "Janchein aur Post karein" : "Janchein aur Post karein"}</Text>
              <Text style={styles.sub}>{lang === "hi" ? "Post karne ke baad workers is job ko dekh paayenge." : "Post karne ke baad workers is job ko dekh paayenge."}</Text>

              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewIcon}>
                    <Text style={styles.reviewEmoji}>{cat?.icon}</Text>
                  </View>
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
                    <Ionicons name={r.icon} size={16} color={colors.primary} />
                    <Text style={styles.reviewRowText}>{r.val}</Text>
                  </View>
                ))}

                <View style={styles.reviewDivider} />
                <Text style={styles.reviewDescLabel}>Job description</Text>
                <Text style={styles.reviewDesc}>{form.description}</Text>
              </View>
              <View style={styles.reviewHelper}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.reviewHelperText}>Post karne ke baad workers is job ko dekh paayenge.</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Footer nav ──────────────────────────────────────────────── */}
        <View style={styles.footer}>
          {step > 1 && (
            <SecondaryButton
              title="Back"
              fullWidth={false}
              onPress={back}
              icon={<Ionicons name="arrow-back" size={17} color={colors.text} />}
              style={styles.backButton}
            />
          )}
          {step < 4 ? (
            <PrimaryButton
              title="Continue"
              fullWidth={false}
              disabled={!canNext()}
              onPress={next}
              icon={<Ionicons name="arrow-forward" size={17} color="#fff" />}
              style={styles.footerPrimary}
            />
          ) : (
            <PrimaryButton
              title="Post Job"
              fullWidth={false}
              loading={saving}
              onPress={submit}
              icon={<Ionicons name="paper-plane-outline" size={17} color="#fff" />}
              style={styles.footerPrimary}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

function Label({ text }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  centerStateText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  topArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 6,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
  },
  progressBar: {
    flex: 1,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  progressBarDone: { backgroundColor: colors.primary },
  stepPill: {
    alignSelf: "flex-start",
    marginTop: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  h1: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 16,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  catGridItem: {
    width: "48%",
  },
  catPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },
  catPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  skillChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  skillChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  skillChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
  },
  separatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 18,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  separatorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  counter: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignSelf: "flex-start",
    marginBottom: 8,
    overflow: "hidden",
  },
  counterBtn: {
    minWidth: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  counterVal: {
    fontFamily: fonts.display,
    fontSize: 23,
    color: colors.text,
    paddingHorizontal: 22,
    minWidth: 68,
    textAlign: "center",
  },
  rateHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: 10,
  },
  rateHintText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.primary,
  },
  insightBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  insightText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    lineHeight: 18,
  },
  dateChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  dateChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  dateChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dateChipTextActive: {
    color: colors.primary,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    ...shadow.sm,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  reviewIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewEmoji: { fontSize: 30 },
  reviewTitle: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: colors.text,
  },
  reviewCat: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.primary,
    marginTop: 2,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 11,
  },
  reviewRowText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.text,
  },
  reviewDescLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  reviewDesc: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  reviewHelper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: "#CCFBF1",
    padding: 12,
  },
  reviewHelperText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.primary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.lg,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backButton: {
    minWidth: 112,
  },
  footerPrimary: {
    flex: 1,
  },

  // ── AI quick-fill ──────────────────────────────────────────────────────
  aiRow:     { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  aiBtn:          { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.indigo, backgroundColor: "#f0f4ff" },
  aiBtnRecording: { backgroundColor: colors.danger, borderColor: colors.danger },
  aiBtnText:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.indigo },

  // ── Urgency / Recurrence chips ─────────────────────────────────────────
  chipRow:        { flexDirection: "row", gap: spacing.xs, marginBottom: spacing.md, flexWrap: "wrap" },
  optChip:        { paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  optChipActive:  { backgroundColor: colors.indigo, borderColor: colors.indigo },
  optChipText:    { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  optChipTextActive: { color: "#fff", fontFamily: fonts.bodyBold },

  // ── GPS button ────────────────────────────────────────────────────────
  gpsBtn:     { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: spacing.sm, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.indigo, backgroundColor: "#f0f4ff", marginBottom: spacing.md },
  gpsBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.indigo },

  // ── Anonymous toggle ──────────────────────────────────────────────────
  anonRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  anonLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  anonSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
});
