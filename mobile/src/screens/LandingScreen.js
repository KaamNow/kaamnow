import { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Alert,
  ImageBackground,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, sizes, spacing } from "../theme";
import Button from "../components/Button";
import Input from "../components/Input";
import Overline from "../components/Overline";

export default function LandingScreen({ navigation }) {
  const { user } = useAuth();
  const isWorker = user?.role === "worker";
  const isCustomer = user?.role === "customer";
  const isGuest = !user;
  const [stats, setStats] = useState({ workers: 0, jobs: 0, completed_bookings: 0, villages: 0 });
  const [waitForm, setWaitForm] = useState({ name: "", email: "", role: "customer" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const submitWaitlist = async () => {
    if (!waitForm.email) return Alert.alert("Email is required");
    setSubmitting(true);
    try {
      await api.post("/waitlist", waitForm);
      Alert.alert("✅ You're on the list!", "We'll be in touch soon.");
      setWaitForm({ name: "", email: "", role: "customer" });
    } catch (err) {
      Alert.alert("Error", formatApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.brandRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoLetter}>K</Text>
          </View>
          <Text style={styles.brand}>
            kaamnow<Text style={{ color: colors.saffron }}>.com</Text>
          </Text>
        </View>

        <View style={styles.hero}>
          <Overline>Bharat&apos;s village labour marketplace</Overline>
          <Text style={styles.h1}>Kaam milega.</Text>
          <Text style={[styles.h1, { color: colors.saffron }]}>Mazdoori milegi.</Text>
          <Text style={[styles.h1, { color: colors.indigo }]}>Izzat ke saath.</Text>
          <Text style={styles.lead}>
            KaamNow connects 250M+ rural workers with farmers, homeowners and contractors —
            over WhatsApp, voice, and a phone any villager already owns.
          </Text>

          <View style={styles.ctas}>
            {/* Worker */}
            {isWorker && (
              <Button
                title="Find Jobs Near Me"
                onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}
                icon={<Ionicons name="briefcase-outline" size={16} color="#fff" />}
              />
            )}

            {/* Customer */}
            {isCustomer && (
              <>
                <Button
                  title="Find Workers"
                  onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}
                  icon={<Ionicons name="people-outline" size={16} color="#fff" />}
                />
                <Button
                  title="Post a Job"
                  variant="outline"
                  onPress={() => navigation.navigate("PostJob")}
                  icon={<Ionicons name="add-circle-outline" size={16} color={colors.text} />}
                />
              </>
            )}

            {/* Guest */}
            {isGuest && (
              <>
                <Button
                  title="Find Workers"
                  onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}
                  icon={<Ionicons name="people-outline" size={16} color="#fff" />}
                />
                <Button
                  title="Find Work"
                  variant="outline"
                  onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}
                  icon={<Ionicons name="briefcase-outline" size={14} color={colors.text} />}
                />
              </>
            )}

            <Button
              testID="hero-whatsapp-demo"
              title="WhatsApp bot demo"
              variant="outline"
              onPress={() => navigation.navigate("Tabs", { screen: "Chat" })}
              icon={<Ionicons name="chatbubble-outline" size={14} color={colors.text} />}
            />
          </View>

          <Image
            source={{
              uri: "https://images.pexels.com/photos/12921278/pexels-photo-12921278.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=720",
            }}
            style={styles.heroImg}
          />

          <View style={styles.statsGrid}>
            {[
              { v: stats.workers + "+", l: "Verified workers" },
              { v: stats.villages + "+", l: "Villages" },
              { v: "₹450", l: "Avg daily wage" },
              { v: "<15min", l: "Avg match" },
            ].map((s) => (
              <View key={s.l} style={styles.statBox}>
                <Text style={styles.statValue}>{s.v}</Text>
                <Text style={styles.statLabel}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* HOW IT WORKS */}
        <View style={styles.section}>
          <Overline>How it works</Overline>
          <Text style={styles.h2}>
            Three taps. One worker. <Text style={{ color: colors.indigo }}>Zero middlemen.</Text>
          </Text>
          {[
            { n: "01", t: "Post via WhatsApp or app", d: "Tell us what work, when, where. Voice-in works. Hindi works. 60 seconds.", icon: "chatbubble-outline" },
            { n: "02", t: "We find verified workers", d: "Sarpanch-vouched, peer-rated workers within 5km. Trust tiers shown upfront.", icon: "location-outline" },
            { n: "03", t: "They arrive. Pay cash or UPI.", d: "Cash-friendly. Rate after work. Reputation grows for everyone.", icon: "shield-checkmark-outline" },
          ].map((s, i) => (
            <View key={i} style={styles.howCard}>
              <View style={styles.howHeader}>
                <Text style={styles.howN}>{s.n}</Text>
                <Ionicons name={s.icon} size={24} color={i % 2 ? colors.saffron : colors.indigo} />
              </View>
              <Text style={styles.howT}>{s.t}</Text>
              <Text style={styles.howD}>{s.d}</Text>
            </View>
          ))}
        </View>

        {/* FEATURES */}
        <View style={styles.section}>
          <Overline>Built for the last village</Overline>
          <Text style={styles.h2}>What makes us different.</Text>
          {[
            { t: "WhatsApp-native booking", d: "700M+ Indians on WhatsApp. No app download required.", bg: colors.indigo, fg: "#fff" },
            { t: "Voice-first UX", d: "Speak in Bhojpuri, Marathi, Tamil. We transcribe.", bg: "#fff", fg: colors.text },
            { t: "3-tier trust system", d: "Self-verified → Gaon Verified → KaamNow Pro.", bg: "#fff", fg: colors.text },
            { t: "Farm calendar booking", d: "Pre-book crews 7 days ahead for sowing/harvest.", bg: "#fff", fg: colors.text },
            { t: "Cash + UPI hybrid", d: "Start with cash. Move to UPI when ready. Never forced.", bg: colors.saffron, fg: "#fff" },
          ].map((f, i) => (
            <View
              key={i}
              style={[
                styles.featureCard,
                { backgroundColor: f.bg, borderColor: f.bg === "#fff" ? colors.border : f.bg },
              ]}
            >
              <Text style={[styles.featureT, { color: f.fg }]}>{f.t}</Text>
              <Text style={[styles.featureD, { color: f.fg === "#fff" ? "rgba(255,255,255,0.85)" : colors.textSecondary }]}>{f.d}</Text>
            </View>
          ))}
        </View>

        {/* TESTIMONIAL */}
        <View style={[styles.section, { backgroundColor: "#fff", borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }]}>
          <Overline>From the chowk</Overline>
          <Text style={styles.testimonial}>
            &ldquo;Pehle 12 din kaam milta tha, ab 18 din. Bachhon ki padhai bhi chal rahi hai.&rdquo;
          </Text>
          <View style={styles.testimonialRow}>
            <Image
              source={{ uri: "https://images.pexels.com/photos/36998122/pexels-photo-36998122.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=200" }}
              style={styles.testimonialAvatar}
            />
            <View>
              <Text style={styles.testimonialName}>Ramesh Kumar, Mason</Text>
              <Text style={styles.testimonialMeta}>Pratapgarh, UP — 47 jobs</Text>
            </View>
          </View>
        </View>

        {/* WAITLIST */}
        <ImageBackground
          source={{ uri: "https://images.pexels.com/photos/32915125/pexels-photo-32915125.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=800&w=1500" }}
          style={styles.waitlistBg}
        >
          <View style={styles.waitlistOverlay}>
            <Text style={[styles.h2, { color: "#fff", textAlign: "center" }]}>Ready when your village is.</Text>
            <Text style={styles.waitlistLead}>Join the waitlist. Be among the first 100 villages we onboard in 2026.</Text>
            <View style={styles.waitlistForm}>
              <Input
                testID="waitlist-name"
                placeholder="Your name"
                value={waitForm.name}
                onChangeText={(v) => setWaitForm({ ...waitForm, name: v })}
              />
              <Input
                testID="waitlist-email"
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                value={waitForm.email}
                onChangeText={(v) => setWaitForm({ ...waitForm, email: v })}
              />
              <Button
                testID="waitlist-submit"
                title="Join Waitlist"
                onPress={submitWaitlist}
                loading={submitting}
              />
            </View>
          </View>
        </ImageBackground>

        <View style={styles.footer}>
          <Text style={styles.brand}>
            kaamnow<Text style={{ color: colors.saffron }}>.com</Text>
          </Text>
          <Text style={styles.footerText}>© {new Date().getFullYear()} KaamNow. Built for Bharat.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.saffron,
    alignItems: "center",
    justifyContent: "center",
  },
  logoLetter: { color: "#fff", fontFamily: fonts.display, fontSize: 18 },
  brand: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  hero: { padding: spacing.xl, paddingTop: spacing.lg },
  h1: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, color: colors.text, marginTop: 4 },
  lead: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  ctas: { gap: 10, marginTop: spacing.xl },
  heroImg: {
    width: "100%",
    height: 280,
    borderRadius: radius.xl,
    marginTop: spacing.xl,
    backgroundColor: colors.border,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.xl,
    marginHorizontal: -8,
  },
  statBox: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 2,
  },
  section: { padding: spacing.xl },
  h2: { fontFamily: fonts.display, fontSize: 28, color: colors.text, marginTop: 8, marginBottom: 16 },
  howCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 12,
  },
  howHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  howN: { fontFamily: fonts.display, fontSize: 36, color: "#E5E7EB" },
  howT: { fontFamily: fonts.display, fontSize: 20, marginTop: 14, color: colors.text },
  howD: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  featureCard: { borderRadius: radius.lg, borderWidth: 1, padding: 18, marginBottom: 10 },
  featureT: { fontFamily: fonts.display, fontSize: 18 },
  featureD: { fontFamily: fonts.body, fontSize: 13, marginTop: 4, lineHeight: 18 },
  testimonial: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text,
    marginTop: 14,
  },
  testimonialRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  testimonialAvatar: { width: 44, height: 44, borderRadius: 22 },
  testimonialName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  testimonialMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  waitlistBg: { width: "100%" },
  waitlistOverlay: {
    backgroundColor: "rgba(63,55,201,0.92)",
    padding: spacing.xl,
    paddingVertical: 56,
  },
  waitlistLead: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 8,
  },
  waitlistForm: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: radius.lg,
    marginTop: 24,
  },
  footer: { padding: spacing.xl, alignItems: "center", gap: 6 },
  footerText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
});
