import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  maxLength,
  autoFocus = false,
  helperText,
  errorText,
  successText,
  leftIcon,
  rightElement,
  secureTextEntry = false,
  multiline = false,
  style,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const borderColor = errorText
    ? colors.danger
    : successText
      ? colors.success
      : focused
        ? colors.primary
        : "transparent";
  const supportText = errorText || successText || helperText;
  const supportColor = errorText
    ? colors.danger
    : successText
      ? colors.success
      : colors.textMuted;

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, { borderColor }, multiline && styles.multilineWrap]}>
        {leftIcon ? <View style={styles.side}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoFocus={autoFocus}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.multilineInput]}
          {...props}
        />
        {rightElement ? <View style={styles.side}>{rightElement}</View> : null}
      </View>
      {supportText ? <Text style={[styles.support, { color: supportColor }]}>{supportText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginBottom: 12,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  inputWrap: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  multilineWrap: {
    minHeight: 104,
    alignItems: "flex-start",
    paddingTop: 12,
  },
  side: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 78,
    paddingTop: 0,
    textAlignVertical: "top",
  },
  support: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },
});
