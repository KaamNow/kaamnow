import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function Button({
  title,
  onPress,
  variant = "saffron",
  loading = false,
  disabled = false,
  style,
  textStyle,
  testID,
  icon,
  fullWidth = false,
}) {
  const variantStyle = styles[variant] || styles.saffron;
  const textColor =
    variant === "outline" ? colors.text : "#fff";

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        variantStyle,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fullWidth: {
    width: "100%",
  },
  saffron: { backgroundColor: colors.primary },
  indigo: { backgroundColor: colors.primary },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.88,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
