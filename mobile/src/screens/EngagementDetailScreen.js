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
  requested:  { bg: "#fef3c7", text: "#92400e" },
  accepted:   { bg: "#d1fae5", text: "#065f46" },
  completed:  { bg: "#dbeafe", text: "#1d4ed8" },
  rejected:   { bg: "#fee2e2", text: "#991b1b" },
  cancelled:  { bg: "#f3f4f6", text: "#6b7280" },
};

export default function EngagementDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
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

  const otherPartyName = engagement.other_user?.name
    || (isSentByMe ? (engagement.requested_to_name || "—") : (engagement.requested_by_name || "—"));

  // Rating: sender_rating = left by requested_by; receiver_rating = left by requested_to
  const myRating = isSentByMe ? engagement.sender_rating : engagement.receiver_rating;
  const canRate  = status === "completed" && !myRating;

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

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 32 }}>
        {/* Direction badge */}
        <View style={[styles.roleBadge, { backgroundColor: isSentByMe ? "#ede9fe" : "#fef3c7", borderColor: isSentByMe ? "#c4b5fd" : "#fde68a" }]}>
          <Ionicons name={isSentByMe ? "arrow-up-outline" : "arrow-down-outline"} size={13} color={isSentByMe ? "#7c3aed" : "#b45309"} style={{ marginRight: 4 }} />
          <Text style={[styles.roleText, { color: isSentByMe ? "#7c3aed" : "#b45309" }]}>
            {isSentByMe ? "You sent this request" : "You received this request"}
          </Text>
        </View>

        {/* Job info */}
        <View style={styles.card}>
          <Text style={styles.jobTitle}>{jobTitle}</Text>
          {jobDate ? (
            <Text style={styles.meta}><Ionicons name="calendar-outline" size={13} /> {jobDate}</Text>
          ) : null}
          {dailyRate ? (
            <Text style={styles.meta}><Ionicons name="cash-outline" size={13} /> ₹{dailyRate}/day</Text>
          ) : null}
        </View>

        {/* Other party */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Other party</Text>
          <Text style={styles.partyName}>{otherPartyName}</Text>
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
          {status === "accepted" && (
            <ActionBtn
              label={t("chat_open")}
              icon="chatbubble-outline"
              onPress={() => navigation.navigate("Chat", { engagementId: id })}
              color={colors.primary}
            />
          )}
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
          <View style={styles.card}>
            {canRate ? (
              <>
                <Text style={styles.ratingTitle}>
                  {isCustomer ? "Rate the Expert" : "Rate the Customer"}
                </Text>
                <Text style={styles.ratingSubtitle}>How was your experience?</Text>
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
                  label={submittingRating ? "Submitting…" : "Submit Rating"}
                  onPress={submitRating}
                  color={colors.primary}
                  loading={submittingRating}
                />
              </>
            ) : myRating ? (
              <>
                <Text style={styles.ratingTitle}>Your Rating</Text>
                <StarPicker value={myRating.rating} onChange={() => {}} readonly />
                {myRating.comment ? (
                  <Text style={styles.ratingCommentText}>"{myRating.comment}"</Text>
                ) : null}
              </>
            ) : null}
          </View>
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
  headerTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusText:  { fontFamily: fonts.bodyBold, fontSize: 12 },

  card: {
    backgroundColor: colors.surfaceCard, borderRadius: radius.xxl,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  jobTitle:     { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.textHeading, marginBottom: 6 },
  meta:         { fontFamily: fonts.body, fontSize: 13, color: colors.outline, marginTop: 3 },
  sectionLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginBottom: 4 },
  partyName:    { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },

  roleBadge: {
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6,
    alignSelf: "flex-start", marginBottom: spacing.md,
    borderWidth: 1, flexDirection: "row", alignItems: "center",
  },
  roleText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  actionsWrap: { gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    borderRadius: radius.xxl, paddingVertical: 14,
  },
  actionBtnText: { fontFamily: fonts.bodyBold, fontSize: 15 },

  // Rating
  ratingTitle:       { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading, marginBottom: 4 },
  ratingSubtitle:    { fontFamily: fonts.body, fontSize: 13, color: colors.outline, marginBottom: spacing.sm },
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
  photoBtnText:    { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  proofPreviewWrap: { position: "relative", marginBottom: spacing.md },
  proofPreview:    { width: "100%", height: 180, borderRadius: radius.lg },
  removePhoto:     { position: "absolute", top: 8, right: 8 },
});
