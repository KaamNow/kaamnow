import { useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, StyleSheet, ScrollView, Pressable, Switch,
  Alert, KeyboardAvoidingView, Platform,
  ActivityIndicator, TouchableOpacity, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import api, { formatApiError } from "../api";
import { track } from "../lib/analytics";
import AppScreen from "../components/AppScreen";
import InputField from "../components/InputField";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth }     from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, shadow, spacing } from "../theme";

/* ── Data ─────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  {
    v: "construction", icon: "🏗️", label: "Construction", color: "#FEF3C7",
    image: "https://lh3.googleusercontent.com/aida/ADBb0uijJcOKpViZw94lNeoaesnzMM6OnIbDvEVnz2Oyfl7m2660IKjIq1-TCS9KkEKkOi2Ebh_MHyvbX_a9XX_g9smFkSPGx8iON5EMOAzNQ8JJE0WYyCwONVyrtRehRApB8SY_JkekdNUGemVNtadOPwYCzcImqpgNUbqxWqBTUW4Ptfbc1ijp58VsSEDTO8OE3SP8u8L0WISBe4VJT5O2VOTMRJM6q1rgD7nT7guq_IQUFEIPpG-huVB_nM0",
  },
  {
    v: "farm", icon: "🌾", label: "Agriculture", color: "#D1FAE5",
    image: "https://lh3.googleusercontent.com/aida/ADBb0ujcGO8Yr9Ke1W_DZNOaNNv-KSca3rIoZZq3G_j1eqpujVUGgAzJL6GEkalHZQJPjTKXSdrTK8rb5Wyz5HUg8wSy2_Rxpu0sIjrZScADQ6_an3nEHF6faaC6CPQanhiItXK-6kcX_KQZ2KbccgBwO5qefXtF_ZuCBtvFGzGRdjbx_NnfY8_ZJK_oreAJVzecjnXB_-pPEx2_dIkGvjukUWCM0xBVIyojcOQb5dPO8FatgOg7wzTnnCd1Gqk",
  },
  {
    v: "electrical", icon: "⚡", label: "Electrical", color: "#FDE8FF",
    image: "https://lh3.googleusercontent.com/aida/ADBb0uia9109NbLab5nlGuUIK6031TrjhjArGhnnL_37umiyTPp_UqRviTAZuhV4CTwk9SAY73r_A02IxchTORkZpaz-Jm4uuAObOuu2jGdjyIrrGtDgr9vtxhNRsdbaSHph-wFiPWEwBFbBJlSuz79A_RtmTkuwZEh9WZ1FiXrhQ0ZJUzi2NULk9aQUIfKhiX4P5j_DgrKYp2lkPiYWukaD6QWQ_H3OKAhkk8RHMYJziA6Oqut60X5dInjFJAU",
  },
  {
    v: "cleaning", icon: "✨", label: "Cleaning", color: "#E0F2FE",
    image: "https://lh3.googleusercontent.com/aida/ADBb0ui-PwC-iBi81It8DxtKcaNuTll5gdZHeIt_4EhcGOkydYV6YEdgNumwBU8TDJNhnhFWOw-jP3zWF8L7Yk3MLwN8nrDS8APnr_a5mkKQWl5t0hE3XbB1Zh0ofPNSGHHmfIgX3xg5DKeItU_FWSiSlrtaaTQ5gbdmAtxqk91J6Yzced1HwufuFHLY-HjipmtwUiem-KRqrMw54Qyids6wcDzZrhq3868NALS8GNLO1kLrHy1gHblk47_UjjM",
  },
  {
    v: "transport", icon: "🚛", label: "Transport", color: "#FFF7ED",
    image: "https://lh3.googleusercontent.com/aida/ADBb0ugiHLhmLRKn0_akmcLIVORwSAjXb8bKumcKophmC2WsGkmc0F4kwDlPtSHCzp2wy-F4u2rnCnbVZ2HAFo7R6iiNErXscSvEewmLbvnTPqQIDULh3n2Q9XhtdvUQawP4vETnJnOdonYMGHrS36K5ed2FjjD58N6kiJ0Lg6yMryiffHjrDHrklfNI6zWZPzoWKVVf8vaQiIgAj0N8MJXvEbVAaD_VmGeoQoXuM_9FWNWPo5cKWbXw60u8TD4",
  },
  {
    v: "mechanical", icon: "🔧", label: "Mechanical", color: "#EEF2FF",
    image: "https://lh3.googleusercontent.com/aida/ADBb0uhB8I05nE-hKWlcxywRMQG6CFB0dADbQKGf6sEI2yRKsm6uuVPPc0Hkv_P36UDAFTVDyUhc8PDrh7nG0ZsDN6hGos9FNyJewAtyRE8wvdBd7vTmAZDj3OkYIrXE85G9a1CAs9ubBzSzcx9a-LCWzDT0mLc8Qzw29KxXrATzlYQC1pyXIQIlr1njVBRAWjwItNibZGK7pHGA2Dc_DfwA0wDnvdW_cjLNFGtjK8hwCw6rzBbTdfDKKJNQz-I",
  },
  {
    v: "home", icon: "🏠", label: "Home Services", color: "#FFF1F2",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&q=80",
  },
  {
    v: "tailoring", icon: "✂️", label: "Tailoring", color: "#F0FDF4",
    image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=400&h=400&fit=crop&q=80",
  },
  {
    v: "other", icon: "📦", label: "Other", color: "#F9FAFB",
    image: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=400&fit=crop&q=80",
  },
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
  if (rate < lo) return { tone: "warning", color: "#D97706", msg: `Market rate ₹${lo}–₹${hi}/day. Low pay may reduce responses.` };
  if (rate > hi) return { tone: "success", color: "#059669", msg: `Above market (₹${lo}–₹${hi}/day). You'll attract experts faster.` };
  return { tone: "good", color: "#059669", msg: `Great rate. Market average ₹${lo}–₹${hi}/day.` };
}

function buildDescription(form) {
  const cat = CATEGORIES.find(c => c.v === form.category);
  const skill = form.skill || (cat?.label || "Local Expert");
  const n = form.workers_needed || 1;
  const loc = form.village || (form.pincode ? `pincode ${form.pincode} area` : "nearby");
  const rate = form.daily_rate ? `₹${form.daily_rate}` : "competitive";
  return `Need ${n} experienced ${skill}${n > 1 ? "s" : ""} for ${cat?.label?.toLowerCase() || "work"} near ${loc}. Daily wage ${rate}/day.`;
}

const TOMORROW  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const THIS_WEEK = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const STEP_LABELS = ["", "CONTINUE TO DETAILS", "CONTINUE", "REVIEW JOB", "POST JOB"];

/* ── Component ────────────────────────────────────────────────────────── */
export default function PostJobScreen({ navigation }) {
  const { user }  = useAuth();
  const { lang }  = useLanguage();
  const { pincode: pcVal, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();
  const savedAddresses = user?.saved_addresses || [];
  const scrollRef = useRef(null);

  const [step, setStep]             = useState(1);
  const [saving, setSaving]         = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [jobPhotoUri, setJobPhotoUri] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [recording, setRecording]   = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showDatePicker,    setShowDatePicker]    = useState(false);
  const [pickerDate,        setPickerDate]        = useState(new Date(Date.now() + 86400000));
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [manualPinMode,     setManualPinMode]     = useState(false);
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

  useEffect(() => setForm(f => ({ ...f, pincode: pcVal })), [pcVal]);
  useEffect(() => { if (pinResult?.name) setForm(f => ({ ...f, village: pinResult.name })); }, [pinResult]);
  useEffect(() => { setForm(f => ({ ...f, description: buildDescription(f) })); }, [form.category, form.skill, form.workers_needed, form.daily_rate, form.village, form.pincode]);

  // Pre-fill location from default saved address when user reaches step 3
  useEffect(() => {
    if (step !== 3 || selectedAddressId) return;
    const def = savedAddresses.find(a => a.is_default) || savedAddresses[0];
    if (!def) return;
    applyAddress(def);
  }, [step]);

  const effectiveSkill = form.skill || form.customSkill;
  const rateInsight    = getRateInsight(effectiveSkill, form.daily_rate ? Number(form.daily_rate) : null);
  const cat            = CATEGORIES.find(c => c.v === form.category);
  const marketRange    = effectiveSkill ? RATES[effectiveSkill.toLowerCase()] : null;

  const applyAddress = (addr) => {
    const pin = addr.address?.pincode || "";
    const vil = addr.address?.village || "";
    setSelectedAddressId(addr.id);
    if (pin.length === 6) setPincode(pin);
    setForm(f => ({
      ...f,
      pincode: pin,
      village: vil,
      lat: addr.lat ?? f.lat,
      lng: addr.lng ?? f.lng,
    }));
  };

  const canNext = () => {
    if (step === 1) return !!form.category;
    if (step === 2) return !!(form.skill || form.customSkill.trim());
    if (step === 3) return form.workers_needed >= 1 && Number(form.daily_rate) >= 100 && form.job_date && form.pincode.length === 6;
    return true;
  };

  const next = () => {
    if (!canNext()) {
      const hints = ["", "Pick a category", "Pick or type a skill", "Fill team size, rate, date and pincode", ""];
      Alert.alert(hints[step] || "Please fill required fields");
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setStep(s => Math.min(s + 1, 4));
  };

  const back = () => {
    if (step === 1) { navigation.goBack(); return; }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setStep(s => Math.max(s - 1, 1));
  };

  const useGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { Alert.alert("Location access denied", "Allow location in Settings, or type your pincode manually."); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
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
        setForm(f => ({ ...f, lat: latitude, lng: longitude }));
        Alert.alert("Location set", "Could not detect pincode automatically. Please type it.");
      }
    } catch {
      Alert.alert("Could not get location", "Check your internet and try again.");
    } finally {
      setGpsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("Microphone access denied", "Allow microphone in Settings."); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch { Alert.alert("Could not start recording", "Check microphone permissions."); }
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
      const fd = new FormData();
      fd.append("file", { uri, name: "voice.m4a", type: "audio/m4a" });
      const r = await api.post("/ai/voice-to-job", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fields = r.data?.job_fields || {};
      if (fields.category) {
        setForm(f => ({ ...f, category: fields.category, categoryLabel: fields.category, skill: fields.skill || f.skill, daily_rate: fields.daily_rate ? String(fields.daily_rate) : f.daily_rate, description: fields.description || f.description, urgency: fields.urgency || f.urgency }));
        if (step === 1) setStep(2);
      }
      Alert.alert("Heard you!", r.data?.transcript ? `"${r.data.transcript}"\n\nForm filled — check the details.` : "Form filled — review and continue.");
    } catch { Alert.alert("Voice failed", "Could not process audio. Please type manually."); }
    finally { setAiLoading(false); }
  };

  const photoToJob = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Photo permission denied."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setJobPhotoUri(uri);
    setAiLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", { uri, name: "job_photo.jpg", type: "image/jpeg" });
      const r = await api.post("/ai/photo-to-job", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const fields = r.data || {};
      if (fields.category) {
        setForm(f => ({ ...f, category: fields.category, categoryLabel: fields.category, skill: fields.skill || f.skill, description: fields.description || f.description }));
        if (step === 1) setStep(2);
      } else {
        Alert.alert("Couldn't detect category", "Please select a category below.");
      }
    } catch { Alert.alert("Photo analysis failed. Please fill the form manually."); }
    finally { setAiLoading(false); }
  };

  const [posted, setPosted] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      track("post_job", { category: form.category, urgency: form.urgency, recurrence: form.recurrence });
      await api.post("/jobs", {
        title: `Need ${form.workers_needed} ${effectiveSkill} — ${form.categoryLabel}`,
        category: form.category, description: form.description,
        workers_needed: Number(form.workers_needed), daily_rate: Number(form.daily_rate),
        job_date: form.job_date, village: form.village,
        lat: form.lat || pinResult?.lat || 22.97, lng: form.lng || pinResult?.lng || 78.66,
        urgency: form.urgency, recurrence: form.recurrence, is_anonymous: form.is_anonymous,
        address: { village: form.village, post: pinResult?.name || "", block: pinResult?.block || "", district: pinResult?.district || "", state: pinResult?.state || "", pincode: form.pincode },
        required_skills: [{ category: form.categoryLabel, skill: effectiveSkill }],
      });
      setPosted(true);
    } catch (e) { Alert.alert("Failed", formatApiError(e)); }
    finally { setSaving(false); }
  };

  if (posted) {
    return (
      <AppScreen edges={["top", "bottom"]} style={[S.safe, { justifyContent: "center", alignItems: "center", padding: 32 }]}>
        <View style={S.successCircle}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </View>
        <Text style={S.successTitle}>Job Posted!</Text>
        <Text style={S.successSub}>
          Nearby Local Experts have been notified. You'll hear back soon in your Activity tab.
        </Text>
        <View style={S.successSteps}>
          {[
            { icon: "notifications-outline", text: "Experts near you are being alerted" },
            { icon: "chatbubble-outline",    text: "They'll message you to confirm" },
            { icon: "checkmark-circle-outline", text: "You accept who to hire" },
          ].map((step, i) => (
            <View key={i} style={S.successStep}>
              <Ionicons name={step.icon} size={20} color="#16a34a" />
              <Text style={S.successStepText}>{step.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={S.successBtn} onPress={() => navigation.navigate("Activity")}>
          <Text style={S.successBtnText}>View My Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.successBtnSecondary} onPress={() => navigation.navigate("Tabs", { screen: "Home" })}>
          <Text style={S.successBtnSecondaryText}>Back to Home</Text>
        </TouchableOpacity>
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={["top"]} style={S.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>

        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={back} style={S.headerBackBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>Post a Job</Text>
        </View>

        {/* Progress */}
        <View style={S.progressArea}>
          <View style={S.progressTextRow}>
            <Text style={S.progressStepText}>STEP 0{step} / 04</Text>
            <Text style={S.progressPctText}>{step * 25}% COMPLETE</Text>
          </View>
          <View style={S.progressTrack}>
            <View style={[S.progressFill, { width: `${step * 25}%` }]} />
          </View>
        </View>

        <ScrollView ref={scrollRef} contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ══ STEP 1: Category ══════════════════════════════════════════ */}
          {step === 1 && (
            <View>
              <Text style={[S.h1, { textAlign: "center" }]}>{"What kind of\nexpertise\ndo you require?"}</Text>
              <Text style={[S.sub, { textAlign: "center" }]}>Select a category below or use our smart input tools to help us categorize your project automatically.</Text>

              <View style={S.aiRow}>
                <TouchableOpacity style={[S.aiBtn, isRecording && S.aiBtnRec]} onPressIn={startRecording} onPressOut={stopRecordingAndProcess} disabled={aiLoading} activeOpacity={0.85}>
                  <Ionicons name={isRecording ? "mic" : "mic-outline"} size={18} color={isRecording ? "#fff" : colors.primary} />
                  <Text style={[S.aiBtnText, isRecording && { color: "#fff" }]}>{isRecording ? "RELEASE TO SEND" : "VOICE DESCRIBE"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.aiBtn} onPress={photoToJob} disabled={aiLoading || isRecording} activeOpacity={0.85}>
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={S.aiBtnText}>UPLOAD PHOTO</Text>
                </TouchableOpacity>
                {aiLoading && <ActivityIndicator color={colors.primary} />}
              </View>

              {jobPhotoUri ? (
                <View style={S.photoPreviewRow}>
                  <Image source={{ uri: jobPhotoUri }} style={S.photoPreview} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={S.photoPreviewLabel}>Photo uploaded</Text>
                    <Text style={S.photoPreviewSub}>AI is analyzing the job site</Text>
                  </View>
                  <TouchableOpacity onPress={() => setJobPhotoUri(null)}>
                    <Ionicons name="close-circle" size={22} color={colors.outline} />
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={S.catGrid}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity key={c.v} activeOpacity={0.85} style={[S.catCard, form.category === c.v && S.catCardActive]} onPress={() => setForm(f => ({ ...f, category: c.v, categoryLabel: c.label, skill: null, customSkill: "" }))}>
                    <Image source={{ uri: c.image }} style={S.catImage} resizeMode="contain" />
                    <Text style={[S.catLabel, form.category === c.v && S.catLabelActive]}>{c.label.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ══ STEP 2: Skill ════════════════════════════════════════════ */}
          {step === 2 && (
            <View>
              {/* Category context banner */}
              <View style={[S.contextBanner, { backgroundColor: cat?.color || "#f0f0f5" }]}>
                <Image source={{ uri: cat?.image }} style={S.contextImage} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={S.contextTag}>SELECTED CATEGORY</Text>
                  <Text style={S.contextTitle}>{cat?.label}</Text>
                </View>
                <TouchableOpacity onPress={() => setStep(1)} style={S.contextChange}>
                  <Text style={S.contextChangeText}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={S.h1}>{"Which skill\ndo you need?"}</Text>
              <Text style={S.sub}>Pick the specific role, or describe your own below.</Text>

              <View style={S.skillGrid}>
                {(SKILLS[form.category] || []).map(sk => (
                  <TouchableOpacity
                    key={sk}
                    activeOpacity={0.85}
                    style={[S.skillCard, form.skill === sk && S.skillCardActive]}
                    onPress={() => setForm(f => ({ ...f, skill: sk, customSkill: "" }))}
                  >
                    {form.skill === sk && (
                      <View style={S.skillCheck}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                      </View>
                    )}
                    <Text style={[S.skillCardText, form.skill === sk && S.skillCardTextActive]}>{sk}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={S.dividerRow}>
                <View style={S.dividerLine} />
                <Text style={S.dividerText}>OR DESCRIBE YOUR OWN</Text>
                <View style={S.dividerLine} />
              </View>

              <View style={S.sectionCard}>
                <Text style={S.sectionLabel}>CUSTOM SKILL</Text>
                <InputField
                  placeholder="e.g. RCC shuttering expert, plumber for bathrooms…"
                  value={form.customSkill}
                  onChangeText={v => setForm(f => ({ ...f, customSkill: v, skill: null }))}
                />
              </View>
            </View>
          )}

          {/* ══ STEP 3: Details ══════════════════════════════════════════ */}
          {step === 3 && (
            <View>
              {/* Context banner */}
              <View style={[S.contextBanner, { backgroundColor: cat?.color || "#f0f0f5" }]}>
                <Image source={{ uri: cat?.image }} style={S.contextImage} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={S.contextTag}>YOUR SELECTION</Text>
                  <Text style={S.contextTitle}>{effectiveSkill || cat?.label}</Text>
                  <Text style={S.contextSub}>{cat?.label}</Text>
                </View>
              </View>

              <Text style={S.h1}>{"Job details"}</Text>
              <Text style={S.sub}>These details are shown to Local Experts nearby.</Text>

              {/* Team size */}
              <View style={S.sectionCard}>
                <Text style={S.sectionLabel}>TEAM SIZE</Text>
                <Text style={S.sectionHint}>How many workers do you need?</Text>
                <View style={S.counter}>
                  <TouchableOpacity style={S.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.max(1, f.workers_needed - 1) }))}>
                    <Ionicons name="remove" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={S.counterVal}>{form.workers_needed}</Text>
                    <Text style={S.counterUnit}>Local Expert{form.workers_needed > 1 ? "s" : ""}</Text>
                  </View>
                  <TouchableOpacity style={S.counterBtn} onPress={() => setForm(f => ({ ...f, workers_needed: Math.min(20, f.workers_needed + 1) }))}>
                    <Ionicons name="add" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Daily rate */}
              <View style={S.sectionCard}>
                <View style={S.sectionLabelRow}>
                  <Text style={S.sectionLabel}>DAILY RATE</Text>
                  <View style={S.requiredBadge}><Text style={S.requiredText}>REQUIRED</Text></View>
                </View>
                {marketRange && (
                  <View style={S.marketBadge}>
                    <Ionicons name="trending-up-outline" size={13} color="#059669" />
                    <Text style={S.marketBadgeText}>Market: ₹{marketRange[0]}–₹{marketRange[1]}/day</Text>
                  </View>
                )}
                <View style={S.rateInputRow}>
                  <View style={S.ratePrefix}>
                    <Text style={S.ratePrefixText}>₹</Text>
                  </View>
                  <InputField
                    placeholder="500"
                    keyboardType="number-pad"
                    value={String(form.daily_rate)}
                    onChangeText={v => setForm(f => ({ ...f, daily_rate: v.replace(/\D/g, "") }))}
                    style={{ flex: 1 }}
                  />
                </View>
                {rateInsight && (
                  <View style={[S.insightBanner, { backgroundColor: rateInsight.tone === "warning" ? "#FFFBEB" : "#ECFDF5", borderColor: rateInsight.color + "40" }]}>
                    <Ionicons name={rateInsight.tone === "warning" ? "alert-circle-outline" : "checkmark-circle-outline"} size={16} color={rateInsight.color} />
                    <Text style={[S.insightText, { color: rateInsight.color }]}>{rateInsight.msg}</Text>
                  </View>
                )}
              </View>

              {/* Schedule */}
              {(() => {
                const isCustom = form.job_date !== TOMORROW && form.job_date !== THIS_WEEK;
                const displayDate = isCustom && form.job_date
                  ? new Date(form.job_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  : "Pick a date";

                const onDateChange = (event, selected) => {
                  if (Platform.OS === "android") setShowDatePicker(false);
                  if (selected) {
                    setPickerDate(selected);
                    setForm(f => ({ ...f, job_date: selected.toISOString().slice(0, 10) }));
                  }
                };

                return (
                  <View style={S.sectionCard}>
                    <Text style={S.sectionLabel}>WHEN DO YOU NEED THEM?</Text>
                    <View style={S.optionRow}>
                      {[
                        { label: "Tomorrow",  sub: TOMORROW.slice(5),  value: TOMORROW  },
                        { label: "This week", sub: "Next 7 days",       value: THIS_WEEK },
                        { label: "Custom",    sub: isCustom && form.job_date ? form.job_date.slice(5) : "Pick a date", value: "custom" },
                      ].map(o => {
                        const active = o.value === "custom" ? isCustom : form.job_date === o.value;
                        return (
                          <TouchableOpacity
                            key={o.label} activeOpacity={0.85}
                            style={[S.optionCard, active && S.optionCardActive]}
                            onPress={() => {
                              if (o.value === "custom") {
                                setShowDatePicker(true);
                                if (!isCustom) setForm(f => ({ ...f, job_date: "" }));
                              } else {
                                setShowDatePicker(false);
                                setForm(f => ({ ...f, job_date: o.value }));
                              }
                            }}
                          >
                            <Ionicons
                              name={o.value === "custom" ? "calendar-outline" : "time-outline"}
                              size={16}
                              color={active ? "#fff" : colors.outline}
                              style={{ marginBottom: 4 }}
                            />
                            <Text style={[S.optionCardTitle, active && S.optionCardTitleActive]}>{o.label}</Text>
                            <Text style={[S.optionCardSub, active && { color: "rgba(255,255,255,0.7)" }]}>{o.sub}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Selected custom date display */}
                    {isCustom && form.job_date ? (
                      <TouchableOpacity style={S.selectedDateRow} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                        <Ionicons name="calendar" size={18} color={colors.primary} />
                        <Text style={S.selectedDateText}>{displayDate}</Text>
                        <Text style={S.selectedDateChange}>Change</Text>
                      </TouchableOpacity>
                    ) : null}

                    {/* iOS inline calendar / Android dialog */}
                    {showDatePicker && (
                      Platform.OS === "ios" ? (
                        <View style={S.iosPickerWrap}>
                          <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display="inline"
                            minimumDate={new Date()}
                            onChange={onDateChange}
                            accentColor={colors.primary}
                          />
                          <TouchableOpacity style={S.iosPickerDone} onPress={() => setShowDatePicker(false)}>
                            <Text style={S.iosPickerDoneText}>DONE</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <DateTimePicker
                          value={pickerDate}
                          mode="date"
                          display="default"
                          minimumDate={new Date()}
                          onChange={onDateChange}
                        />
                      )
                    )}
                  </View>
                );
              })()}

              {/* Urgency */}
              <View style={S.sectionCard}>
                <Text style={S.sectionLabel}>URGENCY</Text>
                <View style={S.segmentRow}>
                  {[{ v: "normal", label: "Normal", icon: "time-outline" }, { v: "urgent", label: "Urgent", icon: "flash-outline" }, { v: "asap", label: "Today", icon: "alert-circle-outline" }].map(u => (
                    <TouchableOpacity key={u.v} activeOpacity={0.85} style={[S.segment, form.urgency === u.v && S.segmentActive]} onPress={() => setForm(f => ({ ...f, urgency: u.v }))}>
                      <Ionicons name={u.icon} size={15} color={form.urgency === u.v ? "#fff" : colors.outline} />
                      <Text style={[S.segmentText, form.urgency === u.v && S.segmentTextActive]}>{u.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Recurrence */}
              <View style={S.sectionCard}>
                <Text style={S.sectionLabel}>HOW OFTEN?</Text>
                <View style={S.segmentRow}>
                  {[{ v: "once", label: "One Time", icon: "radio-button-on-outline" }, { v: "weekly", label: "Weekly", icon: "repeat-outline" }, { v: "monthly", label: "Monthly", icon: "calendar-outline" }].map(r => (
                    <TouchableOpacity key={r.v} activeOpacity={0.85} style={[S.segment, form.recurrence === r.v && S.segmentActive]} onPress={() => setForm(f => ({ ...f, recurrence: r.v }))}>
                      <Ionicons name={r.icon} size={15} color={form.recurrence === r.v ? "#fff" : colors.outline} />
                      <Text style={[S.segmentText, form.recurrence === r.v && S.segmentTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location */}
              <View style={S.sectionCard}>
                <View style={S.sectionLabelRow}>
                  <Ionicons name="location-outline" size={14} color={colors.outline} />
                  <Text style={S.sectionLabel}>LOCATION</Text>
                  <View style={S.requiredBadge}><Text style={S.requiredText}>REQUIRED</Text></View>
                </View>

                {savedAddresses.length > 0 ? (
                  <>
                    {savedAddresses.map(addr => {
                      const active = selectedAddressId === addr.id;
                      const sub = [addr.address?.village, addr.address?.district, addr.address?.pincode].filter(Boolean).join(", ");
                      return (
                        <TouchableOpacity
                          key={addr.id}
                          activeOpacity={0.85}
                          style={[S.addrCard, active && S.addrCardActive]}
                          onPress={() => applyAddress(addr)}
                        >
                          <View style={[S.addrCardIcon, active && S.addrCardIconActive]}>
                            <Ionicons name="home-outline" size={18} color={active ? "#fff" : colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[S.addrCardLabel, active && S.addrCardLabelActive]}>{addr.label}</Text>
                              {addr.is_default && (
                                <View style={S.addrDefaultBadge}>
                                  <Text style={S.addrDefaultText}>DEFAULT</Text>
                                </View>
                              )}
                            </View>
                            {!!sub && <Text style={[S.addrCardSub, active && { color: "rgba(255,255,255,0.8)" }]}>{sub}</Text>}
                          </View>
                          {active && <Ionicons name="checkmark-circle" size={20} color="#fff" />}
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <View style={S.addrEmptyCard}>
                    <View style={S.addrEmptyIcon}>
                      <Ionicons name="location-outline" size={26} color={colors.outline} />
                    </View>
                    <Text style={S.addrEmptyTitle}>No saved addresses</Text>
                    <Text style={S.addrEmptySub}>Save an address in your profile to auto-fill location, or use GPS below.</Text>
                  </View>
                )}

                <TouchableOpacity style={S.gpsBtn} onPress={useGPS} disabled={gpsLoading}>
                  {gpsLoading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                  }
                  <Text style={S.gpsBtnText}>{gpsLoading ? "Detecting…" : "Use my GPS location"}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={S.manualLink} onPress={() => setManualPinMode(m => !m)}>
                  <Ionicons name="keyboard-outline" size={14} color={colors.outline} />
                  <Text style={S.manualLinkText}>{manualPinMode ? "Hide manual entry" : "Enter pincode manually"}</Text>
                </TouchableOpacity>

                {(manualPinMode || (!selectedAddressId && !gpsLoading)) && (
                  <TextInput
                    style={[S.rateInputRow && null, {
                      marginTop: 10, backgroundColor: "#f9f9fe",
                      borderRadius: 12, borderWidth: 1.5, borderColor: form.pincode.length === 6 ? colors.primary : "#e8e8ed",
                      paddingHorizontal: 16, paddingVertical: 13,
                      fontFamily: fonts.body, fontSize: 16, color: colors.textHeading, letterSpacing: 2,
                    }]}
                    value={form.pincode}
                    onChangeText={v => {
                      const digits = v.replace(/\D/g, "").slice(0, 6);
                      setSelectedAddressId(null);
                      setForm(f => ({ ...f, pincode: digits }));
                      if (digits.length === 6) setPincode(digits);
                    }}
                    placeholder="6-digit pincode"
                    placeholderTextColor={colors.outline}
                    keyboardType="number-pad"
                    maxLength={6}
                    returnKeyType="done"
                  />
                )}

                {form.pincode.length === 6 && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                    {pinStatus === "loading"
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name="checkmark-circle" size={15} color="#059669" />
                    }
                    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 13, color: pinStatus === "loading" ? colors.outline : "#059669" }}>
                      {pinStatus === "loading"
                        ? "Looking up area…"
                        : pinResult?.name
                          ? `${pinResult.name}${pinResult.district ? `, ${pinResult.district}` : ""}`
                          : form.village
                            ? `${form.village} — ${form.pincode}`
                            : `${form.pincode} ✓`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Anonymous */}
              <View style={S.sectionCard}>
                <View style={S.anonRow}>
                  <View style={S.anonIconWrap}>
                    <Ionicons name="eye-off-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.anonLabel}>Post anonymously</Text>
                    <Text style={S.anonSub}>Your name is hidden until you accept a worker</Text>
                  </View>
                  <Switch
                    value={form.is_anonymous}
                    onValueChange={v => setForm(f => ({ ...f, is_anonymous: v }))}
                    trackColor={{ false: colors.borderSubtle, true: "#059669" }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </View>
          )}

          {/* ══ STEP 4: Review ═══════════════════════════════════════════ */}
          {step === 4 && (
            <View>
              <Text style={S.h1}>{"Review &\nPost your Job"}</Text>
              <Text style={S.sub}>Everything looks good? Hit Post — Local Experts nearby will be notified instantly.</Text>

              {/* Hero card */}
              <View style={S.reviewHero}>
                <View style={[S.reviewHeroBg, { backgroundColor: cat?.color || "#f0f0f5" }]}>
                  <Image source={{ uri: cat?.image }} style={S.reviewHeroImage} resizeMode="contain" />
                </View>
                <View style={S.reviewHeroBody}>
                  <Text style={S.reviewHeroTitle}>Need {form.workers_needed} {effectiveSkill}</Text>
                  <View style={S.reviewHeroBadge}>
                    <Text style={S.reviewHeroBadgeText}>{form.categoryLabel?.toUpperCase()}</Text>
                  </View>
                </View>
              </View>

              {/* Detail rows */}
              <View style={S.sectionCard}>
                {[
                  { icon: "people-outline",  label: "Team size",    val: `${form.workers_needed} Local Expert${form.workers_needed > 1 ? "s" : ""}` },
                  { icon: "cash-outline",    label: "Daily rate",   val: `₹${form.daily_rate} per day` },
                  { icon: "calendar-outline",label: "Start date",   val: form.job_date },
                  { icon: "flash-outline",   label: "Urgency",      val: form.urgency === "asap" ? "Need Today" : form.urgency.charAt(0).toUpperCase() + form.urgency.slice(1) },
                  { icon: "repeat-outline",  label: "Recurrence",   val: form.recurrence === "once" ? "One Time" : form.recurrence.charAt(0).toUpperCase() + form.recurrence.slice(1) },
                  { icon: "location-outline",label: "Location",     val: [form.village, pinResult?.district, pinResult?.state].filter(Boolean).join(", ") || form.pincode },
                ].map((r, i, arr) => (
                  <View key={r.icon}>
                    <View style={S.reviewRow}>
                      <View style={S.reviewRowIcon}>
                        <Ionicons name={r.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.reviewRowLabel}>{r.label}</Text>
                        <Text style={S.reviewRowVal}>{r.val}</Text>
                      </View>
                    </View>
                    {i < arr.length - 1 && <View style={S.reviewDivider} />}
                  </View>
                ))}
              </View>

              {/* Description */}
              <View style={S.sectionCard}>
                <Text style={S.sectionLabel}>JOB DESCRIPTION</Text>
                <Text style={S.reviewDesc}>{form.description}</Text>
              </View>

              {/* Info banner */}
              <View style={S.infoBanner}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={S.infoBannerText}>Local Experts within 25 km will be notified on WhatsApp and the app.</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={S.footer}>
          <TouchableOpacity style={S.footerBack} onPress={back} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={colors.textHeading} />
          </TouchableOpacity>
          <TouchableOpacity style={[S.continueBtn, !canNext() && S.continueBtnOff]} disabled={!canNext() || saving} onPress={step < 4 ? next : submit} activeOpacity={0.9}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={S.continueBtnText}>{STEP_LABELS[step]}</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </AppScreen>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f9f9fe" },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#f9f9fe",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
    gap: 10,
  },
  headerBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "#f0f0f5",
  },
  headerTitle: { fontFamily: fonts.headlineSm, fontSize: 20, color: colors.primary, letterSpacing: -0.3 },

  /* Progress */
  progressArea: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, backgroundColor: "#f9f9fe" },
  progressTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressStepText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.outline, letterSpacing: 1 },
  progressPctText:  { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.primary, letterSpacing: 1 },
  progressTrack: { height: 2, backgroundColor: "#e8e8ed", borderRadius: 1, overflow: "hidden" },
  progressFill:  { height: "100%", backgroundColor: colors.primary, borderRadius: 1 },

  /* Scroll */
  scroll: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 120, backgroundColor: "#f9f9fe" },

  /* Typography */
  h1: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, color: colors.primary, marginBottom: 10, letterSpacing: -0.5 },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.outline, marginBottom: 24 },

  /* Step 1 — AI buttons */
  aiRow: { flexDirection: "row", gap: 10, marginBottom: 24, alignItems: "center" },
  aiBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "#e8e8ed", backgroundColor: "#ffffff", ...shadow.xs },
  aiBtnRec: { backgroundColor: colors.error, borderColor: colors.error },
  aiBtnText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary, letterSpacing: 1 },
  successCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", marginBottom: 24 },
  successTitle: { fontFamily: fonts.bodyBold, fontSize: 30, color: "#111827", textAlign: "center", marginBottom: 10 },
  successSub: { fontFamily: fonts.body, fontSize: 16, color: "#4B5563", textAlign: "center", lineHeight: 24, marginBottom: 32 },
  successSteps: { width: "100%", gap: 14, marginBottom: 36 },
  successStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  successStepText: { fontFamily: fonts.body, fontSize: 15, color: "#374151", flex: 1 },
  successBtn: { width: "100%", height: 52, borderRadius: 14, backgroundColor: "#111827", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  successBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  successBtnSecondary: { width: "100%", height: 52, borderRadius: 14, borderWidth: 1, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  successBtnSecondaryText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#374151" },
  photoPreviewRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f0fdf4", borderRadius: 12, padding: 10, marginBottom: 16, borderWidth: 1, borderColor: "#bbf7d0" },
  photoPreview: { width: 56, height: 56, borderRadius: 8 },
  photoPreviewLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#166534" },
  photoPreviewSub: { fontFamily: fonts.body, fontSize: 11, color: "#15803d", marginTop: 2 },

  /* Step 1 — Category grid */
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  catCard: { width: "48%", aspectRatio: 1, backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#f0f0f5", alignItems: "center", justifyContent: "center", paddingVertical: 20, paddingHorizontal: 12, gap: 12, ...shadow.xs },
  catCardActive: { borderColor: colors.primary, borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 6 },
  catImage: { width: 90, height: 90 },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textHeading, letterSpacing: 1.2, textAlign: "center" },
  catLabelActive: { color: colors.primary },

  /* Steps 2-4 — Context banner */
  contextBanner: {
    flexDirection: "row", alignItems: "center", gap: 14,
    borderRadius: 20, padding: 14, marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
  },
  contextImage: { width: 56, height: 56, borderRadius: 12 },
  contextTag:   { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.outline, letterSpacing: 1.2, marginBottom: 2 },
  contextTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.primary, letterSpacing: -0.3 },
  contextSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 1 },
  contextChange: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", backgroundColor: "rgba(255,255,255,0.6)" },
  contextChangeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary },

  /* Step 2 — Skill grid */
  skillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  skillCard: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8ed",
    backgroundColor: "#ffffff", ...shadow.xs, position: "relative",
  },
  skillCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  skillCardText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.textBody },
  skillCardTextActive: { color: "#ffffff" },
  skillCheck: {
    position: "absolute", top: -5, right: -5,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary, borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },

  /* Divider */
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e8e8ed" },
  dividerText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.outline, letterSpacing: 1 },

  /* Section cards (Steps 2-4) */
  sectionCard: {
    backgroundColor: "#ffffff", borderRadius: 20,
    borderWidth: 1, borderColor: "#f0f0f5",
    padding: 18, marginBottom: 14, ...shadow.xs,
  },
  sectionLabel:    { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.outline, letterSpacing: 1.5, marginBottom: 10 },
  sectionLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  requiredBadge:   { backgroundColor: "#FEE2E2", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  requiredText:    { fontFamily: fonts.bodyBold, fontSize: 9, color: "#DC2626", letterSpacing: 0.8 },
  sectionHint:     { fontFamily: fonts.body, fontSize: 13, color: colors.outline },

  /* Step 3 — Counter */
  counter: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f9f9fe", borderRadius: 16,
    borderWidth: 1, borderColor: "#e8e8ed",
    overflow: "hidden", marginTop: 4,
  },
  counterBtn: { width: 56, height: 56, alignItems: "center", justifyContent: "center", backgroundColor: "#f0f0f5" },
  counterVal:  { fontFamily: fonts.display, fontSize: 32, color: colors.primary, lineHeight: 38 },
  counterUnit: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },

  /* Market badge */
  marketBadge: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10, alignSelf: "flex-start", backgroundColor: "#ECFDF5", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  marketBadgeText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#059669" },

  /* Rate input */
  rateInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ratePrefix: { width: 44, height: 50, borderRadius: 12, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e8e8ed" },
  ratePrefixText: { fontFamily: fonts.display, fontSize: 20, color: colors.primary },

  /* Insight */
  insightBanner: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 },
  insightText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18 },

  /* Option cards (date) */
  optionRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  optionCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8ed", backgroundColor: "#f9f9fe", alignItems: "center" },
  optionCardActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionCardTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  optionCardTitleActive: { color: "#ffffff" },
  optionCardSub: { fontFamily: fonts.body, fontSize: 11, color: colors.outline, marginTop: 3 },

  /* Date picker */
  selectedDateRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14,
    backgroundColor: "#f0f0f5", borderRadius: 14, padding: 14,
  },
  selectedDateText:   { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.primary },
  selectedDateChange: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.outline },
  iosPickerWrap: {
    marginTop: 12, backgroundColor: "#ffffff",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#e8e8ed",
  },
  iosPickerDone: {
    alignItems: "center", paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#e8e8ed",
    backgroundColor: "#f9f9fe",
  },
  iosPickerDoneText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary, letterSpacing: 1 },

  /* Segment control */
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#e8e8ed", backgroundColor: "#f9f9fe" },
  segmentActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  segmentText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.outline },
  segmentTextActive: { color: "#ffffff" },

  /* GPS */
  gpsBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, backgroundColor: "#dae2fd" },
  gpsBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.primary },

  /* Saved address quick-select */
  savedAddrHint:       { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, letterSpacing: 0.5, marginBottom: 8 },
  savedAddrChip:       { flexDirection: "row", alignItems: "center", gap: 7, marginHorizontal: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8ed", backgroundColor: "#f9f9fe", minWidth: 90 },
  savedAddrChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  savedAddrChipLabel:  { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textHeading },
  savedAddrChipSub:    { fontFamily: fonts.body, fontSize: 11, color: colors.outline, maxWidth: 90 },
  savedAddrAddChip:    { flexDirection: "row", alignItems: "center", gap: 5, marginHorizontal: 4, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: "#e8e8ed", borderStyle: "dashed", backgroundColor: "#f9f9fe" },
  savedAddrAddText:    { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },
  saveAddrPrompt:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#e8e8ed", backgroundColor: "#f9f9fe" },
  saveAddrPromptText:  { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },

  /* Address cards (location picker) */
  addrCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#f9f9fe", borderRadius: 14,
    borderWidth: 1.5, borderColor: "#e8e8ed",
    padding: 14, marginBottom: 10,
  },
  addrCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  addrCardIcon: {
    width: 40, height: 40, borderRadius: 11,
    backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#e8e8ed",
  },
  addrCardIconActive: { backgroundColor: "rgba(255,255,255,0.25)", borderColor: "transparent" },
  addrCardLabel:       { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  addrCardLabelActive: { color: "#ffffff" },
  addrCardSub:         { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },
  addrDefaultBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#ECFDF5", borderRadius: 20,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  addrDefaultText: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#059669", letterSpacing: 0.5 },
  addrAddLink: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 4, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 7,
  },
  addrAddLinkText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary },
  addrEmptyCard: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 16, marginBottom: 8 },
  addrEmptyIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center",
    marginBottom: 14,
  },
  addrEmptyTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 6 },
  addrEmptySub: {
    fontFamily: fonts.body, fontSize: 13, color: colors.outline,
    textAlign: "center", lineHeight: 18, marginBottom: 16,
  },
  addrEmptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 11,
  },
  addrEmptyBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  manualLink: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 12, alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 7,
  },
  manualLinkText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.outline },

  /* Anonymous */
  anonRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  anonIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  anonLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  anonSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },

  /* Step 4 — Hero */
  reviewHero: { backgroundColor: "#ffffff", borderRadius: 24, borderWidth: 1, borderColor: "#f0f0f5", marginBottom: 14, overflow: "hidden", ...shadow.sm },
  reviewHeroBg: { height: 140, alignItems: "center", justifyContent: "center" },
  reviewHeroImage: { width: 110, height: 110 },
  reviewHeroBody: { padding: 18 },
  reviewHeroTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.primary, letterSpacing: -0.3 },
  reviewHeroBadge: { alignSelf: "flex-start", marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "#f0f0f5", borderRadius: 20 },
  reviewHeroBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.outline, letterSpacing: 1 },

  /* Step 4 — Detail rows */
  reviewRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 4 },
  reviewRowIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  reviewRowLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, letterSpacing: 0.5, marginBottom: 2 },
  reviewRowVal:   { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.textHeading },
  reviewDivider:  { height: 1, backgroundColor: "#f0f0f5", marginVertical: 10 },
  reviewDesc:     { fontFamily: fonts.body, fontSize: 14, color: colors.textBody, lineHeight: 22, marginTop: 4 },

  /* Info banner */
  infoBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#dae2fd", borderRadius: 16, padding: 14, marginTop: 4 },
  infoBannerText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: colors.primary, lineHeight: 19 },

  /* Footer */
  footer: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    backgroundColor: "#f9f9fe",
    borderTopWidth: 1, borderTopColor: "#e8e8ed",
  },
  footerBack: { width: 56, height: 56, borderRadius: 16, backgroundColor: "#e8e8ed", alignItems: "center", justifyContent: "center" },
  continueBtn: { flex: 1, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.primary, borderRadius: 16, ...shadow.md },
  continueBtnOff: { opacity: 0.38, shadowOpacity: 0, elevation: 0 },
  continueBtnText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#ffffff", letterSpacing: 1.2 },
});
