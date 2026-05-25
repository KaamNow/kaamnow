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
      const r = await api.get(`/service-profiles?limit=50`);
      setWorkers(Array.isArray(r.data) ? r.data : []);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} region={region} showsUserLocation>
        {workers.filter((w) => w.lat && w.lng).map((w) => (
          <Marker key={w.id} coordinate={{ latitude: w.lat, longitude: w.lng }}>
            <View style={[styles.pin, w.is_available_now && styles.pinActive]}>
              <Ionicons name="person" size={12} color="#fff" />
            </View>
            <Callout onPress={() => navigation.navigate("WorkerProfile", { id: w.id })}>
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
        <Ionicons name="locate" size={22} color={colors.textHeading} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  map:       { flex: 1 },

  pin: {
    backgroundColor: colors.primary, width: 32, height: 32,
    borderRadius: 16, justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: colors.surfaceCard,
    shadowColor: "#0B0B14", shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  pinActive: { backgroundColor: colors.success },
  callout: { width: 160, padding: spacing.sm },
  calloutName:  { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  calloutSkill: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  calloutRate:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.success, marginTop: 4 },
  calloutLink:  { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textHeading, marginTop: 6 },

  locateBtn: {
    position: "absolute", bottom: 28, right: 16,
    backgroundColor: colors.surfaceCard, borderRadius: 24, width: 48, height: 48,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#0B0B14", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
});
