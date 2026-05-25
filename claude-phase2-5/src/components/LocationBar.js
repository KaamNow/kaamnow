import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "../theme";

export default function LocationBar({
  pincode,
  village,
  district,
  state,
  onPress,
  label = "Location",
  compact = false,
  style,
}) {
  const locationParts = [village, district, state].filter(Boolean);
  const locationText = pincode
    ? [pincode, locationParts.join(", ")].filter(Boolean).join(" · ")
    : "Set location";

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.bar,
        compact && styles.compactBar,
        pressed && onPress && styles.pressed,
        style,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.textBlock}>
        {!compact ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.location} numberOfLines={1}>{locationText}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-down" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...shadow.xs,
  },
  compactBar: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.94,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 1,
  },
  location: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.text,
  },
});
