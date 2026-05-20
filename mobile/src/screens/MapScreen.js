import { useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function MapScreen({ navigation }) {
  const { t } = useTranslation();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 25.5941,
    longitude: 85.1376,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    locate();
  }, []);

  const locate = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude, longitude } = loc.coords;
        setRegion({ latitude, longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 });
        fetchWorkers(latitude, longitude);
      } else {
        fetchWorkers(region.latitude, region.longitude);
      }
    } catch {
      fetchWorkers(region.latitude, region.longitude);
    }
  };

  const fetchWorkers = async (lat, lng) => {
    try {
      const r = await api.get(`/workers/search?lat=${lat}&lng=${lng}&radius=20&limit=50`);
      setWorkers(r.data?.workers || r.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region} showsUserLocation>
        {workers.filter((w) => w.lat && w.lng).map((w) => (
          <Marker key={w.id} coordinate={{ latitude: w.lat, longitude: w.lng }}>
            <View style={styles.pin}>
              <Ionicons name="person" size={12} color="#fff" />
            </View>
            <Callout onPress={() => navigation.navigate("WorkerProfile", { workerId: w.id })}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{w.name}</Text>
                <Text style={styles.calloutSkill}>{(w.skills || []).join(", ")}</Text>
                <Text style={styles.calloutRate}>₹{w.daily_rate}/day</Text>
                <Text style={styles.calloutLink}>{t("map_view_profile")}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <TouchableOpacity style={styles.locateBtn} onPress={locate}>
        <Ionicons name="locate" size={20} color={colors.indigo} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  map:       { flex: 1 },

  pin: {
    backgroundColor: colors.indigo, width: 28, height: 28,
    borderRadius: 14, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#fff",
  },
  callout: { width: 140, padding: spacing.xs },
  calloutName:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text },
  calloutSkill: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  calloutRate:  { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success, marginTop: 2 },
  calloutLink:  { fontFamily: fonts.body, fontSize: 11, color: colors.indigo, marginTop: 4 },

  locateBtn: {
    position: "absolute", bottom: 24, right: 16,
    backgroundColor: "#fff", borderRadius: 22, width: 44, height: 44,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 4,
  },
});
