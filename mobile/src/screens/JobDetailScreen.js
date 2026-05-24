import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts } from "../theme";
import api from "../lib/api";

const SC = {
  open:      { bg: "#ecfdf5", text: "#059669", dot: "#10b981", label: "Open" },
  filled:    { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6", label: "Filled" },
  closed:    { bg: "#f9fafb", text: "#6b7280", dot: "#9ca3af", label: "Closed" },
  requested: { bg: "#fffbeb", text: "#d97706", dot: "#f59e0b", label: "Pending" },
  accepted:  { bg: "#ecfdf5", text: "#059669", dot: "#10b981", label: "Accepted" },
  completed: { bg: "#eff6ff", text: "#2563eb", dot: "#3b82f6", label: "Done" },
  rejected:  { bg: "#fef2f2", text: "#dc2626", dot: "#ef4444", label: "Declined" },
  cancelled: { bg: "#f9fafb", text: "#6b7280", dot: "#9ca3af", label: "Cancelled" },
};

export default function JobDetailScreen({ route, navigation }) {
  const { jobId } = route.params || {};
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [job, setJob]               = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [applying, setApplying]     = useState(false);
  const [acting, setActing]         = useState(null);

  const load = useCallback(async () => {
    try {
      const [jRes, eRes] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get("/work-requests/mine").catch(() => ({ data: [] })),
      ]);
      setJob(jRes.data);
      const all = Array.isArray(eRes.data) ? eRes.data : [];
      setApplications(all.filter(e => e.job_id === jobId));
    } catch {
      Alert.alert("Error", "Could not load job details");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    setActing(id + action);
    try {
      await api.post(`/work-requests/${id}/${action}`);
      await load();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Action failed");
    } finally { setActing(null); }
  };

  const applyNow = async () => {
    setApplying(true);
    try {
      await api.post("/work-requests", { job_id: jobId, request_type: "job_application" });
      await load();
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.detail || "Could not apply");
    } finally { setApplying(false); }
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator color={colors.primary} /></View>;
  }
  if (!job) return null;

  const isMyJob  = job.posted_by_user_id === user?.id;
  const status   = job.status || "open";
  const sc       = SC[status] || SC.open;
  const myApp    = applications[0];
  const hasApplied = !!myApp && ["requested", "accepted"].includes(myApp.status);
  const canApply = !isMyJob && !hasApplied && status === "open";

  const pay = job.budget_min
    ? `₹${job.budget_min}${job.budget_max ? ` – ₹${job.budget_max}` : ""}`
    : job.daily_rate ? `₹${job.daily_rate}/day` : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Job Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (canApply ? 104 : 32), gap: 16 }}
      >

        {/* ── Title card ─────────────────────────────────────────────── */}
        <View style={s.titleCard}>
          {/* Status badge */}
          <View style={[s.statusBadge, { backgroundColor: sc.bg }]}>
            <View style={[s.statusDot, { backgroundColor: sc.dot }]} />
            <Text style={[s.statusTxt, { color: sc.text }]}>{sc.label}</Text>
          </View>

          <Text style={s.jobTitle}>{job.title}</Text>

          {job.posted_by_name && (
            <View style={s.postedRow}>
              <View style={s.postedAvatar}>
                <Text style={s.postedAvatarTxt}>{(job.posted_by_name[0] || "?").toUpperCase()}</Text>
              </View>
              <Text style={s.postedName}>{job.posted_by_name}</Text>
              <Text style={s.postedLabel}>· Posted by</Text>
            </View>
          )}
        </View>

        {/* ── Stats row ──────────────────────────────────────────────── */}
        {(pay || job.location_text || job.pincode || job.job_date) && (
          <View style={s.statsRow}>
            {pay && (
              <View style={[s.statBox, { backgroundColor: "#1a1c2e", flex: 1.3 }]}>
                <Ionicons name="cash-outline" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={[s.statLabel, { color: "rgba(255,255,255,0.55)" }]}>Pay</Text>
                <Text style={[s.statValue, { color: "#fff" }]}>{pay}</Text>
              </View>
            )}
            {(job.location_text || job.pincode) && (
              <View style={[s.statBox, { flex: 1 }]}>
                <Ionicons name="location-outline" size={18} color="#6b7280" />
                <Text style={s.statLabel}>Location</Text>
                <Text style={s.statValue} numberOfLines={1}>{job.location_text || job.pincode}</Text>
              </View>
            )}
            {job.job_date && (
              <View style={[s.statBox, { flex: 1 }]}>
                <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                <Text style={s.statLabel}>Date</Text>
                <Text style={s.statValue}>{job.job_date}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Description ────────────────────────────────────────────── */}
        {job.description ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About this job</Text>
            <Text style={s.bodyTxt}>{job.description}</Text>
          </View>
        ) : null}

        {/* ── Requirements ───────────────────────────────────────────── */}
        {job.requirements ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Requirements</Text>
            <Text style={s.bodyTxt}>{job.requirements}</Text>
          </View>
        ) : null}

        {/* ── Your application status (non-owner, applied) ────────────── */}
        {!isMyJob && myApp && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Your Application</Text>
            <View style={s.myAppRow}>
              <View style={[s.myAppIconWrap, { backgroundColor: (SC[myApp.status] || SC.cancelled).bg }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color={(SC[myApp.status] || SC.cancelled).dot} />
              </View>
              <View>
                <Text style={s.myAppStatus}>{(SC[myApp.status] || SC.cancelled).label}</Text>
                <Text style={s.myAppSub}>
                  {myApp.status === "requested" ? "Waiting for employer response" :
                   myApp.status === "accepted"  ? "Employer accepted your application" :
                   myApp.status === "rejected"  ? "Not selected this time" :
                   "Application closed"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Applications list (owner only) ─────────────────────────── */}
        {isMyJob && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Applications ({applications.length})</Text>

            {applications.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="people-outline" size={40} color="#e5e7eb" />
                <Text style={s.emptyTxt}>No applications yet</Text>
                <Text style={s.emptySub}>Share this job to get more applicants</Text>
              </View>
            ) : (
              applications.map((eng, idx) => {
                const es = SC[eng.status] || SC.cancelled;
                const name = eng.requested_by_name || "Applicant";
                const canDecide = eng.direction === "received" && eng.status === "requested";
                return (
                  <TouchableOpacity
                    key={eng.id}
                    style={[s.appRow, idx > 0 && s.appRowBorder]}
                    onPress={() => navigation.navigate("EngagementDetail", { id: eng.id })}
                    activeOpacity={0.8}
                  >
                    <View style={s.appAvatar}>
                      <Text style={s.appAvatarTxt}>{(name[0] || "?").toUpperCase()}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={s.appName}>{name}</Text>
                        <View style={[s.appBadge, { backgroundColor: es.bg }]}>
                          <Text style={[s.appBadgeTxt, { color: es.text }]}>{es.label}</Text>
                        </View>
                      </View>

                      {canDecide && (
                        <View style={s.decideRow}>
                          <TouchableOpacity
                            style={s.acceptBtn}
                            disabled={acting !== null}
                            onPress={() => act(eng.id, "accept")}
                          >
                            {acting === eng.id + "accept"
                              ? <ActivityIndicator size="small" color="#fff" />
                              : <><Ionicons name="checkmark" size={13} color="#fff" /><Text style={s.acceptTxt}>Accept</Text></>}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.declineBtn}
                            disabled={acting !== null}
                            onPress={() => act(eng.id, "reject")}
                          >
                            {acting === eng.id + "reject"
                              ? <ActivityIndicator size="small" color="#ef4444" />
                              : <Text style={s.declineTxt}>Decline</Text>}
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Apply CTA ───────────────────────────────────────────── */}
      {canApply && (
        <View style={[s.stickyBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity
            style={[s.applyBtn, applying && { opacity: 0.6 }]}
            onPress={applyNow}
            disabled={applying}
            activeOpacity={0.88}
          >
            {applying
              ? <ActivityIndicator color="#fff" />
              : <><Ionicons name="paper-plane-outline" size={18} color="#fff" /><Text style={s.applyBtnTxt}>Apply Now</Text></>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 2,
};

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#f5f5fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: "#f0f0f5",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#f3f4f6",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#111" },

  // Title card
  titleCard: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20, ...SHADOW,
  },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, marginBottom: 12,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontFamily: fonts.bodyBold, fontSize: 11 },
  jobTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#111", lineHeight: 30, marginBottom: 14 },
  postedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  postedAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center",
  },
  postedAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#4f46e5" },
  postedName:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#374151" },
  postedLabel: { fontFamily: fonts.body, fontSize: 13, color: "#9ca3af" },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4, ...SHADOW,
  },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: "#9ca3af", marginTop: 2 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#111" },

  // Sections
  section: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20, ...SHADOW,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#111", marginBottom: 12 },
  bodyTxt:      { fontFamily: fonts.body, fontSize: 14, color: "#4b5563", lineHeight: 22 },

  // My application status
  myAppRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  myAppIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  myAppStatus: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#111", marginBottom: 2 },
  myAppSub:    { fontFamily: fonts.body, fontSize: 13, color: "#6b7280" },

  // Application rows
  appRow:       { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  appRowBorder: { borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  appAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center",
  },
  appAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#4f46e5" },
  appName:      { fontFamily: fonts.bodyBold, fontSize: 14, color: "#111" },
  appBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  appBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 11 },

  decideRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: "#10b981",
  },
  acceptTxt:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  declineBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: "#ef4444",
  },
  declineTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#ef4444" },

  // Empty state
  empty:    { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#374151" },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: "#9ca3af" },

  // Sticky apply bar
  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: "#f0f0f5",
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, backgroundColor: "#1a1c2e", borderRadius: 14,
  },
  applyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
