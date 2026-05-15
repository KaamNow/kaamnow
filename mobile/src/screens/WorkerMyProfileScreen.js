import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, Image, RefreshControl, ActivityIndicator, Switch, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Button from "../components/Button";

const TIER_NAMES  = { 1: "Basic", 2: "Verified", 3: "Pro", 4: "Elite" };
const TIER_BADGE  = { 1: "—", 2: "✅", 3: "🔵", 4: "🏆" };
const TIER_COLORS = { 1: "#9ca3af", 2: "#16a34a", 3: "#2563eb", 4: "#b45309" };

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

  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const doDeactivate = () => setShowDeactivateModal(true);

  const confirmDeactivate = async () => {
    try {
      setShowDeactivateModal(false);
      await api.delete("/auth/me");
      await logout();
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
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

  const removePhoto = async () => {
    try {
      await api.patch("/auth/me", { photo_url: null });
      await load();
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
  };

  const pickPhoto = () => {
    const options = [
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
      ...(profile?.photo_url ? [{ text: "Remove photo", style: "destructive", onPress: removePhoto }] : []),
      { text: "Cancel", style: "cancel" },
    ];
    Alert.alert("Profile photo", "Choose an option", options);
  };

  if (loading) return (
    <SafeAreaView style={s.safe}><View style={s.center}><ActivityIndicator color={colors.saffron} size="large" /></View></SafeAreaView>
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
        contentContainerStyle={{ paddingBottom: editing ? 100 : 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Gradient Header ──────────────────────────────────────────── */}
        <LinearGradient colors={["#0A5C56", "#0F766E", "#0D9488"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.heroGrad}>
          {/* Decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.blob3} />

          {/* Top row: availability toggle */}
          <View style={s.heroTopRow}>
            <View style={s.workerBadge}>
              <Ionicons name="hammer-outline" size={11} color="#fff" />
              <Text style={s.workerBadgeTxt}>Worker</Text>
            </View>
            <Pressable
              style={[s.availToggleBtn, available ? s.availToggleBtnOn : s.availToggleBtnOff]}
              onPress={() => toggleAvailability(!available)}
              disabled={togglingAvail}
            >
              <View style={[s.availDot, available ? s.availDotOn : s.availDotOff]} />
              <Text style={s.availToggleTxt}>
                {available ? "Available" : "Busy"}
              </Text>
              <Switch
                value={available}
                onValueChange={toggleAvailability}
                disabled={togglingAvail}
                trackColor={{ false: "rgba(255,255,255,0.2)", true: "#4ade80" }}
                thumbColor="#fff"
                style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
              />
            </Pressable>
          </View>

          {/* Photo + name block */}
          <View style={s.heroCenter}>
            <Pressable onPress={pickPhoto} style={s.photoRing}>
              {profile.photo_url
                ? <Image source={{ uri: profile.photo_url.startsWith("http") ? profile.photo_url : `${API_URL}${profile.photo_url}` }} style={s.photo} />
                : <View style={[s.photo, s.photoFallback]}>
                    <Text style={s.photoInitials}>
                      {(user?.name || profile.name || "?").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase()}
                    </Text>
                  </View>}
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </Pressable>

            <Text style={s.heroName}>{user?.name || profile.name}</Text>

            {/* Star rating */}
            <View style={s.heroStars}>
              {[1,2,3,4,5].map(n => (
                <Ionicons
                  key={n}
                  name={parseFloat(avgRating) >= n ? "star" : parseFloat(avgRating) >= n - 0.5 ? "star-half" : "star-outline"}
                  size={14}
                  color="#FCD34D"
                />
              ))}
              <Text style={s.heroRatingTxt}>{avgRating}</Text>
              {totalJobs > 0 && <Text style={s.heroJobsTxt}>· {totalJobs} jobs</Text>}
            </View>

            {/* Location */}
            <View style={s.heroLocRow}>
              <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={s.heroLocation}>
                {[profile.village, profile.state].filter(Boolean).join(", ") || "Location not set"}
              </Text>
            </View>
          </View>

          {/* Stats cards row */}
          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statCardVal}>₹{profile.daily_rate || 0}</Text>
              <Text style={s.statCardLabel}>Per day</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statCardVal}>{totalJobs}</Text>
              <Text style={s.statCardLabel}>Jobs done</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statCardVal}>{avgRating}</Text>
              <Text style={s.statCardLabel}>Rating</Text>
            </View>
            <View style={[s.statCard, { borderRightWidth: 0 }]}>
              <Text style={s.statCardVal}>{TIER_BADGE[profile.trust_tier || 1]}</Text>
              <Text style={s.statCardLabel}>{TIER_NAMES[profile.trust_tier || 1]}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: spacing.lg, paddingBottom: 40 }}>

          {/* ── Edit button (view mode only) ─────────────────────────── */}
          {!editing && (
            <Button
              title="Edit Profile"
              variant="outline"
              icon={<Ionicons name="create-outline" size={15} color={colors.text} />}
              onPress={() => setEditing(true)}
            />
          )}

          {editing ? (
            /* ── EDIT MODE: full form ────────────────────────────────── */
            <>
              <SectionHeader icon="hammer-outline" title="Skills" />
              {SKILL_CATEGORIES.map(cat => (
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
              ))}
              <SectionHeader icon="cash-outline" title="Daily Rate" />
              <TextInput
                style={s.input}
                value={dailyRate}
                onChangeText={v => setDailyRate(v.replace(/\D/g,""))}
                keyboardType="number-pad"
                placeholder="e.g. 500"
                placeholderTextColor={colors.textMuted}
              />
              <SectionHeader icon="document-text-outline" title="About me" />
              <TextInput
                style={[s.input, { minHeight: 90, textAlignVertical: "top" }]}
                value={bio}
                onChangeText={setBio}
                multiline
                placeholder="Describe your experience and availability…"
                placeholderTextColor={colors.textMuted}
              />
            </>
          ) : (
            /* ── VIEW MODE: compact one-screen ──────────────────────── */
            <>
              {/* Skills — horizontal scroll row */}
              <View style={s.compactSection}>
                <Text style={s.compactLabel}>Skills</Text>
                {(profile.skills || []).length === 0 ? (
                  <Text style={s.emptySub}>No skills — tap Edit to add.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection:"row", gap:8, paddingVertical:4 }}>
                      {profile.skills.map(sk => (
                        <View key={sk} style={s.skillTag}>
                          <Text style={s.skillTagTxt}>{sk}</Text>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}
              </View>

              {/* Rate + Bio in one band */}
              <View style={s.infoBand}>
                <View style={s.infoBandLeft}>
                  <Text style={s.infoBandLabel}>Daily Rate</Text>
                  <Text style={s.infoBandRate}>₹{profile.daily_rate || "—"}</Text>
                  <Text style={s.infoBandSub}>/day</Text>
                </View>
                <View style={s.infoBandSep} />
                <View style={s.infoBandRight}>
                  <Text style={s.infoBandLabel}>About</Text>
                  <Text style={s.infoBandBio} numberOfLines={3}>
                    {profile.bio || "No bio yet — tap Edit to add."}
                  </Text>
                </View>
              </View>

              {/* Location — single line */}
              {(profile.address?.village || profile.village) && (
                <View style={s.locLine}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={s.locLineTxt} numberOfLines={1}>
                    {[profile.address?.village || profile.village, profile.address?.district, profile.address?.state].filter(Boolean).join(", ")}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ── Actions row ─────────────────────────────────────────── */}
          <View style={s.actionsRow}>
            <Pressable style={s.actionBtn} onPress={() => navigation.navigate("ContactSupport")}>
              <Ionicons name="help-circle-outline" size={22} color={colors.saffron} />
              <Text style={s.actionBtnTxt}>Help</Text>
            </Pressable>
            <View style={s.actionSep} />
            <Pressable style={s.actionBtn} onPress={doLogout}>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={[s.actionBtnTxt, { color: colors.danger }]}>Logout</Text>
            </Pressable>
            <View style={s.actionSep} />
            <Pressable style={s.actionBtn} onPress={doDeactivate}>
              <Ionicons name="warning-outline" size={22} color={colors.textMuted} />
              <Text style={[s.actionBtnTxt, { color: colors.textMuted }]}>Deactivate</Text>
            </Pressable>
          </View>

        </View>
      </ScrollView>

      {/* ── Sticky save footer (edit mode only) ──────────────────── */}
      {editing && (
        <View style={s.saveFooter}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={() => { setEditing(false); load(); }}
            style={{ flex: 1 }}
          />
          <Button
            title={saving ? "Saving…" : "Save changes"}
            onPress={save}
            loading={saving}
            style={{ flex: 2 }}
          />
        </View>
      )}
      {/* Deactivate TnC Modal */}
      <Modal visible={showDeactivateModal} transparent animationType="slide" onRequestClose={() => setShowDeactivateModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>⚠️ Deactivate Account?</Text>
            <ScrollView style={s.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.modalBody}>Please read before confirming:{"\n\n"}
                <Text style={s.modalBold}>What happens when you deactivate:{"\n"}</Text>
                {"• "}Your worker profile will be hidden immediately{"\n"}
                {"• "}You will be logged out of the app{"\n"}
                {"• "}All active bookings will be cancelled{"\n"}
                {"• "}Customers will not be able to find or book you{"\n\n"}
                <Text style={s.modalBold}>Reactivation:{"\n"}</Text>
                {"• "}You can reactivate within 30 days by logging in again with your phone number{"\n"}
                {"• "}After 30 days your data will be permanently deleted and cannot be recovered{"\n\n"}
                <Text style={s.modalBold}>By tapping "Deactivate" you agree to KaamNow's Terms & Conditions and confirm you understand the above.
                </Text>
              </Text>
            </ScrollView>
            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setShowDeactivateModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={s.modalConfirm} onPress={confirmDeactivate}>
                <Text style={s.modalConfirmTxt}>Deactivate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <View style={{ flexDirection:"row", alignItems:"center", gap:7, marginTop:22, marginBottom:10 }}>
      <Ionicons name={icon} size={16} color={colors.saffron} />
      <Text style={{ fontFamily:fonts.bodyBold, fontSize:12, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary }}>{title}</Text>
    </View>
  );
}


const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.bg },
  center: { flex:1, alignItems:"center", justifyContent:"center", padding:40 },
  emptyTitle: { fontFamily:fonts.display, fontSize:22, color:colors.text, textAlign:"center", marginBottom:8 },
  emptySub: { fontFamily:fonts.body, fontSize:13, color:colors.textMuted, textAlign:"center" },
  // Hero
  heroGrad: { paddingTop:spacing.md, paddingBottom:0, paddingHorizontal:spacing.lg, position:"relative", overflow:"hidden" },
  blob1: { position:"absolute", width:240, height:240, borderRadius:120, backgroundColor:"rgba(255,255,255,0.06)", top:-80, right:-60 },
  blob2: { position:"absolute", width:140, height:140, borderRadius:70, backgroundColor:"rgba(255,255,255,0.05)", bottom:40, left:-40 },
  blob3: { position:"absolute", width:80, height:80, borderRadius:40, backgroundColor:"rgba(255,255,255,0.07)", top:30, left:30 },
  heroTopRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:spacing.md },
  workerBadge: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(255,255,255,0.15)", paddingVertical:6, paddingHorizontal:12, borderRadius:20 },
  workerBadgeTxt: { fontFamily:fonts.bodyBold, fontSize:11, color:"#fff" },
  availToggleBtn: { flexDirection:"row", alignItems:"center", gap:4, paddingVertical:5, paddingHorizontal:10, borderRadius:20 },
  availToggleBtnOn: { backgroundColor:"rgba(74,222,128,0.25)", borderWidth:1, borderColor:"rgba(74,222,128,0.4)" },
  availToggleBtnOff: { backgroundColor:"rgba(255,255,255,0.12)", borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  availDot: { width:7, height:7, borderRadius:4 },
  availDotOn: { backgroundColor:"#4ADE80" },
  availDotOff: { backgroundColor:"rgba(255,255,255,0.4)" },
  availToggleTxt: { fontFamily:fonts.bodyBold, fontSize:11, color:"#fff" },
  heroCenter: { alignItems:"center", marginBottom:spacing.lg },
  photoRing: { width:108, height:108, borderRadius:54, borderWidth:3, borderColor:"rgba(255,255,255,0.35)", alignItems:"center", justifyContent:"center", marginBottom:14, position:"relative" },
  photo: { width:102, height:102, borderRadius:51 },
  photoFallback: { backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  photoInitials: { fontFamily:fonts.display, fontSize:38, color:"#fff" },
  cameraBadge: { position:"absolute", bottom:2, right:2, backgroundColor:colors.saffron, borderRadius:14, padding:5, borderWidth:2, borderColor:"#fff" },
  heroName: { fontFamily:fonts.display, fontSize:26, color:"#fff", marginBottom:8 },
  heroStars: { flexDirection:"row", alignItems:"center", gap:3, marginBottom:8 },
  heroRatingTxt: { fontFamily:fonts.bodyBold, fontSize:13, color:"#FCD34D", marginLeft:4 },
  heroJobsTxt: { fontFamily:fonts.body, fontSize:12, color:"rgba(255,255,255,0.65)" },
  heroLocRow: { flexDirection:"row", alignItems:"center", gap:4 },
  heroLocation: { fontFamily:fonts.body, fontSize:12, color:"rgba(255,255,255,0.75)" },
  statsRow: { flexDirection:"row", backgroundColor:"rgba(255,255,255,0.12)", borderTopLeftRadius:14, borderTopRightRadius:14, overflow:"hidden" },
  statCard: { flex:1, alignItems:"center", paddingVertical:14, borderRightWidth:1, borderRightColor:"rgba(255,255,255,0.15)" },
  statCardVal: { fontFamily:fonts.display, fontSize:20, color:"#fff" },
  statCardLabel: { fontFamily:fonts.bodyBold, fontSize:9, letterSpacing:1, textTransform:"uppercase", color:"rgba(255,255,255,0.6)", marginTop:2 },
  // Form
  catLabel: { fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary, marginBottom:8 },
  chipRow: { flexDirection:"row", flexWrap:"wrap", gap:8 },
  chip: { paddingVertical:8, paddingHorizontal:14, borderRadius:20, backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.border },
  chipOn: { backgroundColor:colors.saffronTint, borderColor:colors.saffron },
  chipTxt: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.textSecondary },
  chipTxtOn: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.saffron },
  input: { backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.saffron, borderRadius:12, paddingVertical:13, paddingHorizontal:14, fontFamily:fonts.body, fontSize:15, color:colors.text },
  valueCard: { flexDirection:"row", alignItems:"baseline", gap:6, backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, padding:16 },
  valueBig: { fontFamily:fonts.display, fontSize:32, color:colors.saffron },
  valueSub: { fontFamily:fonts.body, fontSize:13, color:colors.textMuted },
  bioText: { fontFamily:fonts.body, fontSize:14, color:colors.textSecondary, lineHeight:22 },
  locationCard: { backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, overflow:"hidden" },
  locRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:12, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:colors.border },
  locLabel: { fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1, textTransform:"uppercase", color:colors.textMuted },
  locVal: { fontFamily:fonts.bodySemi, fontSize:13, color:colors.text },

  // Compact view mode
  compactSection: { marginTop: 18, marginBottom: 4 },
  compactLabel: { fontFamily:fonts.bodyBold, fontSize:10, letterSpacing:1.3, textTransform:"uppercase", color:colors.textSecondary, marginBottom:8 },
  skillTag: { backgroundColor:colors.saffronTint, borderWidth:1, borderColor:colors.border, paddingHorizontal:12, paddingVertical:6, borderRadius:20 },
  skillTagTxt: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.saffron },

  infoBand: { flexDirection:"row", marginTop:14, backgroundColor:"#fff", borderRadius:14, borderWidth:1, borderColor:colors.border, overflow:"hidden" },
  infoBandLeft: { flex:1, padding:14, alignItems:"center" },
  infoBandSep: { width:1, backgroundColor:colors.border },
  infoBandRight: { flex:2, padding:14 },
  infoBandLabel: { fontFamily:fonts.bodyBold, fontSize:9, letterSpacing:1.2, textTransform:"uppercase", color:colors.textMuted, marginBottom:4 },
  infoBandRate: { fontFamily:fonts.display, fontSize:28, color:colors.money },
  infoBandSub: { fontFamily:fonts.body, fontSize:11, color:colors.textMuted },
  infoBandBio: { fontFamily:fonts.body, fontSize:13, color:colors.textSecondary, lineHeight:19 },

  locLine: { flexDirection:"row", alignItems:"center", gap:5, marginTop:12, paddingHorizontal:4 },
  locLineTxt: { fontFamily:fonts.body, fontSize:12, color:colors.textMuted, flex:1 },

  saveFooter: { flexDirection:"row", gap:10, padding:spacing.lg, paddingBottom:spacing.xl, backgroundColor:"#fff", borderTopWidth:1, borderTopColor:colors.border },
  actionsRow: { flexDirection:"row", marginTop:24, backgroundColor:"#fff", borderRadius:14, borderWidth:1, borderColor:colors.border, overflow:"hidden" },
  actionBtn: { flex:1, alignItems:"center", paddingVertical:16, gap:5 },
  actionBtnTxt: { fontFamily:fonts.bodyBold, fontSize:11, color:colors.saffron },
  actionSep: { width:1, backgroundColor:colors.border },
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.55)", justifyContent:"flex-end" },
  modalCard: { backgroundColor:"#fff", borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:"80%" },
  modalTitle: { fontFamily:fonts.bodyBold, fontSize:18, color:colors.text, marginBottom:16, textAlign:"center" },
  modalScroll: { maxHeight:320 },
  modalBody: { fontFamily:fonts.body, fontSize:14, color:colors.textSecondary, lineHeight:22 },
  modalBold: { fontFamily:fonts.bodyBold, color:colors.text },
  modalActions: { flexDirection:"row", gap:12, marginTop:20 },
  modalCancel: { flex:1, paddingVertical:14, borderRadius:12, borderWidth:1.5, borderColor:colors.border, alignItems:"center" },
  modalCancelTxt: { fontFamily:fonts.bodyBold, fontSize:14, color:colors.textSecondary },
  modalConfirm: { flex:1, paddingVertical:14, borderRadius:12, backgroundColor:colors.danger, alignItems:"center" },
  modalConfirmTxt: { fontFamily:fonts.bodyBold, fontSize:14, color:"#fff" },
});
