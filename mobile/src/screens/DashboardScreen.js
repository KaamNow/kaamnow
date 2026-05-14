import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, RefreshControl, Modal, TextInput, Linking, Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, spacing } from "../theme";
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

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={["#0F766E", "#0D5F59"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroCircle} />
          <View style={styles.heroCircle2} />

          <View style={styles.heroTop}>
            {/* Left: greeting + name + status pills */}
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting()}</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <View style={styles.heroPillRow}>
                {isCustomer ? (
                  <>
                    {openJobs.length > 0 && (
                      <View style={styles.heroPill}>
                        <Ionicons name="briefcase-outline" size={10} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.heroPillTxt}>{openJobs.length} open job{openJobs.length > 1 ? "s" : ""}</Text>
                      </View>
                    )}
                    {nearbyCount !== null && (
                      <View style={styles.heroPill}>
                        <View style={styles.nearbyDot} />
                        <Text style={styles.heroPillTxt}>{nearbyCount} workers near</Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    {activeEngs.length > 0 && (
                      <View style={[styles.heroPill, styles.heroPillGreen]}>
                        <View style={styles.nearbyDot} />
                        <Text style={styles.heroPillTxt}>{activeEngs.length} active job{activeEngs.length > 1 ? "s" : ""}</Text>
                      </View>
                    )}
                    {nearbyCount !== null && (
                      <View style={styles.heroPill}>
                        <Ionicons name="search-outline" size={10} color="rgba(255,255,255,0.9)" />
                        <Text style={styles.heroPillTxt}>{nearbyCount} jobs near you</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Right: initials avatar (tappable → profile) + optional CTA */}
            <View style={styles.heroRight}>
              <Pressable
                style={styles.heroAvatar}
                onPress={() => navigation.navigate(isCustomer ? "CustomerProfile" : "Tabs", isCustomer ? undefined : { screen: "Account" })}
              >
                <Text style={styles.heroAvatarTxt}>
                  {(user?.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                </Text>
              </Pressable>
              {isCustomer && (
                <Pressable style={styles.heroCtaPrimary} onPress={() => navigation.navigate("PostJob")}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.heroCtaPrimaryText}>Post Job</Text>
                </Pressable>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: spacing.lg }}>

          {/* ══ PROFILE COMPLETION (customer) ═══════════════════════════ */}
          {isCustomer && completion && completion.pct < 100 && (
            <View style={styles.card}>
              <View style={styles.completionHeader}>
                <View>
                  <Text style={styles.cardTitle}>Complete your profile</Text>
                  <Text style={styles.cardMeta}>Workers trust complete profiles more</Text>
                </View>
                <Text style={[styles.completionPct, { color: completion.pct >= 75 ? colors.success : completion.pct >= 50 ? colors.saffron : colors.saffron }]}>
                  {completion.pct}%
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${completion.pct}%`,
                  backgroundColor: completion.pct >= 75 ? colors.success : completion.pct >= 50 ? colors.saffron : colors.saffron,
                }]} />
              </View>
              {completion.steps.map((s, i) => (
                <View key={i} style={styles.completionRow}>
                  <View style={[styles.completionDot, s.done && styles.completionDotDone]}>
                    {s.done
                      ? <Ionicons name="checkmark" size={10} color="#fff" />
                      : <View style={styles.completionDotEmpty} />}
                  </View>
                  <Text style={[styles.completionLabel, s.done && styles.completionLabelDone]}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ══ WORKER: stats strip above tabs ════════════════════════ */}
          {!isCustomer && (
            <View style={styles.workerStatsStrip}>
              <WorkerStat val={activeEngs.length}    label="Active"    color={colors.success} onPress={() => setTab("active")}    active={tab === "active"} />
              <View style={styles.wStatSep} />
              <WorkerStat val={pendingEngs.length}   label="Pending"   color="#F59E0B"         onPress={() => setTab("pending")}   active={tab === "pending"} />
              <View style={styles.wStatSep} />
              <WorkerStat val={completedEngs.length} label="Completed" color={colors.saffron}  onPress={() => setTab("completed")} active={tab === "completed"} />
              <View style={styles.wStatSep} />
              <WorkerStat val={cancelledEngs.length} label="Cancelled" color={colors.textMuted} onPress={() => setTab("cancelled")} active={tab === "cancelled"} />
            </View>
          )}

          {/* ══ TABS ════════════════════════════════════════════════════ */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
            <View style={styles.tabRow}>
              {TABS.map(t => (
                <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
                  <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* ══ OVERVIEW ════════════════════════════════════════════════ */}
          {tab === "overview" && isCustomer && (
            <View style={{ gap: 12 }}>
              {openJobs.length === 0 && activeEngs.length === 0 ? (
                <View style={styles.emptyHero}>
                  <Text style={styles.emptyEmoji}>👷</Text>
                  <Text style={styles.emptyTitle}>Post your first job</Text>
                  <Text style={styles.emptySubtitle}>Connect with verified workers near you in minutes.</Text>
                  <Button title="Post a Job" icon={<Ionicons name="add" size={16} color="#fff" />} onPress={() => navigation.navigate("PostJob")} style={{ marginTop: 14 }} />
                </View>
              ) : (
                <>
                  {/* Active bookings (accepted engagements) */}
                  {activeEngs.map(e => <CustomerActiveCard key={e.id} e={e} onComplete={() => completeEng(e.id, e.worker_name)} onRate={() => setRatingModal({ id: e.id, workerName: e.worker_name })} onPress={() => setDetailItem(e)} />)}
                  {/* Open jobs */}
                  {openJobs.map(j => {
                    const resp = responsesFor(j.id);
                    return (
                      <View key={j.id} style={[styles.jobCard, resp > 0 && styles.jobCardActive]}>
                        <View style={styles.jobCardBody}>
                          <View style={styles.jobCardHeader}>
                            <View style={styles.jobCatBadge}>
                              <Text style={styles.jobCatIcon}>{CAT_ICONS[j.category] || "📦"}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.jobTitle} numberOfLines={1}>{j.title}</Text>
                              <Text style={styles.jobCat}>{j.job_date} · {j.village || "—"}</Text>
                            </View>
                            <Text style={styles.jobRate}>₹{j.daily_rate}<Text style={{ fontSize: 10, color: colors.textMuted }}>/day</Text></Text>
                          </View>
                          <View style={styles.jobStats}>
                            <MiniStat label="Workers" val={j.workers_needed} />
                            <MiniStat label="Date" val={j.job_date} />
                            <MiniStat label="Status" val={j.status} />
                          </View>
                          {resp > 0 ? (
                            <Pressable style={styles.responseCtaBtn} onPress={() => setTab("pending")}>
                              <View style={styles.responseDot} />
                              <Text style={styles.responseCtaTxt}>{resp} worker{resp > 1 ? "s" : ""} interested — Review now</Text>
                              <Ionicons name="chevron-forward" size={14} color="#fff" />
                            </Pressable>
                          ) : (
                            <Pressable style={styles.findWorkersBtn} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
                              <Ionicons name="search-outline" size={13} color={colors.saffron} />
                              <Text style={styles.findWorkersBtnTxt}>Find Workers →</Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* ══ PENDING (customer: accept/reject) ═══════════════════════ */}
          {tab === "pending" && isCustomer && (
            <View style={{ gap: 12 }}>
              {pendingEngs.length === 0 ? (
                <Empty msg="No responses yet." sub="Workers who express interest in your jobs will appear here." />
              ) : pendingEngs.map(e => {
                const workerInitials = (e.worker_name || "W").split(" ").map(w => w[0]).slice(0,2).join("").toUpperCase();
                return (
                  <Pressable key={e.id} onPress={() => setDetailItem(e)} style={styles.responseCard}>
                    {/* Worker info */}
                    <View style={styles.responseWorkerRow}>
                      <View style={styles.responseAvatar}>
                        <Text style={styles.responseAvatarTxt}>{workerInitials}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.responseWorkerName}>{e.worker_name || "Worker"}</Text>
                        <Text style={styles.responseJobTitle} numberOfLines={1}>{e.job_title}</Text>
                      </View>
                      <View style={styles.responseDateBadge}>
                        <Text style={styles.responseDateTxt}>{e.job_date}</Text>
                      </View>
                    </View>
                    {/* Rate row */}
                    <View style={styles.responseRateRow}>
                      <Ionicons name="cash-outline" size={13} color={colors.textMuted} />
                      <Text style={styles.responseRateTxt}>
                        Offering <Text style={{ color: colors.money, fontFamily: fonts.bodyBold }}>₹{e.daily_rate}/day</Text>
                      </Text>
                    </View>
                    {/* Accept / Reject */}
                    <View style={styles.actionRow}>
                      <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => acceptEng(e.id)}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.btnGreenText}>Accept</Text>
                      </Pressable>
                      <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={() => rejectEng(e.id, e.worker_name)}>
                        <Text style={styles.btnOutlineText}>Decline</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ══ PENDING (worker: sent interest) ═════════════════════════ */}
          {tab === "pending" && !isCustomer && (
            <View style={{ gap: 12 }}>
              {pendingEngs.length === 0 ? (
                <Empty msg="No pending interest." sub="Jobs you've applied to will show here." />
              ) : pendingEngs.map(e => <WorkerPendingCard key={e.id} e={e} onCancel={() => cancelEng(e.id)} onPress={() => setDetailItem(e)} />)}
            </View>
          )}

          {/* ══ ACTIVE (worker: confirmed jobs) ══════════════════════════ */}
          {tab === "active" && !isCustomer && (
            <View style={{ gap: 12 }}>
              {activeEngs.length === 0 ? (
                <Empty msg="No active jobs." sub="Accepted jobs appear here." />
              ) : activeEngs.map(e => <WorkerActiveCard key={e.id} e={e} onComplete={() => completeEng(e.id)} onCancel={() => cancelEng(e.id)} onPress={() => setDetailItem(e)} />)}
            </View>
          )}

          {/* ══ MY JOBS (customer) ═══════════════════════════════════════ */}
          {tab === "jobs" && isCustomer && (
            <View style={{ gap: 12 }}>
              {jobs.length === 0 ? (
                <Empty msg="No jobs posted yet." />
              ) : jobs.map(j => (
                <Pressable key={j.id} onPress={() => setDetailItem(j)} style={styles.card}>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 24 }}>{CAT_ICONS[j.category] || "📦"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{j.title}</Text>
                      <Text style={styles.cardMeta}>{j.job_date} · {j.village} · ₹{j.daily_rate}/day</Text>
                    </View>
                    <StatusPill status={j.status} />
                  </View>
                  <Text style={styles.tapHint}>Tap for details →</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* ══ HISTORY (customer only) ══════════════════════════════════ */}
          {tab === "history" && isCustomer && (
            <View style={{ gap: 12 }}>
              {pastEngs.length === 0 ? (
                <Empty msg="No history yet." />
              ) : pastEngs.map(e => {
                const status = e.engagement_status || e.status;
                const st = STATUS_STYLE[status] || { bg:"#f3f4f6", fg:"#374151", label: status };
                return (
                  <Pressable key={e.id} onPress={() => setDetailItem(e)} style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{e.job_title}</Text>
                        <Text style={styles.cardMeta}>
                          {e.job_date} · ₹{e.daily_rate}/day · 👷 {e.worker_name}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                    {status === "completed" && !e.rating && (
                      <Pressable style={[styles.btnSaffron, { marginTop: 10 }]} onPress={() => setRatingModal({ id: e.id, workerName: e.worker_name })}>
                        <Text style={styles.btnSaffronText}>⭐ Rate Worker</Text>
                      </Pressable>
                    )}
                    {e.rating && (
                      <View style={styles.ratingChip}>
                        <Ionicons name="star" size={12} color={colors.saffron} />
                        <Text style={styles.ratingChipText}>{e.rating}/5</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ══ COMPLETED (worker) ═══════════════════════════════════════ */}
          {tab === "completed" && !isCustomer && (
            <View style={{ gap: 12 }}>
              {completedEngs.length === 0 ? (
                <Empty msg="No completed jobs yet." sub="Finished jobs will appear here with your earnings." />
              ) : (
                <>
                  {/* Earnings summary */}
                  <View style={styles.earningsSummary}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.earningsLabel}>Total earned</Text>
                      <Text style={styles.earningsVal}>
                        ₹{completedEngs.reduce((sum, e) => sum + (e.daily_rate || 0), 0)}
                      </Text>
                    </View>
                    <View style={styles.wStatSep} />
                    <View style={{ flex: 1, alignItems: "center" }}>
                      <Text style={styles.earningsLabel}>Jobs done</Text>
                      <Text style={styles.earningsVal}>{completedEngs.length}</Text>
                    </View>
                    <View style={styles.wStatSep} />
                    <View style={{ flex: 1, alignItems: "flex-end" }}>
                      <Text style={styles.earningsLabel}>Avg rating</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.earningsVal}>
                          {completedEngs.filter(e => e.rating).length > 0
                            ? (completedEngs.filter(e => e.rating).reduce((s, e) => s + e.rating, 0) / completedEngs.filter(e => e.rating).length).toFixed(1)
                            : "—"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {completedEngs.map(e => (
                    <Pressable key={e.id} onPress={() => setDetailItem(e)} style={styles.completedCard}>
                      <View style={styles.completedCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{e.job_title}</Text>
                          <Text style={styles.cardMeta}>🤝 {e.customer_name} · {e.job_date}</Text>
                        </View>
                        <Text style={styles.completedRate}>₹{e.daily_rate}</Text>
                      </View>
                      {e.rating ? (
                        <View style={styles.ratingChip}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <Text style={styles.ratingChipText}>{e.rating}/5</Text>
                          {e.comment ? <Text style={styles.ratingComment} numberOfLines={1}>"{e.comment}"</Text> : null}
                        </View>
                      ) : (
                        <Text style={styles.awaitingRating}>Awaiting customer rating</Text>
                      )}
                    </Pressable>
                  ))}
                </>
              )}
            </View>
          )}

          {/* ══ CANCELLED (worker) ═══════════════════════════════════════ */}
          {tab === "cancelled" && !isCustomer && (
            <View style={{ gap: 12 }}>
              {cancelledEngs.length === 0 ? (
                <Empty msg="No cancelled jobs." sub="Withdrawn or rejected applications appear here." />
              ) : cancelledEngs.map(e => {
                const status = e.engagement_status || e.status;
                const st = STATUS_STYLE[status] || { bg:"#f3f4f6", fg:"#374151", label: status };
                return (
                  <Pressable key={e.id} onPress={() => setDetailItem(e)} style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{e.job_title}</Text>
                        <Text style={styles.cardMeta}>{e.job_date} · ₹{e.daily_rate}/day</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Support link */}
          <Pressable onPress={() => navigation.navigate("ContactSupport")} style={styles.supportLink}>
            <Ionicons name="help-circle-outline" size={15} color={colors.saffron} />
            <Text style={styles.supportText}>Help & Support</Text>
          </Pressable>

        </View>
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
    </SafeAreaView>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

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

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
});
