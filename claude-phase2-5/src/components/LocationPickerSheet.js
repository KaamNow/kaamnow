import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocationContext } from "../contexts/LocationContext";
import { useAuth } from "../contexts/AuthContext";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, radius, spacing } from "../theme";

const ADDRESS_ICONS = { home: "home-outline", work: "business-outline", site: "construct-outline", other: "location-outline" };

export default function LocationPickerSheet({ visible, onClose }) {
  const { setLocation, detectGPS, gpsLoading } = useLocationContext();
  const { user } = useAuth();
  const { pincode, setPincode, status, result } = usePincodeLookup();
  const inputRef = useRef(null);
  const [confirming, setConfirming] = useState(false);

  const savedAddresses = (user?.saved_addresses || []).filter(a => a.pincode?.length === 6);

  useEffect(() => {
    if (visible) { setPincode(""); }
  }, [visible]);

  const handleGPS = async () => {
    const res = await detectGPS();
    if (!res?.error) onClose();
  };

  const pickSaved = (addr) => {
    const label = [addr.label || addr.type, addr.village || addr.district, addr.pincode]
      .filter(Boolean).join(" · ");
    setLocation({ pincode: addr.pincode, label, lat: addr.lat, lng: addr.lng });
    onClose();
  };

  const confirmPincode = () => {
    if (status !== "success" || !result) return;
    const label = [result.name, result.district].filter(Boolean).join(", ");
    setLocation({ pincode, label: label || `Pincode ${pincode}` });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Pressable style={s.overlay} onPress={onClose}>
          <Pressable style={s.sheet} onPress={() => {}}>

            {/* Handle */}
            <View style={s.handle} />

            {/* Title */}
            <View style={s.titleRow}>
              <Text style={s.title}>Set Delivery Location</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color="#374151" />
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

              {/* GPS detect */}
              <TouchableOpacity style={s.gpsRow} onPress={handleGPS} disabled={gpsLoading} activeOpacity={0.7}>
                <View style={s.gpsIconBox}>
                  {gpsLoading
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Ionicons name="locate" size={20} color={colors.primary} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.gpsPrimary}>Use current location</Text>
                  <Text style={s.gpsSub}>Automatically detect your pincode</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Saved addresses */}
              {savedAddresses.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>SAVED ADDRESSES</Text>
                  {savedAddresses.map((addr, i) => {
                    const type = (addr.label || addr.type || "other").toLowerCase();
                    const icon = ADDRESS_ICONS[type] || "location-outline";
                    const line1 = addr.label ? addr.label.charAt(0).toUpperCase() + addr.label.slice(1) : "Address";
                    const line2 = [addr.village || addr.district, addr.pincode].filter(Boolean).join(" · ");
                    return (
                      <TouchableOpacity key={i} style={s.addrRow} onPress={() => pickSaved(addr)} activeOpacity={0.7}>
                        <View style={s.addrIconBox}>
                          <Ionicons name={icon} size={18} color="#374151" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.addrLabel}>{line1}</Text>
                          {line2 ? <Text style={s.addrSub} numberOfLines={1}>{line2}</Text> : null}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {/* Pincode input */}
              <Text style={s.sectionLabel}>ENTER PINCODE</Text>
              <View style={[s.inputRow, status === "error" && s.inputRowError]}>
                <Ionicons name="pin-outline" size={18} color="#6B7280" />
                <TextInput
                  ref={inputRef}
                  style={s.input}
                  value={pincode}
                  onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {status === "loading" && <ActivityIndicator size="small" color={colors.primary} />}
                {status === "success" && result && (
                  <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                )}
                {pincode.length > 0 && (
                  <Pressable onPress={() => setPincode("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </Pressable>
                )}
              </View>

              {/* Pincode resolved name */}
              {status === "success" && result && (
                <View style={s.resolvedRow}>
                  <Ionicons name="location" size={14} color="#16a34a" />
                  <Text style={s.resolvedTxt}>{[result.name, result.district, result.state].filter(Boolean).join(", ")}</Text>
                </View>
              )}
              {status === "error" && (
                <Text style={s.errorTxt}>Invalid pincode — please check and try again</Text>
              )}

              {/* Confirm button */}
              <TouchableOpacity
                style={[s.confirmBtn, (status !== "success" || !result) && s.confirmBtnOff]}
                disabled={status !== "success" || !result}
                onPress={confirmPincode}
                activeOpacity={0.85}
              >
                <Text style={s.confirmBtnTxt}>Apply Location</Text>
              </TouchableOpacity>

            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
    maxHeight: "85%",
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", alignSelf: "center", marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#111827" },

  gpsRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  gpsIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  gpsPrimary: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  gpsSub: { fontFamily: fonts.body, fontSize: 12, color: "#6B7280", marginTop: 1 },

  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#9CA3AF", letterSpacing: 0.8, marginTop: 20, marginBottom: 8 },

  addrRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  addrIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#F9FAFB", alignItems: "center", justifyContent: "center" },
  addrLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#111827" },
  addrSub: { fontFamily: fonts.body, fontSize: 12, color: "#6B7280", marginTop: 1 },

  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, height: 52, backgroundColor: "#F9FAFB", borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  inputRowError: { borderColor: "#EF4444", backgroundColor: "#FEF2F2" },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: "#111827", paddingVertical: 0 },
  resolvedRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, paddingHorizontal: 4 },
  resolvedTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#16a34a" },
  errorTxt: { fontFamily: fonts.body, fontSize: 12, color: "#EF4444", marginTop: 6, paddingHorizontal: 4 },

  confirmBtn: { marginTop: 20, height: 52, borderRadius: 14, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  confirmBtnOff: { backgroundColor: "#E5E7EB" },
  confirmBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
