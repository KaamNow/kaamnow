import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import api from "../api";
import { colors, fonts, radius, spacing } from "../theme";
import Overline from "../components/Overline";
import WorkerCard from "../components/WorkerCard";
import Input from "../components/Input";

const SKILLS = ["all", "mason", "farm work", "painting", "plumbing", "electrical", "helper", "cleaning", "carpentry", "welding"];

export default function MarketplaceScreen({ navigation }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("all");
  const [q, setQ] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (skill !== "all") params.skill = skill;
    if (q) params.q = q;
    api.get("/workers", { params })
      .then((r) => setWorkers(r.data))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [skill, q]);

  const center = workers.length
    ? {
        latitude: workers.reduce((a, w) => a + w.lat, 0) / workers.length,
        longitude: workers.reduce((a, w) => a + w.lng, 0) / workers.length,
        latitudeDelta: 12,
        longitudeDelta: 12,
      }
    : { latitude: 22.97, longitude: 78.65, latitudeDelta: 16, longitudeDelta: 16 };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.head}>
        <Overline>Find Workers</Overline>
        <View style={styles.headerRow}>
          <Text style={styles.h1}>{workers.length} verified workers</Text>
          <Pressable
            testID="map-toggle"
            onPress={() => setShowMap(!showMap)}
            style={styles.mapToggle}
          >
            <Ionicons name={showMap ? "list" : "map"} size={16} color={colors.indigo} />
            <Text style={styles.mapToggleText}>{showMap ? "List" : "Map"}</Text>
          </Pressable>
        </View>

        <Input
          testID="search-input"
          placeholder="Search by name, village or skill"
          value={q}
          onChangeText={setQ}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.skillsRow}>
          {SKILLS.map((s) => (
            <Pressable
              key={s}
              testID={`skill-${s.replace(/\s+/g, "-")}`}
              onPress={() => setSkill(s)}
              style={[styles.skillChip, skill === s && styles.skillChipActive]}
            >
              <Text style={[styles.skillText, skill === s && { color: "#fff" }]}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {showMap ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={center}
        >
          {workers.map((w) => (
            <Marker
              key={w.id}
              coordinate={{ latitude: w.lat, longitude: w.lng }}
              title={w.name}
              description={`₹${w.daily_rate}/day · ⭐ ${(w.avg_rating || 0).toFixed(1)} · ${w.village}`}
              pinColor={colors.saffron}
              onCalloutPress={() => navigation.navigate("WorkerProfile", { id: w.id })}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => w.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
          renderItem={({ item }) => (
            <WorkerCard
              testID={`worker-card-${item.id}`}
              worker={item}
              onPress={() => navigation.navigate("WorkerProfile", { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {loading ? "Loading workers…" : "No workers match your filters."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { padding: spacing.lg, backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6, marginBottom: 12 },
  h1: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  mapToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.indigoTint, borderRadius: radius.pill },
  mapToggleText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.indigo },
  skillsRow: { gap: 6, paddingVertical: 4 },
  skillChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff" },
  skillChipActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  skillText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textSecondary },
  empty: { padding: 40, alignItems: "center" },
  emptyText: { fontFamily: fonts.body, color: colors.textMuted },
});
