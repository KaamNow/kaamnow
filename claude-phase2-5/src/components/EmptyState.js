import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing } from "../theme";
import PrimaryButton from "./PrimaryButton";

export default function EmptyState({
  icon = "information-circle-outline",
  title,
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: spacing.lg,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.xl,
  },
});
