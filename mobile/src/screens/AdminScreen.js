import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Alert, RefreshControl, ActivityIndicator, TextInput, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api, { formatApiError } from "../api";
import { useAuth } from "../contexts/AuthContext";
import { colors, fonts, radius, spacing } from "../theme";

const TABS = ["Stats", "Local Experts", "Users", "Jobs"];

const TIER_COLORS = {
  1: { label: "T1 Self",   icon: "shield-outline",        bg: "#f3f4f6", fg: "#6b7280" },
  2: { label: "T2 Verified", icon: "shield-checkmark",    bg: "#dcfce7", fg: "#15803d" },
  3: { label: "T3 Pro",    icon: "ribbon-outline",         bg: "#dbeafe", fg: "#1d4ed8" },
  4: { label: "T4 Elite",  icon: "trophy-outline",         bg: "#fef9c3", fg: "#b45309" },
};

export default function AdminScreen() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Stats");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);

  // Workers
  const [workers, setWorkers] = useState([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerTotal, setWorkerTotal] = useState(0);
  const [workerPage, setWorkerPage] = useState(0);

  // Users
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [userTotal, setUserTotal] = useState(0);

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [jobTotal, setJobTotal] = useState(0);

  // Broadcast modal
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState("experts");
  const [broadcasting, setBroadcasting] = useState(false);

  const LIMIT = 20;

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get("/admin/stats");
      setStats(r.data);
    } catch {}
  }, []);

  const fetchWorkers = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT, skip: page * LIMIT });
      if (workerSearch) p.append("search", workerSearch);
      const r = await api.get(`/admin/experts?${p}`);
      setWorkers(r.data.items || []);
      setWorkerTotal(r.data.total || 0);
    } catch { Alert.alert("Error", "Failed to load Local Experts"); }
    finally { setLoading(false); }
  }, [workerSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: LIMIT });
      if (userSearch) p.append("search", userSearch);
      const r = await api.get(`/admin/users?${p}`);
      setUsers(r.data.items || []);
      setUserTotal(r.data.total || 0);
    } catch { Alert.alert("Error", "Failed to load users"); }
    finally { setLoading(false); }
  }, [userSearch]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/jobs?limit=30");
      setJobs(r.data.items || []);
      setJobTotal(r.data.total || 0);
    } catch { Alert.alert("Error", "Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    if (activeTab === "Local Experts") fetchWorkers(0);
    if (activeTab === "Users") fetchUsers();
    if (activeTab === "Jobs") fetchJobs();
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    if (activeTab === "Local Experts") await fetchWorkers(0);
    if (activeTab === "Users") await fetchUsers();
    if (activeTab === "Jobs") await fetchJobs();
    setRefreshing(false);
  };

  // Worker actions
  const suspendWorker = async (id, status) => {
    const suspend = status !== "suspended";
    try {
      await api.patch(`/admin/experts/${id}/suspend`, { suspend });
      fetchWorkers(workerPage);
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
  };

  const setTrustTier = (worker) => {
    const TIERS = [
      { tier: 1, label: "Tier 1 — Self Verified" },
      { tier: 2, label: "Tier 2 — Verified ✓" },
      { tier: 3, label: "Tier 3 — KaamNow Pro" },
      { tier: 4, label: "Tier 4 — Elite Expert" },
    ];
    Alert.alert(
      `Set Trust Tier — ${worker.display_name || worker.name}`,
      `Current: Tier ${worker.trust_tier || 1}`,
      [
        ...TIERS.map(({ tier, label }) => ({
          text: label,
          onPress: async () => {
            try {
              await api.patch(`/admin/experts/${worker.id}/trust-tier`, { trust_tier: tier });
              fetchWorkers(workerPage);
            } catch (e) { Alert.alert("Error", formatApiError(e)); }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const deleteWorker = async (id, name) => {
    Alert.alert(
      "Delete & wipe account?",
      `This will permanently delete all data for "${name}" including their user account, engagements and history. Cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
          try { await api.delete(`/admin/experts/${id}`); fetchWorkers(workerPage); }
          catch (e) { Alert.alert("Error", formatApiError(e)); }
        }},
      ]
    );
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    try {
      await api.post("/admin/whatsapp/broadcast", { message: broadcastMsg, audience: broadcastAudience });
      Alert.alert("Sent!", "Broadcast delivered.");
      setBroadcastModal(false);
      setBroadcastMsg("");
    } catch (e) { Alert.alert("Error", formatApiError(e)); }
    finally { setBroadcasting(false); }
  };

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.label}>KAAMNOW</Text>
          <Text style={s.title}>Admin Dashboard</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable style={s.broadcastBtn} onPress={() => setBroadcastModal(true)}>
            <Ionicons name="megaphone-outline" size={18} color="#fff" />
          </Pressable>
          <Pressable style={s.logoutBtn} onPress={() => Alert.alert("Logout?", "", [{ text: "Cancel", style: "cancel" }, { text: "Logout", onPress: logout }])}>
            <Ionicons name="log-out-outline" size={18} color={colors.textBody} />
          </Pressable>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar}>
        <View style={s.tabRow}>
          {TABS.map(t => (
            <Pressable key={t} onPress={() => setActiveTab(t)} style={[s.tab, activeTab === t && s.tabOn]}>
              <Text style={[s.tabTxt, activeTab === t && s.tabTxtOn]}>{t}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STATS ── */}
        {activeTab === "Stats" && (
          <View style={s.statsGrid}>
            {[
              { label: "Local Experts", val: stats?.workers ?? "—", icon: "construct-outline", color: "#6366f1" },
              { label: "Customers", val: stats?.customers ?? "—", icon: "people-outline", color: "#0ea5e9" },
              { label: "Open Jobs", val: stats?.open_jobs ?? "—", icon: "briefcase-outline", color: "#f59e0b" },
              { label: "Completed", val: stats?.completed_jobs ?? "—", icon: "checkmark-circle-outline", color: "#10b981" },
              { label: "Booked", val: stats?.booked_jobs ?? "—", icon: "calendar-outline", color: "#8b5cf6" },
              { label: "Restricted", val: stats?.restricted_workers ?? "—", icon: "shield-outline", color: "#ef4444" },
            ].map(c => (
              <View key={c.label} style={s.statCard}>
                <Ionicons name={c.icon} size={20} color={c.color} />
                <Text style={s.statVal}>{c.val}</Text>
                <Text style={s.statLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── LOCAL EXPERTS ── */}
        {activeTab === "Local Experts" && (
          <>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={15} color={colors.outline} />
              <TextInput
                style={s.searchInput}
                placeholder="Search Local Experts…"
                placeholderTextColor={colors.outline}
                value={workerSearch}
                onChangeText={setWorkerSearch}
                onSubmitEditing={() => fetchWorkers(0)}
                returnKeyType="search"
              />
            </View>
            <Text style={s.countTxt}>{workerTotal} workers</Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
            {workers.map(w => (
              <View key={w.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}><Text style={s.avatarTxt}>{(w.name||"?")[0].toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{w.name}</Text>
                    <Text style={s.cardSub}>{w.phone || "No phone"} · T{w.trust_tier || 1}</Text>
                    <Text style={s.cardSub}>{w.village || ""}{w.district ? `, ${w.district}` : ""}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: w.availability_status === "available" ? "#dcfce7" : "#fee2e2" }]}>
                    <Text style={[s.statusTxt, { color: w.availability_status === "available" ? "#15803d" : "#dc2626" }]}>
                      {w.availability_status || "available"}
                    </Text>
                  </View>
                </View>
                <View style={s.cardActions}>
                  {/* Trust tier badge — tap to change */}
                  <Pressable
                    onPress={() => setTrustTier(w)}
                    style={[s.tierBtn, { backgroundColor: TIER_COLORS[w.trust_tier || 1]?.bg }]}
                  >
                    <Ionicons name={TIER_COLORS[w.trust_tier || 1]?.icon} size={12} color={TIER_COLORS[w.trust_tier || 1]?.fg} />
                    <Text style={[s.tierBtnText, { color: TIER_COLORS[w.trust_tier || 1]?.fg }]}>
                      {TIER_COLORS[w.trust_tier || 1]?.label}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => suspendWorker(w.id, w.availability_status)}
                    style={[s.actionBtn, { backgroundColor: w.availability_status === "suspended" ? "#dcfce7" : "#fff7ed" }]}>
                    <Ionicons name={w.availability_status === "suspended" ? "shield-checkmark-outline" : "pause-outline"} size={14}
                      color={w.availability_status === "suspended" ? "#15803d" : "#ea580c"} />
                  </Pressable>
                  <Pressable onPress={() => deleteWorker(w.id, w.name)} style={[s.actionBtn, { backgroundColor: "#fee2e2" }]}>
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── USERS ── */}
        {activeTab === "Users" && (
          <>
            <View style={s.searchRow}>
              <Ionicons name="search-outline" size={15} color={colors.outline} />
              <TextInput
                style={s.searchInput}
                placeholder="Search users…"
                placeholderTextColor={colors.outline}
                value={userSearch}
                onChangeText={setUserSearch}
                onSubmitEditing={fetchUsers}
                returnKeyType="search"
              />
            </View>
            <Text style={s.countTxt}>{userTotal} users</Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
            {users.map(u => (
              <View key={u.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={[s.avatar, { backgroundColor: "#e0e7ff" }]}>
                    <Text style={[s.avatarTxt, { color: "#6366f1" }]}>{(u.name||"?")[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{u.name}</Text>
                    <Text style={s.cardSub}>{u.phone_primary || "No phone"}</Text>
                    <Text style={s.cardSub}>{u.village || ""}{u.has_service_profile ? " · Expert" : ""}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: u.status === "suspended" || u.is_active === false ? "#fee2e2" : "#f0fdf4" }]}>
                    <Text style={[s.statusTxt, { color: u.status === "suspended" || u.is_active === false ? "#dc2626" : "#15803d" }]}>
                      {u.status || (u.is_active ? "active" : "inactive")}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── JOBS ── */}
        {activeTab === "Jobs" && (
          <>
            <Text style={s.countTxt}>{jobTotal} jobs</Text>
            {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />}
            {jobs.map(j => (
              <View key={j.id} style={s.card}>
                <Text style={s.cardName}>{j.title}</Text>
                <Text style={s.cardSub}>₹{j.daily_rate}/day · {j.village || "—"}</Text>
                <View style={[s.statusBadge, { alignSelf: "flex-start", marginTop: 6,
                  backgroundColor: j.status === "open" ? "#f0fdf4" : j.status === "booked" ? "#eff6ff" : "#f9fafb" }]}>
                  <Text style={[s.statusTxt, { color: j.status === "open" ? "#15803d" : j.status === "booked" ? "#1d4ed8" : "#6b7280" }]}>
                    {j.status}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* Broadcast Modal */}
      <Modal visible={broadcastModal} transparent animationType="slide" onRequestClose={() => setBroadcastModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>📢 Broadcast Message</Text>
            <View style={s.audienceRow}>
              {["experts", "all"].map(a => (
                <Pressable key={a} onPress={() => setBroadcastAudience(a)}
                  style={[s.audienceBtn, broadcastAudience === a && s.audienceBtnOn]}>
                  <Text style={[s.audienceTxt, broadcastAudience === a && s.audienceTxtOn]}>{a}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={s.broadcastInput}
              placeholder="Type your message…"
              placeholderTextColor={colors.outline}
              value={broadcastMsg}
              onChangeText={setBroadcastMsg}
              multiline
              numberOfLines={4}
            />
            <View style={s.modalActions}>
              <Pressable style={s.modalCancel} onPress={() => setBroadcastModal(false)}>
                <Text style={s.modalCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={[s.modalConfirm, (!broadcastMsg.trim() || broadcasting) && { opacity: 0.5 }]}
                onPress={sendBroadcast} disabled={!broadcastMsg.trim() || broadcasting}>
                <Text style={s.modalConfirmTxt}>{broadcasting ? "Sending…" : "Send"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingVertical: 12, backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  label: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.5, color: colors.primary },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.textHeading },
  headerActions: { flexDirection: "row", gap: 8 },
  broadcastBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  tabBar: { backgroundColor: colors.surfaceCard, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle },
  tabRow: { flexDirection: "row", paddingHorizontal: spacing.lg, gap: 4, paddingVertical: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: colors.borderSubtle },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.textBody },
  tabTxtOn: { color: colors.onPrimary },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: "47%", backgroundColor: colors.surfaceCard, borderRadius: radius.xxl, padding: 16, borderWidth: 1, borderColor: colors.borderSubtle, alignItems: "center", gap: 6 },
  statVal: { fontFamily: fonts.display, fontSize: 26, color: colors.textHeading },
  statLabel: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.outline, textTransform: "uppercase", letterSpacing: 0.8 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surfaceCard, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderSubtle, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 10, fontFamily: fonts.body, fontSize: 14, color: colors.textHeading },
  countTxt: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginBottom: 10 },
  card: { backgroundColor: colors.surfaceCard, borderRadius: radius.xxl, borderWidth: 1, borderColor: colors.borderSubtle, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryFixed, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primary },
  cardName: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.outline, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusTxt: { fontFamily: fonts.bodyBold, fontSize: 11 },
  cardActions: { flexDirection: "row", gap: 6, marginTop: 10, alignItems: "center" },
  tierBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: colors.borderSubtle },
  tierBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tierTxt: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.textBody },
  tierTxtOn: { color: colors.onPrimary },
  actionBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  tierBtn: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  tierBtnText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surfaceCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.textHeading, marginBottom: 16 },
  audienceRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  audienceBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderSubtle, alignItems: "center" },
  audienceBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  audienceTxt: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textBody, textTransform: "capitalize" },
  audienceTxtOn: { color: colors.onPrimary },
  broadcastInput: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 14, color: colors.textHeading, minHeight: 100, textAlignVertical: "top", marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderSubtle, alignItems: "center" },
  modalCancelTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textBody },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center" },
  modalConfirmTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },
});
