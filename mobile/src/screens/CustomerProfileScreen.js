import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, TextInput, ActivityIndicator, Image,
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

  const pickPhoto = () => {
    Alert.alert("Profile photo", "Choose how to add your photo", [
      {
        text: "Take a photo",
        onPress: async () => {
          const p = await ImagePicker.requestCameraPermissionsAsync();
          if (!p.granted) return Alert.alert("Camera permission needed");
          const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: ["images"] });
          if (!r.canceled && r.assets?.[0]) {
            const form = new FormData();
            form.append("file", { uri: r.assets[0].uri, name: "photo.jpg", type: "image/jpeg" });
            try { await api.post("/auth/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } }); await refreshUser(); }
            catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
          }
        },
      },
      {
        text: "Choose from library",
        onPress: async () => {
          const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!p.granted) return Alert.alert("Photo library permission needed");
          const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7, mediaTypes: ["images"] });
          if (!r.canceled && r.assets?.[0]) {
            const form = new FormData();
            form.append("file", { uri: r.assets[0].uri, name: "photo.jpg", type: "image/jpeg" });
            try { await api.post("/auth/me/photo", form, { headers: { "Content-Type": "multipart/form-data" } }); await refreshUser(); }
            catch (e) { Alert.alert("Upload failed", formatApiError(e)); }
          }
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
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
      "Your account will be hidden. You can reactivate within 30 days by logging in again. After 30 days it is permanently deleted.",
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

  if (!user) return null;

  const addr = user.address || {};
  const initials = (user.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Gradient Header ─────────────────────────────────────────── */}
        <LinearGradient colors={["#ff6b35", "#e85a25"]} start={{ x:0, y:0 }} end={{ x:1, y:1 }} style={s.hero}>
          <View style={s.heroCircle} />

          {/* Avatar — photo if set, else initials */}
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

          <View style={s.heroMeta}>
            <View style={s.heroPill}>
              <Ionicons name="person-outline" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={s.heroPillText}>Customer</Text>
            </View>
            {addr.state && (
              <View style={s.heroPill}>
                <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={s.heroPillText}>{addr.state}</Text>
              </View>
            )}
            <Pressable onPress={doLogout} style={[s.heroPill, { backgroundColor:"rgba(0,0,0,0.2)" }]}>
              <Ionicons name="log-out-outline" size={12} color="#fff" />
              <Text style={s.heroPillText}>Logout</Text>
            </Pressable>
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

          {/* Support */}
          <Pressable onPress={() => navigation.navigate("ContactSupport")} style={s.supportLink}>
            <Ionicons name="help-circle-outline" size={15} color={colors.indigo} />
            <Text style={s.supportText}>Help & Support</Text>
          </Pressable>

          <Pressable onPress={doDeactivate} style={s.deactivateBtn}>
            <Ionicons name="warning-outline" size={15} color={colors.danger} />
            <Text style={s.deactivateText}>Deactivate account</Text>
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
  hero: { padding:spacing.xl, paddingTop:spacing.lg, paddingBottom:spacing.xl, alignItems:"center", position:"relative", overflow:"hidden" },
  heroCircle: { position:"absolute", width:200, height:200, borderRadius:100, backgroundColor:"rgba(255,255,255,0.08)", top:-50, right:-50 },
  avatarRing: { width:106, height:106, borderRadius:53, borderWidth:3, borderColor:"rgba(255,255,255,0.4)", alignItems:"center", justifyContent:"center", marginBottom:12, position:"relative" },
  avatar: { width:96, height:96, borderRadius:48, backgroundColor:"rgba(255,255,255,0.25)", alignItems:"center", justifyContent:"center" },
  avatarImg: { width:100, height:100, borderRadius:50 },
  avatarText: { fontFamily:fonts.display, fontSize:36, color:"#fff" },
  cameraBadge: { position:"absolute", bottom:2, right:2, backgroundColor:colors.indigo, borderRadius:14, padding:5, borderWidth:2, borderColor:"#fff" },
  heroName: { fontFamily:fonts.display, fontSize:24, color:"#fff", marginBottom:4 },
  heroPhone: { fontFamily:fonts.bodySemi, fontSize:13, color:"rgba(255,255,255,0.75)", marginBottom:16 },
  heroMeta: { flexDirection:"row", flexWrap:"wrap", gap:8, justifyContent:"center" },
  heroPill: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(255,255,255,0.2)", paddingVertical:6, paddingHorizontal:12, borderRadius:20 },
  heroPillText: { fontFamily:fonts.bodyBold, fontSize:12, color:"#fff" },
  // Form
  input: { backgroundColor:"#fff", borderWidth:1.5, borderColor:colors.indigo, borderRadius:12, paddingVertical:12, paddingHorizontal:14, fontFamily:fonts.body, fontSize:15, color:colors.text },
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
  supportLink: { flexDirection:"row", alignItems:"center", gap:6, marginTop:28, alignSelf:"center" },
  supportText: { fontFamily:fonts.bodySemi, fontSize:13, color:colors.indigo },
  deactivateBtn: { flexDirection:"row", alignItems:"center", gap:6, marginTop:12, alignSelf:"center" },
  deactivateText: { fontFamily:fonts.bodySemi, fontSize:12, color:colors.danger },
});
