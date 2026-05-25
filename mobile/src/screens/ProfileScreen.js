import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Switch, Alert, Share, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius, shadow } from "../theme";
import api from "../lib/api";

// ── Tier config ───────────────────────────────────────────────────────────────
const TIER = {
  1: { label: "Starter" },
  2: { label: "Rising" },
  3: { label: "Pro" },
  4: { label: "Elite" },
};

// ── Expert tool tiles ─────────────────────────────────────────────────────────
const EXPERT_TOOLS = [
  { icon: "images-outline",    label: "Portfolio",    screen: "Portfolio" },
  { icon: "ribbon-outline",    label: "Certificates", screen: "Certifications" },
  { icon: "videocam-outline",  label: "Video",        screen: "VideoProfile" },
  { icon: "card-outline",      label: "KYC",          screen: "KYC" },
  { icon: "cash-outline",      label: "Earnings",     screen: "Earnings" },
  { icon: "qr-code-outline",   label: "QR Code",      screen: "QRCode" },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ title }) {
  return <Text style={styles.sectionLabel}>{title}</Text>;
}

function SettingsRow({ icon, label, value, onPress, danger }) {
  return (
    <TouchableOpacity style={styles.settingsRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingsRowLeft}>
        <View style={[styles.settingsIcon, danger && { backgroundColor: "#fff1f2" }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.error : colors.textBody} />
        </View>
        <Text style={[styles.settingsLabel, danger && { color: colors.error }]}>{label}</Text>
      </View>
      <View style={styles.settingsRowRight}>
        {value ? <Text style={styles.settingsValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.outlineVariant} />
      </View>
    </TouchableOpacity>
  );
}

function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [availableNow, setAvailableNow] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [broadcastOn, setBroadcastOn] = useState(false);
  const [broadcastExpiry, setBroadcastExpiry] = useState(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const isWorker = user?.has_service_profile === true;
  const [serviceProfile, setServiceProfile] = useState(null);

  // Derive stats from service profile (not user object — those fields live in service_profiles collection)
  const jobsDone   = serviceProfile?.completed_jobs ?? 0;
  const avgRating  = serviceProfile?.rating_avg ?? null;
  const dailyRate  = serviceProfile?.daily_rate ?? null;
  const trustTier  = serviceProfile?.trust_tier || 1;
  const tier       = TIER[trustTier] || TIER[1];

  useEffect(() => {
    if (!isWorker) return;
    api.get("/service-profiles/mine")
      .then(r => {
        setServiceProfile(r.data);
        setAvailableNow(r.data?.available || false);
        setBroadcastOn(r.data?.is_available_now || false);
        setBroadcastExpiry(r.data?.available_now_expires_at || null);
      })
      .catch(() => {});
  }, [isWorker]);

  const toggleAvailableNow = useCallback(async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const next = !availableNow;
      await api.patch("/service-profiles/mine/availability", { is_available: next });
      setAvailableNow(next);
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setToggling(false);
    }
  }, [availableNow, toggling]);

  // Tick every 60s so formatExpiry re-evaluates while broadcast is active
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!broadcastOn || !broadcastExpiry) return;
    const id = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [broadcastOn, broadcastExpiry]);

  const formatExpiry = (iso) => {
    if (!iso) return "";
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (mins <= 0) return "Expired";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m`;
  };

  const toggleBroadcast = useCallback(async () => {
    if (broadcasting) return;
    setBroadcasting(true);
    try {
      if (broadcastOn) {
        await api.delete("/service-profiles/mine/available-now");
        setBroadcastOn(false);
        setBroadcastExpiry(null);
      } else {
        const res = await api.post("/service-profiles/mine/available-now");
        setBroadcastOn(true);
        setBroadcastExpiry(res.data?.expires_at || null);
      }
    } catch {
      Alert.alert(t("err_generic"));
    } finally {
      setBroadcasting(false);
    }
  }, [broadcastOn, broadcasting]);

  const shareReferral = async () => {
    if (!user?.referral_code) return;
    try {
      await Share.share({
        message: `Join KaamNow — India's local work marketplace! Use my code ${user.referral_code} and get ₹50 credits. https://kaamnow.com/join?ref=${user.referral_code}`,
      });
    } catch {}
  };

  const handleLogout = () => Alert.alert(
    "Log out?",
    "You will need to verify your number again to log back in.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]
  );

  if (!user) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;

  const firstName = (user.name || "").split(" ")[0] || "there";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero header ──────────────────────────────────────────── */}
      <View style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}>
        {/* Top bar: title + edit */}
        <View style={styles.heroTopBar}>
          <Text style={styles.heroTopTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate("EditProfile")} style={styles.heroEditBtn} activeOpacity={0.82}>
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={styles.heroEditText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar centered */}
        <View style={styles.heroCenterCol}>
          <View style={styles.avatarWrap}>
            {user.photo_url ? (
              <Image source={{ uri: user.photo_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{(user.name || "?")[0].toUpperCase()}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate("EditPhoto")}>
              <Ionicons name="camera-outline" size={16} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroName}>{user.name || "My Profile"}</Text>
          <Text style={styles.heroPhone}>{user.phone_primary || user.phone || ""}</Text>
          {isWorker && (
            <View style={styles.tierChip}>
              <Text style={styles.tierChipText}>{tier.label}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Worker stats bar ─────────────────────────────────────── */}
      {isWorker && (
        <Card style={styles.statsCard}>
          <StatCell label="Jobs Done" value={jobsDone} />
          <View style={styles.statDivider} />
          <StatCell label="Avg Rating" value={avgRating ? `${avgRating.toFixed(1)} ★` : "—"} highlight={!!avgRating} />
          <View style={styles.statDivider} />
          <StatCell label="Daily Rate" value={dailyRate ? `₹${dailyRate}` : "—"} />
        </Card>
      )}

      {/* ── Become Expert (customers only) ───────────────────────── */}
      {!isWorker && (
        <TouchableOpacity style={styles.becomeExpertCard} onPress={() => navigation.navigate("BecomeExpert")} activeOpacity={0.88}>
          <View style={{ flex: 1 }}>
            <Text style={styles.becomeTitle}>Become a Local Expert</Text>
            <Text style={styles.becomeSub}>Offer your skills, earn money nearby</Text>
          </View>
          <View style={styles.becomeArrow}>
            <Ionicons name="arrow-forward" size={18} color={colors.primary} />
          </View>
        </TouchableOpacity>
      )}

      {/* ── Availability toggle (workers only) ───────────────────── */}
      {isWorker && (
        <View style={styles.sectionWrapTight}>
          <Card style={styles.availCard}>
            <View style={styles.availLeft}>
              <View style={[styles.availDot, { backgroundColor: availableNow ? colors.statusSuccess : colors.outlineVariant }]} />
              <View>
                <Text style={styles.availTitle}>Available for Work</Text>
                <Text style={styles.availSub}>{availableNow ? "Customers can book you now" : "You're currently offline"}</Text>
              </View>
            </View>
            <Switch
              value={availableNow}
              onValueChange={toggleAvailableNow}
              trackColor={{ false: colors.borderSubtle, true: colors.statusSuccess }}
              thumbColor="#fff"
              disabled={toggling}
            />
          </Card>

          <Card style={[styles.availCard, { marginTop: 10 }]}>
            <View style={styles.availLeft}>
              <View style={[styles.availDot, { backgroundColor: broadcastOn ? "#10b981" : colors.outlineVariant, width: 10, height: 10, borderRadius: 5 }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.availTitle}>Available Now</Text>
                <Text style={styles.availSub}>
                  {broadcastOn
                    ? (broadcastExpiry ? formatExpiry(broadcastExpiry) : "Notifying saved customers")
                    : "Broadcast for 4h · Alerts saved customers"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.broadcastBtn, broadcastOn && styles.broadcastBtnOff]}
              onPress={toggleBroadcast}
              disabled={broadcasting}
            >
              {broadcasting
                ? <ActivityIndicator size="small" color={broadcastOn ? "#ef4444" : "#fff"} />
                : <Text style={[styles.broadcastBtnText, broadcastOn && { color: "#ef4444" }]}>
                    {broadcastOn ? "Turn Off" : "Go Live"}
                  </Text>
              }
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* ── Skills & Rate (workers only) ─────────────────────────── */}
      {isWorker && (
        <View style={[styles.sectionWrap, { marginTop: spacing.lg }]}>
          <SectionLabel title="My Expert Profile" />
          <Card style={{ padding: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading }}>My Skills</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("BecomeExpert", { editMode: true })}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="pencil" size={15} color={colors.textHeading} />
              </TouchableOpacity>
            </View>

            {serviceProfile?.skills?.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {serviceProfile.skills.map(skill => (
                  <View key={skill} style={styles.skillBadge}>
                    <Text style={styles.skillBadgeText}>
                      {skill.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.outline }}>No skills added yet — tap pencil to add</Text>
            )}
          </Card>
        </View>
      )}

      {/* ── Expert Tools grid (workers only) ─────────────────────── */}
      {isWorker && (
        <View style={styles.expertToolsWrap}>
          <SectionLabel title="Expert Tools" />
          <Card style={styles.toolsCard}>
            <View style={styles.toolsGrid}>
              {EXPERT_TOOLS.map((tool, i) => (
                <TouchableOpacity
                  key={tool.screen}
                  style={[styles.toolTile, i % 3 !== 2 && styles.toolTileBorderRight, i < 3 && styles.toolTileBorderBottom]}
                  onPress={() => navigation.navigate(tool.screen)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={tool.icon} size={25} color={colors.textHeading} />
                  <Text style={styles.toolLabel}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </View>
      )}

      {/* ── Referral card ─────────────────────────────────────────── */}
      {user?.referral_code && (
        <TouchableOpacity style={styles.referCard} onPress={shareReferral} activeOpacity={0.88}>
          <View style={styles.referLeft}>
            <Text style={styles.referEmoji}>🎁</Text>
            <View>
              <Text style={styles.referTitle}>Refer & Earn ₹50</Text>
              <Text style={styles.referSub}>Code: <Text style={styles.referCode}>{user.referral_code}</Text></Text>
            </View>
          </View>
          <Ionicons name="share-social-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}

      {/* ── Account settings ──────────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <SectionLabel title="Account" />
        <Card>
          <SettingsRow
            icon="clipboard-outline"
            label="My Activity"
            onPress={() => navigation.navigate("Activity")}
          />
          <SettingsRow
            icon="wallet-outline"
            label="Wallet"
            value={user.wallet_balance > 0 ? `₹${user.wallet_balance}` : undefined}
            onPress={() => navigation.navigate("Wallet")}
          />
          <SettingsRow
            icon="heart-outline"
            label="Saved Experts"
            onPress={() => navigation.navigate("SavedExperts")}
          />
          <SettingsRow
            icon="location-outline"
            label="Saved Addresses"
            onPress={() => navigation.navigate("SavedAddresses")}
          />
          <SettingsRow
            icon="warning-outline"
            label="Emergency Contact"
            onPress={() => navigation.navigate("EmergencyContact")}
          />
        </Card>
      </View>

      {/* ── Help & Support ────────────────────────────────────────── */}
      <View style={styles.sectionWrap}>
        <SectionLabel title="Help" />
        <Card>
          <SettingsRow icon="chatbubble-ellipses-outline" label="Support Chat" onPress={() => navigation.navigate("SupportChat")} />
          <SettingsRow icon="help-circle-outline" label="FAQ" onPress={() => navigation.navigate("FAQ")} />
        </Card>
      </View>

      {/* ── Legal (compact row) ───────────────────────────────────── */}
      <View style={styles.legalRow}>
        <TouchableOpacity onPress={() => navigation.navigate("Terms")} style={styles.legalLink}>
          <Text style={styles.legalText}>Terms of Service</Text>
        </TouchableOpacity>
        <View style={styles.legalDot} />
        <TouchableOpacity onPress={() => navigation.navigate("Privacy")} style={styles.legalLink}>
          <Text style={styles.legalText}>Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* ── Logout ────────────────────────────────────────────────── */}
      <View style={styles.logoutWrap}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* App version */}
      <Text style={styles.version}>KaamNow v1.0 · काम की बात 🙏</Text>
    </ScrollView>
  );
}

function StatCell({ label, value, highlight }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, highlight && { color: "#d97706" }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: "#000",
    paddingHorizontal: spacing.xl,
    paddingBottom: 40,
    alignItems: "center",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    ...shadow.lg,
  },
  heroTopBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    width: "100%", paddingVertical: spacing.sm, marginBottom: spacing.lg,
  },
  heroTopTitle:  { fontFamily: fonts.bodyBold, fontSize: 20, color: "#fff" },
  heroEditBtn:   { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", backgroundColor: "rgba(255,255,255,0.1)" },
  heroEditText:  { fontFamily: fonts.bodyMedium, fontSize: 14, color: "#fff" },
  heroCenterCol: { alignItems: "center" },
  avatarWrap:    { position: "relative", marginBottom: spacing.md },
  avatar:        { width: 96, height: 96, borderRadius: 48, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)" },
  avatarFallback:{ backgroundColor: "#1F2937", justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontSize: 34, fontFamily: fonts.bodySemi, color: "#fff" },
  editAvatarBtn: {
    position: "absolute", bottom: 0, right: 0,
    backgroundColor: "#fff",
    borderRadius: 15, width: 30, height: 30,
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#E5E7EB",
    ...shadow.sm,
  },
  heroName:     { fontFamily: fonts.bodyBold, fontSize: 24, color: "#fff", marginBottom: 5 },
  heroPhone:    { fontFamily: fonts.body, fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: spacing.sm },
  tierChip:     { paddingHorizontal: 20, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.2)" },
  tierChipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff", textTransform: "uppercase", letterSpacing: 0.8 },

  // ── Stats ─────────────────────────────────────────────────────
  statsCard:  { flexDirection: "row", marginHorizontal: spacing.xl, marginTop: -28, borderRadius: 18, ...shadow.sm },
  statCell:   { flex: 1, alignItems: "center", paddingVertical: spacing.md },
  statValue:  { fontFamily: fonts.bodyBold, fontSize: 18, color: "#111827" },
  statLabel:  { fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.8 },
  statDivider:{ width: 1, backgroundColor: "#F3F4F6", marginVertical: spacing.sm },

  // ── Skill badges ──────────────────────────────────────────────
  skillBadge: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, backgroundColor: "#EEF2FF",
    borderWidth: 1, borderColor: "#C7D2FE",
  },
  skillBadgeText: { fontFamily: fonts.bodySemi, fontSize: 13, color: "#4338CA" },

  // ── Become Expert ─────────────────────────────────────────────
  becomeExpertCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: spacing.xl, marginTop: spacing.lg,
    backgroundColor: "#fff",
    borderRadius: 18, padding: spacing.md,
    borderWidth: 1, borderColor: "#F3F4F6",
    ...shadow.xs,
  },
  becomeTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 3 },
  becomeSub:   { fontFamily: fonts.body, fontSize: 13, color: colors.textBody },
  becomeArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },

  // ── Availability ──────────────────────────────────────────────
  availCard:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.md, borderRadius: 18 },
  availLeft:  { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  availDot:   { width: 8, height: 8, borderRadius: 4 },
  availTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading },
  availSub:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 1 },
  broadcastBtn: { backgroundColor: "#10b981", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, minWidth: 80, alignItems: "center" },
  broadcastBtnOff: { backgroundColor: "#fee2e2" },
  broadcastBtnText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },

  // ── Expert Tools grid ─────────────────────────────────────────
  toolsCard: { padding: 0, overflow: "hidden", borderRadius: 18, backgroundColor: "#F3F4F6" },
  toolsGrid: { flexDirection: "row", flexWrap: "wrap" },
  toolTile:  {
    width: "33.33%",
    minHeight: 122,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
  },
  toolTileBorderRight:  { borderRightWidth: 1, borderRightColor: "#F3F4F6" },
  toolTileBorderBottom: { borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  toolLabel: { fontFamily: fonts.bodyMedium, fontSize: 12, color: "#4B5563", textAlign: "center" },

  // ── Referral ──────────────────────────────────────────────────
  referCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#FEFCE8",
    marginHorizontal: spacing.xl, marginTop: 0, marginBottom: spacing.xl,
    borderRadius: 18, padding: spacing.lg,
    borderWidth: 1, borderColor: "#FEF3C7",
  },
  referLeft:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  referEmoji: { fontSize: 28 },
  referTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 2 },
  referSub:   { fontFamily: fonts.body, fontSize: 13, color: colors.textBody },
  referCode:  { fontFamily: fonts.bodyBold, color: colors.primary },

  // ── Settings rows ─────────────────────────────────────────────
  settingsRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: spacing.md,
    borderBottomWidth: 1, borderBottomColor: "#F9FAFB",
  },
  settingsRowLeft:  { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  settingsRowRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  settingsIcon:     { width: 32, height: 32, borderRadius: 9, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
  settingsLabel:    { fontFamily: fonts.bodyMedium, fontSize: 15, color: "#374151" },
  settingsValue:    { fontFamily: fonts.body, fontSize: 14, color: colors.outline },

  // ── Legal row ─────────────────────────────────────────────────
  legalRow:  { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg, gap: spacing.sm },
  legalLink: { paddingVertical: 4, paddingHorizontal: 2 },
  legalText: { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  legalDot:  { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.outlineVariant },

  // ── Logout ────────────────────────────────────────────────────
  logoutWrap: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  logoutBtn:  {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    paddingVertical: 15, borderRadius: 18,
    borderWidth: 2, borderColor: "rgba(220,38,38,0.1)",
    backgroundColor: "#fff",
  },
  logoutText: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.error },

  // ── Layout helpers ────────────────────────────────────────────
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1, borderColor: "#F3F4F6",
    overflow: "hidden",
    ...shadow.xs,
  },
  sectionWrap: { marginHorizontal: spacing.xl, marginBottom: spacing.xl },
  expertToolsWrap: { marginHorizontal: spacing.xl, marginBottom: spacing.xs },
  sectionWrapTight: { marginHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.xl },
  sectionLabel:{ fontFamily: fonts.bodyBold, fontSize: 10, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: spacing.sm, marginLeft: 4 },
  version:     { fontFamily: fonts.bodyMedium, fontSize: 10, color: "#9CA3AF", textAlign: "center", marginBottom: spacing.sm },
});
