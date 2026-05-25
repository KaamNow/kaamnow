import { useEffect, useMemo, useState } from "react";
import {
  View, Text, ScrollView, Image, ImageBackground, StyleSheet,
  Pressable, Alert, ActivityIndicator, Share, Platform,
  TextInput, KeyboardAvoidingView, TouchableOpacity,
} from "react-native";
import { ResizeMode, Video } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api, { formatApiError, API_URL } from "../api";
import EmptyState from "../components/EmptyState";
import TrustBadge from "../components/TrustBadge";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const HERO_FALLBACK =
  "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200&auto=format&fit=crop";
const VIDEO_FALLBACK =
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1200&auto=format&fit=crop";

const fullUrl = (url) => {
  if (!url) return null;
  return url.startsWith("http") ? url : `${API_URL}${url}`;
};

const prettySkill = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

const timeAgo = (iso) => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.max(0, Math.floor((Date.now() - then) / 86400000));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`;
  return `${Math.floor(days / 30)} month${days < 60 ? "" : "s"} ago`;
};

export default function WorkerProfileScreen({ route, navigation }) {
  const { id } = route.params;
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Booking form sheet
  const [bookingSheet, setBookingSheet] = useState(false);
  const [bookDesc,    setBookDesc]    = useState("");
  const [bookPrice,   setBookPrice]   = useState("");
  const [bookAddress, setBookAddress] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/service-profiles/${id}`)
      .then((r) => setProfile(r.data))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Keep heart in sync whenever user.saved_users or profile changes
  useEffect(() => {
    if (profile?.user_id) {
      setSaved((user?.saved_users || []).includes(profile.user_id));
    }
  }, [profile?.user_id, user?.saved_users]);

  const view = useMemo(() => {
    if (!profile) return null;
    const photos = Array.isArray(profile.photos) ? profile.photos : [];
    const heroPhoto = fullUrl(
      profile.cover_url ||
      photos[0]?.image_url ||
      photos[0]?.url ||
      profile.photo_url
    ) || HERO_FALLBACK;
    const avatar = fullUrl(profile.photo_url);
    const name = profile.display_name || profile.name || "Local Expert";
    const skills = [
      ...(Array.isArray(profile.categories) ? profile.categories : []),
      ...(Array.isArray(profile.skills) ? profile.skills : []),
    ].filter(Boolean);
    const uniqueSkills = [...new Set(skills)].slice(0, 8);
    const rating = Number(profile.rating_avg || 0);
    const ratingCount = Number(profile.rating_count || 0);
    const completed = Number(profile.completed_jobs || profile.total_jobs || ratingCount || 0);
    const experience = profile.experience_years || profile.experience || null;
    const rate = profile.hourly_rate || profile.daily_rate || null;
    const rateLabel = profile.hourly_rate ? "Per Hour" : "Per Day";
    const location = profile.location_text || profile.village || profile.pincode || "Location not added";
    const reviews = Array.isArray(profile.reviews) ? profile.reviews : [];
    const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
    return {
      heroPhoto, avatar, name, uniqueSkills, rating, ratingCount, completed,
      experience, rate, rateLabel, location, reviews, initials,
      available: profile.availability !== false && profile.is_active !== false,
      isAvailableNow: profile.is_available_now || false,
      verified: profile.verification_status === "verified" || profile.selfie_verified || profile.trust_tier >= 2,
      trustTier: profile.trust_tier || 1,
      videoUrl: fullUrl(profile.video_url || profile.intro_video_url || profile.intro_video),
      videoTitle: profile.video_title || profile.intro_video_title || "Intro Video",
      bio: profile.bio || profile.about || "This Local Expert has not added an about section yet.",
      userId: profile.user_id,
    };
  }, [profile]);

  const isOwnProfile = user?.id && view?.userId === user.id;

  const bookNow = () => {
    if (!view?.userId) return;
    if (!user) { navigation.navigate("Login"); return; }
    if (isOwnProfile) { Alert.alert("Your profile", "This is your own service profile."); return; }
    setBookDesc("");
    setBookPrice("");
    setBookAddress("");
    setBookingSheet(true);
  };

  const submitBooking = async () => {
    const priceStr = bookPrice.trim();
    const addr = bookAddress.trim();
    const note = bookDesc.trim();

    const priceNum = parseFloat(priceStr);
    if (!priceStr || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Price required", "Please enter a proposed price.");
      return;
    }
    if (!addr) {
      Alert.alert("Address required", "Please enter where the work needs to happen.");
      return;
    }

    setBooking(true);
    try {
      await api.post("/work-requests", {
        requested_to_user_id: view.userId,
        request_type: "direct_booking",
        message: note || `Hi ${view.name}, I'd like to book your service.`,
        proposed_price: priceNum,
        address: addr,
      });
      setBookingSheet(false);
      Alert.alert("Request sent", "The Local Expert will respond shortly.");
      navigation.navigate("Tabs", { screen: "Activity", params: { initialTab: "sent" } });
    } catch (err) {
      Alert.alert("Could not send request", formatApiError(err));
    } finally {
      setBooking(false);
    }
  };

  const shareProfile = async () => {
    if (!profile?.id) return;
    try {
      await Share.share({
        message: `View ${view?.name || "this Local Expert"} on KaamNow: https://kaamnow.com/local-expert/${profile.id}`,
      });
    } catch {}
  };

  const toggleSave = async () => {
    if (!user) { navigation.navigate("Login"); return; }
    if (!view?.userId || saving) return;
    setSaving(true);
    const wasSaved = saved;
    setSaved(!wasSaved);
    try {
      const res = await api.post(`/auth/me/save-user/${view.userId}`);
      // Sync heart state from server response
      const updatedSaved = res.data?.saved_users || [];
      setSaved(updatedSaved.includes(view.userId));
      refreshUser();
    } catch {
      setSaved(wasSaved); // revert on error
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={s.loadingTxt}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (!view) {
    return (
      <View style={s.safe}>
        <EmptyState
          icon="person-outline"
          title="Local Expert not found"
          subtitle="Try again or go back."
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={s.safe}>
      <View style={[s.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.iconButton}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </Pressable>
        <Text style={[s.topTitle, { flex: 1, textAlign: "center" }]}>Expert Profile</Text>
        <View style={{ flexDirection: "row" }}>
          <Pressable onPress={shareProfile} hitSlop={10} style={s.iconButton}>
            <Ionicons name="share-social-outline" size={20} color={colors.textHeading} />
          </Pressable>
          {!isOwnProfile && (
            <Pressable onPress={toggleSave} hitSlop={10} style={s.iconButton} disabled={saving}>
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color={saved ? "#ef4444" : colors.textHeading}
              />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 132 }}
      >
        <ImageBackground source={{ uri: view.heroPhoto }} style={s.heroImage} imageStyle={s.heroImg}>
          <View style={s.heroShade} />
          <View style={s.verifiedPill}>
            <Ionicons name={view.verified ? "shield-checkmark" : "shield-outline"} size={13} color="#fff" />
            <Text style={s.verifiedText}>{view.verified ? "Verified Expert" : "Local Expert"}</Text>
          </View>
        </ImageBackground>

        <View style={s.identityWrap}>
          <View style={s.avatarShell}>
            {view.avatar ? (
              <Image source={{ uri: view.avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarInitial}>{view.initials}</Text>
              </View>
            )}
            <View style={[s.onlineDot, !view.available && s.onlineDotOff]} />
          </View>

          <View style={s.nameRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{view.name}</Text>
              <View style={s.locationRow}>
                <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
                <Text style={s.locationText} numberOfLines={2}>{view.location}</Text>
              </View>
              {view.isAvailableNow && (
                <View style={s.availNowChip}>
                  <View style={s.availNowDot} />
                  <Text style={s.availNowChipText}>Available Now</Text>
                </View>
              )}
            </View>
            <TrustBadge tier={view.trustTier} />
          </View>
        </View>

        <View style={s.statsRow}>
          <StatCard value={view.experience ? `${view.experience}+` : `${view.completed}+`} label={view.experience ? "Years Exp." : "Jobs Done"} />
          <StatCard value={view.rating ? view.rating.toFixed(1) : "New"} label="Rating" star />
          <StatCard value={view.rate ? `₹${view.rate}` : "Ask"} label={view.rateLabel} />
        </View>

        <Section title="Specializations">
          {view.uniqueSkills.length ? (
            <View style={s.chipsRow}>
              {view.uniqueSkills.map((skill) => (
                <View key={skill} style={s.skillChip}>
                  <Text style={s.skillText}>{prettySkill(skill)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.emptyText}>No specializations added yet.</Text>
          )}
        </Section>

        <Section title="About">
          <Text style={s.aboutText}>{view.bio}</Text>
        </Section>

        <Section title="Skill Video">
          <View style={s.videoCard}>
            {view.videoUrl ? (
              <Video
                source={{ uri: view.videoUrl }}
                style={s.videoPlayer}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                shouldPlay={false}
              />
            ) : (
              <>
                <Image source={{ uri: VIDEO_FALLBACK }} style={s.videoImage} />
                <View style={s.videoOverlay}>
                  <View style={s.playCircle}>
                    <Ionicons name="play" size={34} color="#fff" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              </>
            )}
            <View style={s.videoBottom} pointerEvents="none">
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>{view.videoUrl ? "INTRO VIDEO" : "DEMO"}</Text>
              </View>
              <Text style={s.videoTitle} numberOfLines={1}>{view.videoTitle}</Text>
            </View>
          </View>
        </Section>

        <Section
          title={`Client Reviews (${view.ratingCount || view.reviews.length})`}
          right={view.rating ? `${view.rating.toFixed(1)} / 5.0` : null}
        >
          {view.reviews.length ? (
            <>
              {view.reviews.slice(0, 3).map((review) => (
                <Review key={review.id} item={review} />
              ))}
              {view.reviews.length > 3 ? (
                <Pressable style={s.moreReviewsBtn}>
                  <Text style={s.moreReviewsText}>Read More Reviews</Text>
                </Pressable>
              ) : null}
            </>
          ) : (
            <View style={s.noReviews}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textMuted} />
              <Text style={s.emptyText}>No client reviews yet.</Text>
            </View>
          )}
        </Section>
      </ScrollView>

      {!isOwnProfile && (
        <View style={[s.stickyBar, { paddingBottom: insets.bottom + 10 }]}>
          <Pressable style={[s.bookButton, booking && { opacity: 0.6 }]} onPress={bookNow} disabled={booking}>
            {booking ? <ActivityIndicator color="#fff" /> : <Text style={s.bookButtonText}>Book Now</Text>}
          </Pressable>
        </View>
      )}

      {/* Booking form bottom sheet */}
      {bookingSheet && (
        <>
          <TouchableOpacity
            style={s.sheetOverlay}
            activeOpacity={1}
            onPress={() => { if (!booking) setBookingSheet(false); }}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={s.sheetWrap}
          >
            <View style={[s.sheetInner, { paddingBottom: insets.bottom + 16 }]}>
              <Text style={s.sheetTitle}>Book {view.name}</Text>
              <Text style={s.sheetSubtitle}>
                {view.uniqueSkills.length ? view.uniqueSkills.slice(0, 2).map(sk => sk.replace(/_/g, " ")).join(" · ") : "Local Expert"}
              </Text>

              <Text style={s.fieldLabel}>Your proposed price (₹) *</Text>
              <TextInput
                style={[s.fieldInput, s.fieldInputSingle]}
                placeholder={view.rate ? `₹${view.rate} — their listed rate` : "e.g. 500"}
                placeholderTextColor={colors.textMuted}
                value={bookPrice}
                onChangeText={setBookPrice}
                keyboardType="numeric"
                maxLength={10}
              />

              <Text style={s.fieldLabel}>Where is the work? *</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="House no., street, village / city, pincode"
                placeholderTextColor={colors.textMuted}
                value={bookAddress}
                onChangeText={setBookAddress}
                multiline
                maxLength={300}
              />

              <Text style={s.fieldLabel}>Add a note (optional)</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="Any extra details for the expert…"
                placeholderTextColor={colors.textMuted}
                value={bookDesc}
                onChangeText={setBookDesc}
                multiline
                maxLength={300}
              />

              <Pressable
                style={[s.bookButton, { marginTop: 8 }, booking && { opacity: 0.6 }]}
                onPress={submitBooking}
                disabled={booking}
              >
                {booking
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.bookButtonText}>Send Booking Request</Text>
                }
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </>
      )}
    </View>
  );
}

function Section({ title, right, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {right ? (
          <View style={s.sectionRating}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={s.sectionRight}>{right}</Text>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function StatCard({ value, label, star }) {
  return (
    <View style={s.statCard}>
      <View style={s.statValueRow}>
        {star && value !== "New" ? <Ionicons name="star" size={15} color="#F59E0B" /> : null}
        <Text style={s.statValue}>{value}</Text>
      </View>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Review({ item }) {
  const rating = Math.round(Number(item.rating || 0));
  const name = item.reviewer_name || "User";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <View style={s.review}>
      <View style={s.reviewTop}>
        <View style={s.reviewUser}>
          {item.reviewer_photo_url ? (
            <Image source={{ uri: fullUrl(item.reviewer_photo_url) }} style={s.reviewAvatar} />
          ) : (
            <View style={[s.reviewAvatar, s.reviewAvatarFallback]}>
              <Text style={s.reviewInitial}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={s.reviewName}>{name}</Text>
            <Text style={s.reviewDate}>{timeAgo(item.created_at)}</Text>
          </View>
        </View>
        <View style={s.stars}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name={n <= rating ? "star" : "star-outline"} size={12} color={n <= rating ? "#F59E0B" : "#C7C7CC"} />
          ))}
        </View>
      </View>
      {item.comment ? <Text style={s.reviewText}>"{item.comment}"</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingTxt: { fontFamily: fonts.body, fontSize: 14, color: colors.outline },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.04)",
    zIndex: 5,
  },
  iconButton: { width: 40, height: 36, alignItems: "center", justifyContent: "center" },
  topTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },

  heroImage: { height: 150, width: "100%", justifyContent: "flex-end" },
  heroImg: { resizeMode: "cover" },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.16)" },
  verifiedPill: {
    alignSelf: "flex-end",
    marginRight: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  verifiedText: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },

  identityWrap: { paddingHorizontal: spacing.md, marginTop: -38 },
  avatarShell: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 5,
    backgroundColor: colors.bg,
    ...shadow.md,
  },
  avatar: { width: 94, height: 94, borderRadius: 47 },
  avatarFallback: { backgroundColor: colors.textHeading, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontFamily: fonts.bodyBold, fontSize: 28, color: "#fff" },
  onlineDot: {
    position: "absolute",
    right: 8,
    bottom: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.success,
    borderWidth: 3,
    borderColor: colors.bg,
  },
  onlineDotOff: { backgroundColor: colors.textMuted },
  nameRow: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.md, gap: spacing.sm },
  name: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.textHeading, letterSpacing: -0.2 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 5, maxWidth: 260 },
  locationText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  trustedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 5,
  },
  trustedText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textHeading },

  statsRow: { flexDirection: "row", gap: spacing.lg, paddingHorizontal: spacing.md, marginTop: spacing.md },
  statCard: {
    flex: 1,
    minHeight: 72,
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.sm,
  },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginTop: 3,
  },

  section: { paddingHorizontal: spacing.md, marginTop: spacing.xl },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  sectionRating: { flexDirection: "row", alignItems: "center", gap: 4 },
  sectionRight: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textHeading },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skillChip: { backgroundColor: colors.borderSubtle, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  skillText: { fontFamily: fonts.body, fontSize: 14, color: colors.textHeading },
  aboutText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: "#2E3034" },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary },

  videoCard: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.xl, overflow: "hidden", ...shadow.lg },
  videoPlayer: { width: "100%", height: "100%", backgroundColor: colors.textHeading },
  videoImage: { width: "100%", height: "100%" },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.26)", alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  videoBottom: {
    position: "absolute",
    left: spacing.sm,
    right: spacing.sm,
    bottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 10, color: "#fff" },
  videoTitle: { flex: 1, textAlign: "right", fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },

  noReviews: { alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  review: { borderLeftWidth: 2, borderLeftColor: colors.borderSubtle, paddingLeft: spacing.md, marginBottom: spacing.xl },
  reviewTop: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm, marginBottom: spacing.sm },
  reviewUser: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewAvatarFallback: { backgroundColor: colors.textHeading, alignItems: "center", justifyContent: "center" },
  reviewInitial: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  reviewName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  reviewDate: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.textSecondary },
  stars: { flexDirection: "row", gap: 1, paddingTop: 3 },
  reviewText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 22, color: colors.textSecondary, fontStyle: "italic" },
  moreReviewsBtn: {
    height: 44,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -spacing.sm,
  },
  moreReviewsText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  availNowChip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#dcfce7", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start", marginTop: 6 },
  availNowDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.success },
  availNowChipText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.success },

  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: "rgba(249,249,254,0.94)",
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  bookButton: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: { fontFamily: fonts.bodyBold, fontSize: 20, color: "#fff" },

  // Booking form sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 20,
  },
  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
  },
  sheetInner: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: 20,
  },
  sheetTitle:    { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 4 },
  sheetSubtitle: { fontFamily: fonts.body,     fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
  fieldLabel:    { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textHeading,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  fieldInputSingle: { minHeight: 48, textAlignVertical: "center" },
});
