import { useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions, Animated,
  TouchableOpacity, Modal,
} from "react-native";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";

const { width } = Dimensions.get("window");
const SEEN_FLAG = FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}kn_onboarded.flag` : null;

const SLIDES = [
  {
    icon: "briefcase-outline",
    titleKey: "onboard_slide1_title",
    descKey: "onboard_slide1_desc",
    bg: "#EEF2FF",
    iconColor: colors.indigo,
  },
  {
    icon: "star-outline",
    titleKey: "onboard_slide2_title",
    descKey: "onboard_slide2_desc",
    bg: "#FFF7ED",
    iconColor: colors.saffron,
  },
  {
    icon: "wallet-outline",
    titleKey: "onboard_slide3_title",
    descKey: "onboard_slide3_desc",
    bg: "#F0FDF4",
    iconColor: colors.success,
  },
];

export default function OnboardingWalkthrough({ visible, onDone }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (nextIdx) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setIdx(nextIdx);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  };

  const next = () => {
    if (idx < SLIDES.length - 1) goTo(idx + 1);
    else onDone();
  };

  const slide = SLIDES[idx];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { backgroundColor: slide.bg, opacity: fadeAnim }]}>
          {/* Dots */}
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
            ))}
          </View>

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: slide.iconColor + "20" }]}>
            <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
          </View>

          <Text style={styles.title}>{t(slide.titleKey)}</Text>
          <Text style={styles.desc}>{t(slide.descKey)}</Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
              <Text style={styles.skipText}>{t("onboard_skip")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} style={styles.nextBtn}>
              <Text style={styles.nextText}>
                {idx < SLIDES.length - 1 ? t("onboard_next") : t("onboard_start")}
              </Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export async function hasSeenOnboarding() {
  if (!SEEN_FLAG) return true;
  try {
    const info = await FileSystem.getInfoAsync(SEEN_FLAG);
    return info.exists;
  } catch { return true; }
}

export async function markOnboardingSeen() {
  if (!SEEN_FLAG) return;
  try { await FileSystem.writeAsStringAsync(SEEN_FLAG, "1"); } catch {}
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center", alignItems: "center", padding: spacing.lg,
  },
  card: {
    width: "100%", maxWidth: 360, borderRadius: radius.xl,
    padding: spacing.xl, alignItems: "center",
  },
  dots: { flexDirection: "row", gap: 6, marginBottom: spacing.xl },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(0,0,0,0.15)" },
  dotActive: { width: 18, backgroundColor: colors.indigo },
  iconCircle: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: spacing.lg },
  title: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.text, textAlign: "center", marginBottom: spacing.sm },
  desc:  { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center", lineHeight: 22, marginBottom: spacing.xl },
  actions: { flexDirection: "row", width: "100%", justifyContent: "space-between", alignItems: "center" },
  skipBtn:  { padding: spacing.sm },
  skipText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  nextBtn:  { flexDirection: "row", alignItems: "center", backgroundColor: colors.indigo, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
