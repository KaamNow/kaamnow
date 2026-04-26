import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function Button({
  title,
  onPress,
  variant = "saffron",
  loading = false,
  disabled = false,
  style,
  testID,
  icon,
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
        variantStyle,
        (disabled || loading) && { opacity: 0.6 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: textColor }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saffron: { backgroundColor: colors.saffron },
  indigo: { backgroundColor: colors.indigo },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
});
