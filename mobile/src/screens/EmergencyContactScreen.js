import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function EmergencyContactScreen({ navigation }) {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(user?.emergency_contact?.name || "");
  const [phone, setPhone] = useState(user?.emergency_contact?.phone || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert(t("emergency_contact_required"));
      return;
    }
    setSaving(true);
    try {
      await api.patch("/auth/me", { emergency_contact: { name: name.trim(), phone: phone.trim() } });
      await refreshUser();
      navigation.goBack();
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={styles.label}>{t("emergency_contact_name")}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t("emergency_contact_name_placeholder")}
        placeholderTextColor={colors.textMuted}
        maxLength={100}
      />

      <Text style={styles.label}>{t("emergency_contact_phone")}</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="+91XXXXXXXXXX"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        maxLength={15}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>
          {saving ? t("loading") : t("save")}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label:      { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: spacing.md },
  input:      { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: fonts.body, fontSize: 15, color: colors.text },
  saveBtn:    { backgroundColor: colors.indigo, borderRadius: radius.lg, paddingVertical: 14, alignItems: "center", marginTop: spacing.xl },
  saveBtnText:{ fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },
});
