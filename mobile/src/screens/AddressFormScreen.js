import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import api from "../lib/api";
import { usePincodeLookup } from "../lib/usePincode";
import { colors, fonts, spacing, radius, shadow } from "../theme";

const LABELS = ["Home", "Work", "Site", "Other"];

export default function AddressFormScreen({ navigation, route }) {
  const existing = route.params?.address ?? null; // null = add, object = edit
  const insets = useSafeAreaInsets();

  const { pincode: pcVal, setPincode, status: pinStatus, result: pinResult, errorMsg: pinError } = usePincodeLookup();

  const [label,      setLabel]      = useState(existing?.label      || "Home");
  const [customLabel,setCustomLabel]= useState(LABELS.includes(existing?.label) ? "" : existing?.label || "");
  const [street,     setStreet]     = useState(existing?.address?.street  || "");
  const [village,    setVillage]    = useState(existing?.address?.village || "");
  const [district,   setDistrict]   = useState(existing?.address?.district|| "");
  const [state,      setState]      = useState(existing?.address?.state   || "");
  const [lat,        setLat]        = useState(existing?.lat  ?? null);
  const [lng,        setLng]        = useState(existing?.lng  ?? null);
  const [isDefault,  setIsDefault]  = useState(existing?.is_default ?? false);
  const [saving,     setSaving]     = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Seed pincode field from existing address
  useEffect(() => {
    if (existing?.address?.pincode) setPincode(existing.address.pincode);
  }, []);

  // Auto-fill from pincode lookup
  useEffect(() => {
    if (pinResult) {
      setVillage(v => v || pinResult.name || "");
      setDistrict(pinResult.district || "");
      setState(pinResult.state || "");
      if (pinResult.lat) setLat(pinResult.lat);
      if (pinResult.lng) setLng(pinResult.lng);
    }
  }, [pinResult]);

  const useGPS = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location denied", "Allow location in Settings or type your pincode.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      setLat(latitude);
      setLng(longitude);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { "Accept-Language": "en", "User-Agent": "KaamNow/1.0" } }
      );
      const data = await res.json();
      const pin = (data.address?.postcode || "").replace(/\s/g, "").slice(0, 6);
      const vil = data.address?.village || data.address?.suburb || data.address?.city_district || data.address?.city || "";
      if (pin.length === 6) {
        setPincode(pin);
        setVillage(vil);
      } else {
        Alert.alert("Location set", "Could not detect pincode. Please type it.");
      }
    } catch {
      Alert.alert("Could not get location", "Check internet and try again.");
    } finally {
      setGpsLoading(false);
    }
  };

  const effectiveLabel = label === "Other" && customLabel.trim() ? customLabel.trim() : label;

  const canSave = pcVal.length === 6 && effectiveLabel.length > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        label: effectiveLabel,
        address: {
          street:   street.trim()  || undefined,
          village:  village.trim() || undefined,
          pincode:  pcVal,
          district: district.trim()|| undefined,
          state:    state.trim()   || undefined,
        },
        lat,
        lng,
        is_default: isDefault,
      };
      if (existing) {
        await api.patch(`/auth/me/addresses/${existing.id}`, payload);
      } else {
        await api.post("/auth/me/addresses", payload);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert("Could not save", err?.response?.data?.detail || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[S.safe, { paddingTop: insets.top }]}>

        {/* Header */}
        <View style={S.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={S.headerBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
          </TouchableOpacity>
          <Text style={S.headerTitle}>{existing ? "Edit Address" : "Add Address"}</Text>
          <TouchableOpacity
            onPress={save}
            disabled={!canSave || saving}
            style={[S.saveBtn, (!canSave || saving) && { opacity: 0.4 }]}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={S.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Label */}
          <Text style={S.sectionLabel}>LABEL</Text>
          <View style={S.labelRow}>
            {LABELS.map(l => (
              <TouchableOpacity
                key={l}
                activeOpacity={0.8}
                style={[S.labelChip, label === l && S.labelChipActive]}
                onPress={() => setLabel(l)}
              >
                <Ionicons
                  name={l === "Home" ? "home-outline" : l === "Work" ? "briefcase-outline" : l === "Site" ? "construct-outline" : "ellipsis-horizontal-outline"}
                  size={14}
                  color={label === l ? "#fff" : colors.outline}
                />
                <Text style={[S.labelChipText, label === l && S.labelChipTextActive]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {label === "Other" && (
            <TextInput
              style={[S.input, { marginTop: 8 }]}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g. Parents' house, Farm"
              placeholderTextColor={colors.outline}
              maxLength={40}
              autoFocus
            />
          )}

          {/* Street / Flat */}
          <Text style={S.sectionLabel}>STREET / FLAT (OPTIONAL)</Text>
          <TextInput
            style={S.input}
            value={street}
            onChangeText={setStreet}
            placeholder="e.g. Flat 3B, Krishna Nagar"
            placeholderTextColor={colors.outline}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Pincode */}
          <Text style={S.sectionLabel}>
            PINCODE <Text style={{ color: "#DC2626" }}>*</Text>
          </Text>
          <View style={S.inputRow}>
            <View style={[S.input, S.inputWithIcon, { flex: 1 }]}>
              <Ionicons name="location-outline" size={17} color={colors.outline} />
              <TextInput
                style={S.innerInput}
                value={pcVal}
                onChangeText={v => setPincode(v.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit pincode"
                placeholderTextColor={colors.outline}
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="done"
              />
              {pinStatus === "loading" && <ActivityIndicator size="small" color={colors.primary} />}
              {pinStatus === "success" && <Ionicons name="checkmark-circle" size={18} color="#059669" />}
            </View>
            <TouchableOpacity style={S.gpsBtn} onPress={useGPS} disabled={gpsLoading}>
              {gpsLoading
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="locate-outline" size={18} color={colors.primary} />
              }
            </TouchableOpacity>
          </View>
          {pinStatus === "error" && <Text style={S.errorText}>{pinError}</Text>}

          {/* Auto-filled location */}
          {(village || district || state) && (
            <View style={S.locationCard}>
              <Ionicons name="location" size={16} color="#059669" />
              <Text style={S.locationText}>
                {[village, district, state].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}

          {/* Village override */}
          <Text style={S.sectionLabel}>VILLAGE / AREA</Text>
          <TextInput
            style={S.input}
            value={village}
            onChangeText={setVillage}
            placeholder="e.g. Koramangala, Bandra"
            placeholderTextColor={colors.outline}
            autoCapitalize="words"
            returnKeyType="next"
          />

          {/* Set as default */}
          <View style={S.defaultRow}>
            <View style={S.defaultIcon}>
              <Ionicons name="star-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.defaultLabel}>Set as default address</Text>
              <Text style={S.defaultSub}>Auto-filled when you post a new job</Text>
            </View>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: colors.borderSubtle, true: "#059669" }}
              thumbColor="#fff"
            />
          </View>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: "#f9f9fe" },

  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1, borderBottomColor: "#e8e8ed",
  },
  headerBack:  { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontFamily: fonts.headlineSm, fontSize: 18, color: colors.textHeading },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  saveBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },

  scroll: { paddingHorizontal: 20, paddingTop: 24 },

  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.outline, letterSpacing: 1.5, marginBottom: 10, marginTop: 20 },

  labelRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  labelChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: "#e8e8ed",
    backgroundColor: "#ffffff", ...shadow.xs,
  },
  labelChipActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  labelChipText:       { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.outline },
  labelChipTextActive: { color: "#ffffff" },

  input: {
    backgroundColor: "#ffffff", borderRadius: 14,
    borderWidth: 1, borderColor: "#e8e8ed",
    paddingHorizontal: 14, paddingVertical: 13,
    fontFamily: fonts.body, fontSize: 15, color: colors.textHeading,
    ...shadow.xs,
  },
  inputRow:     { flexDirection: "row", gap: 10, alignItems: "center" },
  inputWithIcon:{ flexDirection: "row", alignItems: "center", gap: 8 },
  innerInput:   { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.textHeading },

  gpsBtn: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: "#dae2fd",
    borderWidth: 1, borderColor: "#c0cef8",
    alignItems: "center", justifyContent: "center",
  },

  errorText:    { fontFamily: fonts.body, fontSize: 12, color: "#DC2626", marginTop: 4 },

  locationCard: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#ECFDF5", borderRadius: 12, padding: 12, marginTop: 8,
  },
  locationText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 13, color: "#059669" },

  defaultRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "#ffffff", borderRadius: 16,
    borderWidth: 1, borderColor: "#e8e8ed",
    padding: 16, marginTop: 24, ...shadow.xs,
  },
  defaultIcon:  { width: 40, height: 40, borderRadius: 12, backgroundColor: "#f0f0f5", alignItems: "center", justifyContent: "center" },
  defaultLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  defaultSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },
});
