import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";
import TrustBadge from "./TrustBadge";

export default function RatingTrustRow({
  rating,
  totalJobs,
  jobsDone,
  tier,
  trustTier,
  size = "medium",
  showTrustBadge = true,
}) {
  const resolvedTier = trustTier ?? tier ?? 1;
  const jobs = totalJobs ?? jobsDone;
  const hasRating = typeof rating === "number" && Number.isFinite(rating) && rating > 0;
  const isSmall = size === "small";

  return (
    <View style={styles.row}>
      <View style={styles.ratingGroup}>
        {hasRating ? (
          <>
            <Ionicons name="star" size={isSmall ? 12 : 13} color="#F59E0B" />
            <Text style={[styles.ratingText, isSmall && styles.smallText]}>{rating.toFixed(1)}</Text>
          </>
        ) : (
          <Text style={[styles.newText, isSmall && styles.smallText]}>New</Text>
        )}
        {typeof jobs === "number" && jobs > 0 ? (
          <Text style={[styles.jobsText, isSmall && styles.smallJobs]}> · {jobs} jobs</Text>
        ) : null}
      </View>
      {showTrustBadge && resolvedTier >= 2 ? (
        <TrustBadge tier={resolvedTier} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  ratingGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: {
    marginLeft: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.text,
  },
  newText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  jobsText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  smallText: {
    fontSize: 12,
  },
  smallJobs: {
    fontSize: 11,
  },
});
