import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";
import { API_URL } from "../api";

const fullUrl = (url) => !url ? null : url.startsWith("http") ? url : `${API_URL}${url}`;

export default function WorkerCard({ worker, onPress, testID }) {
  const photo = fullUrl(worker.photo_url);
  const initials = (worker.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [s.card, pressed && { opacity: 0.88 }]}
    >
      {/* Photo or initials */}
      <View style={s.photoWrap}>
        {photo
          ? <Image source={{ uri: photo }} style={s.photo} />
          : <View style={[s.photo, s.photoFallback]}>
              <Text style={s.initials}>{initials}</Text>
            </View>}
        {worker.is_available && <View style={s.availDot} />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Name + rate */}
        <View style={s.nameRow}>
          <Text style={s.name} numberOfLines={1}>{worker.name}</Text>
          <Text style={s.rate}>₹{worker.daily_rate}<Text style={s.rateUnit}>/day</Text></Text>
        </View>

        {/* Skills */}
        <Text style={s.skills} numberOfLines={1}>
          {(worker.skills || []).slice(0, 3).join(" · ") || "—"}
        </Text>

        {/* Footer */}
        <View style={s.footer}>
          {/* Rating */}
          <View style={s.ratingRow}>
            <Ionicons name="star" size={11} color="#F59E0B" />
            <Text style={s.ratingTxt}>{(worker.avg_rating || 0).toFixed(1)}</Text>
            {worker.total_jobs > 0 && (
              <Text style={s.jobsTxt}> · {worker.total_jobs} jobs</Text>
            )}
          </View>
          {/* Location */}
          {(worker.village || worker.state) && (
            <View style={s.locRow}>
              <Ionicons name="location-outline" size={10} color={colors.textMuted} />
              <Text style={s.locTxt} numberOfLines={1}>
                {[worker.village, worker.state].filter(Boolean).join(", ")}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.border} style={{ alignSelf: "center" }} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  photoWrap: { position: "relative" },
  photo: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.soft },
  photoFallback: { alignItems: "center", justifyContent: "center", backgroundColor: colors.saffronTint },
  initials: { fontFamily: fonts.display, fontSize: 26, color: colors.saffron },
  availDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#4ADE80",
    borderWidth: 2,
    borderColor: "#fff",
  },
  nameRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 6 },
  name: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, flex: 1 },
  rate: { fontFamily: fonts.display, fontSize: 16, color: colors.money },
  rateUnit: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  skills: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 3 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  ratingTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  jobsTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locTxt: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, maxWidth: 120 },
});
