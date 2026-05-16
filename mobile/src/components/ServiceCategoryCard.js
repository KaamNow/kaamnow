import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "../theme";

export default function ServiceCategoryCard({
  category,
  label,
  icon,
  value,
  color,
  selected = false,
  onPress,
  size = "grid",
  disabled = false,
}) {
  const data = typeof category === "object" && category ? category : {};
  const resolvedLabel = label || data.label || data.title || data.name || value || data.value || "Service";
  const resolvedIcon = icon || data.icon || "briefcase-outline";
  const resolvedColor = color || data.color || colors.primaryLight;
  const isChip = size === "chip";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [
        isChip ? styles.chip : styles.grid,
        { backgroundColor: isChip ? colors.surface : resolvedColor },
        selected && (isChip ? styles.chipSelected : styles.gridSelected),
        disabled && styles.disabled,
        pressed && !disabled && onPress && styles.pressed,
      ]}
    >
      <View style={isChip ? styles.chipIconWrap : styles.gridIconWrap}>
        {resolvedIcon.includes("-") ? (
          <Ionicons name={resolvedIcon} size={isChip ? 16 : 26} color={colors.primary} />
        ) : (
          <Text style={isChip ? styles.chipEmoji : styles.gridEmoji}>{resolvedIcon}</Text>
        )}
      </View>
      <Text style={isChip ? styles.chipText : styles.gridText} numberOfLines={isChip ? 1 : 2}>
        {resolvedLabel}
      </Text>
      {selected && !isChip ? (
        <View style={styles.check}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    minHeight: 112,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    justifyContent: "space-between",
    position: "relative",
    ...shadow.xs,
  },
  gridSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  gridIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  gridEmoji: {
    fontSize: 24,
  },
  gridText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "relative",
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  chipEmoji: {
    fontSize: 16,
  },
  chipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
  },
  check: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.9,
  },
});
