import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, RefreshControl, Modal, TextInput, Linking, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError } from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import PrimaryButton from "../components/PrimaryButton";
import SecondaryButton from "../components/SecondaryButton";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import Button from "../components/Button";

const CAT_ICONS = { construction:"🏗️", farm:"🌾", electrical:"⚡", cleaning:"✨", transport:"🚛", mechanical:"🔧", tailoring:"✂️", home:"🏠", other:"📦" };

const STATUS_STYLE = {
  requested: { bg:"#fef3c7", fg:"#92400e", label:"Pending" },
  accepted:  { bg:"#d1fae5", fg:"#065f46", label:"Hired ✓" },
  rejected:  { bg:"#fee2e2", fg:"#991b1b", label:"Rejected" },
  cancelled: { bg:"#f3f4f6", fg:"#374151", label:"Cancelled" },
  completed: { bg:"#dbeafe", fg:"#1e40af", label:"Done" },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Suprabhat 🙏" : h < 17 ? "Namaste 🙏" : "Shubh Sandhya 🙏";
}

export default function DashboardScreen({ navigation, route }) {
  const { user, logout, refreshUser } = useAuth();
  const { lang } = useLanguage();
  const [engagements, setEngagements]   = useState([]);
  const [jobs, setJobs]                 = useState([]);
  const [nearbyCount, setNearbyCount]   = useState(null);
  const isWorkerRole = user?.role !== "customer";
  const [tab, setTab] = useState(route?.params?.initialTab || (isWorkerRole ? "active" : "overview"));

  useEffect(() => {
    if (route?.params?.initialTab) setTab(route.params.initialTab);
  }, [route?.params?.initialTab]);
  const [refreshing, setRefreshing]     = useState(false);
  const [ratingModal, setRatingModal]   = useState(null);
  const [ratingVal, setRatingVal]       = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [detailItem, setDetailItem]     = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [engR, jobR] = await Promise.all([
        api.get("/engagements/mine").catch(() => ({ data: [] })),
        user.role === "customer"
          ? api.get("/jobs/mine").catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);
      setEngagements(Array.isArray(engR.data) ? engR.data : []);
      setJobs(Array.isArray(jobR.data) ? jobR.data : []);
    } catch {}
    if (user.role === "worker") {
      api.get("/jobs/feed").then(r => setNearbyCount(Array.isArray(r.data) ? r.data.length : null)).catch(() => {});
    } else {
      api.get("/workers/search?available_only=true").then(r => setNearbyCount(r.data?.length ?? r.data?.workers?.length ?? null)).catch(() => {});
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  // ── Action helpers ────────────────────────────────────────────────────

  const acceptEng  = async (id) => { try { await api.post(`/engagements/${id}/accept`); load(); } catch (e) { Alert.alert("Error", formatApiError(e)); } };
  const rejectEng  = async (id, name) => Alert.alert(`Reject ${name}?`, "", [
    { text: "Cancel", style: "cancel" },
    { text: "Reject", style: "destructive", onPress: async () => { try { await api.post(`/engagements/${id}/reject`); load(); } catch (e) { Alert.alert("Error", formatApiError(e)); } } },
  ]);
  const cancelEng  = async (id) => Alert.alert("Withdraw?", "", [
    { text: "No", style: "cancel" },
    { text: "Withdraw", style: "destructive", onPress: async () => { try { await api.post(`/engagements/${id}/cancel`); load(); } catch (e) { Alert.alert("Error", formatApiError(e)); } } },
  ]);
  const completeEng = async (id, workerName) => {
    try {
      await api.post(`/engagements/${id}/complete`);
      load();
      // Auto-prompt customer to rate immediately after marking done
      if (user?.role === "customer") {
        setRatingVal(5);
        setRatingComment("");
        setRatingModal({ id, workerName: workerName || "" });
      } else {
        Alert.alert("✅ Job marked complete!");
      }
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
  };
  const submitRating = async () => {
    const r = ratingVal;
    if (!r || r < 1 || r > 5) return Alert.alert("Rating 1–5 please");
    try {
      await api.post(`/engagements/${ratingModal.id}/rate`, { rating: r, comment: ratingComment.trim() });
      setRatingModal(null); setRatingVal(5); setRatingComment("");
      load(); Alert.alert("Thanks for rating!");
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
  };
  const doLogout = () => {
    Alert.alert(
      "Log out?",
      "You will need to enter your OTP again to log back in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Log out", style: "destructive", onPress: async () => {
          try { navigation?.navigate?.("Home"); } catch {}
          await logout();
        }},
      ]
    );
  };

  if (!user) return null;

  const firstName = (user.name || "").split(" ")[0] || "there";
  const isCustomer = user.role === "customer";

  // Derived data
  const pendingEngs   = engagements.filter(e => (e.engagement_status || e.status) === "requested");
  const activeEngs    = engagements.filter(e => (e.engagement_status || e.status) === "accepted");
  const completedEngs = engagements.filter(e => (e.engagement_status || e.status) === "completed");
  const cancelledEngs = engagements.filter(e => ["cancelled","rejected"].includes(e.engagement_status || e.status));
  const pastEngs      = engagements.filter(e => ["completed","cancelled","rejected"].includes(e.engagement_status || e.status));
  const openJobs     = jobs.filter(j => j.status === "open" || j.status === "booked");
  const responsesFor = (jobId) => pendingEngs.filter(e => e.job_id === jobId).length;

  // Profile completion for customers
  const completion = isCustomer ? (() => {
    const steps = [
      { label: "Phone verified",    done: !!user.phone_verified },
      { label: "Village & Pincode", done: !!(user.address?.pincode || user.village) },
      { label: "Profile photo",     done: !!user.photo_url },
      { label: "First job posted",  done: jobs.length > 0 },
    ];
    return { steps, pct: Math.round((steps.filter(s => s.done).length / steps.length) * 100) };
  })() : null;

  const TABS = isCustomer
    ? [{ id:"overview", label:"Overview" }, { id:"pending", label:`Responses${pendingEngs.length ? ` (${pendingEngs.length})` : ""}` }, { id:"jobs", label:"My Jobs" }, { id:"history", label:"History" }]
    : [
        { id:"active",    label:`Active${activeEngs.length ? ` (${activeEngs.length})` : ""}` },
        { id:"pending",   label:`Pending${pendingEngs.length ? ` (${pendingEngs.length})` : ""}` },
        { id:"completed", label:`Completed${completedEngs.length ? ` (${completedEngs.length})` : ""}` },
        { id:"cancelled", label:"Cancelled" },
      ];

  if (isCustomer) {
    const hasAnyCustomerWork = jobs.length > 0 || engagements.length > 0;

    return (
      <AppScreen edges={["top"]} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.customerScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.customerHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerTitle}>My Jobs</Text>
              <Text style={styles.customerSubtitle}>Aapke posted kaam aur responses</Text>
            </View>
            <PrimaryButton
              title="Post Job"
              fullWidth={false}
              onPress={() => navigation.navigate("PostJob")}
              icon={<Ionicons name="add" size={16} color="#fff" />}
              style={styles.customerPostBtn}
            />
          </View>

          <View style={styles.customerSummaryRow}>
            <CustomerSummaryStat label="Open Jobs" value={openJobs.length} color={colors.primary} />
            <CustomerSummaryStat label="Responses" value={pendingEngs.length} color={colors.warning} />
            <CustomerSummaryStat label="Active" value={activeEngs.length} color={colors.success} />
            <CustomerSummaryStat label="Completed" value={completedEngs.length} color="#1E40AF" />
          </View>

          {pendingEngs.length > 0 && (
            <Pressable style={({ pressed }) => [styles.customerAlert, pressed && styles.pressed]} onPress={() => setDetailItem(pendingEngs[0])}>
              <View style={styles.customerAlertIcon}>
                <Ionicons name="people-outline" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerAlertTitle}>{pendingEngs.length} workers interested</Text>
                <Text style={styles.customerAlertSub}>Review karke worker choose karein</Text>
              </View>
              <Text style={styles.customerAlertCta}>Review Now</Text>
            </Pressable>
          )}

          {!hasAnyCustomerWork ? (
            <View style={styles.customerEmptyWrap}>
              <EmptyState
                icon="briefcase-outline"
                title="Abhi koi job post nahi hai"
                subtitle="Post Job karke nearby workers se response paayein"
                actionLabel="Post a Job"
                onAction={() => navigation.navigate("PostJob")}
              />
            </View>
          ) : (
            <>
              {pendingEngs.length > 0 && (
                <View style={styles.customerSection}>
                  <CustomerSectionHeader title="Responses" actionLabel="View all" onAction={() => setDetailItem(pendingEngs[0])} />
                  {pendingEngs.map(e => (
                    <CustomerResponseCard
                      key={e.id}
                      e={e}
                      onPress={() => setDetailItem(e)}
                      onWorkerPress={() => e.worker_id ? navigation.navigate("WorkerProfile", { id: e.worker_id }) : setDetailItem(e)}
                      onAccept={() => acceptEng(e.id)}
                      onReject={() => rejectEng(e.id, e.worker_name)}
                    />
                  ))}
                </View>
              )}

              {activeEngs.length > 0 && (
                <View style={styles.customerSection}>
                  <CustomerSectionHeader title="Active Jobs" />
                  {activeEngs.map(e => (
                    <CustomerActivePremiumCard
                      key={e.id}
                      e={e}
                      onPress={() => setDetailItem(e)}
                      onComplete={() => completeEng(e.id, e.worker_name)}
                      onRate={() => setRatingModal({ id: e.id, workerName: e.worker_name })}
                    />
                  ))}
                </View>
              )}

              <View style={styles.customerSection}>
                <CustomerSectionHeader title="Open Jobs" actionLabel="Post Job" onAction={() => navigation.navigate("PostJob")} />
                {openJobs.length === 0 ? (
                  <View style={styles.customerMiniEmpty}>
                    <Text style={styles.customerMiniEmptyTitle}>No open jobs right now</Text>
                    <Text style={styles.customerMiniEmptySub}>Naya kaam post karke workers se response paayein.</Text>
                  </View>
                ) : openJobs.map(j => (
                  <CustomerOpenJobCard
                    key={j.id}
                    job={j}
                    responses={responsesFor(j.id)}
                    onPress={() => setDetailItem(j)}
                    onReview={() => {
                      const response = pendingEngs.find(e => e.job_id === j.id);
                      response ? setDetailItem(response) : setDetailItem(j);
                    }}
                    onFindWorkers={() => navigation.navigate("Tabs", { screen: "Workers" })}
                  />
                ))}
              </View>

              {pastEngs.length > 0 && (
                <View style={styles.customerSection}>
                  <CustomerSectionHeader title="Completed & History" />
                  {pastEngs.slice(0, 4).map(e => (
                    <CustomerHistoryCard
                      key={e.id}
                      e={e}
                      onPress={() => setDetailItem(e)}
                      onRate={() => setRatingModal({ id: e.id, workerName: e.worker_name })}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <Pressable onPress={() => navigation.navigate("ContactSupport")} style={styles.customerSupportLink}>
            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
            <Text style={styles.customerSupportText}>Help & Support</Text>
          </Pressable>
        </ScrollView>

        <Modal transparent visible={!!detailItem} animationType="slide" onRequestClose={() => setDetailItem(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDetailItem(null)}>
            <Pressable style={styles.detailSheet} onPress={() => {}}>
              {detailItem && (() => {
                const status = detailItem.engagement_status || detailItem.status;
                const st = STATUS_STYLE[status] || { bg:"#f3f4f6", fg:"#374151", label: status };
                const isJob = !!detailItem.title;
                const title = detailItem.title || detailItem.job_title || "Job";
                const catIcon = CAT_ICONS[detailItem.category] || "💼";
                return (
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.detailHeader}>
                      <Text style={styles.detailEmoji}>{catIcon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailTitle}>{title}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: st.bg, alignSelf: "flex-start", marginTop: 4 }]}>
                          <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                        </View>
                      </View>
                    </View>

                    {[
                      { icon: "calendar-outline", label: "Date", val: detailItem.job_date },
                      { icon: "cash-outline", label: "Rate", val: detailItem.daily_rate ? `₹${detailItem.daily_rate}/day` : null },
                      { icon: "location-outline", label: "Location", val: detailItem.village || detailItem.address?.village },
                      { icon: "people-outline", label: "Workers", val: detailItem.workers_needed ? `${detailItem.workers_needed} needed` : null },
                      { icon: "person-outline", label: "Worker", val: detailItem.worker_name },
                      { icon: "call-outline", label: "Phone", val: detailItem.worker_phone, link: !!detailItem.worker_phone },
                    ].filter(r => r.val).map(r => (
                      <Pressable
                        key={r.label}
                        style={styles.detailRow}
                        onPress={r.link ? () => Linking.openURL(`tel:${r.val}`) : undefined}
                      >
                        <View style={styles.detailIconWrap}>
                          <Ionicons name={r.icon} size={16} color={colors.saffron} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailRowLabel}>{r.label}</Text>
                          <Text style={[styles.detailRowVal, r.link && { color: "#16a34a", fontFamily: fonts.bodyBold }]}>{r.val}</Text>
                        </View>
                        {r.link && <Ionicons name="call-outline" size={16} color="#16a34a" />}
                      </Pressable>
                    ))}

                    {detailItem.description && (
                      <View style={styles.detailDesc}>
                        <Text style={styles.detailDescLabel}>Description</Text>
                        <Text style={styles.detailDescText}>{detailItem.description}</Text>
                      </View>
                    )}

                    <View style={{ gap: 10, marginTop: 16 }}>
                      {status === "requested" && (
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => { setDetailItem(null); acceptEng(detailItem.id); }}>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={styles.btnGreenText}>Accept</Text>
                          </Pressable>
                          <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={() => { setDetailItem(null); rejectEng(detailItem.id, detailItem.worker_name); }}>
                            <Text style={styles.btnOutlineText}>Reject</Text>
                          </Pressable>
                        </View>
                      )}
                      {status === "completed" && !detailItem.rating && (
                        <Pressable style={styles.btnSaffron} onPress={() => { setDetailItem(null); setRatingModal({ id: detailItem.id, workerName: detailItem.worker_name }); }}>
                          <Text style={styles.btnSaffronText}>⭐ Rate Worker</Text>
                        </Pressable>
                      )}
                    </View>

                    <Pressable onPress={() => setDetailItem(null)} style={{ alignItems: "center", marginTop: 20, paddingBottom: 8 }}>
                      <Text style={{ fontFamily: fonts.bodySemi, color: colors.saffron }}>Close</Text>
                    </Pressable>
                  </ScrollView>
                );
              })()}
            </Pressable>
          </Pressable>
        </Modal>

        <Modal transparent visible={!!ratingModal} animationType="slide" onRequestClose={() => setRatingModal(null)}>
          <View style={styles.ratingModalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {lang === "hi" ? `${(ratingModal?.workerName || "").split(" ")[0]} को rate करो` : `Rate ${(ratingModal?.workerName || "").split(" ")[0]}`}
              </Text>
              <Text style={styles.modalSub}>
                {lang === "hi" ? "काम कैसा था?" : "How was the work?"}
              </Text>

              <View style={styles.starsRow}>
                {[1,2,3,4,5].map(n => (
                  <Pressable key={n} onPress={() => setRatingVal(n)} hitSlop={8}>
                    <Ionicons name={ratingVal >= n ? "star" : "star-outline"} size={44} color={colors.saffron} />
                  </Pressable>
                ))}
              </View>
              <Text style={styles.ratingLabel}>
                {ratingVal === 1 ? "😞 बहुत बुरा" : ratingVal === 2 ? "😐 ठीक नहीं" : ratingVal === 3 ? "🙂 ठीक था" : ratingVal === 4 ? "😊 अच्छा था" : "🌟 बहुत अच्छा!"}
              </Text>

              <TextInput
                value={ratingComment} onChangeText={setRatingComment}
                placeholder={lang === "hi" ? "कुछ लिखो (optional)…" : "Add a comment (optional)…"}
                placeholderTextColor={colors.textMuted}
                style={styles.commentInput} multiline maxLength={200}
              />

              <Pressable onPress={submitRating} style={styles.submitRatingBtn}>
                <Ionicons name="star" size={16} color="#fff" />
                <Text style={styles.submitRatingTxt}>{lang === "hi" ? "Submit करो" : "Submit Rating"}</Text>
              </Pressable>
              <Pressable onPress={() => setRatingModal(null)} style={{ marginTop: 12, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 13 }}>
                  {lang === "hi" ? "अभी नहीं" : "Skip for now"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </AppScreen>
    );
  }

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.workerScroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.workerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.workerTitle}>My Work</Text>
            <Text style={styles.workerSubtitle}>Aapke applied aur accepted kaam</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.workerBrowseBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}
          >
            <Ionicons name="search-outline" size={14} color={colors.primary} />
            <Text style={styles.workerBrowseBtnTxt}>Browse Jobs</Text>
          </Pressable>
        </View>

        {/* ── Summary stats ── */}
        <View style={styles.workerSummaryRow}>
          <WorkerSummaryStat label="Active" value={activeEngs.length} color={colors.success} />
          <WorkerSummaryStat label="Pending" value={pendingEngs.length} color={colors.warning} />
          <WorkerSummaryStat label="Completed" value={completedEngs.length} color="#1E40AF" />
          <WorkerSummaryStat label="Cancelled" value={cancelledEngs.length} color={colors.textMuted} />
        </View>

        {/* ── Empty state — no engagements at all ── */}
        {engagements.length === 0 ? (
          <View style={styles.workerEmptyWrap}>
            <EmptyState
              icon="briefcase-outline"
              title="Abhi koi kaam nahi"
              subtitle="Nearby jobs browse karke apply karein"
              actionLabel="Browse Jobs"
              onAction={() => navigation.navigate("Tabs", { screen: "Jobs" })}
            />
          </View>
        ) : (
          <>
            {/* ── Active / Hired jobs ── */}
            {activeEngs.length > 0 && (
              <View style={styles.workerSection}>
                <WorkerSectionHeader title="Chal raha kaam" count={activeEngs.length} countColor={colors.success} />
                {activeEngs.map(e => (
                  <WorkerActivePremiumCard
                    key={e.id}
                    e={e}
                    onPress={() => setDetailItem(e)}
                    onComplete={() => completeEng(e.id)}
                    onCancel={() => cancelEng(e.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Pending applications ── */}
            {pendingEngs.length > 0 && (
              <View style={styles.workerSection}>
                <WorkerSectionHeader title="Pending requests" count={pendingEngs.length} countColor={colors.warning} />
                {pendingEngs.map(e => (
                  <WorkerPendingPremiumCard
                    key={e.id}
                    e={e}
                    onPress={() => setDetailItem(e)}
                    onWithdraw={() => cancelEng(e.id)}
                  />
                ))}
              </View>
            )}

            {/* ── Find more jobs CTA ── */}
            <Pressable
              style={({ pressed }) => [styles.workerFindCtaCard, pressed && { opacity: 0.9 }]}
              onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}
            >
              <LinearGradient
                colors={[colors.primary, "#0D5F59"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.workerFindCtaGrad}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerFindCtaTitle}>Naya kaam dhoondhein</Text>
                  <Text style={styles.workerFindCtaSub}>
                    {nearbyCount !== null ? `${nearbyCount} jobs available nearby` : "Nearby jobs feed dekhein"}
                  </Text>
                </View>
                <View style={styles.workerFindCtaIcon}>
                  <Ionicons name="briefcase-outline" size={26} color="#fff" />
                </View>
              </LinearGradient>
            </Pressable>

            {/* ── History — completed + cancelled ── */}
            {pastEngs.length > 0 && (
              <View style={styles.workerSection}>
                <WorkerSectionHeader title="History" />

                {/* Earnings summary row — only if completions exist */}
                {completedEngs.length > 0 && (
                  <View style={styles.workerEarningsCard}>
                    <View style={styles.workerEarningBox}>
                      <Text style={[styles.workerEarningVal, { color: colors.money }]}>
                        ₹{completedEngs.reduce((sum, e) => sum + (e.daily_rate || 0), 0)}
                      </Text>
                      <Text style={styles.workerEarningLabel}>Total earned</Text>
                    </View>
                    <View style={styles.workerEarningDivider} />
                    <View style={styles.workerEarningBox}>
                      <Text style={styles.workerEarningVal}>{completedEngs.length}</Text>
                      <Text style={styles.workerEarningLabel}>Jobs done</Text>
                    </View>
                    <View style={styles.workerEarningDivider} />
                    <View style={styles.workerEarningBox}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.workerEarningVal}>
                          {completedEngs.filter(e => e.rating).length > 0
                            ? (completedEngs.filter(e => e.rating).reduce((s, e) => s + e.rating, 0) / completedEngs.filter(e => e.rating).length).toFixed(1)
                            : "—"}
                        </Text>
                      </View>
                      <Text style={styles.workerEarningLabel}>Avg rating</Text>
                    </View>
                  </View>
                )}

                {pastEngs.slice(0, 6).map(e => (
                  <WorkerHistoryCard
                    key={e.id}
                    e={e}
                    onPress={() => setDetailItem(e)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ── Support ── */}
        <Pressable
          onPress={() => navigation.navigate("ContactSupport")}
          style={styles.workerSupportLink}
        >
          <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.workerSupportText}>Help & Support</Text>
        </Pressable>
      </ScrollView>

      {/* ══ DETAIL MODAL ════════════════════════════════════════════════ */}
      <Modal transparent visible={!!detailItem} animationType="slide" onRequestClose={() => setDetailItem(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDetailItem(null)}>
          <Pressable style={styles.detailSheet} onPress={() => {}}>
            {detailItem && (() => {
              const status = detailItem.engagement_status || detailItem.status;
              const st = STATUS_STYLE[status] || { bg:"#f3f4f6", fg:"#374151", label: status };
              const isJob = !!detailItem.title;
              const title = detailItem.title || detailItem.job_title || "Job";
              const catIcon = CAT_ICONS[detailItem.category] || "💼";
              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Header */}
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailEmoji}>{catIcon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailTitle}>{title}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg, alignSelf: "flex-start", marginTop: 4 }]}>
                        <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Details rows */}
                  {[
                    { icon: "calendar-outline",   label: "Date",       val: detailItem.job_date },
                    { icon: "cash-outline",        label: "Rate",       val: `₹${detailItem.daily_rate}/day` },
                    { icon: "location-outline",    label: "Location",   val: detailItem.village || detailItem.address?.village },
                    { icon: "people-outline",      label: "Workers",    val: detailItem.workers_needed ? `${detailItem.workers_needed} needed` : null },
                    { icon: "person-outline",      label: isCustomer ? "Worker" : "Customer",
                      val: isCustomer ? detailItem.worker_name : detailItem.customer_name },
                    { icon: "call-outline",        label: "Phone",
                      val: isCustomer ? detailItem.worker_phone : detailItem.customer_phone,
                      link: (isCustomer ? detailItem.worker_phone : detailItem.customer_phone) ? true : false },
                  ].filter(r => r.val).map(r => (
                    <Pressable
                      key={r.label}
                      style={styles.detailRow}
                      onPress={r.link ? () => Linking.openURL(`tel:${r.val}`) : undefined}
                    >
                      <View style={styles.detailIconWrap}>
                        <Ionicons name={r.icon} size={16} color={colors.saffron} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailRowLabel}>{r.label}</Text>
                        <Text style={[styles.detailRowVal, r.link && { color: "#16a34a", fontFamily: fonts.bodyBold }]}>{r.val}</Text>
                      </View>
                      {r.link && <Ionicons name="call-outline" size={16} color="#16a34a" />}
                    </Pressable>
                  ))}

                  {/* Description */}
                  {detailItem.description && (
                    <View style={styles.detailDesc}>
                      <Text style={styles.detailDescLabel}>Description</Text>
                      <Text style={styles.detailDescText}>{detailItem.description}</Text>
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={{ gap: 10, marginTop: 16 }}>
                    {isCustomer && status === "requested" && (
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => { setDetailItem(null); acceptEng(detailItem.id); }}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                          <Text style={styles.btnGreenText}>Accept</Text>
                        </Pressable>
                        <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={() => { setDetailItem(null); rejectEng(detailItem.id, detailItem.worker_name); }}>
                          <Text style={styles.btnOutlineText}>Reject</Text>
                        </Pressable>
                      </View>
                    )}
                    {isCustomer && status === "completed" && !detailItem.rating && (
                      <Pressable style={styles.btnSaffron} onPress={() => { setDetailItem(null); setRatingModal({ id: detailItem.id, workerName: detailItem.worker_name }); }}>
                        <Text style={styles.btnSaffronText}>⭐ Rate Worker</Text>
                      </Pressable>
                    )}
                    {!isCustomer && status === "accepted" && (
                      <Pressable style={[styles.btnSaffron, { flexDirection: "row", gap: 6 }]} onPress={() => { setDetailItem(null); completeEng(detailItem.id, detailItem.worker_name); }}>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                        <Text style={styles.btnGreenText}>Mark Job Done</Text>
                      </Pressable>
                    )}
                    {!isCustomer && ["requested","accepted"].includes(status) && (
                      <Pressable style={styles.btnOutline} onPress={() => { setDetailItem(null); cancelEng(detailItem.id); }}>
                        <Text style={styles.btnOutlineText}>Withdraw / Cancel</Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable onPress={() => setDetailItem(null)} style={{ alignItems: "center", marginTop: 20, paddingBottom: 8 }}>
                    <Text style={{ fontFamily: fonts.bodySemi, color: colors.saffron }}>Close</Text>
                  </Pressable>
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══ RATING MODAL ════════════════════════════════════════════════ */}
      <Modal transparent visible={!!ratingModal} animationType="slide" onRequestClose={() => setRatingModal(null)}>
        <View style={styles.ratingModalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {lang === "hi" ? `${(ratingModal?.workerName || "").split(" ")[0]} को rate करो` : `Rate ${(ratingModal?.workerName || "").split(" ")[0]}`}
            </Text>
            <Text style={styles.modalSub}>
              {lang === "hi" ? "काम कैसा था?" : "How was the work?"}
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(n => (
                <Pressable key={n} onPress={() => setRatingVal(n)} hitSlop={8}>
                  <Ionicons name={ratingVal >= n ? "star" : "star-outline"} size={44} color={colors.saffron} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.ratingLabel}>
              {ratingVal === 1 ? "😞 बहुत बुरा" : ratingVal === 2 ? "😐 ठीक नहीं" : ratingVal === 3 ? "🙂 ठीक था" : ratingVal === 4 ? "😊 अच्छा था" : "🌟 बहुत अच्छा!"}
            </Text>

            {/* Comment */}
            <TextInput
              value={ratingComment} onChangeText={setRatingComment}
              placeholder={lang === "hi" ? "कुछ लिखो (optional)…" : "Add a comment (optional)…"}
              placeholderTextColor={colors.textMuted}
              style={styles.commentInput} multiline maxLength={200}
            />

            {/* Buttons */}
            <Pressable onPress={submitRating} style={styles.submitRatingBtn}>
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={styles.submitRatingTxt}>{lang === "hi" ? "Submit करो" : "Submit Rating"}</Text>
            </Pressable>
            <Pressable onPress={() => setRatingModal(null)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: colors.textMuted, fontSize: 13 }}>
                {lang === "hi" ? "अभी नहीं" : "Skip for now"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function CustomerSummaryStat({ value, label, color }) {
  return (
    <View style={styles.customerSummaryStat}>
      <Text style={[styles.customerSummaryValue, { color }]}>{value}</Text>
      <Text style={styles.customerSummaryLabel}>{label}</Text>
    </View>
  );
}

function CustomerSectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.customerSectionHeader}>
      <Text style={styles.customerSectionTitle}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.customerSectionAction}>
          <Text style={styles.customerSectionActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CustomerResponseCard({ e, onPress, onWorkerPress, onAccept, onReject }) {
  const workerInitials = (e.worker_name || "W").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.customerWorkCard, pressed && styles.pressed]}>
      <View style={styles.customerCardTop}>
        <Pressable onPress={onWorkerPress} style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>{workerInitials}</Text>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.customerCardTitle} numberOfLines={1}>{e.worker_name || "Worker"}</Text>
          <Text style={styles.customerCardMeta} numberOfLines={1}>{e.job_title}</Text>
        </View>
        <StatusBadge status="requested" size="small" />
      </View>
      <View style={styles.customerInfoRow}>
        <InfoMini icon="calendar-outline" text={e.job_date || "Date not set"} />
        <InfoMini icon="cash-outline" text={`₹${e.daily_rate || "—"}/day`} money />
      </View>
      <View style={styles.customerActionRow}>
        <PrimaryButton title="Accept" onPress={onAccept} fullWidth={false} style={styles.customerActionPrimary} />
        <SecondaryButton title="Decline" onPress={onReject} fullWidth={false} style={styles.customerActionSecondary} />
      </View>
    </Pressable>
  );
}

function CustomerActivePremiumCard({ e, onPress, onComplete, onRate }) {
  const status = e.engagement_status || e.status;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.customerWorkCard, styles.customerActiveCard, pressed && styles.pressed]}>
      <View style={styles.customerCardTop}>
        <View style={styles.customerIconCircle}>
          <Ionicons name="hammer-outline" size={18} color={colors.success} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.customerCardTitle} numberOfLines={1}>{e.job_title || "Active job"}</Text>
          <Text style={styles.customerCardMeta} numberOfLines={1}>Worker: {e.worker_name || "Worker"}</Text>
        </View>
        <StatusBadge status={status} size="small" />
      </View>
      <View style={styles.customerInfoRow}>
        <InfoMini icon="calendar-outline" text={e.job_date || "Date not set"} />
        <InfoMini icon="cash-outline" text={`₹${e.daily_rate || "—"}/day`} money />
      </View>
      <View style={styles.customerActionRow}>
        {e.worker_phone ? (
          <SecondaryButton
            title="Call"
            onPress={() => Linking.openURL(`tel:${e.worker_phone}`)}
            fullWidth={false}
            style={styles.customerActionSecondary}
          />
        ) : null}
        {status === "accepted" ? (
          <PrimaryButton title="Mark done" onPress={onComplete} fullWidth={false} style={styles.customerActionPrimary} />
        ) : status === "completed" && !e.rating ? (
          <PrimaryButton title="Rate worker" onPress={onRate} fullWidth={false} style={styles.customerActionPrimary} />
        ) : null}
      </View>
    </Pressable>
  );
}

function CustomerOpenJobCard({ job, responses, onPress, onReview, onFindWorkers }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.customerWorkCard, responses > 0 && styles.customerResponseHighlight, pressed && styles.pressed]}>
      <View style={styles.customerCardTop}>
        <View style={styles.customerIconCircle}>
          <Text style={styles.customerJobEmoji}>{CAT_ICONS[job.category] || "📦"}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.customerCardTitle} numberOfLines={1}>{job.title || "Open job"}</Text>
          <Text style={styles.customerCardMeta} numberOfLines={1}>{job.job_date || "Date not set"} · {job.village || "Location not set"}</Text>
        </View>
        <StatusBadge status={job.status || "open"} size="small" />
      </View>
      <View style={styles.customerInfoRow}>
        <InfoMini icon="people-outline" text={`${job.workers_needed || 1} workers`} />
        <InfoMini icon="cash-outline" text={`₹${job.daily_rate || "—"}/day`} money />
        <InfoMini icon="chatbubble-ellipses-outline" text={`${responses} responses`} />
      </View>
      {responses > 0 ? (
        <PrimaryButton title="Review workers" onPress={onReview} style={styles.customerFullAction} />
      ) : (
        <SecondaryButton title="Find workers" onPress={onFindWorkers} style={styles.customerFullAction} />
      )}
    </Pressable>
  );
}

function CustomerHistoryCard({ e, onPress, onRate }) {
  const status = e.engagement_status || e.status;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.customerWorkCard, pressed && styles.pressed]}>
      <View style={styles.customerCardTop}>
        <View style={styles.customerIconCircle}>
          <Ionicons name={status === "completed" ? "checkmark-done-outline" : "close-circle-outline"} size={18} color={status === "completed" ? colors.success : colors.textMuted} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.customerCardTitle} numberOfLines={1}>{e.job_title || "Job"}</Text>
          <Text style={styles.customerCardMeta} numberOfLines={1}>{e.worker_name || "Worker"} · {e.job_date || "Date not set"}</Text>
        </View>
        <StatusBadge status={status} size="small" />
      </View>
      {status === "completed" && !e.rating ? (
        <SecondaryButton title="Rate worker" onPress={onRate} style={styles.customerFullAction} />
      ) : e.rating ? (
        <View style={styles.customerRatingPill}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.customerRatingText}>{e.rating}/5</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function InfoMini({ icon, text, money }) {
  return (
    <View style={styles.customerInfoMini}>
      <Ionicons name={icon} size={12} color={money ? colors.money : colors.textMuted} />
      <Text style={[styles.customerInfoMiniText, money && { color: colors.money }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

function CustomerActiveCard({ e, onComplete, onRate, onPress }) {
  const status = e.engagement_status || e.status;
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.success }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{e.job_title}</Text>
          <Text style={styles.cardMeta}>👷 {e.worker_name} · {e.job_date} · ₹{e.daily_rate}/day</Text>
        </View>
        <StatusPill status={status} />
      </View>
      {e.worker_phone && (
        <View style={styles.contactBox}>
          <Ionicons name="call-outline" size={13} color="#15803d" />
          <Text style={styles.contactText}>{e.worker_phone}</Text>
        </View>
      )}
      <View style={styles.actionRow}>
        {e.worker_phone && (
          <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${e.worker_phone}`)}>
            <Ionicons name="call-outline" size={14} color="#fff" />
            <Text style={styles.btnGreenText}>Call Worker</Text>
          </Pressable>
        )}
        {status === "completed" && !e.rating && (
          <Pressable style={[styles.btnSaffron, { flex: 1 }]} onPress={onRate}>
            <Text style={styles.btnSaffronText}>⭐ Rate</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function WorkerActiveCard({ e, onComplete, onCancel, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.saffron }]}>
      <Text style={styles.cardTitle}>{e.job_title}</Text>
      <Text style={styles.cardMeta}>🤝 {e.customer_name} · {e.job_date} · ₹{e.daily_rate}/day</Text>
      {e.customer_phone && (
        <View style={styles.contactBox}>
          <Ionicons name="call-outline" size={13} color="#15803d" />
          <Text style={styles.contactText}>{e.customer_phone}</Text>
        </View>
      )}
      <View style={styles.actionRow}>
        {e.customer_phone && (
          <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => Linking.openURL(`tel:${e.customer_phone}`)}>
            <Ionicons name="call-outline" size={14} color="#fff" />
            <Text style={styles.btnGreenText}>Call Customer</Text>
          </Pressable>
        )}
        <Pressable style={[styles.btnSaffron, { flex: 1 }]} onPress={onComplete}>
          <Ionicons name="checkmark-circle-outline" size={14} color="#fff" />
          <Text style={styles.btnGreenText}>Mark Done</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function WorkerPendingCard({ e, onCancel, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#f59e0b" }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{e.job_title}</Text>
          <Text style={styles.cardMeta}>{e.job_date} · ₹{e.daily_rate}/day</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: "#fef9c3" }]}>
          <Text style={[styles.statusText, { color: "#854d0e" }]}>Awaiting</Text>
        </View>
      </View>
      <Pressable style={[styles.btnOutline, { marginTop: 10, alignSelf: "flex-start" }]} onPress={onCancel}>
        <Text style={styles.btnOutlineText}>Withdraw</Text>
      </Pressable>
    </Pressable>
  );
}

function WorkerStat({ val, label, color, onPress, active }) {
  return (
    <Pressable onPress={onPress} style={[styles.wStat, active && { backgroundColor: color + "15" }]}>
      <Text style={[styles.wStatVal, { color }]}>{val}</Text>
      <Text style={styles.wStatLabel}>{label}</Text>
    </Pressable>
  );
}

function StatCard({ icon, label, val, color, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statVal}>{val}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function MiniStat({ label, val }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatVal}>{val}</Text>
    </View>
  );
}

function StatusPill({ status }) {
  const map = {
    open:      { bg:"#fff4f0", fg:"#0F766E", label:"Open" },
    booked:    { bg:"#d1fae5", fg:"#065f46", label:"Filled" },
    waiting:   { bg:"#fef3c7", fg:"#92400e", label:"Waiting" },
    accepted:  { bg:"#d1fae5", fg:"#065f46", label:"Hired ✓" },
    completed: { bg:"#dbeafe", fg:"#1e40af", label:"Done" },
  };
  const s = map[status] || map.waiting;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.fg }]}>{s.label}</Text>
    </View>
  );
}

function Empty({ msg, sub }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyCardMsg}>{msg}</Text>
      {sub && <Text style={styles.emptyCardSub}>{sub}</Text>}
    </View>
  );
}

/* ── Worker branch sub-components ───────────────────────────────────────────── */

function WorkerSummaryStat({ value, label, color }) {
  return (
    <View style={styles.workerSummaryStat}>
      <Text style={[styles.workerSummaryValue, { color }]}>{value}</Text>
      <Text style={styles.workerSummaryLabel}>{label}</Text>
    </View>
  );
}

function WorkerSectionHeader({ title, count, countColor }) {
  return (
    <View style={styles.workerSectionHeader}>
      <Text style={styles.workerSectionTitle}>{title}</Text>
      {count !== undefined && count > 0 ? (
        <View style={[styles.workerSectionBadge, { backgroundColor: (countColor || colors.primary) + "20" }]}>
          <Text style={[styles.workerSectionBadgeText, { color: countColor || colors.primary }]}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function WorkerActivePremiumCard({ e, onPress, onComplete, onCancel }) {
  const status = e.engagement_status || e.status;
  const catIcon = CAT_ICONS[e.category] || "💼";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.workerWorkCard, styles.workerActiveAccent, pressed && styles.pressed]}
    >
      <View style={styles.workerCardTop}>
        <View style={styles.workerIconCircle}>
          <Text style={styles.workerCardEmoji}>{catIcon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.workerCardTitle} numberOfLines={1}>{e.job_title || "Active job"}</Text>
          <Text style={styles.workerCardMeta} numberOfLines={1}>
            {e.customer_name ? `Customer: ${e.customer_name}` : "Customer details pending"}
          </Text>
        </View>
        <StatusBadge status={status} size="small" />
      </View>

      <View style={styles.workerInfoRow}>
        {e.job_date ? (
          <View style={styles.workerInfoPill}>
            <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
            <Text style={styles.workerInfoPillText}>{e.job_date}</Text>
          </View>
        ) : null}
        {e.daily_rate ? (
          <View style={[styles.workerInfoPill, styles.workerRatePill]}>
            <Text style={styles.workerRateText}>₹{e.daily_rate}/day</Text>
          </View>
        ) : null}
        {(e.village || e.address?.village) ? (
          <View style={styles.workerInfoPill}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.workerInfoPillText} numberOfLines={1}>{e.village || e.address?.village}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.workerCardActions}>
        {e.customer_phone ? (
          <Pressable
            style={styles.workerCallBtn}
            onPress={() => Linking.openURL(`tel:${e.customer_phone}`)}
          >
            <Ionicons name="call-outline" size={14} color="#fff" />
            <Text style={styles.workerCallBtnText}>Call Customer</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.workerMarkDoneBtn} onPress={onComplete}>
          <Ionicons name="checkmark-circle-outline" size={14} color={colors.primary} />
          <Text style={styles.workerMarkDoneText}>Mark Done</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function WorkerPendingPremiumCard({ e, onPress, onWithdraw }) {
  const catIcon = CAT_ICONS[e.category] || "💼";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.workerWorkCard, styles.workerPendingAccent, pressed && styles.pressed]}
    >
      <View style={styles.workerCardTop}>
        <View style={[styles.workerIconCircle, { backgroundColor: "#FFFBEB" }]}>
          <Text style={styles.workerCardEmoji}>{catIcon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.workerCardTitle} numberOfLines={1}>{e.job_title || "Applied job"}</Text>
          <Text style={styles.workerCardMeta} numberOfLines={1}>
            {e.job_date || "Date not set"}{e.village ? ` · ${e.village}` : ""}
          </Text>
        </View>
        <StatusBadge status="requested" size="small" />
      </View>

      <View style={styles.workerInfoRow}>
        {e.daily_rate ? (
          <View style={[styles.workerInfoPill, styles.workerRatePill]}>
            <Text style={styles.workerRateText}>₹{e.daily_rate}/day</Text>
          </View>
        ) : null}
        <View style={[styles.workerInfoPill, { backgroundColor: "#FFFBEB" }]}>
          <Ionicons name="time-outline" size={12} color={colors.warning} />
          <Text style={[styles.workerInfoPillText, { color: colors.warning }]}>Awaiting response</Text>
        </View>
      </View>

      <Pressable style={styles.workerWithdrawBtn} onPress={onWithdraw}>
        <Text style={styles.workerWithdrawText}>Withdraw</Text>
      </Pressable>
    </Pressable>
  );
}

function WorkerHistoryCard({ e, onPress }) {
  const status = e.engagement_status || e.status;
  const isDone = status === "completed";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.workerHistoryCard,
        isDone && styles.workerHistoryDone,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.workerCardTop}>
        <View style={[styles.workerIconCircle, { backgroundColor: isDone ? "#F0FDF4" : colors.surface2 }]}>
          <Ionicons
            name={isDone ? "checkmark-done-outline" : "close-circle-outline"}
            size={18}
            color={isDone ? colors.success : colors.textMuted}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.workerCardTitle} numberOfLines={1}>{e.job_title || "Job"}</Text>
          <Text style={styles.workerCardMeta} numberOfLines={1}>
            {e.customer_name || "Customer"}{e.job_date ? ` · ${e.job_date}` : ""}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {e.daily_rate ? (
            <Text style={styles.workerHistoryRate}>₹{e.daily_rate}</Text>
          ) : null}
          <StatusBadge status={status} size="small" />
        </View>
      </View>
      {isDone && e.rating ? (
        <View style={styles.workerRatingPill}>
          <Ionicons name="star" size={12} color="#F59E0B" />
          <Text style={styles.workerRatingText}>{e.rating}/5</Text>
          {e.comment ? (
            <Text style={styles.workerRatingComment} numberOfLines={1}>"{e.comment}"</Text>
          ) : null}
        </View>
      ) : isDone && !e.rating ? (
        <Text style={styles.workerAwaitingRating}>Awaiting customer rating</Text>
      ) : null}
    </Pressable>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  pressed: { opacity: 0.94 },
  customerScroll: { paddingBottom: 96 },
  customerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  customerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
  },
  customerSubtitle: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  customerPostBtn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  customerSummaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  customerSummaryStat: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    ...shadow.xs,
  },
  customerSummaryValue: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  customerSummaryLabel: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  customerAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: spacing.md,
  },
  customerAlertIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  customerAlertTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#92400E",
  },
  customerAlertSub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: "#A16207",
  },
  customerAlertCta: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.warning,
  },
  customerEmptyWrap: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  customerSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  customerSectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  customerSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.text,
  },
  customerSectionAction: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: spacing.md,
  },
  customerSectionActionText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  customerWorkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.xs,
  },
  customerActiveCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  customerResponseHighlight: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  customerCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  customerAvatarText: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: "#fff",
  },
  customerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  customerJobEmoji: { fontSize: 20 },
  customerCardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
  },
  customerCardMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  customerInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  customerInfoMini: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
  },
  customerInfoMiniText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.textSecondary,
  },
  customerActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  customerActionPrimary: { flex: 1, minHeight: 44, paddingVertical: 12 },
  customerActionSecondary: { flex: 1, minHeight: 44, paddingVertical: 12 },
  customerFullAction: {
    marginTop: 12,
    minHeight: 44,
  },
  customerMiniEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  customerMiniEmptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
  },
  customerMiniEmptySub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  customerRatingPill: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  customerRatingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
  },
  customerSupportLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
  },
  customerSupportText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  // Hero
  hero: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, position: "relative", overflow: "hidden" },
  heroCircle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.07)", top: -50, right: -40 },
  heroCircle2: { position: "absolute", width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.05)", bottom: -20, left: 40 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroGreeting: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  heroName: { fontFamily: fonts.display, fontSize: 24, color: "#fff", marginBottom: 10 },
  heroPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  heroPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20 },
  heroPillGreen: { backgroundColor: "rgba(74,222,128,0.25)" },
  heroPillTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#fff" },
  heroRight: { alignItems: "center", gap: 10 },
  heroAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.2)", borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center" },
  heroAvatarTxt: { fontFamily: fonts.display, fontSize: 20, color: "#fff" },
  heroCtaPrimary: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.2)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12 },
  heroCtaPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#fff" },
  nearbyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ade80" },
  // Cards
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 10 },
  cardTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  cardMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 3 },
  // Profile completion
  completionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  completionPct: { fontFamily: fonts.display, fontSize: 28 },
  progressBg: { height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, overflow: "hidden", marginBottom: 12 },
  progressFill: { height: "100%", borderRadius: 4 },
  completionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  completionDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  completionDotDone: { backgroundColor: "#16a34a" },
  completionDotEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#d1d5db" },
  completionLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  completionLabelDone: { color: colors.textMuted, textDecorationLine: "line-through" },
  // Tabs
  tabRow: { flexDirection: "row", gap: 8, paddingBottom: 4 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border },
  tabActive: { backgroundColor: colors.saffron, borderColor: colors.saffron },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  // Job cards
  jobCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  jobCardActive: { borderColor: colors.saffron, borderLeftWidth: 3, borderLeftColor: colors.saffron },
  jobCardBody: { padding: 14 },
  jobCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  jobCatBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  jobCatIcon: { fontSize: 22 },
  jobTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  jobCat: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 1 },
  jobRate: { fontFamily: fonts.display, fontSize: 16, color: colors.money },
  jobStats: { flexDirection: "row", backgroundColor: "#f9f8f5", borderRadius: 10, padding: 10, marginBottom: 10, gap: 4 },
  responseDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#fff" },
  responseCtaBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10 },
  responseCtaTxt: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  findWorkersBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 11, borderRadius: 10 },
  findWorkersBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.saffron },
  // Response cards (Responses tab)
  responseCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14 },
  responseWorkerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  responseAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  responseAvatarTxt: { fontFamily: fonts.display, fontSize: 18, color: "#fff" },
  responseWorkerName: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  responseJobTitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  responseDateBadge: { backgroundColor: colors.saffronTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  responseDateTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.saffron },
  responseRateRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#f9f8f5", borderRadius: 8, padding: 10, marginBottom: 12 },
  responseRateTxt: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },
  miniStatLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  miniStatVal: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, marginTop: 2 },
  // Worker row
  workerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  workerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  // Stat grid
  statGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: colors.border, borderTopWidth: 3, padding: 14, alignItems: "center" },
  statVal: { fontFamily: fonts.display, fontSize: 24, color: colors.text, marginTop: 6 },
  statLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  // Contact
  contactBox: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#ecfdf5", padding: 10, borderRadius: 8, marginTop: 8, marginBottom: 4 },
  contactText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#15803d" },
  // Action buttons
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btnGreen: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#16a34a", paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnGreenText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  btnSaffron: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.saffron, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnSaffronText: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  btnIndigo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.saffronTint, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnIndigoText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.saffron },
  btnOutline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: colors.border, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, backgroundColor: "#fff" },
  btnOutlineText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  // Status
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: "flex-start" },
  statusText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  // Rating
  ratingChip: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, alignSelf: "flex-start", backgroundColor: colors.saffronTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  ratingChipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.text },
  // Empty states
  emptyHero: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 32, alignItems: "center" },
  emptyEmoji: { fontSize: 48, marginBottom: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginBottom: 6, textAlign: "center" },
  emptySubtitle: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  emptyCardMsg: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  emptyCardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: "center" },
  // Completed tab
  earningsSummary: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 4 },
  earningsLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 4 },
  earningsVal: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  completedCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: colors.success, padding: 14 },
  completedCardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  completedRate: { fontFamily: fonts.display, fontSize: 20, color: colors.money },
  awaitingRating: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
  ratingComment: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, flex: 1 },
  // Worker stats strip
  workerStatsStrip: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: "hidden" },
  wStat: { flex: 1, alignItems: "center", paddingVertical: 14 },
  wStatVal: { fontFamily: fonts.display, fontSize: 26, color: colors.text },
  wStatLabel: { fontFamily: fonts.bodyBold, fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },
  wStatSep: { width: 1, backgroundColor: colors.border },
  // Support
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 10 },
  tapHint: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 8, textAlign: "right" },
  supportLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, alignSelf: "center" },
  supportText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.saffron },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  detailEmoji: { fontSize: 40 },
  detailTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.saffronTint, alignItems: "center", justifyContent: "center" },
  detailRowLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  detailRowVal: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginTop: 2 },
  detailDesc: { backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, marginTop: 16 },
  detailDescLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginBottom: 6 },
  detailDescText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  ratingModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 24, padding: 24, width: "100%", maxWidth: 360 },
  modalTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 4, textAlign: "center" },
  modalSub: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: 20 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 10 },
  ratingLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text, textAlign: "center", marginBottom: 18 },
  commentInput: { backgroundColor: "#fafaf7", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text, minHeight: 72, textAlignVertical: "top", marginBottom: 16 },
  submitRatingBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.saffron, paddingVertical: 14, borderRadius: 14 },
  submitRatingTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff" },

  // ── Worker branch styles ───────────────────────────────────────────────────
  workerScroll: { paddingBottom: 96 },
  workerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  workerTitle: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.text,
  },
  workerSubtitle: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  workerBrowseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    minHeight: 44,
  },
  workerBrowseBtnTxt: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  workerSummaryRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  workerSummaryStat: {
    flex: 1,
    minHeight: 78,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    ...shadow.xs,
  },
  workerSummaryValue: {
    fontFamily: fonts.display,
    fontSize: 22,
  },
  workerSummaryLabel: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  workerEmptyWrap: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  workerSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  workerSectionHeader: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  workerSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.text,
  },
  workerSectionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  workerSectionBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  workerWorkCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 10,
    ...shadow.xs,
  },
  workerActiveAccent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  workerPendingAccent: {
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  workerCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  workerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  workerCardEmoji: { fontSize: 20 },
  workerCardTitle: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.text,
  },
  workerCardMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  workerInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  workerInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
  },
  workerInfoPillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.textSecondary,
  },
  workerRatePill: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  workerRateText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.money,
  },
  workerCardActions: {
    flexDirection: "row",
    gap: 8,
  },
  workerCallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.success,
    paddingVertical: 11,
    borderRadius: radius.md,
    minHeight: 44,
  },
  workerCallBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#fff",
  },
  workerMarkDoneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 11,
    borderRadius: radius.md,
    minHeight: 44,
  },
  workerMarkDoneText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
  workerWithdrawBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 44,
    justifyContent: "center",
  },
  workerWithdrawText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  workerFindCtaCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  workerFindCtaGrad: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.xl,
  },
  workerFindCtaTitle: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: "#fff",
  },
  workerFindCtaSub: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  workerFindCtaIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  workerEarningsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: 12,
    ...shadow.xs,
  },
  workerEarningBox: {
    flex: 1,
    alignItems: "center",
  },
  workerEarningVal: {
    fontFamily: fonts.display,
    fontSize: 20,
    color: colors.text,
  },
  workerEarningLabel: {
    marginTop: 3,
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: "center",
  },
  workerEarningDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  workerHistoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 8,
  },
  workerHistoryDone: {
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  workerHistoryRate: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.money,
  },
  workerRatingPill: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  workerRatingText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.text,
  },
  workerRatingComment: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  workerAwaitingRating: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: "italic",
  },
  workerSupportLink: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  workerSupportText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary,
  },
});
