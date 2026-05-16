import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, Image, RefreshControl, ActivityIndicator,
  Switch, Modal, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import AppScreen from "../components/AppScreen";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import TrustBadge from "../components/TrustBadge";
import { colors, fonts, radius, shadow, spacing } from "../theme";

/* ── Skill taxonomy (unchanged) ─────────────────────────────────────── */
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
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state — exact field names preserved
  const [bio, setBio]               = useState("");
  const [dailyRate, setDailyRate]   = useState("");
  const [skills, setSkills]         = useState([]);
  const [available, setAvailable]   = useState(true);
  const [village, setVillage]       = useState("");
  const [district, setDistrict]     = useState("");
  const [state, setState]           = useState("");
  const [block, setBlock]           = useState("");
  const [togglingAvail, setTogglingAvail] = useState(false);

  /* ── Data load ─────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    try {
      const r = await api.get("/workers/me/profile");
      setProfile(r.data);
      setBio(r.data.bio || "");
      setDailyRate(String(r.data.daily_rate || ""));
      setSkills(r.data.skills || []);
      setAvailable(r.data.available !== false);
      setVillage(r.data.address?.village || r.data.village || "");
      setDistrict(r.data.address?.district || r.data.district || "");
      setState(r.data.address?.state || r.data.state || "");
      setBlock(r.data.address?.block || "");
    } catch { setProfile(null); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  /* ── Skill toggle ──────────────────────────────────────────────────── */
  const toggleSkill = (s) =>
    setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  /* ── Availability toggle (existing API) ────────────────────────────── */
  const toggleAvailability = async (val) => {
    setAvailable(val);
    setTogglingAvail(true);
    try {
      await api.patch("/workers/me/availability", {
        availability_status: val ? "available" : "not_available",
      });
    } catch (e) {
      setAvailable(!val);
      Alert.alert("Error", formatApiError(e));
    } finally { setTogglingAvail(false); }
  };

  /* ── Logout ────────────────────────────────────────────────────────── */
  const doLogout = () => {
    Alert.alert("Log out?", "You'll need your OTP to sign back in.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: async () => {
        try { navigation?.navigate?.("Home"); } catch {}
        await logout();
      }},
    ]);
  };

  /* ── Deactivate ────────────────────────────────────────────────────── */
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const doDeactivate = () => setShowDeactivateModal(true);
  const confirmDeactivate = async () => {
    try {
      setShowDeactivateModal(false);
      await api.delete("/auth/me");
      await logout();
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
  };

  /* ── Save (existing payload preserved exactly) ─────────────────────── */
  const save = async () => {
    const rate = parseInt(dailyRate, 10);
    if (!rate || rate < 100) return Alert.alert("Rate must be at least ₹100");
    if (!skills.length) return Alert.alert("Pick at least one skill");
    setSaving(true);
    try {
      const address = {
        village: village.trim(),
        district: district.trim(),
        state: state.trim(),
        block: block.trim(),
        pincode: profile?.address?.pincode || profile?.pincode || "",
      };
      await Promise.all([
        api.patch("/workers/profile", {
          bio: bio.trim(), daily_rate: rate, skills,
          structured_skills: skills.map(s => ({ category: skillCategory(s), skill: s })),
          village: village.trim(), district: district.trim(),
          state: state.trim(), address,
        }),
        api.patch("/auth/me", { village: village.trim(), address }),
      ]);
      await load(); setEditing(false);
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
    finally { setSaving(false); }
  };

  /* ── Photo upload (existing behavior preserved) ─────────────────────── */
  const uploadAsset = async (asset) => {
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: "photo.jpg", type: "image/jpeg" });
    try {
      await api.post("/workers/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
  };

  const removePhoto = async () => {
    try { await api.patch("/auth/me", { photo_url: null }); await load(); }
    catch (e) { Alert.alert("Error", formatApiError(e)); }
  };

  const pickPhoto = () => {
    Alert.alert("Profile photo", "Choose an option", [
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
    ]);
  };

  /* ── Loading / error states ─────────────────────────────────────────── */
  if (loading) return (
    <AppScreen style={s.safe}>
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    </AppScreen>
  );

  if (!profile) return (
    <AppScreen style={s.safe}>
      <View style={s.center}>
        <Ionicons name="person-circle-outline" size={64} color={colors.textMuted} />
        <Text style={s.emptyTitle}>Profile setup karna baaki hai</Text>
        <Text style={s.emptySub}>Worker profile banao aur kaam pao.</Text>
        <PrimaryButton
          title="Setup karein"
          onPress={() => navigation.navigate("WorkerOnboarding")}
          style={{ marginTop: 20 }}
        />
      </View>
    </AppScreen>
  );

  /* ── Derived values ─────────────────────────────────────────────────── */
  const avgRating = (profile.avg_rating || 0).toFixed(1);
  const totalJobs = profile.total_jobs || 0;
  const tier      = profile.trust_tier || 1;

  // Profile completion checklist
  const completionItems = [
    { label: "Profile photo", done: !!profile.photo_url },
    { label: "Skills",        done: (profile.skills || []).length > 0 },
    { label: "Daily rate",    done: !!(profile.daily_rate) },
    { label: "About me",      done: !!profile.bio },
    { label: "Location",      done: !!(profile.address?.village || profile.village) },
  ];
  const completionPct = Math.round(
    completionItems.filter(i => i.done).length / completionItems.length * 100
  );

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: editing ? 120 : 48 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══ GRADIENT HERO ══════════════════════════════════════════ */}
          <LinearGradient
            colors={["#0A5C56", "#0F766E", "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.heroGrad}
          >
            <View style={s.blob1} />
            <View style={s.blob2} />
            <View style={s.blob3} />

            {/* Top row: screen title + availability toggle */}
            <View style={s.heroTopRow}>
              <View>
                <Text style={s.heroScreenTitle}>Meri Profile</Text>
                <Text style={s.heroScreenSub}>Profile strong rakhein — zyada calls milenge</Text>
              </View>
              <Pressable
                style={[s.availToggleBtn, available ? s.availToggleBtnOn : s.availToggleBtnOff]}
                onPress={() => toggleAvailability(!available)}
                disabled={togglingAvail}
              >
                <View style={[s.availDot, available ? s.availDotOn : s.availDotOff]} />
                <Text style={s.availToggleTxt}>{available ? "Available" : "Busy"}</Text>
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

            {/* Photo + name + rating + trust */}
            <View style={s.heroCenter}>
              <Pressable onPress={pickPhoto} style={s.photoRing}>
                {profile.photo_url
                  ? <Image
                      source={{ uri: profile.photo_url.startsWith("http") ? profile.photo_url : `${API_URL}${profile.photo_url}` }}
                      style={s.photo}
                    />
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
                {totalJobs > 0 && <Text style={s.heroJobsTxt}>· {totalJobs} kaam</Text>}
              </View>

              {tier >= 2 && (
                <View style={s.heroTrustWrap}>
                  <TrustBadge tier={tier} />
                </View>
              )}

              <View style={s.heroLocRow}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={s.heroLocation}>
                  {[profile.village, profile.state].filter(Boolean).join(", ") || "Location not set"}
                </Text>
              </View>
            </View>

            {/* Stats row */}
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
                <Text style={s.statCardVal}>{completionPct}%</Text>
                <Text style={s.statCardLabel}>Complete</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ══ CONTENT ════════════════════════════════════════════════ */}
          <View style={s.content}>

            {/* ── Profile completion card ─────────────────────────────── */}
            {completionPct < 100 && (
              <View style={s.completionCard}>
                <View style={s.completionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.completionTitle}>Profile pura karo</Text>
                    <Text style={s.completionSub}>Zyada complete = zyada job calls milenge</Text>
                  </View>
                  <Text style={s.completionPctTxt}>{completionPct}%</Text>
                </View>
                <View style={s.completionBar}>
                  <View style={[s.completionFill, { width: `${completionPct}%` }]} />
                </View>
                <View style={s.completionList}>
                  {completionItems.map(item => (
                    <View key={item.label} style={s.completionItem}>
                      <View style={[s.completionDot, item.done && s.completionDotDone]}>
                        {item.done
                          ? <Ionicons name="checkmark" size={10} color="#fff" />
                          : null}
                      </View>
                      <Text style={[s.completionLabel, item.done && s.completionLabelDone]}>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Edit button (view mode) ─────────────────────────────── */}
            {!editing && (
              <PrimaryButton
                title="Profile edit karein"
                icon={<Ionicons name="create-outline" size={15} color="#fff" />}
                onPress={() => setEditing(true)}
                style={s.editBtn}
              />
            )}

            {editing ? (
              /* ──────────────── EDIT MODE ──────────────────────────── */
              <>
                <SectionHeader icon="hammer-outline" title="Skills" />
                {SKILL_CATEGORIES.map(cat => (
                  <View key={cat.category} style={s.skillCatBlock}>
                    <Text style={s.skillCatLabel}>{cat.category}</Text>
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
                <InputField
                  label="Rate (₹ per day)"
                  value={dailyRate}
                  onChangeText={v => setDailyRate(v.replace(/\D/g, ""))}
                  keyboardType="number-pad"
                  placeholder="e.g. 500"
                />

                <SectionHeader icon="document-text-outline" title="About me" />
                <TextInput
                  style={s.bioInput}
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  numberOfLines={4}
                  placeholder="Apna experience aur kaam ka description likho…"
                  placeholderTextColor={colors.textMuted}
                />

                <SectionHeader icon="location-outline" title="Address" />
                <InputField
                  label="Village / Area"
                  value={village}
                  onChangeText={setVillage}
                  placeholder="Aapka gaon ya area"
                />
                <InputField
                  label="District"
                  value={district}
                  onChangeText={setDistrict}
                  placeholder="District"
                  style={{ marginTop: 8 }}
                />
                <InputField
                  label="State"
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                  style={{ marginTop: 8 }}
                />
                <InputField
                  label="Block (optional)"
                  value={block}
                  onChangeText={setBlock}
                  placeholder="Block / Tehsil"
                  style={{ marginTop: 8 }}
                />
                <View style={s.lockedRow}>
                  <Ionicons name="lock-closed-outline" size={12} color={colors.textMuted} />
                  <Text style={s.lockedTxt}>
                    Pincode: {profile?.address?.pincode || profile?.pincode || "—"} · Phone: {profile?.phone || "—"} (cannot be changed here)
                  </Text>
                </View>
              </>
            ) : (
              /* ──────────────── VIEW MODE ──────────────────────────── */
              <>
                {/* Skills */}
                <View style={s.viewSection}>
                  <Text style={s.viewSectionLabel}>Skills</Text>
                  {(profile.skills || []).length === 0 ? (
                    <Text style={s.emptySub}>No skills — tap Edit to add.</Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                        {profile.skills.map(sk => (
                          <View key={sk} style={s.skillTag}>
                            <Text style={s.skillTagTxt}>{sk}</Text>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  )}
                </View>

                {/* Rate + Bio */}
                <View style={s.infoBand}>
                  <View style={s.infoBandLeft}>
                    <Text style={s.infoBandLabel}>Daily Rate</Text>
                    <Text style={s.infoBandRate}>₹{profile.daily_rate || "—"}</Text>
                    <Text style={s.infoBandSub}>/day</Text>
                  </View>
                  <View style={s.infoBandSep} />
                  <View style={s.infoBandRight}>
                    <Text style={s.infoBandLabel}>About</Text>
                    <Text style={s.infoBandBio} numberOfLines={4}>
                      {profile.bio || "No bio yet — tap Edit to add."}
                    </Text>
                  </View>
                </View>

                {/* Address */}
                <View style={s.addrCard}>
                  <View style={s.addrCardHeader}>
                    <View style={s.addrCardIcon}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                    </View>
                    <Text style={s.addrCardTitle}>Address</Text>
                  </View>
                  {[
                    { label: "Village",  val: profile.address?.village || profile.village },
                    { label: "Block",    val: profile.address?.block },
                    { label: "District", val: profile.address?.district || profile.district },
                    { label: "State",    val: profile.address?.state || profile.state },
                    { label: "Pincode",  val: profile.address?.pincode || profile.pincode },
                  ].filter(r => r.val).map(r => (
                    <View key={r.label} style={s.addrFieldRow}>
                      <Text style={s.addrFieldLabel}>{r.label}</Text>
                      <Text style={s.addrFieldVal}>{r.val}</Text>
                    </View>
                  ))}
                  {!profile.address?.village && !profile.village && (
                    <Text style={s.emptySub}>No address — tap Edit to add.</Text>
                  )}
                </View>

                {/* Account / trust info */}
                <View style={s.accountCard}>
                  <Text style={s.accountCardTitle}>Account</Text>
                  {[
                    { icon: "call-outline",     label: "Phone",      val: profile.phone || user?.phone || "—",    verified: true },
                    { icon: "location-outline", label: "Pincode",    val: profile.address?.pincode || profile.pincode || "—", verified: !!(profile.address?.pincode || profile.pincode) },
                    { icon: "eye-outline",      label: "Visibility", val: "Visible to customers",                 verified: true },
                  ].map(row => (
                    <View key={row.label} style={s.accountRow}>
                      <View style={s.accountIconWrap}>
                        <Ionicons name={row.icon} size={15} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.accountRowLabel}>{row.label}</Text>
                        <Text style={s.accountRowVal}>{row.val}</Text>
                      </View>
                      {row.verified && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* ── Actions ─────────────────────────────────────────────── */}
            <View style={s.actionsRow}>
              <Pressable style={s.actionBtn} onPress={() => navigation.navigate("ContactSupport")}>
                <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
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

        {/* ── Sticky save footer (edit mode only) ─────────────────────── */}
        {editing && (
          <View style={s.saveFooter}>
            <SecondaryButton
              title="Cancel"
              onPress={() => { setEditing(false); load(); }}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title={saving ? "Saving…" : "Save changes"}
              onPress={save}
              loading={saving}
              style={{ flex: 2 }}
            />
          </View>
        )}

        {/* ── Deactivate modal (unchanged content) ────────────────────── */}
        <Modal
          visible={showDeactivateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDeactivateModal(false)}
        >
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
                  <Text style={s.modalBold}>By tapping "Deactivate" you agree to KaamNow's Terms & Conditions and confirm you understand the above.</Text>
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
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

/* ── Section header ──────────────────────────────────────────────────── */
function SectionHeader({ icon, title }) {
  return (
    <View style={s.sectionHeader}>
      <View style={s.sectionHeaderIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={s.sectionHeaderTitle}>{title}</Text>
    </View>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: "center" },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },

  // ── Hero gradient ──────────────────────────────────────────────────
  heroGrad: { paddingTop: spacing.md, paddingBottom: 0, paddingHorizontal: spacing.lg, position: "relative", overflow: "hidden" },
  blob1: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "rgba(255,255,255,0.06)", top: -80, right: -60 },
  blob2: { position: "absolute", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.05)", bottom: 40, left: -40 },
  blob3: { position: "absolute", width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.07)", top: 30, left: 30 },

  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  heroScreenTitle: { fontFamily: fonts.display, fontSize: 22, color: "#fff" },
  heroScreenSub: { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  availToggleBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  availToggleBtnOn: { backgroundColor: "rgba(74,222,128,0.25)", borderWidth: 1, borderColor: "rgba(74,222,128,0.4)" },
  availToggleBtnOff: { backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  availDot: { width: 7, height: 7, borderRadius: 4 },
  availDotOn: { backgroundColor: "#4ADE80" },
  availDotOff: { backgroundColor: "rgba(255,255,255,0.4)" },
  availToggleTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },

  heroCenter: { alignItems: "center", marginBottom: spacing.lg },
  photoRing: { width: 108, height: 108, borderRadius: 54, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 14, position: "relative" },
  photo: { width: 102, height: 102, borderRadius: 51 },
  photoFallback: { backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  photoInitials: { fontFamily: fonts.display, fontSize: 38, color: "#fff" },
  cameraBadge: { position: "absolute", bottom: 2, right: 2, backgroundColor: colors.primary, borderRadius: 14, padding: 5, borderWidth: 2, borderColor: "#fff" },
  heroName: { fontFamily: fonts.display, fontSize: 26, color: "#fff", marginBottom: 8 },
  heroStars: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 8 },
  heroRatingTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#FCD34D", marginLeft: 4 },
  heroJobsTxt: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.65)" },
  heroTrustWrap: { marginBottom: 8 },
  heroLocRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroLocation: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.75)" },

  statsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderTopLeftRadius: 14, borderTopRightRadius: 14, overflow: "hidden" },
  statCard: { flex: 1, alignItems: "center", paddingVertical: 14, borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.15)" },
  statCardVal: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  statCardLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginTop: 2 },

  // ── Content area ───────────────────────────────────────────────────
  content: { padding: spacing.lg, paddingBottom: 8 },

  // ── Completion card ────────────────────────────────────────────────
  completionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow.xs,
  },
  completionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 },
  completionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  completionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  completionPctTxt: { fontFamily: fonts.display, fontSize: 26, color: colors.primary },
  completionBar: { height: 6, backgroundColor: colors.surface2, borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  completionFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
  completionList: { gap: 8 },
  completionItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  completionDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.surface2, alignItems: "center", justifyContent: "center" },
  completionDotDone: { backgroundColor: colors.success },
  completionLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  completionLabelDone: { color: colors.textMuted, textDecorationLine: "line-through" },

  // Edit button
  editBtn: { marginBottom: spacing.lg },

  // ── Section header ─────────────────────────────────────────────────
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 12 },
  sectionHeaderIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  sectionHeaderTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },

  // ── Skill chips ────────────────────────────────────────────────────
  skillCatBlock: { marginBottom: 14 },
  skillCatLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, minHeight: 36, justifyContent: "center" },
  chipOn: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.textSecondary },
  chipTxtOn: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },

  // Bio input (multiline — kept as styled TextInput for reliability)
  bioInput: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.body, fontSize: 14, color: colors.text, minHeight: 100, textAlignVertical: "top" },

  lockedRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  lockedTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, flex: 1 },

  // ── View mode ──────────────────────────────────────────────────────
  viewSection: { marginTop: 16, marginBottom: 4 },
  viewSectionLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 8 },
  skillTag: { backgroundColor: colors.primaryLight, borderWidth: 1, borderColor: colors.primary + "40", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  skillTagTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },

  infoBand: { flexDirection: "row", marginTop: 14, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow.xs },
  infoBandLeft: { flex: 1, padding: 14, alignItems: "center" },
  infoBandSep: { width: 1, backgroundColor: colors.border },
  infoBandRight: { flex: 2, padding: 14 },
  infoBandLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textMuted, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  infoBandRate: { fontFamily: fonts.display, fontSize: 28, color: colors.money },
  infoBandSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  infoBandBio: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

  addrCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: 14, ...shadow.xs },
  addrCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  addrCardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  addrCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  addrFieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
  addrFieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  addrFieldVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },

  accountCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: 14, ...shadow.xs },
  accountCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginBottom: 12 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
  accountIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  accountRowLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  accountRowVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text, marginTop: 1 },

  // ── Actions row ────────────────────────────────────────────────────
  actionsRow: { flexDirection: "row", marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow.xs },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 5, minHeight: 44 },
  actionBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  actionSep: { width: 1, backgroundColor: colors.border },

  // ── Save footer ────────────────────────────────────────────────────
  saveFooter: { flexDirection: "row", gap: 10, padding: spacing.lg, paddingBottom: spacing.xl, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },

  // ── Deactivate modal ───────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: "80%" },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.text, marginBottom: 16, textAlign: "center" },
  modalScroll: { maxHeight: 320 },
  modalBody: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  modalBold: { fontFamily: fonts.bodyBold, color: colors.text },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  modalCancelTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSecondary },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: "center" },
  modalConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
