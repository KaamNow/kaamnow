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
import { colors, fonts, radius, spacing, sizes } from "../theme";
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

export default function DashboardScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [engagements, setEngagements]   = useState([]);
  const [jobs, setJobs]                 = useState([]);
  const [nearbyCount, setNearbyCount]   = useState(null);
  const [tab, setTab]                   = useState("overview");
  const [refreshing, setRefreshing]     = useState(false);
  const [ratingModal, setRatingModal]   = useState(null);
  const [ratingVal, setRatingVal]       = useState("5");
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
  const completeEng = async (id) => { try { await api.post(`/engagements/${id}/complete`); load(); Alert.alert("Marked complete!"); } catch (e) { Alert.alert("Error", formatApiError(e)); } };
  const submitRating = async () => {
    const r = parseInt(ratingVal, 10);
    if (!r || r < 1 || r > 5) return Alert.alert("Rating 1–5 please");
    try {
      await api.post(`/engagements/${ratingModal.id}/rate`, { rating: r, comment: ratingComment.trim() });
      setRatingModal(null); setRatingVal("5"); setRatingComment("");
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
  const pendingEngs  = engagements.filter(e => (e.engagement_status || e.status) === "requested");
  const activeEngs   = engagements.filter(e => (e.engagement_status || e.status) === "accepted");
  const pastEngs     = engagements.filter(e => ["completed","cancelled","rejected"].includes(e.engagement_status || e.status));
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
    : [{ id:"overview", label:"Overview" }, { id:"active",  label:`Active${activeEngs.length ? ` (${activeEngs.length})` : ""}` },  { id:"pending", label:`Pending${pendingEngs.length ? ` (${pendingEngs.length})` : ""}` }, { id:"history", label:"History" }];

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ══ HERO ════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={isCustomer ? ["#3f37c9", "#2f28a8"] : ["#FF6B35", "#E85A25"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative circle */}
          <View style={styles.heroCircle} />
          <View style={styles.heroCircle2} />

          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting()}</Text>
              <Text style={styles.heroName}>{firstName}</Text>
              <Text style={styles.heroSub}>
                {isCustomer ? "What work do you need today?" : "Find work near you"}
              </Text>
            </View>
          </View>

          <View style={styles.heroCTAs}>
            {isCustomer ? (
              <>
                <Pressable style={styles.heroCtaPrimary} onPress={() => navigation.navigate("PostJob")}>
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.heroCtaPrimaryText}>Post a Job</Text>
                </Pressable>
                <Pressable style={styles.heroCtaSecondary} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
                  <Text style={styles.heroCtaSecondaryText}>Find Workers →</Text>
                </Pressable>
                <Pressable style={styles.heroCtaSecondary} onPress={() => navigation.navigate("CustomerProfile")}>
                  <Ionicons name="person-outline" size={14} color="#fff" />
                  <Text style={styles.heroCtaSecondaryText}>My Profile</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable style={styles.heroCtaPrimary} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })}>
                  <Ionicons name="briefcase-outline" size={16} color="#fff" />
                  <Text style={styles.heroCtaPrimaryText}>Browse Jobs</Text>
                </Pressable>
                {activeEngs.length > 0 && (
                  <View style={styles.heroCtaSecondary}>
                    <Text style={styles.heroCtaSecondaryText}>{activeEngs.length} active hire{activeEngs.length > 1 ? "s" : ""}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {nearbyCount !== null && (
            <View style={styles.nearbyRow}>
              <View style={styles.nearbyDot} />
              <Text style={styles.nearbyText}>
                {isCustomer
                  ? `${nearbyCount} verified workers available near you`
                  : `${nearbyCount} open jobs near you`}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={{ padding: spacing.lg }}>

          {/* ══ PROFILE COMPLETION (customer) ═══════════════════════════ */}
          {isCustomer && completion && completion.pct < 100 && (
            <View style={styles.card}>
              <View style={styles.completionHeader}>
                <View>
                  <Text style={styles.cardTitle}>Complete your profile</Text>
                  <Text style={styles.cardMeta}>Workers trust complete profiles more</Text>
                </View>
                <Text style={[styles.completionPct, { color: completion.pct >= 75 ? colors.success : completion.pct >= 50 ? colors.saffron : colors.indigo }]}>
                  {completion.pct}%
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, {
                  width: `${completion.pct}%`,
                  backgroundColor: completion.pct >= 75 ? colors.success : completion.pct >= 50 ? colors.saffron : colors.indigo,
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

          {/* ══ WORKER: active jobs preview above tabs ═══════════════════ */}
          {!isCustomer && activeEngs.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionTitle}>Your active jobs</Text>
              {activeEngs.map(e => (
                <WorkerActiveCard key={e.id} e={e}
                  onComplete={() => completeEng(e.id)}
                  onCancel={() => cancelEng(e.id)} />
              ))}
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
                  {activeEngs.map(e => <CustomerActiveCard key={e.id} e={e} onComplete={() => completeEng(e.id)} onRate={() => setRatingModal({ id: e.id, workerName: e.worker_name })} onPress={() => setDetailItem(e)} />)}
                  {/* Open jobs */}
                  {openJobs.map(j => {
                    const resp = responsesFor(j.id);
                    return (
                      <View key={j.id} style={styles.jobCard}>
                        {resp > 0 && (
                          <View style={styles.responseBanner}>
                            <View style={styles.responseDot} />
                            <Text style={styles.responseBannerText}>{resp} worker{resp > 1 ? "s" : ""} interested — tap to review</Text>
                          </View>
                        )}
                        <View style={styles.jobCardBody}>
                          <View style={styles.jobCardHeader}>
                            <Text style={styles.jobCatIcon}>{CAT_ICONS[j.category] || "📦"}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.jobTitle} numberOfLines={2}>{j.title}</Text>
                              <Text style={styles.jobCat}>{j.category || "General"}</Text>
                            </View>
                            <StatusPill status={j.status === "open" ? "open" : "booked"} />
                          </View>
                          <View style={styles.jobStats}>
                            <MiniStat label="Workers" val={j.workers_needed} />
                            <MiniStat label="Rate" val={`₹${j.daily_rate}`} />
                            <MiniStat label="Date" val={j.job_date} />
                            <MiniStat label="Area" val={j.village || "—"} />
                          </View>
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                            {resp > 0 && (
                              <Pressable style={styles.btnSaffron} onPress={() => setTab("pending")}>
                                <Text style={styles.btnSaffronText}>See {resp} Response{resp > 1 ? "s" : ""}</Text>
                              </Pressable>
                            )}
                            <Pressable style={[styles.btnIndigo, { flex: 1 }]} onPress={() => navigation.navigate("Tabs", { screen: "Workers" })}>
                              <Text style={styles.btnIndigoText}>Find Workers →</Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          )}

          {/* Worker overview */}
          {tab === "overview" && !isCustomer && (
            <View style={{ gap: 12 }}>
              <View style={styles.statGrid}>
                <StatCard icon="briefcase-outline"    label="Active Jobs"   val={activeEngs.length}  color={colors.indigo} />
                <StatCard icon="time-outline"          label="Pending"       val={pendingEngs.length} color={colors.saffron} />
                <StatCard icon="checkmark-circle-outline" label="Completed" val={pastEngs.filter(e => (e.engagement_status||e.status)==="completed").length} color={colors.success} />
              </View>
              {activeEngs.length === 0 && pendingEngs.length === 0 ? (
                <View style={styles.emptyHero}>
                  <Text style={styles.emptyEmoji}>💼</Text>
                  <Text style={styles.emptyTitle}>No active work yet</Text>
                  <Text style={styles.emptySubtitle}>Browse open jobs nearby and express interest.</Text>
                  <Button title="Find Jobs" icon={<Ionicons name="briefcase-outline" size={16} color="#fff" />} onPress={() => navigation.navigate("Tabs", { screen: "Jobs" })} style={{ marginTop: 14 }} />
                </View>
              ) : (
                <>
                  {activeEngs.map(e => <WorkerActiveCard key={e.id} e={e} onComplete={() => completeEng(e.id)} onCancel={() => cancelEng(e.id)} onPress={() => setDetailItem(e)} />)}
                  {pendingEngs.map(e => <WorkerPendingCard key={e.id} e={e} onCancel={() => cancelEng(e.id)} onPress={() => setDetailItem(e)} />)}
                </>
              )}
            </View>
          )}

          {/* ══ PENDING (customer: accept/reject) ═══════════════════════ */}
          {tab === "pending" && isCustomer && (
            <View style={{ gap: 12 }}>
              {pendingEngs.length === 0 ? (
                <Empty msg="No pending responses." sub="Workers who express interest in your jobs will appear here." />
              ) : pendingEngs.map(e => (
                <Pressable key={e.id} onPress={() => setDetailItem(e)} style={styles.card}>
                  <View style={styles.workerRow}>
                    <View style={[styles.workerAvatar, { backgroundColor: colors.indigoTint }]}>
                      <Ionicons name="person" size={22} color={colors.indigo} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{e.worker_name || "Worker"}</Text>
                      <Text style={styles.cardMeta}>{e.job_title} · ₹{e.daily_rate}/day · {e.job_date}</Text>
                    </View>
                  </View>
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.btnGreen, { flex: 1 }]} onPress={() => acceptEng(e.id)}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.btnGreenText}>Accept</Text>
                    </Pressable>
                    <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={() => rejectEng(e.id, e.worker_name)}>
                      <Text style={styles.btnOutlineText}>Reject</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
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
                <View key={j.id} style={styles.card}>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Text style={{ fontSize: 24 }}>{CAT_ICONS[j.category] || "📦"}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>{j.title}</Text>
                      <Text style={styles.cardMeta}>{j.job_date} · {j.village} · ₹{j.daily_rate}/day</Text>
                    </View>
                    <StatusPill status={j.status} />
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ══ HISTORY ══════════════════════════════════════════════════ */}
          {tab === "history" && (
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
                          {e.job_date} · ₹{e.daily_rate}/day · {isCustomer ? `👷 ${e.worker_name}` : `🤝 ${e.customer_name}`}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.fg }]}>{st.label}</Text>
                      </View>
                    </View>
                    {isCustomer && status === "completed" && !e.rating && (
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

          {/* Support link */}
          <Pressable onPress={() => navigation.navigate("ContactSupport")} style={styles.supportLink}>
            <Ionicons name="help-circle-outline" size={15} color={colors.indigo} />
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
                        <Ionicons name={r.icon} size={16} color={colors.indigo} />
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
                    {isCustomer && status === "accepted" && (
                      <Pressable style={styles.btnOutline} onPress={() => { setDetailItem(null); completeEng(detailItem.id); }}>
                        <Text style={styles.btnOutlineText}>✓ Mark Done</Text>
                      </Pressable>
                    )}
                    {isCustomer && status === "completed" && !detailItem.rating && (
                      <Pressable style={styles.btnSaffron} onPress={() => { setDetailItem(null); setRatingModal({ id: detailItem.id, workerName: detailItem.worker_name }); }}>
                        <Text style={styles.btnSaffronText}>⭐ Rate Worker</Text>
                      </Pressable>
                    )}
                    {!isCustomer && ["requested","accepted"].includes(status) && (
                      <Pressable style={styles.btnOutline} onPress={() => { setDetailItem(null); cancelEng(detailItem.id); }}>
                        <Text style={styles.btnOutlineText}>Withdraw / Cancel</Text>
                      </Pressable>
                    )}
                  </View>

                  <Pressable onPress={() => setDetailItem(null)} style={{ alignItems: "center", marginTop: 20, paddingBottom: 8 }}>
                    <Text style={{ fontFamily: fonts.bodySemi, color: colors.indigo }}>Close</Text>
                  </Pressable>
                </ScrollView>
              );
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══ RATING MODAL ════════════════════════════════════════════════ */}
      <Modal transparent visible={!!ratingModal} animationType="fade" onRequestClose={() => setRatingModal(null)}>
        <View style={styles.ratingModalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate {(ratingModal?.workerName || "").split(" ")[0]}</Text>
            <View style={styles.starsRow}>
              {[1,2,3,4,5].map(n => (
                <Pressable key={n} onPress={() => setRatingVal(String(n))}>
                  <Ionicons name={parseInt(ratingVal) >= n ? "star" : "star-outline"} size={36} color={colors.saffron} />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={ratingComment} onChangeText={setRatingComment}
              placeholder="Add a comment (optional)"
              placeholderTextColor={colors.textMuted}
              style={styles.commentInput} multiline
            />
            <Button title="Submit" onPress={submitRating} style={{ marginTop: 8 }} />
            <Pressable onPress={() => setRatingModal(null)} style={{ marginTop: 12, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.bodySemi, color: colors.indigo }}>Cancel</Text>
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
        {status === "accepted" && (
          <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={onComplete}>
            <Text style={styles.btnOutlineText}>✓ Mark Done</Text>
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
        <Pressable style={[styles.btnOutline, { flex: 1 }]} onPress={onCancel}>
          <Text style={styles.btnOutlineText}>Cancel</Text>
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

function StatCard({ icon, label, val, color }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.statVal}>{val}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    open:      { bg:"#fff4f0", fg:"#ff6b35", label:"Open" },
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
  hero: { padding: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl, position: "relative", overflow: "hidden" },
  heroCircle: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.08)", top: -40, right: -40 },
  heroCircle2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.06)", bottom: -20, left: 60 },
  heroTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  heroGreeting: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  heroName: { fontFamily: fonts.display, fontSize: 28, color: "#fff" },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10 },
  heroCTAs: { flexDirection: "row", gap: 10, marginBottom: 14 },
  heroCtaPrimary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.25)", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  heroCtaPrimaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  heroCtaSecondary: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.18)", paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  heroCtaSecondaryText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
  nearbyRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  nearbyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80" },
  nearbyText: { fontFamily: fonts.body, fontSize: 12, color: "rgba(255,255,255,0.65)" },
  // Cards
  card: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 2 },
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
  tabActive: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  tabText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  // Job cards
  jobCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  responseBanner: { backgroundColor: "#fff4f0", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  responseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.saffron },
  responseBannerText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#ff6b35" },
  jobCardBody: { padding: 14 },
  jobCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  jobCatIcon: { fontSize: 28 },
  jobTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.text },
  jobCat: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginTop: 2 },
  jobStats: { flexDirection: "row", backgroundColor: colors.soft || "#f9f8f4", borderRadius: 10, padding: 10, marginBottom: 12, gap: 4 },
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
  btnIndigo: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.indigoTint, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10 },
  btnIndigoText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.indigo },
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
  // Support
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textSecondary, marginBottom: 10 },
  supportLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, alignSelf: "center" },
  supportText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.indigo },
  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  detailSheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: "85%" },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 20 },
  detailEmoji: { fontSize: 40 },
  detailTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.indigoTint, alignItems: "center", justifyContent: "center" },
  detailRowLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  detailRowVal: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text, marginTop: 2 },
  detailDesc: { backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, marginTop: 16 },
  detailDescLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted, marginBottom: 6 },
  detailDescText: { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  ratingModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360 },
  modalTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, marginBottom: 18, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 18 },
  commentInput: { backgroundColor: "#fafaf7", borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 15, color: colors.text, minHeight: 80, textAlignVertical: "top" },
});
