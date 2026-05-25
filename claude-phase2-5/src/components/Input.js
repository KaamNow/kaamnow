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
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.text,
  },
});
