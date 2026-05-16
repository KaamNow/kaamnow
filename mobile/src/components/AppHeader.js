import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, spacing } from "../theme";

export default function AppHeader({
  showLogo = true,
  showLangToggle = true,
  showNotifBell = false,
  notifCount = 0,
  onNotifPress,
  rightElement,
  lang = "en",
  onLangToggle,
  style,
}) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {showLogo ? (
          <>
            <Image source={require("../../assets/icon.png")} style={styles.logoImg} resizeMode="contain" />
            <Text style={styles.logoText}>KaamNow</Text>
          </>
        ) : null}
      </View>

      <View style={styles.actions}>
        {showLangToggle ? (
          <Pressable
            onPress={onLangToggle}
            disabled={!onLangToggle}
            style={({ pressed }) => [styles.langToggle, pressed && onLangToggle && styles.pressed]}
          >
            <Text style={styles.langText}>{lang === "hi" ? "हिं" : "EN"}</Text>
          </Pressable>
        ) : null}

        {showNotifBell ? (
          <Pressable
            onPress={onNotifPress}
            disabled={!onNotifPress}
            style={({ pressed }) => [styles.iconButton, pressed && onNotifPress && styles.pressed]}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {notifCount > 0 ? (
              <View style={styles.notifDot}>
                <Text style={styles.notifText}>{notifCount > 9 ? "9+" : notifCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}

        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
  },
  left: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  logoImg: { width: 36, height: 36, borderRadius: 10 },
  logoText: {
    marginLeft: 10,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  langToggle: {
    minHeight: 36,
    minWidth: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  langText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    top: -2,
    right: -2,
    paddingHorizontal: 3,
  },
  notifText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: "#fff",
  },
  pressed: {
    opacity: 0.88,
  },
});
