import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, ActivityIndicator, Image, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import api, { formatApiError, API_URL } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, spacing } from "../theme";
import Button from "../components/Button";

export default function CustomerProfileScreen({ navigation }) {
  const { user, refreshUser, logout } = useAuth();
  const { pincode, setPincode, status, result, errorMsg } = usePincodeLookup();

  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [name, setName]         = useState(user?.name || "");
  const [village, setVillage]   = useState(user?.village || user?.address?.village || "");

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

  const uploadPhoto = async (asset) => {
    const form = new FormData();
    form.append("file", { uri: asset.uri, name: "photo.jpg", type: "image/jpeg" });
    try { await api.post("/auth/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } }); await refreshUser(); }
    catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
  };

  const removePhoto = async () => {
    try { await api.patch("/auth/me", { photo_url: null }); await refreshUser(); }
    catch (e) { Alert.alert("Error", formatApiError(e)); }
  };

  const pickPhoto = () => {
    const options = [
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
    ];
    Alert.alert("Profile photo", "Choose an option", options);
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

  if (!user) return null;

  const addr = user.address || {};
  const initials = (user.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Gradient Header ─────────────────────────────────────────── */}
        <LinearGradient colors={["#0A5C56","#0F766E","#0D9488"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.hero}>
          {/* Decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.blob3} />

          {/* Customer badge top-left */}
          <View style={s.custBadge}>
            <Ionicons name="person-outline" size={11} color="#fff" />
            <Text style={s.custBadgeTxt}>Customer</Text>
          </View>

          {/* Avatar */}
          <Pressable style={s.avatarRing} onPress={pickPhoto}>
            {user.photo_url
              ? <Image source={{ uri: user.photo_url.startsWith("http") ? user.photo_url : `${API_URL}${user.photo_url}` }} style={s.avatarImg} />
              : <View style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </View>}
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={13} color="#fff" />
            </View>
          </Pressable>

          <Text style={s.heroName}>{user.name}</Text>
          <Text style={s.heroPhone}>{user.phone_primary}</Text>

          {/* Location + verified pills */}
          <View style={s.heroMeta}>
            {addr.state && (
              <View style={s.heroPill}>
                <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.9)" />
                <Text style={s.heroPillText}>{addr.district ? `${addr.district}, ` : ""}{addr.state}</Text>
              </View>
            )}
            {user.phone_verified && (
              <View style={[s.heroPill, s.heroPillVerified]}>
                <Ionicons name="checkmark-circle" size={11} color="#4ADE80" />
                <Text style={s.heroPillText}>Verified</Text>
              </View>
            )}
          </View>

          {/* Stats shelf */}
          <View style={s.heroStatsRow}>
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{addr.pincode || "—"}</Text>
              <Text style={s.heroStatLabel}>Pincode</Text>
            </View>
            <View style={s.heroStatSep} />
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{addr.district || "—"}</Text>
              <Text style={s.heroStatLabel}>District</Text>
            </View>
            <View style={s.heroStatSep} />
            <View style={s.heroStat}>
              <Text style={s.heroStatVal}>{addr.state || "—"}</Text>
              <Text style={s.heroStatLabel}>State</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: 80 }}>

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
              <Button title="Cancel" variant="outline" onPress={() => { setEditing(false); setName(user.name || ""); setVillage(user.village || ""); }} style={{ flex:1 }} />
              <Button title={saving ? "Saving…" : "Save"} onPress={save} loading={saving} style={{ flex:2 }} />
            </View>
          )}

          {/* ── Name ──────────────────────────────────────────────────── */}
          <SectionHeader icon="person-outline" title="Full Name" />
          {editing
            ? <TextInput style={s.input} value={name} onChangeText={setName} autoCapitalize="words" placeholder="Your full name" placeholderTextColor={colors.textMuted} />
            : <InfoRow label="Name" val={user.name} />}

          {/* ── Phone ─────────────────────────────────────────────────── */}
          <SectionHeader icon="call-outline" title="Phone" />
          <InfoRow label="Phone" val={user.phone_primary} locked />

          {/* ── Address ───────────────────────────────────────────────── */}
          <SectionHeader icon="location-outline" title="Address" />
          {editing ? (
            <View style={{ gap: 4 }}>
              <Label text="Pincode" />
              <View style={s.pincodeRow}>
                <TextInput
                  style={[s.input, { flex:1, marginBottom:0 }]}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={v => setPincode(v.replace(/\D/g,"").slice(0,6))}
                />
                {status === "loading" && <ActivityIndicator color={colors.indigo} style={{ marginLeft:10 }} />}
                {status === "success" && <Ionicons name="checkmark-circle" size={22} color="#16a34a" style={{ marginLeft:10 }} />}
              </View>
              {status === "success" && result && (
                <View style={s.pinSuccessBox}>
                  <Ionicons name="location" size={13} color="#15803d" />
                  <Text style={s.pinSuccessText}>{result.district} · {result.state}</Text>
                </View>
              )}
              {status === "error" && errorMsg ? <Text style={s.errorText}>{errorMsg}</Text> : null}

              <Label text="Village / Town" />
              <TextInput
                style={s.input}
                value={village}
                onChangeText={setVillage}
                placeholder="e.g. Ramnagar"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ) : (
            <View style={s.addressCard}>
              {[
                { label:"Village",  val: addr.village || user.village },
                { label:"Block",    val: addr.block },
                { label:"District", val: addr.district },
                { label:"State",    val: addr.state },
                { label:"Pincode",  val: addr.pincode || user.pincode },
              ].filter(r => r.val).map(r => (
                <View key={r.label} style={s.addrRow}>
                  <Text style={s.addrLabel}>{r.label}</Text>
                  <Text style={s.addrVal}>{r.val}</Text>
                </View>
              ))}
              {!addr.village && !user.village && (
                <View style={{ padding:16, alignItems:"center" }}>
                  <Text style={s.emptyText}>No address saved. Tap Edit to add your location.</Text>
                </View>
              )}
            </View>
          )}

          {/* Actions row */}
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

      {/* Deactivate TnC Modal */}
      <Modal visible={showDeactivateModal} transparent animationType="slide" onRequestClose={() => setShowDeactivateModal(false)}>
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
    <View style={{ flexDirection:"row", alignItems:"center", gap:7, marginTop:14, marginBottom:8 }}>
      <Ionicons name={icon} size={16} color={colors.saffron} />
      <Text style={{ fontFamily:fonts.bodyBold, fontSize:12, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary }}>{title}</Text>
    </View>
  );
}
function Label({ text }) {
  return <Text style={{ fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:colors.textSecondary, marginBottom:6, marginTop:12 }}>{text}</Text>;
}
function InfoRow({ label, val, locked }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoVal}>{val || "—"}</Text>
      {locked && <Ionicons name="lock-closed-outline" size={13} color={colors.textMuted} />}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex:1, backgroundColor:colors.bg },
  // Hero
  hero: { paddingTop:spacing.md, paddingHorizontal:spacing.lg, paddingBottom:0, alignItems:"center", position:"relative", overflow:"hidden" },
  blob1: { position:"absolute", width:220, height:220, borderRadius:110, backgroundColor:"rgba(255,255,255,0.06)", top:-70, right:-60 },
  blob2: { position:"absolute", width:120, height:120, borderRadius:60, backgroundColor:"rgba(255,255,255,0.05)", bottom:30, left:-30 },
  blob3: { position:"absolute", width:70, height:70, borderRadius:35, backgroundColor:"rgba(255,255,255,0.07)", top:20, left:20 },
  custBadge: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(255,255,255,0.15)", paddingVertical:5, paddingHorizontal:11, borderRadius:20, alignSelf:"flex-start", marginBottom:spacing.md },
  custBadgeTxt: { fontFamily:fonts.bodyBold, fontSize:11, color:"#fff" },
  avatarRing: { width:106, height:106, borderRadius:53, borderWidth:3, borderColor:"rgba(255,255,255,0.35)", alignItems:"center", justifyContent:"center", marginBottom:12, position:"relative" },
  avatar: { width:100, height:100, borderRadius:50, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  avatarImg: { width:100, height:100, borderRadius:50 },
  avatarText: { fontFamily:fonts.display, fontSize:36, color:"#fff" },
  cameraBadge: { position:"absolute", bottom:2, right:2, backgroundColor:colors.saffron, borderRadius:14, padding:5, borderWidth:2, borderColor:"#fff" },
  heroName: { fontFamily:fonts.display, fontSize:24, color:"#fff", marginBottom:4 },
  heroPhone: { fontFamily:fonts.bodySemi, fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:14 },
  heroMeta: { flexDirection:"row", flexWrap:"wrap", gap:8, justifyContent:"center", marginBottom:spacing.lg },
  heroPill: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(255,255,255,0.18)", paddingVertical:6, paddingHorizontal:12, borderRadius:20 },
  heroPillVerified: { backgroundColor:"rgba(74,222,128,0.2)" },
  heroPillText: { fontFamily:fonts.bodyBold, fontSize:12, color:"#fff" },
  heroStatsRow: { flexDirection:"row", backgroundColor:"rgba(255,255,255,0.12)", borderTopLeftRadius:14, borderTopRightRadius:14, width:"100%", overflow:"hidden" },
  heroStat: { flex:1, alignItems:"center", paddingVertical:13 },
  heroStatVal: { fontFamily:fonts.display, fontSize:16, color:"#fff" },
  heroStatLabel: { fontFamily:fonts.bodyBold, fontSize:9, letterSpacing:1, textTransform:"uppercase", color:"rgba(255,255,255,0.6)", marginTop:2 },
  heroStatSep: { width:1, backgroundColor:"rgba(255,255,255,0.15)" },
  // Form
  input: { backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.saffron, borderRadius:12, paddingVertical:12, paddingHorizontal:14, fontFamily:fonts.body, fontSize:15, color:colors.text },
  pincodeRow: { flexDirection:"row", alignItems:"center" },
  pinSuccessBox: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"#f0fdf4", padding:10, borderRadius:8 },
  pinSuccessText: { fontFamily:fonts.bodyBold, fontSize:12, color:"#15803d" },
  errorText: { fontFamily:fonts.body, fontSize:12, color:colors.danger },
  // Info
  infoRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, padding:14 },
  infoVal: { fontFamily:fonts.bodySemi, fontSize:15, color:colors.text },
  // Address
  addressCard: { backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:colors.border, overflow:"hidden" },
  addrRow: { flexDirection:"row", justifyContent:"space-between", paddingVertical:12, paddingHorizontal:16, borderBottomWidth:1, borderBottomColor:colors.border },
  addrLabel: { fontFamily:fonts.bodyBold, fontSize:11, letterSpacing:1, textTransform:"uppercase", color:colors.textMuted },
  addrVal: { fontFamily:fonts.bodySemi, fontSize:13, color:colors.text },
  emptyText: { fontFamily:fonts.body, color:colors.textMuted, fontSize:13, textAlign:"center" },
  // Actions row
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
