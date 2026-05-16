import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../theme";

const TIER_CONFIG = {
  1: {
    label: "Self verified",
    icon: "shield-outline",
    bg: colors.surface2,
    fg: colors.textSecondary,
    border: colors.border,
  },
  2: {
    label: "Verified",
    icon: "shield-checkmark",
    bg: colors.successLight,
    fg: colors.success,
    border: "#BBF7D0",
  },
  3: {
    label: "KaamNow Pro",
    icon: "ribbon-outline",
    bg: colors.infoLight,
    fg: "#0369A1",
    border: "#BAE6FD",
  },
  4: {
    label: "Elite Worker",
    icon: "trophy-outline",
    bg: colors.warningLight,
    fg: colors.warning,
    border: "#FDE68A",
  },
};

export default function TrustBadge({ tier }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG[1];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Ionicons name={config.icon} size={12} color={config.fg} />
      <Text style={[styles.text, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
  },
});
