import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";
import { track } from "../lib/analytics";

const STATUS_COLORS = {
  requested:  { bg: "#EDEDF2", text: "#5E5E60" },
  accepted:   { bg: "#E3F2FD", text: "#0D47A1" },
  completed:  { bg: "#F0FDF4", text: "#166534" },
  rejected:   { bg: "#FFDAD6", text: "#93000A" },
  cancelled:  { bg: "#F3F3F8", text: "#6B7280" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBannerText(engagement, isSentByMe, otherName, isExpert) {
  const status = engagement.status;
  const rt = engagement.request_type;
  const name = otherName || "them";

  if (status === "accepted") {
    return isExpert
      ? `You are working for ${name}. Mark as done when the work is complete.`
      : `${name} is working on your job. You'll be notified when it's done.`;
  }
  if (status === "completed") {
    return isExpert
      ? `You worked for ${name}. Leave your review below.`
      : `${name} completed your job. Leave a review below.`;
  }
  if (status === "rejected")  return "This request was declined.";
  if (status === "cancelled") return "This request was cancelled.";

  if (rt === "job_application") {
    return isSentByMe
      ? `You applied for ${name}'s job. Waiting for them to respond.`
      : `${name} applied for your job. Accept or decline below.`;
  }
  if (rt === "direct_booking") {
    return isSentByMe
      ? `You sent a booking request to ${name}. Waiting for their response.`
      : `${name} wants to book you. Accept or decline below.`;
  }
  if (rt === "job_invitation") {
    return isSentByMe
      ? `You invited ${name} to your job. Waiting for their response.`
      : `${name} invited you to their job. Accept or decline below.`;
  }
  return "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BannerCard({ text, status }) {
  if (!text) return null;
  const isGreen = status === "completed";
  const isRed   = status === "rejected" || status === "cancelled";
  const bgColor = isGreen ? "#F0FDF4" : isRed ? "#FFF1F2" : "#F3F3F8";
  const txColor = isGreen ? "#166534" : isRed ? "#9F1239" : "#4C4546";
  return (
    <View style={[bannerS.wrap, { backgroundColor: bgColor }]}>
      <Text style={[bannerS.text, { color: txColor }]}>{text}</Text>
    </View>
  );
}

const bannerS = StyleSheet.create({
  wrap: { borderRadius: 12, padding: 14, marginBottom: 16 },
  text: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});

function StatusTracker({ engagement, isSentByMe }) {
  const rt = engagement.request_type;
  const status = engagement.status;
  let labels;
  if (rt === "job_application") {
    labels = isSentByMe ? ["Applied", "Accepted", "Done"] : ["Received", "Accepted", "Done"];
  } else if (rt === "direct_booking") {
    labels = isSentByMe ? ["Booked", "Accepted", "Done"] : ["Received", "Accepted", "Done"];
  } else {
    labels = isSentByMe ? ["Invited", "Accepted", "Done"] : ["Received", "Accepted", "Done"];
  }
  const states = [
    true,
    ["accepted", "completed"].includes(status),
    status === "completed",
  ];
  const isTerminal = status === "rejected" || status === "cancelled";
  const activeWidth = isTerminal ? "0%" : states[2] ? "100%" : states[1] ? "50%" : "0%";
  return (
    <View style={trackerS.wrap}>
      <View style={trackerS.lineWrap}>
        <View style={trackerS.lineBase} />
        <View style={[trackerS.lineActive, { width: activeWidth }]} />
      </View>
      {labels.map((label, i) => (
        <View key={label} style={trackerS.step}>
          <View style={[trackerS.dot, states[i] && !isTerminal && trackerS.dotDone]}>
            {states[i] && !isTerminal
              ? <Ionicons name="checkmark" size={14} color="#fff" />
              : null}
          </View>
          <Text style={[trackerS.label, states[i] && !isTerminal && trackerS.labelDone]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const trackerS = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  lineWrap: { position: "absolute", left: 20, right: 20, top: 13, height: 2 },
  lineBase: { ...StyleSheet.absoluteFillObject, backgroundColor: "#E2E2E7" },
  lineActive: { height: 2, backgroundColor: "#000" },
  step: { alignItems: "center", width: 80 },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#E2E2E7",
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  dotDone: { backgroundColor: "#000" },
  label: {
    fontFamily: fonts.bodyBold, fontSize: 11,
    color: "#9CA3AF", textAlign: "center", includeFontPadding: false,
  },
  labelDone: { color: "#1A1C1F" },
});

export default function EngagementDetailScreen({ route, navigation }) {
  const { id, openComplete } = route.params || {};
  const { user } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [engagement, setEngagement] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [acting, setActing]         = useState(false);

  // Complete flow
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [proofPhoto, setProofPhoto]               = useState(null); // { uri, type, name }
  const [completing, setCompleting]               = useState(false);

  // Rating flow
  const [ratingStars, setRatingStars]     = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/work-requests/${id}`);
      setEngagement(r.data);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Could not load request";
      Alert.alert("Error loading request", msg);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (openComplete) setShowCompleteModal(true);
  }, [openComplete]);

  const act = async (action) => {
    if (acting) return;
    setActing(true);
    try {
      if (action === "accept") { track("accept_booking", { engagement_id: id }); await api.post(`/work-requests/${id}/accept`); }
      if (action === "reject") await api.post(`/work-requests/${id}/reject`);
      if (action === "cancel") await api.post(`/work-requests/${id}/cancel`);
      await load();
    } catch (e) {
      Alert.alert("Action failed", e?.response?.data?.detail || e?.message || "Something went wrong");
    } finally {
      setActing(false);
    }
  };

  const pickProofPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow photo access to upload proof."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) setProofPhoto({ uri: result.assets[0].uri, type: "image/jpeg", name: "proof.jpg" });
  };

  const takeProofPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") { Alert.alert("Permission needed", "Allow camera access to take a photo."); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) setProofPhoto({ uri: result.assets[0].uri, type: "image/jpeg", name: "proof.jpg" });
  };

  const confirmDone = async () => {
    setCompleting(true);
    try {
      await api.post(`/work-requests/${id}/complete`);

      if (proofPhoto) {
        const form = new FormData();
        form.append("file", { uri: proofPhoto.uri, name: "proof.jpg", type: "image/jpeg" });
        await api.post(`/work-requests/${id}/rating-photo`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setShowCompleteModal(false);
      setProofPhoto(null);
      await load();
    } catch (e) {
      Alert.alert("Failed", e?.response?.data?.detail || e?.message || "Could not mark as done");
    } finally {
      setCompleting(false);
    }
  };

  const submitRating = async () => {
    if (ratingStars === 0) {
      Alert.alert("Select stars", "Please choose a star rating before submitting.");
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post(`/work-requests/${id}/rate`, {
        rating: ratingStars,
        comment: ratingComment.trim(),
      });
      setRatingStars(0);
      setRatingComment("");
      await load();
    } catch (e) {
      Alert.alert("Failed", e?.response?.data?.detail || e?.message || "Could not submit rating");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!engagement) return null;

  const status         = engagement.status;
  const sc             = STATUS_COLORS[status] || STATUS_COLORS.requested;
  const isSentByMe     = user?.id === engagement.requested_by_user_id;
  const isReceivedByMe = user?.id === engagement.requested_to_user_id;

  // Normalise fields — backend nests job info under job_summary
  const jobTitle  = engagement.job_summary?.title  || engagement.job_title  || "Work Request";
  const jobDate   = engagement.job_summary?.date    || engagement.job_date   || null;
  const dailyRate = engagement.job_summary?.budget_max || engagement.daily_rate || null;

  // Expert = worker who does the work; customer = job poster
  const isExpert = engagement.request_type === "job_application" ? isSentByMe : isReceivedByMe;
  const isCustomer = !isExpert;

  const canAcceptReject = isReceivedByMe && status === "requested";

  const otherPartyName =
    (isSentByMe ? engagement.requested_to_name : engagement.requested_by_name) ||
    engagement.other_user?.name ||
    "—";

  // Rating: sender_rating = left by requested_by; receiver_rating = left by requested_to
  const myRating    = isSentByMe ? engagement.sender_rating    : engagement.receiver_rating;
  const theirRating = isSentByMe ? engagement.receiver_rating  : engagement.sender_rating;
  const canRate     = status === "completed" && !myRating;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textHeading} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("engagement_detail_title")}</Text>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{t(`status_${status}`) || status}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 40 }}>
        {/* Context banner */}
        <BannerCard text={getBannerText(engagement, isSentByMe, otherPartyName, isExpert)} status={status} />

        {/* Status tracker */}
        <StatusTracker engagement={engagement} isSentByMe={isSentByMe} />

        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          {jobDate ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.outline} />
              <Text style={styles.meta}>{jobDate}</Text>
            </View>
          ) : null}
          {dailyRate ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={14} color={colors.outline} />
              <Text style={styles.meta}>₹{dailyRate}/day</Text>
            </View>
          ) : null}
        </View>

        {/* Other party */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>
            {isExpert ? "You worked for" : "Expert handling your job"}
          </Text>
          <View style={styles.partyRow}>
            <View style={styles.partyAvatar}>
              <Text style={styles.partyAvatarText}>{(otherPartyName[0] || "?").toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.partyName}>{otherPartyName}</Text>
              <Text style={styles.partyRole}>
                {isExpert ? "Customer" : "Expert / Worker"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsWrap}>
          {canAcceptReject && (
            <>
              <ActionBtn label={t("engagement_accept")} onPress={() => act("accept")} color={colors.statusSuccess} loading={acting} />
              <ActionBtn label={t("engagement_decline")} onPress={() => act("reject")} color={colors.error} loading={acting} outline />
            </>
          )}
          {status === "requested" && isSentByMe && (
            <ActionBtn label={t("engagement_cancel")} onPress={() => act("cancel")} color={colors.error} loading={acting} outline />
          )}
          {/* Chat — available after acceptance; archived after completion */}
          {(status === "accepted" || status === "completed") ? (
            <ActionBtn
              label={status === "accepted" ? `Chat with ${otherPartyName}` : `View chat with ${otherPartyName}`}
              icon="chatbubble-outline"
              onPress={() => navigation.navigate("Chat", { engagementId: id })}
              color={status === "accepted" ? colors.primary : "#6B7280"}
            />
          ) : null}
          {/* Only the expert (person who does the work) can mark done */}
          {status === "accepted" && isExpert && (
            <ActionBtn
              label={t("engagement_mark_done")}
              icon="checkmark-circle-outline"
              onPress={() => setShowCompleteModal(true)}
              color={colors.statusSuccess}
            />
          )}
        </View>

        {/* Rating section — shown after completion */}
        {status === "completed" && (
          <>
            <View style={styles.card}>
              {canRate ? (
                <>
                  <Text style={styles.ratingTitle}>
                    {isCustomer ? "Rate the Expert" : "Rate the Customer"}
                  </Text>
                  <Text style={styles.ratingSubtitle}>How was your experience with {otherPartyName}?</Text>
                  <StarPicker value={ratingStars} onChange={setRatingStars} />
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Leave a comment (optional)"
                    placeholderTextColor={colors.outline}
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    multiline
                    maxLength={300}
                  />
                  <ActionBtn
                    label={submittingRating ? "Submitting…" : "Submit Review"}
                    onPress={submitRating}
                    color={colors.primary}
                    loading={submittingRating}
                  />
                </>
              ) : myRating ? (
                <>
                  <Text style={styles.ratingTitle}>Your Review</Text>
                  <StarPicker value={myRating.rating} onChange={() => {}} readonly />
                  {myRating.comment ? (
                    <Text style={styles.ratingCommentText}>"{myRating.comment}"</Text>
                  ) : null}
                </>
              ) : null}
            </View>

            {theirRating ? (
              <View style={styles.card}>
                <Text style={styles.ratingTitle}>{otherPartyName}'s Review</Text>
                <StarPicker value={theirRating.rating} onChange={() => {}} readonly />
                {theirRating.comment ? (
                  <Text style={styles.ratingCommentText}>"{theirRating.comment}"</Text>
                ) : null}
              </View>
            ) : !myRating ? null : (
              <View style={styles.card}>
                <Text style={[styles.ratingSubtitle, { textAlign: "center" }]}>
                  {otherPartyName} hasn't left a review yet.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Complete bottom sheet */}
      {showCompleteModal && (
        <>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => { if (!completing) { setShowCompleteModal(false); setProofPhoto(null); } }}
          />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Mark as Done</Text>
            <Text style={styles.modalSubtitle}>
              Optionally upload a proof photo of the completed work.
            </Text>

            {proofPhoto ? (
              <View style={styles.proofPreviewWrap}>
                <Image source={{ uri: proofPhoto.uri }} style={styles.proofPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removePhoto} onPress={() => setProofPhoto(null)}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <TouchableOpacity style={styles.photoBtn} onPress={takeProofPhoto}>
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={styles.photoBtnText}>Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoBtn} onPress={pickProofPhoto}>
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={styles.photoBtnText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              <ActionBtn
                label={completing ? "Marking done…" : "Confirm — Mark Done"}
                onPress={confirmDone}
                color={colors.statusSuccess}
                loading={completing}
              />
              <ActionBtn
                label="Cancel"
                onPress={() => { setShowCompleteModal(false); setProofPhoto(null); }}
                color={colors.error}
                outline
                loading={completing}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function StarPicker({ value, onChange, readonly = false }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => !readonly && onChange(n)} disabled={readonly} activeOpacity={0.7}>
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={32}
            color={n <= value ? "#f59e0b" : colors.outline}
            style={{ marginHorizontal: 4 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ActionBtn({ label, onPress, color, outline, loading, icon }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, outline
        ? { backgroundColor: colors.surfaceCard, borderWidth: 1.5, borderColor: color }
        : { backgroundColor: color }
      ]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={outline ? color : "#fff"} size="small" style={{ marginRight: 6 }} />
        : icon ? <Ionicons name={icon} size={16} color={outline ? color : "#fff"} style={{ marginRight: 6 }} /> : null
      }
      <Text style={[styles.actionBtnText, { color: outline ? color : "#fff" }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
    gap: spacing.sm,
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  statusText:  { fontFamily: fonts.bodyBold, fontSize: 13 },

  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.xxl,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  jobTitle:     { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 10 },
  metaRow:      { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  meta:         { fontFamily: fonts.body, fontSize: 14, color: colors.outline },
  sectionLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 10 },

  partyRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  partyAvatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: "#E0E7FF", alignItems: "center", justifyContent: "center" },
  partyAvatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#4F46E5" },
  partyName:       { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading },
  partyRole:       { fontFamily: fonts.body, fontSize: 13, color: colors.outline, marginTop: 2 },

  actionsWrap: { gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: radius.xxl, paddingVertical: 14,
  },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 16 },

  // Rating
  ratingTitle:       { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, marginBottom: 4 },
  ratingSubtitle:    { fontFamily: fonts.body, fontSize: 14, color: colors.outline, marginBottom: spacing.sm },
  starsRow:          { flexDirection: "row", marginBottom: spacing.md },
  commentInput: {
    borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.lg,
    padding: spacing.sm, fontFamily: fonts.body, fontSize: 14, color: colors.textHeading,
    minHeight: 80, textAlignVertical: "top", marginBottom: spacing.md,
  },
  ratingCommentText: { fontFamily: fonts.body, fontSize: 14, color: colors.textBody, fontStyle: "italic", marginTop: spacing.xs },

  // Bottom sheet
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 10,
  },
  modalSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 11,
    backgroundColor: colors.surfaceCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalTitle:    { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 6 },
  modalSubtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.outline, marginBottom: spacing.md },
  photoRow:      { flexDirection: "row", gap: spacing.md, marginBottom: spacing.sm },
  photoBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: radius.lg, paddingVertical: 12,
  },
  photoBtnText:    { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
  proofPreviewWrap: { position: "relative", marginBottom: spacing.md },
  proofPreview:    { width: "100%", height: 180, borderRadius: radius.lg },
  removePhoto:     { position: "absolute", top: 8, right: 8 },
});
