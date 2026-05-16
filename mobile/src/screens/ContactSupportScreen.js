import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import AppScreen from "../components/AppScreen";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const SUPPORT_ITEMS = [
  {
    icon: "logo-whatsapp",
    color: "#25D366",
    title: "WhatsApp Support",
    subtitle: "Chat karein — seedha team se",
    action: () => Linking.openURL("https://wa.me/919999999999"),
  },
  {
    icon: "call-outline",
    color: colors.primary,
    title: "Call Us",
    subtitle: "+91 99999 99999 · Mon–Sat 9am–6pm",
    action: () => Linking.openURL("tel:+919999999999"),
  },
  {
    icon: "mail-outline",
    color: colors.primary,
    title: "Email",
    subtitle: "support@kaamnow.com",
    action: () => Linking.openURL("mailto:support@kaamnow.com"),
  },
];

const FAQS = [
  {
    q: "How do I find workers?",
    a: "Tap 'Find Workers' from the home tab, search by skill or village, and tap a worker to send a booking request.",
  },
  {
    q: "How does the OTP login work?",
    a: "We send a 6-digit code to your WhatsApp or SMS. Enter the code and you're in — no password needed.",
  },
  {
    q: "Can a worker cancel after being hired?",
    a: "Yes. Either party can cancel an engagement. Both are notified via WhatsApp. Please use this responsibly.",
  },
  {
    q: "How do I update my skills or rate?",
    a: "Go to Dashboard → your profile section. Skills and daily rate can be edited at any time.",
  },
  {
    q: "Is KaamNow free?",
    a: "Completely free for workers. Customers pay ₹30 per successful booking (coming soon).",
  },
];

export default function ContactSupportScreen() {
  const { user } = useAuth();

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Intro ── */}
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="headset-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.introTitle}>Kis baat mein madad chahiye?</Text>
            <Text style={styles.introSub}>KaamNow team se madad paayein</Text>
          </View>
        </View>

        {user && (
          <View style={styles.userChip}>
            <Ionicons name="person-circle-outline" size={14} color={colors.primary} />
            <Text style={styles.userChipTxt}>{user.name || "User"} · {user.phone_primary}</Text>
          </View>
        )}

        {/* ── Contact channels ── */}
        <Text style={styles.sectionTitle}>Support se baat karein</Text>
        {SUPPORT_ITEMS.map((item) => (
          <Pressable
            key={item.title}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
            onPress={item.action}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color + "20" }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ))}

        {/* ── FAQs ── */}
        <Text style={styles.sectionTitle}>Aksar pooche gaye sawaal</Text>
        {FAQS.map((faq) => (
          <View key={faq.q} style={styles.faqCard}>
            <View style={styles.faqQRow}>
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} style={{ marginTop: 1 }} />
              <Text style={styles.faqQ}>{faq.q}</Text>
            </View>
            <Text style={styles.faqA}>{faq.a}</Text>
          </View>
        ))}

        <Text style={styles.footer}>KaamNow · Bihar se Bharat tak 🇮🇳</Text>
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.xs,
  },
  introIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  introTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  introSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },

  userChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  userChipTxt: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.primary },

  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
    minHeight: 72,
    ...shadow.xs,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  cardSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 3 },

  faqCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.xs,
  },
  faqQRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  faqQ: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, flex: 1, lineHeight: 20 },
  faqA: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20, paddingLeft: 24 },

  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
