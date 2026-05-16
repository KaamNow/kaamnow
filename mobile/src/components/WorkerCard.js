import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../api";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import RatingTrustRow from "./RatingTrustRow";

const fullUrl = (url) => (!url ? null : url.startsWith("http") ? url : `${API_URL}${url}`);

function initialsFromName(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function getRate(worker) {
  return worker?.daily_rate ?? worker?.dailyRate ?? worker?.rate;
}

function getLocation(worker) {
  return [
    worker?.village,
    worker?.district,
    worker?.state,
    worker?.pincode,
  ].filter(Boolean).slice(0, 3).join(", ");
}

export default function WorkerCard({
  worker = {},
  onPress,
  testID,
  size = "full",
  showTrustBadge = true,
  showChevron = false,
}) {
  const isCompact = size === "compact";
  const photo = fullUrl(worker.photo_url || worker.photoUrl || worker.avatar_url);
  const initials = initialsFromName(worker.name);
  const tier = worker.trust_tier ?? worker.trustTier ?? 1;
  const skills = Array.isArray(worker.skills) ? worker.skills : [];
  const visibleSkills = skills.slice(0, isCompact ? 2 : 3);
  const hiddenSkillCount = Math.max(skills.length - visibleSkills.length, 0);
  const rate = getRate(worker);
  const location = getLocation(worker);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        isCompact && styles.compactCard,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.photoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={[styles.photo, isCompact && styles.compactPhoto]} />
        ) : (
          <View style={[styles.photo, styles.photoFallback, isCompact && styles.compactPhoto]}>
            <Text style={[styles.initials, isCompact && styles.compactInitials]}>{initials}</Text>
          </View>
        )}
        {worker.is_available ? <View style={styles.availDot} /> : null}
      </View>

      <View style={styles.content}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{worker.name || "Worker"}</Text>
          {rate ? (
            <Text style={styles.rate}>₹{rate}<Text style={styles.rateUnit}>/day</Text></Text>
          ) : null}
        </View>

        <View style={styles.skillRow}>
          {visibleSkills.length > 0 ? (
            <>
              {visibleSkills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText} numberOfLines={1}>{skill}</Text>
                </View>
              ))}
              {hiddenSkillCount > 0 ? (
                <Text style={styles.moreSkills}>+{hiddenSkillCount}</Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.noSkills}>Skills not added yet</Text>
          )}
        </View>

        <RatingTrustRow
          rating={worker.avg_rating ?? worker.rating}
          totalJobs={worker.total_jobs ?? worker.totalJobs}
          tier={tier}
          size={isCompact ? "small" : "medium"}
          showTrustBadge={showTrustBadge}
        />

        {location ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>
        ) : null}
      </View>

      {showChevron ? (
        <Ionicons name="chevron-forward" size={17} color={colors.borderStrong} style={styles.chevron} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: 10,
    ...shadow.xs,
  },
  compactCard: {
    padding: 14,
    gap: 12,
  },
  pressed: {
    opacity: 0.94,
  },
  photoWrap: {
    position: "relative",
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
  },
  compactPhoto: {
    width: 66,
    height: 66,
    borderRadius: 12,
  },
  photoFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  initials: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.primary,
  },
  compactInitials: {
    fontSize: 24,
  },
  availDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
  },
  rate: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.money,
  },
  rateUnit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  skillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 7,
    marginBottom: 8,
  },
  skillChip: {
    maxWidth: 92,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillChipText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.textSecondary,
  },
  moreSkills: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  noSkills: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  chevron: {
    alignSelf: "center",
  },
});
