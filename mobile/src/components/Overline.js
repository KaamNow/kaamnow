import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "../theme";

export default function Overline({ children, color = colors.indigo, style }) {
  return (
    <Text style={[styles.text, { color }, style]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
