import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../theme";

export default function TrustBadge({ tier }) {
  const labels = { 1: "Self-verified", 2: "Gaon Verified", 3: "KaamNow Pro" };
  const bg = tier === 1 ? "#E5E7EB" : tier === 2 ? colors.indigo : colors.saffron;
  const fg = tier === 1 ? colors.text : "#fff";
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Ionicons name="shield-checkmark" size={10} color={fg} />
      <Text style={[styles.text, { color: fg }]}>{labels[tier]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
});
