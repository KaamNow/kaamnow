import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

const STATUS_STYLES = {
  open: { bg: colors.primaryLight, text: colors.primary, label: "Open" },
  requested: { bg: colors.warningLight, text: colors.warning, label: "Pending" },
  accepted: { bg: colors.successLight, text: colors.success, label: "Hired" },
  completed: { bg: "#DBEAFE", text: "#1E40AF", label: "Done" },
  rejected: { bg: colors.dangerLight, text: colors.danger, label: "Rejected" },
  cancelled: { bg: colors.surface2, text: colors.textMuted, label: "Cancelled" },
  booked: { bg: colors.successLight, text: colors.success, label: "Filled" },
};

export default function StatusBadge({ status, size = "medium", label }) {
  const config = STATUS_STYLES[status] || STATUS_STYLES.open;
  const isSmall = size === "small";

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSmall && styles.smallBadge]}>
      <Text style={[styles.text, { color: config.text }, isSmall && styles.smallText]}>
        {label || config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
  },
  smallText: {
    fontSize: 11,
    lineHeight: 14,
  },
});
