import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, Image, RefreshControl, ActivityIndicator, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Button from "../components/Button";

const SKILL_CATEGORIES = [
  { category: "Construction", skills: ["mason","tile work","carpentry","painting","plumbing","electrical","welding"] },
  { category: "Farm",         skills: ["harvesting","weeding","transplanting","irrigation"] },
  { category: "Home",         skills: ["cleaning","cooking","domestic help"] },
  { category: "Transport",    skills: ["driver","loading","shifting"] },
  { category: "Other",        skills: ["helper","digging","sweeping"] },
];
function skillCategory(s) {
  for (const c of SKILL_CATEGORIES) if (c.skills.includes(s)) return c.category;
  return "Other";
}

export default function WorkerMyProfileScreen({ navigation }) {
  const { user, refreshUser, logout } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bio, setBio]           = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [skills, setSkills]     = useState([]);
  const [available, setAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/workers/me/profile");
      setProfile(r.data);
      setBio(r.data.bio || "");
      setDailyRate(String(r.data.daily_rate || ""));
      setSkills(r.data.skills || []);
      setAvailable(r.data.available !== false);
    } catch { setProfile(null); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const toggleSkill = (s) =>
    setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const toggleAvailability = async (val) => {
    setAvailable(val);
    setTogglingAvail(true);
    try {
      await api.patch("/workers/me/availability", {
        availability_status: val ? "available" : "not_available",
      });
    } catch (e) {
      setAvailable(!val); // revert on error
      Alert.alert("Error", formatApiError(e));
    } finally {
      setTogglingAvail(false);
    }
  };

  const doLogout = () => {
    Alert.alert("Log out?", "You'll need your OTP to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: async () => {
        try { navigation?.navigate?.("Home"); } catch {}
        await logout();
      }},
    ]);
  };

  const doDeactivate = () => {
    Alert.alert(
      "Deactivate account?",
      "Your profile will be hidden. You can reactivate within 30 days by logging in again. After 30 days it is permanently deleted.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: async () => {
          try {
            await api.delete("/auth/me");
            try { navigation?.navigate?.("Home"); } catch {}
            await logout();
          } catch (e) { Alert.alert("Error", formatApiError(e)); }
        }},
      ]
    );
  };

  const save = async () => {
    const rate = parseInt(dailyRate, 10);
    if (!rate || rate < 100) return Alert.alert("Rate must be at least ₹100");
    if (!skills.length) return Alert.alert("Pick at least one skill");
    setSaving(true);
    try {
      await api.patch("/workers/profile", {
        bio: bio.trim(), daily_rate: rate, skills,
        structured_skills: skills.map(s => ({ category: skillCategory(s), skill: s })),
      });
      await load(); setEditing(false);
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
    finally { setSaving(false); }
  };

  const uploadAsset = async (asset) => {
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: "photo.jpg", type: "image/jpeg" });
    try { await api.post("/workers/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } }); await load(); }
    catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
  };

  const pickPhoto = () => {
    Alert.alert("Profile photo", "Choose how to add your photo", [
      {
        text: "Take a photo",
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) return Alert.alert("Camera permission needed");
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: ["images"] });
          if (!r.canceled && r.assets?.[0]) await uploadAsset(r.assets[0]);
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return Alert.alert("Photo library permission needed");
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: ["images"] });
          if (!r.canceled && r.assets?.[0]) await uploadAsset(r.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  if (loading) return (
    <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={colors.indigo} size="large" /></View></SafeAreaView>
  );
  if (!profile) return (
    <SafeAreaView style={s.safe}>
      <View style={s.center}>
        <Text style={s.emptyTitle}>Profile not set up yet</Text>
        <Text style={s.emptySub}>Complete your worker profile to start getting hired.</Text>
        <Button title="Set up profile" onPress={() => navigation.navigate("WorkerOnboarding")} style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );

  const avgRating = (profile.avg_rating || 0).toFixed(1);
  const totalJobs = profile.total_jobs || 0;

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient Header ──────────────────────────────────────────── */}
        <LinearGradient colors={["#3f37c9", "#6366f1"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.heroGrad}>
          <View style={s.heroCircle} />

          {/* Photo */}
          <Pressable onPress={pickPhoto} style={s.photoWrap}>
            {profile.photo_url
              ? <Image source={{ uri: profile.photo_url.startsWith("http") ? profile.photo_url : `${API_URL}${profile.photo_url}` }} style={s.photo} />
              : <View style={[s.photo, s.photoEmpty]}>
                  <Ionicons name="person" size={44} color="rgba(255,255,255,0.6)" />
                </View>}
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </Pressable>

          {/* Name + location */}
          <Text style={s.heroName}>{user?.name || profile.name}</Text>
          <Text style={s.heroLocation}>
            {[profile.village, profile.state].filter(Boolean).join(", ") || "Location not set"}
          </Text>
          <Text style={s.heroPhone}>{user?.phone_primary || "—"}</Text>

          {/* Role pill + availability toggle */}
          <View style={s.heroPillRow}>
            <View style={s.rolePill}>
              <Ionicons name="hammer-outline" size={12} color={colors.indigo} />
              <Text style={s.rolePillText}>Worker</Text>
            </View>
            <View style={[s.availPill, !available && s.availPillOff]}>
              <Switch
                value={available}
                onValueChange={toggleAvailability}
                disabled={togglingAvail}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: "#4ade80" }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
              <Text style={s.availText}>{available ? "Available" : "Unavailable"}</Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={s.statsStrip}>
            <StatItem icon="star" val={avgRating} label="Rating" />
            <View style={s.statDivider} />
            <StatItem icon="checkmark-circle" val={totalJobs} label="Jobs done" />
            <View style={s.statDivider} />
            <StatItem icon="cash" val={`₹${profile.daily_rate || 0}`} label="Per day" />
            <View style={s.statDivider} />
            <StatItem icon="ribbon" val={`T${profile.trust_tier || 1}`} label="Trust" />
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>
          {/* Edit / Save */}
          {!editing ? (
            <Button
              title="Edit Profile"
              variant="outline"
              icon={<Ionicons name="create-outline" size={15} color={colors.text} />}
              onPress={() => setEditing(true)}
            />
          ) : (
            <View style={{ flexDirection:"row", gap:10 }}>
              <Button title="Cancel" variant="outline" onPress={() => { setEditing(false); load(); }} style={{ flex:1 }} />
              <Button title={saving ? "Saving…" : "Save changes"} onPress={save} loading={saving} style={{ flex:2 }} />
            </View>
          )}

          {/* ── Skills ───────────────────────────────────────────────── */}
          <SectionHeader icon="hammer-outline" title="Skills" />
          {editing ? (
            SKILL_CATEGORIES.map(cat => (
              <View key={cat.category} style={{ marginBottom: 14 }}>
                <Text style={s.catLabel}>{cat.category}</Text>
                <View style={s.chipRow}>
                  {cat.skills.map(sk => {
                    const on = skills.includes(sk);
                    return (
                      <Pressable key={sk} onPress={() => toggleSkill(sk)} style={[s.chip, on && s.chipOn]}>
                        <Text style={[s.chipTxt, on && s.chipTxtOn]}>{sk}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          ) : (
            <View style={s.chipRow}>
              {(profile.skills || []).length === 0
                ? <Text style={s.emptySub}>No skills set — tap Edit.</Text>
                : (profile.skills || []).map(sk => (
                    <View key={sk} style={[s.chip, s.chipOn]}>
                      <Text style={s.chipTxtOn}>{sk}</Text>
                    </View>
                  ))}
            </View>
          )}

          {/* ── Daily Rate ───────────────────────────────────────────── */}
          <SectionHeader icon="cash-outline" title="Daily Rate" />
          {editing
            ? <TextInput style={s.input} value={dailyRate} onChangeText={v => setDailyRate(v.replace(/\D/g,""))} keyboardType="number-pad" placeholder="e.g. 500" placeholderTextColor={colors.textMuted} />
            : <View style={s.valueCard}>
                <Text style={s.valueBig}>₹{profile.daily_rate || "—"}</Text>
                <Text style={s.valueSub}>per day</Text>
              </View>}

          {/* ── Bio ──────────────────────────────────────────────────── */}
          <SectionHeader icon="document-text-outline" title="About me" />
          {editing
            ? <TextInput style={[s.input, { minHeight: 90, textAlignVertical: "top" }]} value={bio} onChangeText={setBio} multiline placeholder="Describe your experience and availability…" placeholderTextColor={colors.textMuted} />
            : <Text style={s.bioText}>{profile.bio || "No bio yet — tap Edit to add one."}</Text>}

          {/* ── Location ─────────────────────────────────────────────── */}
          <SectionHeader icon="location-outline" title="Location" />
          <View style={s.locationCard}>
            {[
              { label: "Village",  val: profile.address?.village || profile.village },
              { label: "Block",    val: profile.address?.block },
              { label: "District", val: profile.address?.district },
              { label: "State",    val: profile.address?.state },
              { label: "Pincode",  val: profile.address?.pincode },
            ].filter(r => r.val).map(r => (
              <View key={r.label} style={s.locRow}>
                <Text style={s.locLabel}>{r.label}</Text>
                <Text style={s.locVal}>{r.val}</Text>
              </View>
            ))}
          </View>

          {/* Support */}
          <Pressable onPress={() => navigation.navigate("ContactSupport")} style={s.supportLink}>
            <Ionicons name="help-circle-outline" size={15} color={colors.indigo} />
            <Text style={s.supportText}>Help & Support</Text>
          </Pressable>

          {/* Logout */}
          <Pressable onPress={doLogout} style={s.logoutBtn}>
            <Ionicons name="log-out-outline" size={16} color={colors.danger} />
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>

          {/* Deactivate */}
          <Pressable onPress={doDeactivate} style={{ flexDirection:"row", alignItems:"center", gap:6, marginTop:12, alignSelf:"center" }}>
            <Ionicons name="warning-outline" size={14} color={colors.danger} />
            <Text style={{ fontFamily:fonts.bodySemi, fontSize:12, color:colors.danger }}>Deactivate account</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <View style={{ flexDirection:"row", alignItems:"center", gap:7, marginTop:22, marginBottom:10 }}>
      <Ionicons name={icon} size={16} color={colors.indigo} />
      <Text style={{ fontFamily:fonts.bodyBold, fontSize:12, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary }}>{title}</Text>
    </View>
  );
}

function StatItem({ icon, val, label }) {
  return (
    <View style={{ flex:1, alignItems:"center" }}>
      <Ionicons name={`${icon}-outline`} size={14} color="rgba(255,255,255,0.7)" />
      <Text style={{ fontFamily:fonts.display, fontSize:18, color:"#fff", marginTop:3 }}>{val}</Text>
      <Text style={{ fontFamily:fonts.body, fontSize:10, color:"rgba(255,255,255,0.6)", marginTop:1 }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.bg },
  center: { flex:1, alignItems:"center", justifyContent:"center", padding:40 },
  emptyTitle: { fontFamily:fonts.display, fontSize:22, color:colors.text, textAlign:"center", marginBottom:8 },
  emptySub: { fontFamily:fonts.body, fontSize:13, color:colors.textMuted, textAlign:"center" },
  // Hero
  heroGrad: { paddingTop:spacing.lg, paddingBottom:spacing.xl, paddingHorizontal:spacing.xl, alignItems:"center", position:"relative", overflow:"hidden" },
  heroCircle: { position:"absolute", width:220, height:220, borderRadius:110, backgroundColor:"rgba(255,255,255,0.07)", top:-60, right:-60 },
  photoWrap: { position:"relative", marginBottom:12 },
  photo: { width:100, height:100, borderRadius:50, borderWidth:3, borderColor:"rgba(255,255,255,0.4)" },
  photoEmpty: { alignItems:"center", justifyContent:"center", backgroundColor:"rgba(255,255,255,0.15)" },
  cameraBadge: { position:"absolute", bottom:2, right:2, backgroundColor:colors.saffron, borderRadius:14, padding:5, borderWidth:2, borderColor:"#fff" },
  heroName: { fontFamily:fonts.display, fontSize:24, color:"#fff", marginBottom:4 },
  heroLocation: { fontFamily:fonts.body, fontSize:13, color:"rgba(255,255,255,0.75)", marginBottom:2 },
  heroPhone: { fontFamily:fonts.bodySemi, fontSize:12, color:"rgba(255,255,255,0.55)", marginBottom:20 },
  statsStrip: { flexDirection:"row", backgroundColor:"rgba(255,255,255,0.12)", borderRadius:14, paddingVertical:14, paddingHorizontal:10, width:"100%", gap:4 },
  statDivider: { width:1, backgroundColor:"rgba(255,255,255,0.2)" },
  // Form
  catLabel: { fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary, marginBottom:8 },
  chipRow: { flexDirection:"row", flexWrap:"wrap", gap:8 },
  chip: { paddingVertical:8, paddingHorizontal:14, borderRadius:20, backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.border },
  chipOn: { backgroundColor:colors.indigoTint, borderColor:colors.indigo },
  chipTxt: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.textSecondary },
  chipTxtOn: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.indigo },
  input: { backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.indigo, borderRadius:12, paddingVertical:13, paddingHorizontal:14, fontFamily:fonts.body, fontSize:15, color:colors.text },
  valueCard: { flexDirection:"row", alignItems:"baseline", gap:6, backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, padding:16 },
  valueBig: { fontFamily:fonts.display, fontSize:32, color:colors.indigo },
  valueSub: { fontFamily:fonts.body, fontSize:13, color:colors.textMuted },
  bioText: { fontFamily:fonts.body, fontSize:14, color:colors.textSecondary, lineHeight:22 },
  locationCard: { backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, overflow:"hidden" },
  locRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:12, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:colors.border },
  locLabel: { fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1, textTransform:"uppercase", color:colors.textMuted },
  locVal: { fontFamily:fonts.bodySemi, fontSize:13, color:colors.text },
  supportLink: { flexDirection:"row", alignItems:"center", gap:6, marginTop:28, alignSelf:"center" },
  supportText: { fontFamily:fonts.bodySemi, fontSize:13, color:colors.indigo },
  logoutBtn: { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:8, marginTop:14, marginBottom:8, paddingVertical:13, borderRadius:12, borderWidth:1.5, borderColor:"#fee2e2", backgroundColor:"#fff5f5" },
  logoutText: { fontFamily:fonts.bodyBold, fontSize:14, color:colors.danger },
  heroPillRow: { flexDirection:"row", gap:10, marginBottom:20, alignItems:"center" },
  rolePill: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"#fff", paddingVertical:6, paddingHorizontal:12, borderRadius:20 },
  rolePillText: { fontFamily:fonts.bodyBold, fontSize:12, color:colors.indigo },
  availPill: { flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(74,222,128,0.2)", paddingVertical:4, paddingHorizontal:10, borderRadius:20 },
  availPillOff: { backgroundColor:"rgba(255,255,255,0.15)" },
  availText: { fontFamily:fonts.bodyBold, fontSize:12, color:"#fff" },
});
