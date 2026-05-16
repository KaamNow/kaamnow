import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, ActivityIndicator, Image, Modal,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import AppScreen from "../components/AppScreen";
import InputField from "../components/InputField";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import { colors, fonts, radius, shadow, spacing } from "../theme";

export default function CustomerProfileScreen({ navigation }) {
  const { user, refreshUser, logout } = useAuth();
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();

  // Editable state — exact field names preserved
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [name, setName]         = useState(user?.name || "");
  const [village, setVillage]   = useState(user?.village || user?.address?.village || "");

  // Customer activity stats (optional — silent fail)
  const [stats, setStats] = useState({ jobs: 0, hired: 0, done: 0 });
  useEffect(() => {
    api.get("/jobs/mine")
      .then(r => {
        const jobs = Array.isArray(r.data) ? r.data : [];
        setStats(prev => ({ ...prev, jobs: jobs.length }));
      })
      .catch(() => {});
    api.get("/engagements/mine")
      .then(r => {
        const engs = Array.isArray(r.data) ? r.data : [];
        setStats(prev => ({
          ...prev,
          hired: engs.filter(e => ["accepted", "completed"].includes(e.engagement_status || e.status)).length,
          done:  engs.filter(e => (e.engagement_status || e.status) === "completed").length,
        }));
      })
      .catch(() => {});
  }, []);

  /* ── Save (existing payload preserved exactly) ─────────────────────── */
  const save = async () => {
    if (name.trim().length < 2) return Alert.alert("Name must be at least 2 characters");
    setSaving(true);
    try {
      const patchBody = { name: name.trim() };
      if (result && pincode.length === 6) {
        patchBody.pincode = pincode;
        patchBody.village = village.trim() || result.name;
        patchBody.address = {
          village: village.trim() || result.name,
          post: result.name,
          block: result.block || "",
          district: result.district,
          state: result.state,
          pincode,
        };
      } else if (village.trim()) {
        patchBody.village = village.trim();
      }
      await api.patch("/auth/me", patchBody);
      await refreshUser();
      setEditing(false);
    } catch (e) {
      Alert.alert("Error", formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  /* ── Photo upload (existing behavior preserved) ─────────────────────── */
  const uploadPhoto = async (asset) => {
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: "photo.jpg", type: "image/jpeg" });
    try {
      await api.post("/auth/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshUser();
    } catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
  };

  const removePhoto = async () => {
    try { await api.patch("/auth/me", { photo_url: null }); await refreshUser(); }
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
          if (!r.canceled && r.assets?.[0]) await uploadPhoto(r.assets[0]);
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return Alert.alert("Photo library permission needed");
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: ["images"] });
          if (!r.canceled && r.assets?.[0]) await uploadPhoto(r.assets[0]);
        },
      },
      ...(user?.photo_url ? [{ text: "Remove photo", style: "destructive", onPress: removePhoto }] : []),
      { text: "Cancel", style: "cancel" },
    ]);
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

  if (!user) return null;

  const addr      = user.address || {};
  const initials  = (user.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const hasAddr   = !!(addr.village || user.village);

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <AppScreen edges={["top"]} style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: editing ? 120 : 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ══ GRADIENT HERO ══════════════════════════════════════════ */}
          <LinearGradient
            colors={["#0A5C56", "#0F766E", "#0D9488"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.hero}
          >
            <View style={s.blob1} />
            <View style={s.blob2} />
            <View style={s.blob3} />

            {/* Top row: screen title */}
            <View style={s.heroTopRow}>
              <View>
                <Text style={s.heroScreenTitle}>Meri Profile</Text>
                <Text style={s.heroScreenSub}>Apni details updated rakhein</Text>
              </View>
              {user.phone_verified && (
                <View style={s.verifiedPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#4ADE80" />
                  <Text style={s.verifiedPillTxt}>Verified</Text>
                </View>
              )}
            </View>

            {/* Avatar */}
            <Pressable style={s.avatarRing} onPress={pickPhoto}>
              {user.photo_url
                ? <Image
                    source={{ uri: user.photo_url.startsWith("http") ? user.photo_url : `${API_URL}${user.photo_url}` }}
                    style={s.avatarImg}
                  />
                : <View style={s.avatar}>
                    <Text style={s.avatarText}>{initials}</Text>
                  </View>}
              <View style={s.cameraBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </Pressable>

            <Text style={s.heroName}>{user.name || "Customer"}</Text>
            <Text style={s.heroPhone}>{user.phone_primary}</Text>

            {/* Location + district pills */}
            <View style={s.heroMeta}>
              {addr.state && (
                <View style={s.heroPill}>
                  <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
                  <Text style={s.heroPillText}>
                    {addr.district ? `${addr.district}, ` : ""}{addr.state}
                  </Text>
                </View>
              )}
            </View>

            {/* Stats row */}
            <View style={s.heroStatsRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{stats.jobs}</Text>
                <Text style={s.heroStatLabel}>Jobs posted</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{stats.hired}</Text>
                <Text style={s.heroStatLabel}>Hired</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatVal}>{stats.done}</Text>
                <Text style={s.heroStatLabel}>Done</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ══ CONTENT ════════════════════════════════════════════════ */}
          <View style={s.content}>

            {/* ── Location nudge if missing ────────────────────────────── */}
            {!hasAddr && !editing && (
              <Pressable style={s.locationNudge} onPress={() => setEditing(true)}>
                <View style={s.locationNudgeIcon}>
                  <Ionicons name="location-outline" size={18} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.locationNudgeTitle}>Location add karein</Text>
                  <Text style={s.locationNudgeSub}>Nearby workers better milenge</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.warning} />
              </Pressable>
            )}

            {/* ── Edit / Save buttons ──────────────────────────────────── */}
            {!editing ? (
              <PrimaryButton
                title="Profile edit karein"
                icon={<Ionicons name="create-outline" size={15} color="#fff" />}
                onPress={() => setEditing(true)}
                style={s.editBtn}
              />
            ) : (
              <View style={s.editActionRow}>
                <SecondaryButton
                  title="Cancel"
                  onPress={() => {
                    setEditing(false);
                    setName(user.name || "");
                    setVillage(user.village || user.address?.village || "");
                  }}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title={saving ? "Saving…" : "Save"}
                  onPress={save}
                  loading={saving}
                  style={{ flex: 2 }}
                />
              </View>
            )}

            {/* ── Name ────────────────────────────────────────────────── */}
            <SectionHeader icon="person-outline" title="Full Name" />
            {editing ? (
              <InputField
                label="Poora naam"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Aapka naam"
              />
            ) : (
              <View style={s.infoCard}>
                <Text style={s.infoCardVal}>{user.name || "—"}</Text>
              </View>
            )}

            {/* ── Phone (read-only) ────────────────────────────────────── */}
            <SectionHeader icon="call-outline" title="Phone" />
            <View style={s.infoCard}>
              <Text style={s.infoCardVal}>{user.phone_primary || "—"}</Text>
              <View style={s.infoCardRight}>
                {user.phone_verified && (
                  <View style={s.verifiedChip}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                    <Text style={s.verifiedChipTxt}>Verified</Text>
                  </View>
                )}
                <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
              </View>
            </View>

            {/* ── Address ─────────────────────────────────────────────── */}
            <SectionHeader icon="location-outline" title="Address" />
            {editing ? (
              <View style={s.editAddressBlock}>
                {/* Pincode with live lookup */}
                <Text style={s.fieldLabel}>Pincode</Text>
                <View style={s.pincodeRow}>
                  <TextInput
                    style={[s.pincodeInput, pincode.length === 6 && status === "success" && s.pincodeInputSuccess]}
                    placeholder="6-digit pincode"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    value={pincode}
                    onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                  />
                  {status === "loading" && (
                    <ActivityIndicator color={colors.primary} style={s.pincodeStatus} />
                  )}
                  {status === "success" && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} style={s.pincodeStatus} />
                  )}
                </View>
                {status === "success" && result && (
                  <View style={s.pinSuccessBox}>
                    <Ionicons name="location" size={13} color={colors.success} />
                    <Text style={s.pinSuccessText}>{result.district} · {result.state}</Text>
                  </View>
                )}
                {status === "error" && errorMsg ? (
                  <Text style={s.errorText}>{errorMsg}</Text>
                ) : null}

                <InputField
                  label="Village / Town"
                  value={village}
                  onChangeText={setVillage}
                  placeholder="Aapka gaon ya area"
                  style={{ marginTop: 10 }}
                />
              </View>
            ) : (
              <View style={s.addrCard}>
                <View style={s.addrCardHeader}>
                  <View style={s.addrCardIcon}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                  </View>
                  <Text style={s.addrCardTitle}>Location</Text>
                </View>
                {[
                  { label: "Village",  val: addr.village || user.village },
                  { label: "Block",    val: addr.block },
                  { label: "District", val: addr.district },
                  { label: "State",    val: addr.state },
                  { label: "Pincode",  val: addr.pincode || user.pincode },
                ].filter(r => r.val).map(r => (
                  <View key={r.label} style={s.addrFieldRow}>
                    <Text style={s.addrFieldLabel}>{r.label}</Text>
                    <Text style={s.addrFieldVal}>{r.val}</Text>
                  </View>
                ))}
                {!hasAddr && (
                  <View style={s.addrEmpty}>
                    <Ionicons name="location-outline" size={20} color={colors.textMuted} />
                    <Text style={s.addrEmptyText}>
                      No address saved.{"\n"}Tap "Profile edit karein" to add.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Account info ─────────────────────────────────────────── */}
            {!editing && (
              <View style={s.accountCard}>
                <Text style={s.accountCardTitle}>Account</Text>
                {[
                  { icon: "call-outline",     label: "Phone",      val: user.phone_primary || "—",   verified: !!user.phone_verified },
                  { icon: "person-outline",   label: "Role",       val: "Customer",                  verified: true },
                  { icon: "eye-outline",      label: "Visibility", val: "Active & visible",           verified: true },
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
            )}

            {/* ── Actions row ──────────────────────────────────────────── */}
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
      </KeyboardAvoidingView>

      {/* ── Deactivate modal (content unchanged) ────────────────────────── */}
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
                {"• "}Your account will be hidden immediately{"\n"}
                {"• "}You will be logged out of the app{"\n"}
                {"• "}All your bookings will be cancelled{"\n"}
                {"• "}Workers will not be able to find you{"\n\n"}
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

  // ── Hero gradient ──────────────────────────────────────────────────
  hero: { paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: 0, alignItems: "center", position: "relative", overflow: "hidden" },
  blob1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  blob2: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.05)", bottom: 30, left: -30 },
  blob3: { position: "absolute", width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(255,255,255,0.07)", top: 20, left: 20 },

  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", alignSelf: "stretch", marginBottom: spacing.md },
  heroScreenTitle: { fontFamily: fonts.display, fontSize: 22, color: "#fff" },
  heroScreenSub: { fontFamily: fonts.body, fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },

  verifiedPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(74,222,128,0.2)", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: "rgba(74,222,128,0.35)" },
  verifiedPillTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },

  avatarRing: { width: 106, height: 106, borderRadius: 53, borderWidth: 3, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarText: { fontFamily: fonts.display, fontSize: 36, color: "#fff" },
  cameraBadge: { position: "absolute", bottom: 2, right: 2, backgroundColor: colors.primary, borderRadius: 14, padding: 5, borderWidth: 2, borderColor: "#fff" },

  heroName: { fontFamily: fonts.display, fontSize: 24, color: "#fff", marginBottom: 4 },
  heroPhone: { fontFamily: fonts.bodySemi, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 14 },

  heroMeta: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: spacing.lg },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  heroPillText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },

  heroStatsRow: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.12)", borderTopLeftRadius: 14, borderTopRightRadius: 14, width: "100%", overflow: "hidden" },
  heroStat: { flex: 1, alignItems: "center", paddingVertical: 13 },
  heroStatVal: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  heroStatLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  heroStatSep: { width: 1, backgroundColor: "rgba(255,255,255,0.15)" },

  // ── Content area ───────────────────────────────────────────────────
  content: { padding: spacing.lg, paddingBottom: 8 },

  // Location nudge
  locationNudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  locationNudgeIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  locationNudgeTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#92400E" },
  locationNudgeSub: { fontFamily: fonts.body, fontSize: 12, color: "#A16207", marginTop: 2 },

  // Edit/save buttons
  editBtn: { marginBottom: spacing.lg },
  editActionRow: { flexDirection: "row", gap: 10, marginBottom: spacing.lg },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20, marginBottom: 12 },
  sectionHeaderIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  sectionHeaderTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },

  // Info card (view mode)
  infoCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.xs },
  infoCardVal: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  infoCardRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  verifiedChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  verifiedChipTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },

  // Address edit
  editAddressBlock: { gap: 4 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  pincodeRow: { flexDirection: "row", alignItems: "center" },
  pincodeInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  pincodeInputSuccess: { borderColor: colors.success },
  pincodeStatus: { marginLeft: 10 },
  pinSuccessBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.successLight, padding: 10, borderRadius: radius.sm, marginTop: 4 },
  pinSuccessText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#15803d" },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: colors.danger, marginTop: 4 },

  // Address card (view mode)
  addrCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, ...shadow.xs },
  addrCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  addrCardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  addrCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  addrFieldRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
  addrFieldLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  addrFieldVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  addrEmpty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  addrEmptyText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  // Account info card
  accountCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginTop: 14, ...shadow.xs },
  accountCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, marginBottom: 12 },
  accountRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
  accountIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  accountRowLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textMuted },
  accountRowVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text, marginTop: 1 },

  // Actions row
  actionsRow: { flexDirection: "row", marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadow.xs },
  actionBtn: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 5, minHeight: 44 },
  actionBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.primary },
  actionSep: { width: 1, backgroundColor: colors.border },

  // Deactivate modal
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
