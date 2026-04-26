import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing } from "../theme";
import Button from "../components/Button";
import Input from "../components/Input";
import Overline from "../components/Overline";

const CATEGORIES = [
  { v: "farm", l: "Farm work" },
  { v: "construction", l: "Construction" },
  { v: "home", l: "Home" },
  { v: "other", l: "Other" },
];

const VILLAGES = [
  { name: "Pratapgarh", lat: 25.892, lng: 81.944 },
  { name: "Wardha", lat: 20.7453, lng: 78.6022 },
  { name: "Muzaffarpur", lat: 26.1209, lng: 85.3647 },
  { name: "Hoshangabad", lat: 22.744, lng: 77.7242 },
  { name: "Jodhpur", lat: 26.2389, lng: 73.0243 },
];

export default function PostJobScreen({ navigation }) {
  const { user } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: "",
    category: "farm",
    description: "",
    workers_needed: "1",
    daily_rate: "400",
    job_date: tomorrow,
    village: VILLAGES[0].name,
    lat: VILLAGES[0].lat,
    lng: VILLAGES[0].lng,
  });
  const [loading, setLoading] = useState(false);

  if (user?.role === "worker") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Only customers can post jobs.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const update = (k) => (v) => setForm({ ...form, [k]: v });
  const pickVillage = (v) => {
    const village = VILLAGES.find((x) => x.name === v);
    if (village) setForm({ ...form, village: village.name, lat: village.lat, lng: village.lng });
  };

  const submit = async () => {
    if (!form.title || !form.description) {
      return Alert.alert("Missing info", "Title and description are required.");
    }
    setLoading(true);
    try {
      await api.post("/jobs", {
        ...form,
        workers_needed: parseInt(form.workers_needed, 10) || 1,
        daily_rate: parseInt(form.daily_rate, 10) || 400,
      });
      Alert.alert("✅ Job posted!", "Workers will see this and respond within minutes.");
      navigation.navigate("Dashboard");
    } catch (err) {
      Alert.alert("Failed", formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
        <Overline>Post a job</Overline>
        <Text style={styles.h1}>What work do you need done?</Text>
        <Text style={styles.lead}>Workers will see this and respond within minutes.</Text>

        <View style={styles.card}>
          <Input
            testID="job-title"
            label="Job title"
            placeholder="e.g. Need 2 masons for boundary wall"
            value={form.title}
            onChangeText={update("title")}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.catRow}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.v}
                testID={`cat-${c.v}`}
                onPress={() => setForm({ ...form, category: c.v })}
                style={[styles.catBtn, form.category === c.v && styles.catBtnActive]}
              >
                <Text style={[styles.catText, form.category === c.v && { color: "#fff" }]}>{c.l}</Text>
              </Pressable>
            ))}
          </View>

          <Input
            testID="job-description"
            label="Description"
            placeholder="Briefly describe the work, hours, materials provided…"
            value={form.description}
            onChangeText={update("description")}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: "top" }}
          />

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input
                testID="job-workers-needed"
                label="Workers"
                keyboardType="number-pad"
                value={form.workers_needed}
                onChangeText={update("workers_needed")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                testID="job-rate"
                label="Rate ₹"
                keyboardType="number-pad"
                value={form.daily_rate}
                onChangeText={update("daily_rate")}
              />
            </View>
          </View>

          <Input
            testID="job-date"
            label="Date (YYYY-MM-DD)"
            value={form.job_date}
            onChangeText={update("job_date")}
          />

          <Text style={styles.label}>Village</Text>
          <View style={styles.villageRow}>
            {VILLAGES.map((v) => (
              <Pressable
                key={v.name}
                testID={`village-${v.name}`}
                onPress={() => pickVillage(v.name)}
                style={[styles.villageBtn, form.village === v.name && styles.villageBtnActive]}
              >
                <Text style={[styles.villageText, form.village === v.name && { color: "#fff" }]}>{v.name}</Text>
              </Pressable>
            ))}
          </View>

          <Button
            testID="post-job-submit"
            title={loading ? "Posting…" : "Post job"}
            loading={loading}
            onPress={submit}
            style={{ marginTop: 16 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: spacing.lg, paddingBottom: 8 },
  backText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  h1: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: 8 },
  lead: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 16 },
  card: { backgroundColor: "#fff", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 16 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 6, marginTop: 6 },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#F3F4F6" },
  catBtnActive: { backgroundColor: colors.indigo },
  catText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  villageRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  villageBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: "#F3F4F6" },
  villageBtnActive: { backgroundColor: colors.saffron },
  villageText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted },
});
