import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, textStyle]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  fullWidth: {
    width: "100%",
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
    color: "#fff",
  },
});
