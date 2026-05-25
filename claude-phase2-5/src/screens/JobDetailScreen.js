import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts } from "../theme";
import api from "../lib/api";

const SC = {
  open:      { bg: colors.successLight, text: colors.success,    dot: colors.success,    label: "Open" },
  filled:    { bg: colors.surface,      text: colors.textSecondary, dot: colors.textMuted,  label: "Filled" },
  closed:    { bg: colors.surface,      text: colors.textMuted,   dot: colors.textMuted,    label: "Closed" },
  requested: { bg: colors.warningLight, text: colors.warning,     dot: colors.warning,     label: "Pending" },
  accepted:  { bg: colors.successLight, text: colors.success,    dot: colors.success,    label: "Accepted" },
  completed: { bg: colors.primaryLight, text: colors.secondary,   dot: colors.secondary,   label: "Done" },
  rejected:  { bg: colors.dangerLight,  text: colors.danger,      dot: colors.danger,      label: "Declined" },
  cancelled: { bg: colors.surface,      text: colors.textMuted,   dot: colors.textMuted,    label: "Cancelled" },
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
  const [editVisible, setEditVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    category: "",
    description: "",
    daily_rate: "",
    workers_needed: "1",
    job_date: "",
    village: "",
    pincode: "",
  });
  const [savingJob, setSavingJob] = useState(false);
  const [cancellingJob, setCancellingJob] = useState(false);

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

  const openEdit = () => {
    const address = job?.address || {};
    setEditForm({
      title: job?.title || "",
      category: job?.category || "",
      description: job?.description || "",
      daily_rate: job?.daily_rate != null ? String(job.daily_rate) : "",
      workers_needed: job?.workers_needed != null ? String(job.workers_needed) : "1",
      job_date: job?.job_date || "",
      village: job?.village || address.village || "",
      pincode: job?.pincode || address.pincode || "",
    });
    setEditVisible(true);
  };

  useEffect(() => {
    if (job && route.params?.openEdit) {
      openEdit();
      navigation.setParams({ openEdit: false });
    }
  }, [job, route.params?.openEdit]);

  const saveJobEdits = async () => {
    if (!editForm.title.trim() || !editForm.description.trim()) {
      Alert.alert("Missing details", "Title and description are required.");
      return;
    }
    setSavingJob(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        category: editForm.category.trim() || "other",
        description: editForm.description.trim(),
        daily_rate: Number(editForm.daily_rate || 0),
        workers_needed: Number(editForm.workers_needed || 1),
        job_date: editForm.job_date.trim(),
        village: editForm.village.trim(),
        pincode: editForm.pincode.trim(),
        address: {
          ...(job?.address || {}),
          village: editForm.village.trim(),
          pincode: editForm.pincode.trim(),
        },
      };
      const { data } = await api.patch(`/jobs/${jobId}`, payload);
      setJob(data);
      setEditVisible(false);
      await load();
    } catch (e) {
      Alert.alert("Could not update job", e?.response?.data?.detail || "Please try again.");
    } finally {
      setSavingJob(false);
    }
  };

  const cancelJob = () => {
    Alert.alert(
      "Cancel this job?",
      "Pending applications will be cancelled and this job will stop appearing in Find Work.",
      [
        { text: "Keep Job", style: "cancel" },
        {
          text: "Cancel Job",
          style: "destructive",
          onPress: async () => {
            setCancellingJob(true);
            try {
              await api.post(`/jobs/${jobId}/cancel`);
              await load();
            } catch (e) {
              Alert.alert("Could not cancel job", e?.response?.data?.detail || "Please try again.");
            } finally {
              setCancellingJob(false);
            }
          },
        },
      ],
    );
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
  const canManageJob = isMyJob && status === "open";

  const pay = job.budget_min
    ? `₹${job.budget_min}${job.budget_max ? ` – ₹${job.budget_max}` : ""}`
    : job.daily_rate ? `₹${job.daily_rate}/day` : null;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.textHeading} />
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
              <View style={[s.statBox, { backgroundColor: colors.primary, flex: 1.3 }]}>
                <Ionicons name="cash-outline" size={18} color="rgba(255,255,255,0.6)" />
                <Text style={[s.statLabel, { color: "rgba(255,255,255,0.55)" }]}>Pay</Text>
                <Text style={[s.statValue, { color: "#fff" }]}>{pay}</Text>
              </View>
            )}
            {(job.location_text || job.pincode) && (
              <View style={[s.statBox, { flex: 1 }]}>
                <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                <Text style={s.statLabel}>Location</Text>
                <Text style={s.statValue} numberOfLines={1}>{job.location_text || job.pincode}</Text>
              </View>
            )}
            {job.job_date && (
              <View style={[s.statBox, { flex: 1 }]}>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
                <Text style={s.statLabel}>Date</Text>
                <Text style={s.statValue}>{job.job_date}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Owner controls ─────────────────────────────────────────── */}
        {canManageJob && (
          <View style={s.ownerCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.ownerTitle}>Manage this job</Text>
              <Text style={s.ownerSub}>Edit details or cancel before accepting a worker.</Text>
            </View>
            <View style={s.ownerActions}>
              <TouchableOpacity style={s.editJobBtn} onPress={openEdit} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={15} color={colors.textHeading} />
                <Text style={s.editJobTxt}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.cancelJobBtn, cancellingJob && { opacity: 0.55 }]}
                onPress={cancelJob}
                disabled={cancellingJob}
                activeOpacity={0.85}
              >
                {cancellingJob ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={s.cancelJobTxt}>Cancel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
                <Ionicons name="people-outline" size={40} color={colors.borderSubtle} />
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
                              ? <ActivityIndicator size="small" color={colors.danger} />
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

      <Modal visible={editVisible} animationType="slide" transparent onRequestClose={() => setEditVisible(false)}>
        <View style={s.modalScrim}>
          <View style={[s.editSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Edit Job</Text>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={s.sheetClose}>
                <Ionicons name="close" size={20} color={colors.textHeading} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 14 }}>
              <EditField label="Title" value={editForm.title} onChangeText={(title) => setEditForm(v => ({ ...v, title }))} />
              <EditField label="Category" value={editForm.category} onChangeText={(category) => setEditForm(v => ({ ...v, category }))} />
              <EditField
                label="Description"
                value={editForm.description}
                onChangeText={(description) => setEditForm(v => ({ ...v, description }))}
                multiline
              />
              <View style={s.twoCol}>
                <EditField
                  label="Daily rate"
                  value={editForm.daily_rate}
                  onChangeText={(daily_rate) => setEditForm(v => ({ ...v, daily_rate }))}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
                <EditField
                  label="Workers"
                  value={editForm.workers_needed}
                  onChangeText={(workers_needed) => setEditForm(v => ({ ...v, workers_needed }))}
                  keyboardType="number-pad"
                  style={{ flex: 1 }}
                />
              </View>
              <EditField label="Job date" value={editForm.job_date} onChangeText={(job_date) => setEditForm(v => ({ ...v, job_date }))} placeholder="YYYY-MM-DD" />
              <View style={s.twoCol}>
                <EditField label="Village" value={editForm.village} onChangeText={(village) => setEditForm(v => ({ ...v, village }))} style={{ flex: 1 }} />
                <EditField label="Pincode" value={editForm.pincode} onChangeText={(pincode) => setEditForm(v => ({ ...v, pincode }))} keyboardType="number-pad" style={{ flex: 1 }} />
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[s.saveJobBtn, savingJob && { opacity: 0.6 }]}
              onPress={saveJobEdits}
              disabled={savingJob}
              activeOpacity={0.9}
            >
              {savingJob ? <ActivityIndicator color="#fff" /> : <Text style={s.saveJobTxt}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EditField({ label, style, multiline, ...props }) {
  return (
    <View style={[s.fieldWrap, style]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[s.input, multiline && s.inputMulti]}
      />
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
  root:   { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1, borderBottomColor: colors.surface,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.textHeading },

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
  jobTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.textHeading, lineHeight: 30, marginBottom: 14 },
  postedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  postedAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center",
  },
  postedAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#4f46e5" },
  postedName:  { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textSecondary },
  postedLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  // Stats row
  statsRow: { flexDirection: "row", gap: 10 },
  statBox: {
    backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 4, ...SHADOW,
  },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted, marginTop: 2 },
  statValue: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },

  // Owner controls
  ownerCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOW,
  },
  ownerTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 3 },
  ownerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  ownerActions: { flexDirection: "row", gap: 8 },
  editJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  editJobTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textHeading },
  cancelJobBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
  },
  cancelJobTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },

  // Sections
  section: {
    backgroundColor: "#fff", borderRadius: 18, padding: 20, ...SHADOW,
  },
  sectionTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 12 },
  bodyTxt:      { fontFamily: fonts.body, fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  // My application status
  myAppRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  myAppIconWrap: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: "center", justifyContent: "center",
  },
  myAppStatus: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textHeading, marginBottom: 2 },
  myAppSub:    { fontFamily: fonts.body, fontSize: 13, color: colors.textSecondary },

  // Application rows
  appRow:       { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  appRowBorder: { borderTopWidth: 1, borderTopColor: colors.surface },
  appAvatar: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: "#e0e7ff", alignItems: "center", justifyContent: "center",
  },
  appAvatarTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#4f46e5" },
  appName:      { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  appBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  appBadgeTxt:  { fontFamily: fonts.bodyBold, fontSize: 11 },

  decideRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: colors.success,
  },
  acceptTxt:  { fontFamily: fonts.bodyBold, fontSize: 13, color: "#fff" },
  declineBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: colors.danger,
  },
  declineTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.danger },

  // Empty state
  empty:    { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyTxt: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textSecondary },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  // Sticky apply bar
  stickyBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.surface,
    shadowColor: "#000", shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  applyBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    height: 52, backgroundColor: colors.primary, borderRadius: 14,
  },
  applyBtnTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },

  // Edit sheet
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  editSheet: {
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#d1d5db",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sheetTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.textHeading },
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  twoCol: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  input: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textHeading,
  },
  inputMulti: {
    minHeight: 108,
    textAlignVertical: "top",
  },
  saveJobBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveJobTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff" },
});
