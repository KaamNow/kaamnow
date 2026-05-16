import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function PhoneInput({
  value,
  onChangeText,
  autoFocus = false,
  style,
  ...props
}) {
  const handleChange = (text) => {
    onChangeText(text.replace(/\D/g, "").slice(0, 10));
  };

  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>+91</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={handleChange}
        autoFocus={autoFocus}
        keyboardType="number-pad"
        maxLength={10}
        placeholder="Mobile number"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    minHeight: 52,
    flexDirection: "row",
  },
  prefix: {
    minWidth: 64,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderRightWidth: 0,
    borderColor: colors.primary,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  prefixText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.primary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderTopRightRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    letterSpacing: 2,
    color: colors.text,
  },
});
