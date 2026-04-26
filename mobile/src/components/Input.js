import { TextInput, StyleSheet, View, Text } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function Input({ label, style, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
});
