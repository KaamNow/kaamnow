import { View, Text, StyleSheet, ScrollView, Linking, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Overline from "../components/Overline";

const SUPPORT_ITEMS = [
  {
    icon: "logo-whatsapp",
    color: "#25D366",
    title: "WhatsApp Support",
    subtitle: "Chat with us instantly",
    action: () => Linking.openURL("https://wa.me/919999999999"),
  },
  {
    icon: "call-outline",
    color: colors.indigo,
    title: "Call Us",
    subtitle: "+91 99999 99999 · Mon–Sat 9am–6pm",
    action: () => Linking.openURL("tel:+919999999999"),
  },
  {
    icon: "mail-outline",
    color: colors.saffron,
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
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}>
        <Overline>Help & Support</Overline>
        <Text style={styles.h1}>How can we help?</Text>
        {user && (
          <Text style={styles.userNote}>
            Logged in as {user.name} · {user.phone_primary}
          </Text>
        )}

        {/* Contact channels */}
        <Text style={styles.section}>Contact us</Text>
        {SUPPORT_ITEMS.map((item) => (
          <Pressable key={item.title} style={styles.card} onPress={item.action}>
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

        {/* FAQs */}
        <Text style={styles.section}>Frequently asked questions</Text>
        {FAQS.map((faq) => (
          <View key={faq.q} style={styles.faqCard}>
            <Text style={styles.faqQ}>{faq.q}</Text>
            <Text style={styles.faqA}>{faq.a}</Text>
          </View>
        ))}

        <Text style={styles.footer}>KaamNow · Built for Bharat 🇮🇳</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  h1: { fontFamily: fonts.display, fontSize: sizes.h2, color: colors.text, marginTop: 4, marginBottom: 4 },
  userNote: { fontFamily: fonts.body, fontSize: sizes.small, color: colors.textMuted, marginBottom: 8 },
  section: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textSecondary,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 10,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  cardSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  faqCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  faqQ: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, marginBottom: 6 },
  faqA: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  footer: { fontFamily: fonts.body, fontSize: sizes.small, color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
});
