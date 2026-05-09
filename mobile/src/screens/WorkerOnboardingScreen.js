/**
 * WorkerOnboardingScreen.js — Step-by-step worker onboarding for Expo mobile
 * Mirrors the web WorkerOnboarding.jsx flow
 * Steps: Name → Phone → Address → Skills → Photo
 */
import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Image, Platform, KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, spacing, radius, sizes } from "../theme";

/* ─── Data ────────────────────────────────────────────────────────────────── */
const SKILL_CATEGORIES = [
  { category: "Construction", color: "#e85a25", bg: "#fff4f0",
    skills: ["Mason", "Carpenter", "Painter", "Welder", "Plumber", "Helper"] },
  { category: "Agriculture", color: "#16a34a", bg: "#f0fdf4",
    skills: ["Harvesting", "Irrigation", "Pesticide", "Plowing", "Farm helper"] },
  { category: "Electrical", color: "#d97706", bg: "#fffbeb",
    skills: ["Wiring", "Motor repair", "Panel work", "Electrician"] },
  { category: "Cleaning", color: "#3f37c9", bg: "#f0f0ff",
    skills: ["House cleaning", "Sweeping", "Vessel washing", "Laundry"] },
  { category: "Transport", color: "#0284c7", bg: "#f0f9ff",
    skills: ["Driving", "Loading", "Delivery", "Tractor operator"] },
  { category: "Mechanical", color: "#9333ea", bg: "#faf0ff",
    skills: ["Pump repair", "Engine work", "Welding", "Tool repair"] },
  { category: "General", color: "#4b5563", bg: "#f9fafb",
    skills: ["Daily labour", "Watchman", "Peon", "Loader", "General helper"] },
];

const STEPS = ["Name & Rate", "Phone", "Address", "Skills", "Photo"];

/* ─── Sub-components ──────────────────────────────────────────────────────── */
function ProgressBar({ step, total }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1, height: 4, borderRadius: 2,
            backgroundColor:
              i < step ? colors.saffron
              : i === step ? colors.indigo
              : colors.border,
          }}
        />
      ))}
    </View>
  );
}

function StepHeader({ icon, label, desc }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <Text style={styles.overline}>{label}</Text>
      <Text style={styles.desc}>{desc}</Text>
    </View>
  );
}

function KnInput(props) {
  return <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />;
}

/* ─── Main Screen ─────────────────────────────────────────────────────────── */
export default function WorkerOnboardingScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [dailyRate, setDailyRate] = useState("350");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState({
    village: user?.village || "",
    post: "", block: "", district: "", state: "",
    pincode: "",
  });
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [bio, setBio] = useState("");
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await api.get("/workers/me/profile");
        if (r.data) {
          setName(r.data.name || user?.name || "");
          setPhone(r.data.phone || user?.phone || "");
          setDailyRate(String(r.data.daily_rate || 350));
          if (r.data.address) setAddress(r.data.address);
          if (r.data.structured_skills?.length) setSelectedSkills(r.data.structured_skills);
          setBio(r.data.bio || "");
          if (r.data.photo_url) setPhotoUri(r.data.photo_url);
        }
      } catch { /* no profile yet */ }
      finally { setLoading(false); }
    };
    if (user) load();
  }, [user]);

  const toggleSkill = (category, skill) => {
    setSelectedSkills(prev => {
      const exists = prev.some(x => x.category === category && x.skill === skill);
      return exists
        ? prev.filter(x => !(x.category === category && x.skill === skill))
        : [...prev, { category, skill }];
    });
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return phone.trim().length === 10;
    if (step === 2) return address.village.trim() && address.pincode.trim().length === 6;
    if (step === 3) return selectedSkills.length >= 1;
    return true;
  };

  const next = () => {
    if (!canProceed()) {
      const msgs = [
        "Please enter your full name (at least 2 characters).",
        "Enter a valid 10-digit mobile number.",
        "Village name and 6-digit pincode are required.",
        "Please select at least one skill.",
      ];
      Alert.alert("Required", msgs[step] || "Please fill this step.");
      return;
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow photo access in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name,
        phone,
        village: address.village,
        pincode: address.pincode,
      });

      const skills = selectedSkills.map(x => x.skill.toLowerCase());
      await api.post("/workers/profile", {
        skills,
        structured_skills: selectedSkills,
        daily_rate: Number(dailyRate) || 350,
        bio,
        village: address.village,
        district: address.district || "",
        state: address.state || "",
        lat: 22.9734, // will be replaced by GPS in next version
        lng: 78.6569,
        available: true,
        address,
        availability_status: "available",
      });

      // Upload photo if chosen
      if (photoUri && !photoUri.startsWith("http")) {
        try {
          const fd = new FormData();
          const filename = photoUri.split("/").pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          fd.append("file", { uri: photoUri, name: filename, type });
          await api.post("/workers/me/photo", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch { /* photo optional */ }
      }

      if (refreshUser) await refreshUser();
      Alert.alert("🎉 Welcome!", "Your profile is live. Start finding jobs!", [
        { text: "Go to Dashboard", onPress: () => navigation.replace("Dashboard") },
      ]);
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== "worker") {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>This screen is only for worker accounts.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.saffron} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.logoRow}>
          <Text style={styles.logo}>
            kaam<Text style={{ color: colors.saffron }}>now</Text>
          </Text>
          <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
        </View>

        <ProgressBar step={step} total={STEPS.length} />

        {/* ─── Step 0: Name & Rate ─── */}
        {step === 0 && (
          <View style={styles.card}>
            <StepHeader icon="person-outline" label="Your Name" desc="Tell us your full name so customers can trust you." />
            <Text style={styles.fieldLabel}>Full name *</Text>
            <KnInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Ramesh Kumar"
              autoFocus
            />
            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Daily rate (₹) *</Text>
            <KnInput
              value={dailyRate}
              onChangeText={setDailyRate}
              placeholder="e.g. 350"
              keyboardType="numeric"
            />
            <Text style={styles.hint}>This is what customers will see as your expected pay.</Text>
          </View>
        )}

        {/* ─── Step 1: Phone ─── */}
        {step === 1 && (
          <View style={styles.card}>
            <StepHeader icon="call-outline" label="Phone Number" desc="Your phone helps customers reach you quickly." />
            <Text style={styles.fieldLabel}>Mobile number *</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}><Text style={styles.countryCodeText}>+91</Text></View>
              <TextInput
                style={[styles.input, { flex: 1, borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                value={phone}
                onChangeText={t => setPhone(t.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>📱 OTP verification coming soon. Your number is safe with us.</Text>
            </View>
          </View>
        )}

        {/* ─── Step 2: Address ─── */}
        {step === 2 && (
          <View style={styles.card}>
            <StepHeader icon="location-outline" label="Your Address" desc="Customers nearby will find you based on your pincode." />
            <Text style={styles.fieldLabel}>Village / Town *</Text>
            <KnInput value={address.village} onChangeText={t => setAddress({ ...address, village: t })} placeholder="e.g. Ramnagar" autoFocus />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Post</Text>
                <KnInput value={address.post} onChangeText={t => setAddress({ ...address, post: t })} placeholder="Post office" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>Block</Text>
                <KnInput value={address.block} onChangeText={t => setAddress({ ...address, block: t })} placeholder="Block / Tehsil" />
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>District</Text>
                <KnInput value={address.district} onChangeText={t => setAddress({ ...address, district: t })} placeholder="District" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fieldLabel}>State</Text>
                <KnInput value={address.state} onChangeText={t => setAddress({ ...address, state: t })} placeholder="State" />
              </View>
            </View>
            <Text style={styles.fieldLabel}>Pincode *</Text>
            <KnInput
              value={address.pincode}
              onChangeText={t => setAddress({ ...address, pincode: t.replace(/\D/g, "").slice(0, 6) })}
              placeholder="6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>
        )}

        {/* ─── Step 3: Skills ─── */}
        {step === 3 && (
          <View>
            <View style={styles.card}>
              <StepHeader icon="briefcase-outline" label="Your Skills" desc="Select all skills that apply. Customers will match jobs to you." />
              {selectedSkills.length > 0 && (
                <View style={styles.selectedChips}>
                  {selectedSkills.map(s => (
                    <View key={`${s.category}-${s.skill}`} style={styles.selectedChip}>
                      <Text style={styles.selectedChipText}>{s.skill}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.fieldLabel}>About you (optional)</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: "top" }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Years of experience, tools you own…"
                placeholderTextColor={colors.textMuted}
                multiline
              />
            </View>
            {SKILL_CATEGORIES.map(cat => (
              <View key={cat.category} style={[styles.card, { marginTop: 10 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                  <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name="construct-outline" size={14} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, { color: cat.color }]}>{cat.category}</Text>
                  {selectedSkills.filter(x => x.category === cat.category).length > 0 && (
                    <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                      <Text style={[styles.catBadgeText, { color: cat.color }]}>
                        {selectedSkills.filter(x => x.category === cat.category).length} selected
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.skillChips}>
                  {cat.skills.map(skill => {
                    const active = selectedSkills.some(x => x.skill === skill && x.category === cat.category);
                    return (
                      <TouchableOpacity
                        key={skill}
                        onPress={() => toggleSkill(cat.category, skill)}
                        style={[styles.chip, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                      >
                        {active && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
                        <Text style={[styles.chipText, active && { color: "#fff" }]}>{skill}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Step 4: Photo ─── */}
        {step === 4 && (
          <View style={[styles.card, { alignItems: "center" }]}>
            <StepHeader icon="camera-outline" label="Profile Photo" desc="A photo builds trust. Workers with photos get hired faster." />
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{name?.[0]?.toUpperCase() || "?"}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={16} color={colors.indigo} />
              <Text style={styles.photoBtnText}>{photoUri ? "Change photo" : "Choose photo"}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>Optional — you can add it later from your dashboard.</Text>
          </View>
        )}

        {/* Navigation */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, saving && { opacity: 0.6 }, step === 0 && { flex: 1 }]}
            onPress={next}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.nextBtnText}>
                  {step === STEPS.length - 1 ? "✓ Complete setup" : "Continue →"}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {step === 4 && !saving && (
          <TouchableOpacity style={{ alignItems: "center", marginTop: 12 }} onPress={handleSubmit}>
            <Text style={{ color: colors.textMuted, fontSize: 13, textDecorationLine: "underline" }}>
              Skip photo, complete setup
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  scroll: { padding: spacing.xl, paddingBottom: 48, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  logoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  logo: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  stepLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 20, marginBottom: 12 },
  iconBox: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.indigo, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  overline: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: colors.indigo, marginBottom: 4 },
  desc: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginBottom: 6, marginTop: 4 },
  input: { borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11, fontFamily: fonts.body, fontSize: 15, color: colors.text, backgroundColor: "#fff" },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 6 },
  phoneRow: { flexDirection: "row" },
  countryCode: { backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: colors.border, borderRightWidth: 0, borderTopLeftRadius: radius.md, borderBottomLeftRadius: radius.md, paddingHorizontal: 14, justifyContent: "center" },
  countryCodeText: { fontFamily: fonts.bodyBold, color: colors.textSecondary },
  infoBox: { marginTop: 12, backgroundColor: "#fff4f0", borderRadius: radius.md, padding: 12 },
  infoText: { fontFamily: fonts.body, fontSize: 13, color: colors.saffronDark || colors.saffron },
  row: { flexDirection: "row", gap: 10, marginTop: 4 },
  selectedChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14, padding: 10, backgroundColor: "#f0f0ff", borderRadius: radius.md },
  selectedChip: { backgroundColor: colors.indigo, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  selectedChipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  catIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: "center", alignItems: "center", marginRight: 8 },
  catLabel: { fontFamily: fonts.bodyBold, fontSize: 14 },
  catBadge: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  catBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  skillChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#f9fafb" },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.saffron, marginBottom: 16 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#f0f0ff", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  avatarInitial: { fontFamily: fonts.display, fontSize: 40, color: colors.indigo },
  photoBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: colors.indigo, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 10 },
  photoBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.indigo },
  navRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderColor: colors.borderStrong || colors.border, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 13 },
  backBtnText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  nextBtn: { flex: 1, backgroundColor: colors.saffron, borderRadius: radius.md, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  nextBtnText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
  muted: { fontFamily: fonts.body, color: colors.textMuted, fontSize: 15 },
});
