import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../theme";
import TrustBadge from "./TrustBadge";

export default function WorkerCard({ worker, onPress, testID }) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <Image
        source={{
          uri:
            worker.photo_url ||
            "https://images.pexels.com/photos/16476333/pexels-photo-16476333.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=400&w=400",
        }}
        style={styles.photo}
      />
      <View style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {worker.name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={11} color={colors.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>
                {worker.village}, {worker.state}
              </Text>
            </View>
          </View>
          <Text style={styles.rate}>₹{worker.daily_rate}</Text>
        </View>

        <View style={styles.skillsRow}>
          {worker.skills.slice(0, 3).map((s) => (
            <View key={s} style={styles.skillChip}>
              <Text style={styles.skillText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TrustBadge tier={worker.trust_tier} />
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={colors.saffron} />
            <Text style={styles.ratingText}>
              {(worker.avg_rating || 0).toFixed(1)}
            </Text>
            <Text style={styles.jobsText}>· {worker.total_jobs} jobs</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 14,
    marginBottom: 12,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  rate: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.indigo,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 8,
  },
  skillChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
  },
  jobsText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
});
