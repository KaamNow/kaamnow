import { useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { colors, fonts, radius } from "../theme";

export default function OTPInput({
  value,
  onChange,
  length = 6,
  autoFocus = false,
  style,
}) {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const updateDigit = (text, index) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) {
      onChange(
        value
          .padEnd(length, " ")
          .split("")
          .map((char, i) => (i === index ? " " : char))
          .join("")
          .replace(/\s/g, "")
          .slice(0, length)
      );
      return;
    }

    if (digits.length > 1) {
      const next = digits.slice(0, length);
      onChange(next);
      const nextIndex = Math.min(next.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);
      return;
    }

    const next = value.padEnd(length, " ").split("");
    next[index] = digits;
    onChange(next.join("").replace(/\s/g, "").slice(0, length));

    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyPress = (event, index) => {
    if (event.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
  };

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => { inputRefs.current[index] = ref; }}
          value={value[index] || ""}
          onChangeText={(text) => updateDigit(text, index)}
          onKeyPress={(event) => handleKeyPress(event, index)}
          onFocus={() => setFocusedIndex(index)}
          keyboardType="number-pad"
          maxLength={length}
          selectTextOnFocus
          autoFocus={autoFocus && index === 0}
          style={[
            styles.box,
            focusedIndex === index && styles.boxFocused,
            value[index] && styles.boxFilled,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 7,
  },
  box: {
    flex: 1,
    height: 56,
    maxWidth: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    textAlign: "center",
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.text,
  },
  boxFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  boxFilled: {
    borderColor: colors.primary,
  },
});
