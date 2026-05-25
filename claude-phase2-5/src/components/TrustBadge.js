import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius } from "../theme";

const TIER_CONFIG = {
  1: {
    label: "Self verified",
    icon: "shield-outline",
    bg: "rgba(255,255,255,0.72)",
    fg: colors.textBody,
    border: colors.borderSubtle,
  },
  2: {
    label: "Verified",
    icon: "shield-checkmark",
    bg: "rgba(236,253,245,0.82)",
    fg: colors.statusSuccess,
    border: "#BBF7D0",
  },
  3: {
    label: "KaamNow Pro",
    icon: "ribbon-outline",
    bg: "rgba(218,226,253,0.82)",
    fg: colors.primary,
    border: colors.borderSubtle,
  },
  4: {
    label: "Elite Expert",
    icon: "trophy-outline",
    bg: "rgba(255,255,255,0.82)",
    fg: colors.secondary,
    border: colors.outlineVariant,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  text: {
    fontFamily: fonts.labelSm,
    fontSize: 11,
  },
});
