import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, shadow, spacing } from "../theme";
import api from "../lib/api";

const FILTERS = [
  { key: "all",             label: "All" },
  { key: "action_required", label: "Needs Action" },
  { key: "active",          label: "Active" },
  { key: "done",            label: "Done" },
];

const STATUS_STYLE = {
  posted: { label: "Posted", bg: "#E8E8ED", text: "#1A1C1F", border: "#CFC4C5" },
  action_required: { label: "Action Required", bg: "#FFDAD6", text: "#93000A", border: "#FCA5A5" },
  applied: { label: "Applied", bg: "#EDEDF2", text: "#5E5E60", border: "#E2E2E7" },
  accepted: { label: "Accepted", bg: "#E8E8ED", text: "#1A1C1F", border: "#CFC4C5" },
  in_progress: { label: "In Progress", bg: "#E8E8ED", text: "#1A1C1F", border: "#CFC4C5" },
  completed: { label: "Completed", bg: "#F3F3F8", text: "#7E7576", border: "#E2E2E7" },
  cancelled: { label: "Cancelled", bg: "#F3F3F8", text: "#7E7576", border: "#E2E2E7" },
  rejected: { label: "Declined", bg: "#F3F3F8", text: "#7E7576", border: "#E2E2E7" },
};

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1d ago" : `${days}d ago`;
}

function compactDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

function moneyForJob(job) {
  if (job?.budget_min) {
    return `₹${job.budget_min}${job.budget_max ? ` - ₹${job.budget_max}` : ""}`;
  }
  if (job?.daily_rate) return `₹${job.daily_rate}`;
  return "Price not set";
}

function moneyForRequest(req) {
  if (req.proposed_price) return `₹${req.proposed_price}`;
  const summary = req.job_summary || {};
  if (summary.budget_min) return `₹${summary.budget_min}${summary.budget_max ? ` – ₹${summary.budget_max}` : ""}`;
  if (summary.budget_max) return `₹${summary.budget_max}`;
  if (summary.daily_rate) return `₹${summary.daily_rate}/day`;
  if (req.daily_rate) return `₹${req.daily_rate}/day`;
  if (req.hourly_rate) return `₹${req.hourly_rate}/hr`;
  return "Not specified";
}

function locationForJob(job) {
  const address = job?.address || {};
  return [
    job?.location_text || job?.village || address.village || address.district,
    job?.pincode || address.pincode,
  ].filter(Boolean).join(" • ") || "Location not added";
}

function locationForRequest(req) {
  const summary = req.job_summary || {};
  const addr = summary.address || req.address || {};
  return (
    summary.location_text ||
    req.location_text ||
    summary.location ||
    req.location ||
    addr.village || addr.district ||
    summary.pincode || req.pincode || addr.pincode ||
    "Location not added"
  );
}

function listFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.work_requests)) return data.work_requests;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.engagements)) return data.engagements;
  if (Array.isArray(data?.jobs)) return data.jobs;
  return [];
}

function activityTimestamp(item) {
  if (item.kind === "job") return `Posted ${timeAgo(item.createdAt)}`;
  if (item.statusKey === "action_required") return `Offer received ${timeAgo(item.createdAt)}`;
  if (item.statusKey === "applied") return `Applied ${timeAgo(item.createdAt)}`;
  if (item.statusKey === "accepted" || item.statusKey === "in_progress") return `Updated ${timeAgo(item.updatedAt || item.createdAt)}`;
  if (item.statusKey === "completed") return `Completed ${compactDate(item.updatedAt || item.createdAt)}`;
  return `Updated ${timeAgo(item.updatedAt || item.createdAt)}`;
}

function normalizeJob(job) {
  const isDone = job.status === "completed" || job.status === "cancelled";
  return {
    id: `job:${job.id}`,
    kind: "job",
    source: job,
    filterKey: isDone ? "done" : "active",
    tabKey: "posted",
    statusKey: job.status === "completed" ? "completed" : job.status === "cancelled" ? "cancelled" : "posted",
    title: job.title || "Posted Job",
    location: locationForJob(job),
    price: moneyForJob(job),
    timestamp: activityTimestamp({ kind: "job", createdAt: job.created_at }),
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    primaryLabel: job.status === "completed" ? "Leave Review" : "Manage",
    secondaryLabel: "View Details",
    route: { name: "JobDetail", params: { jobId: job.id } },
  };
}

function normalizeRequest(req) {
  const status = req.status === "pending" ? "requested" : req.status;
  const actions = Array.isArray(req.available_actions) ? req.available_actions : [];
  const isReceiver = req.is_request_receiver === true || req.direction === "received";
  const isSender = req.is_request_sender === true || req.direction === "sent";
  const isExpert =
    req.request_type === "job_application"
      ? isSender
      : req.request_type === "direct_booking" || req.request_type === "job_invitation"
        ? isReceiver
        : false;
  const isReceivedPending = status === "requested" && (req.can_act === true || (isReceiver && actions.includes("accept")) || isReceiver);
  const isSentPending = status === "requested" && isSender && !isReceivedPending;
  const myRating = req.direction === "sent" ? req.sender_rating : req.receiver_rating;
  let statusKey = status || "applied";
  let filterKey = "accepted";
  let primaryLabel = "View Status";
  let secondaryLabel = "Details";

  if (isReceivedPending) {
    statusKey = "action_required";
    filterKey = "action_required";
    primaryLabel = "Accept Offer";
    secondaryLabel = "Reject";
  } else if (isSentPending) {
    statusKey = "applied";
    filterKey = "active";
    primaryLabel = "View Status";
    secondaryLabel = "Details";
  } else if (status === "accepted") {
    statusKey = "in_progress";
    filterKey = "active";
    primaryLabel = isExpert ? "Mark Complete" : "View Status";
    secondaryLabel = "Details";
  } else if (status === "completed") {
    statusKey = "completed";
    filterKey = "done";
    primaryLabel = myRating ? "View Details" : "Leave Review";
    secondaryLabel = "Details";
  } else if (status === "rejected" || status === "cancelled") {
    statusKey = status;
    filterKey = "done";
  }

  const summary = req.job_summary || {};
  const other = req.other_user || {};
  const title = summary.title || req.job_title || req.title || req.request_type_label || "Work Request";

  const item = {
    id: `request:${req.id}`,
    kind: "request",
    source: req,
    filterKey,
    statusKey,
    tabKey: isExpert ? "work" : "posted",
    title,
    location: locationForRequest(req),
    price: moneyForRequest(req),
    createdAt: req.created_at,
    updatedAt: req.updated_at,
    otherName: (req.direction === "sent" ? req.requested_to_name : req.requested_by_name) || other.name,
    primaryLabel,
    secondaryLabel,
    route: { name: "EngagementDetail", params: { id: req.id } },
  };
  item.timestamp = activityTimestamp(item);
  return item;
}

export default function ActivityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("posted");
  const [postedFilter, setPostedFilter] = useState("all");
  const [workFilter, setWorkFilter] = useState("all");
  const [acting, setActing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const hasData = jobs.length > 0 || requests.length > 0;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [reqRes, jobsRes] = await Promise.all([
        api.get("/work-requests/mine").catch(() => ({ data: [] })),
        api.get("/jobs/mine").catch(() => ({ data: [] })),
      ]);
      setRequests(listFromResponse(reqRes.data));
      setJobs(listFromResponse(jobsRes.data));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    // First load: show spinner. Re-focus: keep showing existing data, refresh quietly.
    load(!hasData ? false : true);
  }, [load, hasData]));

  const activities = useMemo(() => {
    const merged = [
      ...jobs.map(normalizeJob),
      ...requests.map(normalizeRequest),
    ];
    return merged.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
  }, [jobs, requests]);

  const postedItems = useMemo(() => activities.filter((i) => i.tabKey === "posted"), [activities]);
  const workItems   = useMemo(() => activities.filter((i) => i.tabKey === "work"),   [activities]);
  const postedBadge = useMemo(() => postedItems.filter((i) => i.filterKey === "action_required").length, [postedItems]);
  const workBadge   = useMemo(() => workItems.filter((i) => i.filterKey === "action_required").length,   [workItems]);

  const visible = useMemo(() => {
    const tabItems = activeTab === "posted" ? postedItems : workItems;
    const filter   = activeTab === "posted" ? postedFilter : workFilter;
    const q = query.trim().toLowerCase();
    return tabItems.filter((item) => {
      const matchesFilter = filter === "all" || item.filterKey === filter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return [
        item.title,
        item.location,
        item.price,
        item.otherName,
        STATUS_STYLE[item.statusKey]?.label,
      ].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [activeTab, postedItems, workItems, postedFilter, workFilter, query]);

  const act = async (item, action) => {
    const id = item.source?.id;
    if (!id) return false;
    setActing(`${id}:${action}`);
    try {
      await api.post(`/work-requests/${id}/${action}`);
      await load();
      return true;
    } catch (err) {
      Alert.alert("Action failed", err?.response?.data?.detail || "Please try again.");
      return false;
    } finally {
      setActing(null);
    }
  };

  const cancelJob = async (item) => {
    const jobId = item.source?.id;
    if (!jobId) return false;
    return new Promise((resolve) => {
      Alert.alert(
        "Cancel this job?",
        "Pending applications will be cancelled and this job will stop appearing in Find Work.",
        [
          { text: "Keep Job", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Cancel Job",
            style: "destructive",
            onPress: async () => {
              setActing(`${jobId}:job_cancel`);
              try {
                await api.post(`/jobs/${jobId}/cancel`);
                await load();
                resolve(true);
              } catch (err) {
                Alert.alert("Could not cancel job", err?.response?.data?.detail || "Please try again.");
                resolve(false);
              } finally {
                setActing(null);
              }
            },
          },
        ],
      );
    });
  };

  const openItem = async (item) => {
    setSelected(item);
    setDetail(null);
    setDetailLoading(true);
    try {
      if (item.kind === "job") {
        const jobId = item.source?.id;
        const r = jobId ? await api.get(`/jobs/${jobId}`) : { data: item.source };
        setDetail({ kind: "job", job: r.data, request: null });
      } else {
        const requestId = item.source?.id;
        const r = requestId ? await api.get(`/work-requests/${requestId}`) : { data: item.source };
        let job = null;
        if (r.data?.job_id) {
          job = await api.get(`/jobs/${r.data.job_id}`).then((res) => res.data).catch(() => null);
        }
        setDetail({ kind: "request", request: r.data, job });
      }
    } catch (err) {
      Alert.alert("Could not load details", err?.response?.data?.detail || "Please try again.");
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setDetail(null);
  };

  const primaryPress = (item) => {
    if (item.statusKey === "action_required") return openItem(item);
    if (item.kind === "request" && item.statusKey === "completed") {
      return openItem(item);
    }
    if (item.kind === "job") return openItem(item);
    if (item.statusKey === "in_progress") return openItem(item);
    return openItem(item);
  };

  const secondaryPress = (item) => {
    if (item.statusKey === "action_required") return openItem(item);
    return openItem(item);
  };

  const renderItem = ({ item }) => (
    <ActivityCard item={item} onOpen={() => openItem(item)} />
  );

  return (
    <View style={[S.safe, { paddingTop: insets.top }]}>
      <View style={S.header}>
        <Text style={S.title}>My Activity</Text>
      </View>

      {/* Two-tab bar */}
      <View style={S.tabBar}>
        {[
          { key: "posted", label: "Jobs I Posted", badge: postedBadge },
          { key: "work",   label: "Work I Do",     badge: workBadge   },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[S.tabItem, isActive && S.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <View style={S.tabLabelRow}>
                <Text style={[S.tabLabel, isActive && S.tabLabelActive]}>{tab.label}</Text>
                {tab.badge > 0 && (
                  <View style={S.tabBadge}>
                    <Text style={S.tabBadgeText}>{tab.badge > 9 ? "9+" : tab.badge}</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={S.controls}>
        <View style={S.searchBox}>
          <Ionicons name="search-outline" size={18} color="#5E5E60" />
          <TextInput
            style={S.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by job title or location..."
            placeholderTextColor="#5E5E60"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable style={S.clearBtn} onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#7E7576" />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
          {FILTERS.map((f) => {
            const currentFilter = activeTab === "posted" ? postedFilter : workFilter;
            const active = currentFilter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[S.filterChip, active && S.filterChipActive]}
                onPress={() => activeTab === "posted" ? setPostedFilter(f.key) : setWorkFilter(f.key)}
              >
                <Text style={[S.filterText, active && S.filterTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={S.center}>
          <ActivityIndicator color="#000" />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            S.list,
            visible.length === 0 && S.emptyList,
            { paddingBottom: insets.bottom + 116 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#000"
            />
          }
          ListEmptyComponent={
            <View style={S.empty}>
              <View style={S.emptyIcon}>
                <Ionicons name="file-tray-outline" size={34} color="#7E7576" />
              </View>
              <Text style={S.emptyTitle}>
                {query
                  ? "No results found"
                  : activeTab === "posted" ? "No jobs posted yet" : "No work activity yet"}
              </Text>
              <Text style={S.emptySub}>
                {query
                  ? "Try a different search or filter."
                  : activeTab === "posted"
                    ? "Post a job to start finding workers."
                    : "Apply for jobs or accept direct bookings."}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <ActivityDetailSheet
        visible={!!selected}
        item={selected}
        detail={detail}
        loading={detailLoading}
        acting={acting}
        requestCountForJob={(jobId) => requests.filter((r) => r.job_id === jobId).length}
        onClose={closeDetail}
        onNavigate={navigation.navigate}
        onAccept={(item) => act(item, "accept")}
        onReject={(item) => act(item, "reject")}
        onCancel={(item) => act(item, "cancel")}
        onCancelJob={cancelJob}
        onChanged={load}
      />
    </View>
  );
}

function ActivityCard({ item, onOpen }) {
  const style = STATUS_STYLE[item.statusKey] || STATUS_STYLE.applied;
  const isUrgent = item.statusKey === "action_required";

  return (
    <Pressable style={[S.card, isUrgent && S.cardUrgent]} onPress={onOpen}>
      <View style={S.cardTop}>
        <Text style={S.cardTitle} numberOfLines={2}>{item.title}</Text>
        <View style={[S.statusPill, { backgroundColor: style.bg, borderColor: style.border }]}>
          <Text style={[S.statusText, { color: style.text }]} numberOfLines={1}>{style.label}</Text>
        </View>
      </View>

      <View style={S.metaStack}>
        <InfoRow icon="location-outline" text={item.location} />
        <InfoRow icon="cash-outline" text={item.price} strong />
        {item.otherName ? <InfoRow icon="person-outline" text={item.otherName} /> : null}
        <InfoRow icon="time-outline" text={item.timestamp} small />
      </View>

      <View style={S.cardFooter}>
        {isUrgent ? (
          <>
            <Ionicons name="alert-circle" size={14} color="#93000A" />
            <Text style={S.cardFooterUrgent}>Tap to respond</Text>
          </>
        ) : (
          <Text style={S.cardFooterText}>{item.primaryLabel}</Text>
        )}
        <Ionicons name="chevron-forward-outline" size={14} color={isUrgent ? "#93000A" : "#9CA3AF"} />
      </View>
    </Pressable>
  );
}

function InfoRow({ icon, text, strong, small }) {
  return (
    <View style={S.infoRow}>
      <Ionicons name={icon} size={small ? 14 : 16} color="#5E5E60" />
      <Text style={[S.infoText, strong && S.infoStrong, small && S.infoSmall]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function ActivityDetailSheet({ visible, item, detail, loading, acting, requestCountForJob, onClose, onNavigate, onAccept, onReject, onCancel, onCancelJob, onChanged }) {
  const insets = useSafeAreaInsets();
  const [proofPhoto, setProofPhoto] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [localRated, setLocalRated] = useState(false);

  useEffect(() => {
    setProofPhoto(null);
    setCompleting(false);
    setLocalStatus(null);
    setRatingStars(0);
    setRatingComment("");
    setSubmittingRating(false);
    setLocalRated(false);
  }, [item?.id]);

  if (!item) return null;

  const request = detail?.request || (item.kind === "request" ? item.source : null);
  const job = detail?.job || (item.kind === "job" ? detail?.job || item.source : null);
  const title = job?.title || request?.job_summary?.title || item.title || "Job Details";
  const description = job?.description || request?.message || "No description added yet.";
  const location = job ? locationForJob(job) : locationForRequest(request || item.source);
  const price = job ? moneyForJob(job) : moneyForRequest(request || item.source);
  const statusKey = item.statusKey;
  const isPostedJob = item.kind === "job";
  const canManagePostedJob = isPostedJob && (job?.status || item.source?.status || "open") === "open";
  const isNewRequest = item.statusKey === "action_required";
  const effectiveStatus = localStatus || request?.status;
  const isInProgress = item.kind === "request" && effectiveStatus === "accepted";
  const isCompletedRequest = item.kind === "request" && effectiveStatus === "completed";
  const isWorkFlow = isInProgress || isCompletedRequest;
  const isExpertOnRequest =
    request?.request_type === "job_application"
      ? request?.direction === "sent"
      : request?.request_type === "direct_booking" || request?.request_type === "job_invitation"
        ? request?.direction === "received"
        : false;
  const canMarkComplete = isInProgress && isExpertOnRequest;
  const requesterName =
    request?.other_user?.name ||
    (request?.direction === "received" ? request?.requested_by_name : request?.requested_to_name) ||
    item.otherName ||
    "KaamNow User";
  const otherRatingAvg = request?.other_user?.rating_avg
    ? Number(request.other_user.rating_avg).toFixed(1)
    : null;
  const otherJobsDone = request?.other_user?.completed_jobs ?? null;
  const posterName = job?.posted_by_name || requesterName;
  const expertName =
    request?.request_type === "job_application"
      ? request?.requested_by_name
      : request?.requested_to_name;
  // When current user IS the expert, show the customer's name; when customer, show expert's name
  const displayPersonName = isNewRequest
    ? requesterName
    : isWorkFlow
      ? (isExpertOnRequest ? requesterName : (expertName || requesterName))
      : posterName;
  const avatarLetter = (displayPersonName || "K")[0].toUpperCase();
  const applicants = isPostedJob ? requestCountForJob(job?.id || item.source?.id) : 0;
  const progress = isPostedJob
    ? (applicants > 0 ? 1 : 0)
    : (["accepted", "in_progress", "completed"].includes(statusKey) ? 2 : 1);
  const canOpenChat = request?.id && ["accepted", "completed"].includes(effectiveStatus);
  const dateLine = job?.date_required || job?.job_date || request?.proposed_date || "Flexible Duration";
  const isAppliedPending =
    item.statusKey === "applied" &&
    request?.status === "requested" &&
    request?.direction === "sent" &&
    request?.request_type === "job_application";
  const primaryLoading = acting === `${request?.id}:accept`;
  const secondaryLoading = acting === `${request?.id}:reject`;
  const cancelLoading = acting === `${request?.id}:cancel`;
  const myRating = request?.direction === "sent" ? request?.sender_rating : request?.receiver_rating;
  const canRate = isCompletedRequest && !myRating && !localRated;

  const acceptRequest = async () => {
    const ok = await onAccept(item);
    if (ok) onClose();
  };

  const rejectRequest = async () => {
    const ok = await onReject(item);
    if (ok) onClose();
  };

  const cancelRequest = async () => {
    const ok = await onCancel(item);
    if (ok) onClose();
  };

  const openChat = () => {
    if (!request?.id) return;
    onClose();
    onNavigate("Chat", { engagementId: request.id });
  };

  const openFull = () => {
    onClose();
    if (isPostedJob && (job?.id || item.source?.id)) {
      onNavigate("JobDetail", { jobId: job?.id || item.source.id });
    } else if (request?.id) {
      onNavigate("EngagementDetail", { id: request.id });
    }
  };

  const openJobEditor = () => {
    onClose();
    if (isPostedJob && (job?.id || item.source?.id)) {
      onNavigate("JobDetail", { jobId: job?.id || item.source.id, openEdit: true });
    }
  };

  const cancelPostedJob = async () => {
    const ok = await onCancelJob?.(item);
    if (ok) onClose();
  };

  const takeProofPhoto = async () => {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    if (result.status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to upload proof.");
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!picked.canceled) {
      setProofPhoto({ uri: picked.assets[0].uri, type: "image/jpeg", name: "proof.jpg" });
    }
  };

  const pickProofPhoto = async () => {
    const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (result.status !== "granted") {
      Alert.alert("Permission needed", "Allow photo access to upload proof.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!picked.canceled) {
      setProofPhoto({ uri: picked.assets[0].uri, type: "image/jpeg", name: "proof.jpg" });
    }
  };

  const completeHere = async () => {
    if (!request?.id || completing) return;
    if (!proofPhoto) {
      Alert.alert("Proof required", "Please upload or take a proof photo before marking complete.");
      return;
    }
    setCompleting(true);
    try {
      await api.post(`/work-requests/${request.id}/complete`);
      const form = new FormData();
      form.append("file", { uri: proofPhoto.uri, name: proofPhoto.name, type: proofPhoto.type });
      await api.post(`/work-requests/${request.id}/rating-photo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLocalStatus("completed");
      await onChanged?.();
    } catch (err) {
      Alert.alert("Could not complete", err?.response?.data?.detail || "Please try again.");
    } finally {
      setCompleting(false);
    }
  };

  const submitRatingHere = async () => {
    if (!request?.id || submittingRating) return;
    if (!ratingStars) {
      Alert.alert("Select stars", "Please choose a star rating before submitting.");
      return;
    }
    setSubmittingRating(true);
    try {
      await api.post(`/work-requests/${request.id}/rate`, {
        rating: ratingStars,
        comment: ratingComment.trim(),
      });
      setLocalRated(true);
      setRatingStars(0);
      setRatingComment("");
      await onChanged?.();
      Alert.alert("Review submitted", "Thanks for sharing your experience.");
    } catch (err) {
      Alert.alert("Could not submit review", err?.response?.data?.detail || "Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.sheetRoot}>
        <Pressable style={S.sheetScrim} onPress={onClose} />
        <View style={[S.sheet, (isNewRequest || isAppliedPending || isWorkFlow) && S.requestSheet, { paddingBottom: insets.bottom + 22 }]}>
          <View style={S.sheetHandle} />
          {loading ? (
            <View style={S.sheetLoading}>
              <ActivityIndicator color="#000" />
            </View>
          ) : (
            <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[S.sheetScroll, (isNewRequest || isAppliedPending || isWorkFlow) && S.requestSheetScroll]}>
              <View style={[S.sheetHeader, (isNewRequest || isAppliedPending || isWorkFlow) && S.requestSheetHeader]}>
                {(isNewRequest || isAppliedPending) ? <View style={S.sheetIconSpacer} /> : null}
                <Text style={[S.sheetTitle, (isNewRequest || isAppliedPending) && S.requestSheetTitle, isWorkFlow && S.progressSheetTitle]}>
                  {isNewRequest ? "New Request" : isAppliedPending ? "Applied Details" : isWorkFlow ? "Engagement Details" : "Job Details"}
                </Text>
                <Pressable style={[S.sheetIconBtn, (isNewRequest || isAppliedPending || isWorkFlow) && S.requestCloseBtn, isWorkFlow && S.progressCloseBtn]} onPress={onClose}>
                  <Ionicons name="close" size={(isNewRequest || isAppliedPending || isWorkFlow) ? 28 : 22} color="#1A1C1F" />
                </Pressable>
              </View>

              <View style={[S.posterCard, isNewRequest && S.requesterCard, isAppliedPending && S.appliedPosterCard, isWorkFlow && S.progressExpertCard]}>
                <View style={[S.posterAvatar, isNewRequest && S.requesterAvatar, isWorkFlow && S.progressAvatar]}>
                  <Text style={S.posterAvatarText}>{avatarLetter}</Text>
                </View>
                <View style={S.posterInfo}>
                  <View style={S.requesterNameRow}>
                    <Text style={[S.posterName, isNewRequest && S.requesterName, isAppliedPending && S.appliedPosterName, isWorkFlow && S.progressExpertName]} numberOfLines={1}>{displayPersonName}</Text>
                    {(isNewRequest || isAppliedPending) ? <Ionicons name="shield-checkmark-outline" size={20} color="#1A1C1F" /> : null}
                  </View>
                  <View style={[S.posterMeta, isNewRequest && S.requesterMeta, isAppliedPending && S.appliedPosterMeta, isWorkFlow && S.progressExpertMeta]}>
                    {isWorkFlow ? (
                      <>
                        <Ionicons name="star" size={15} color="#F59E0B" />
                        <Text style={S.progressMetaText}>
                          {otherRatingAvg
                            ? `${otherRatingAvg}${otherJobsDone != null ? ` · ${otherJobsDone} jobs` : ""}`
                            : "New User"}
                        </Text>
                      </>
                    ) : (isNewRequest || isAppliedPending) ? (
                      <>
                        {otherRatingAvg ? (
                          <>
                            <Ionicons name="star" size={16} color="#F59E0B" />
                            <Text style={S.posterMetaText}>{otherRatingAvg}</Text>
                            {otherJobsDone != null ? <Text style={S.posterMetaText}>({otherJobsDone} jobs)</Text> : null}
                          </>
                        ) : (
                          <Text style={S.posterMetaText}>New User</Text>
                        )}
                        {isNewRequest ? (
                          <>
                            <Text style={S.posterDot}>•</Text>
                            <Text style={S.posterMetaText}>
                              {request?.request_type === "job_application" ? "Sent interest" : "Verified User"}
                            </Text>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <Text style={S.posterMetaText}>{isPostedJob ? "Poster" : request?.request_type_label || "Work Request"}</Text>
                        {otherRatingAvg ? (
                          <>
                            <Text style={S.posterDot}>•</Text>
                            <Text style={S.posterMetaText}>{otherRatingAvg}</Text>
                            <Ionicons name="star" size={12} color="#F59E0B" />
                          </>
                        ) : null}
                      </>
                    )}
                  </View>
                  {isWorkFlow ? (
                    <View style={S.progressVerifiedPill}>
                      <Ionicons name="shield-checkmark-outline" size={14} color="#1A1C1F" />
                      <Text style={S.progressVerifiedText}>Verified Expert</Text>
                    </View>
                  ) : null}
                </View>
                {isWorkFlow ? <View style={S.onlineDot} /> : null}
                {!isNewRequest && !isAppliedPending && !isWorkFlow ? <View style={S.verifiedBadge}>
                  <Text style={S.verifiedBadgeText}>Verified</Text>
                </View> : null}
              </View>

              {isNewRequest ? (
                <View style={S.requestTitleRow}>
                  <View style={S.requestTitleCopy}>
                    <Text style={S.requestTitle}>{title}</Text>
                    <Text style={S.requestDesc}>{description}</Text>
                  </View>
                  <View style={S.requestPriceBlock}>
                    <Text style={S.requestPrice}>{price}</Text>
                    <Text style={S.requestPriceSub}>offer</Text>
                  </View>
                </View>
              ) : isAppliedPending ? (
                <View style={S.appliedJobBlock}>
                  <Text style={S.appliedTitle}>{title}</Text>
                  <View style={S.appliedLocationRow}>
                    <Ionicons name="location-outline" size={20} color="#4C4546" />
                    <Text style={S.appliedLocationText}>{location}</Text>
                  </View>
                  <View style={S.appliedPricePill}>
                    <Text style={S.appliedPriceText}>{price}</Text>
                  </View>
                  <Text style={S.appliedDesc}>{description}</Text>
                </View>
              ) : isWorkFlow ? (
                <View style={S.progressSection}>
                  <Text style={S.progressSectionTitle}>Job Details</Text>
                  <View style={S.progressJobCard}>
                    <View style={S.progressJobTop}>
                      <View style={S.progressJobCopy}>
                        <Text style={S.progressJobTitle}>{title}</Text>
                        <View style={S.progressFactRow}>
                          <Ionicons name="location-outline" size={18} color="#4C4546" />
                          <Text style={S.progressLocationText}>{location}</Text>
                        </View>
                      </View>
                      <View style={S.progressPriceBlock}>
                        <Text style={S.progressPrice}>{price}</Text>
                        <Text style={S.progressPriceUnit}>/ HR</Text>
                      </View>
                    </View>
                    <View style={S.progressDivider} />
                    <View style={S.progressFactRow}>
                      <Ionicons name="calendar-outline" size={25} color="#5E5E60" />
                      <Text style={S.progressDateText}>{dateLine}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={S.detailTitle}>{title}</Text>
                  <Text style={S.detailDesc}>{description}</Text>
                </>
              )}

              {isNewRequest ? (
                <View style={S.requestLocationPill}>
                  <Ionicons name="location-outline" size={20} color="#5E5E60" />
                  <Text style={S.requestLocationText}>{location}</Text>
                </View>
              ) : isAppliedPending || isWorkFlow ? null : (
                <View style={S.detailFacts}>
                  <DetailFact icon="location-outline" text={location} />
                  <DetailFact icon="cash-outline" text={price} />
                </View>
              )}

              <View style={[S.statusBlock, isWorkFlow && S.progressSection]}>
                <Text style={[S.statusBlockTitle, isNewRequest && S.requestStatusTitle]}>
                  {isNewRequest ? "Engagement Status" : isAppliedPending ? "" : isWorkFlow ? "Engagement Status" : "Current Status"}
                </Text>
                {isNewRequest ? <RequestStatusSteps /> : isAppliedPending ? <AppliedStatusSteps /> : isWorkFlow ? <InProgressStatusSteps completed={isCompletedRequest} /> : <StatusSteps progress={progress} />}
              </View>

              {isNewRequest ? (
                <View style={S.infoNote}>
                  <Ionicons name="information-circle-outline" size={22} color="#5E5E60" />
                  <Text style={S.infoNoteText}>
                    By accepting this offer, you agree to complete the service at the designated location and time. Cancellation policies apply.
                  </Text>
                </View>
              ) : isAppliedPending ? (
                <View style={S.infoNote}>
                  <Ionicons name="information-circle-outline" size={24} color="#1A1C1F" />
                  <View style={{ flex: 1 }}>
                    <Text style={S.appliedInfoTitle}>Application Sent</Text>
                    <Text style={S.infoNoteText}>
                      The poster is currently reviewing your profile. You will be notified once a decision is made.
                    </Text>
                  </View>
                </View>
              ) : isWorkFlow ? (
                <>
                  {isInProgress ? (
                    <View style={S.progressSection}>
                      <Pressable
                        style={[S.repostBtn, !canOpenChat && { opacity: 0.4 }]}
                        onPress={canOpenChat ? openChat : undefined}
                        disabled={!canOpenChat}
                      >
                        <Ionicons name="chatbubble-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={S.repostText}>Chat with {displayPersonName}</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {isInProgress && canMarkComplete ? <View style={S.progressSection}>
                    <Text style={S.progressSectionTitle}>Proof of Work</Text>
                    <View style={S.proofCard}>
                      {proofPhoto ? (
                        <View style={S.proofPreviewWrap}>
                          <Image source={{ uri: proofPhoto.uri }} style={S.proofPreview} />
                          <Pressable style={S.proofRemoveBtn} onPress={() => setProofPhoto(null)}>
                            <Ionicons name="close" size={18} color="#fff" />
                          </Pressable>
                        </View>
                      ) : (
                        <View style={S.proofActionRow}>
                          <Pressable style={S.proofUpload} onPress={canMarkComplete ? takeProofPhoto : undefined}>
                            <Ionicons name="camera-outline" size={32} color="#1A1C1F" />
                            <Text style={S.proofUploadText}>
                              {canMarkComplete ? "Take Photo" : "Waiting for proof photo"}
                            </Text>
                          </Pressable>
                          {canMarkComplete ? (
                            <Pressable style={S.proofUpload} onPress={pickProofPhoto}>
                              <Ionicons name="image-outline" size={32} color="#1A1C1F" />
                              <Text style={S.proofUploadText}>Upload Photo</Text>
                            </Pressable>
                          ) : null}
                        </View>
                      )}
                      <Text style={S.proofHint}>
                        {canMarkComplete
                          ? "Please upload a photo of the completed work to proceed."
                          : "The expert must upload proof before marking the work completed."}
                      </Text>
                    </View>
                  </View> : null}
                  {isCompletedRequest ? (
                    <View style={S.progressSection}>
                      <Text style={S.progressSectionTitle}>Review</Text>
                      <View style={S.reviewCard}>
                        {canRate ? (
                          <>
                            <Text style={S.reviewTitle}>Rate your experience</Text>
                            <SheetStarPicker value={ratingStars} onChange={setRatingStars} />
                            <TextInput
                              style={S.reviewInput}
                              value={ratingComment}
                              onChangeText={setRatingComment}
                              placeholder="Write a review"
                              placeholderTextColor="#7E7576"
                              multiline
                            />
                            <Pressable style={S.reviewSubmitBtn} onPress={submitRatingHere} disabled={submittingRating}>
                              {submittingRating ? <ActivityIndicator color="#fff" /> : <Text style={S.reviewSubmitText}>Submit Review</Text>}
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Text style={S.reviewTitle}>Your review is submitted</Text>
                            <Text style={S.proofHint}>Both users can rate each other after the work is completed.</Text>
                          </>
                        )}
                      </View>
                    </View>
                  ) : null}
                  {/* TODO: Activity Timeline — will expand when OTP feature is added */}
                  <View style={S.progressSection}>
                    <Text style={S.progressSectionTitle}>Activity Timeline</Text>
                    <View style={S.timelineCard}>
                      <TimelineItem active title="Work Accepted" subtitle={request?.accepted_at ? compactDate(request.accepted_at) : "Recently"} />
                      <TimelineItem title={isCompletedRequest ? "Work Completed" : "Work In Progress"} subtitle={isCompletedRequest ? "Completed successfully" : "Awaiting completion"} last />
                    </View>
                  </View>
                </>
              ) : isPostedJob ? (
                <View style={S.applicantCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={S.applicantTitle}>
                      {applicants || 0} Applicant{applicants === 1 ? "" : "s"} Interested
                    </Text>
                    <Text style={S.applicantSub}>
                      {applicants > 0 ? "Reviewing profiles now..." : "Waiting for applications..."}
                    </Text>
                  </View>
                  <View style={S.avatarStack}>
                    {[0, 1, 2].map((n) => (
                      <View key={n} style={[S.miniAvatar, { marginLeft: n === 0 ? 0 : -10 }]}>
                        <Text style={S.miniAvatarText}>{String.fromCharCode(65 + n)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {!isNewRequest && !isAppliedPending && !isWorkFlow ? <View style={S.detailActions}>
                {isPostedJob ? (
                  <>
                    <Pressable style={S.repostBtn} onPress={openFull}>
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={S.repostText}>Open Full Details</Text>
                    </Pressable>
                    {canManagePostedJob ? (
                      <View style={S.dualActions}>
                        <Pressable style={S.outlineAction} onPress={openJobEditor}>
                          <Ionicons name="create-outline" size={17} color="#1A1C1F" />
                          <Text style={S.outlineActionText}>Edit Job</Text>
                        </Pressable>
                        <Pressable style={[S.outlineAction, S.dangerOutlineAction]} onPress={cancelPostedJob} disabled={acting === `${job?.id || item.source?.id}:job_cancel`}>
                          {acting === `${job?.id || item.source?.id}:job_cancel` ? (
                            <ActivityIndicator size="small" color="#BA1A1A" />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={17} color="#BA1A1A" />
                              <Text style={S.dangerOutlineText}>Cancel Job</Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Pressable style={S.repostBtn} onPress={openFull}>
                      <Ionicons name="open-outline" size={18} color="#fff" />
                      <Text style={S.repostText}>{statusKey === "completed" ? "Leave Review" : "Open Request"}</Text>
                    </Pressable>
                    {canOpenChat ? (
                      <View style={S.dualActions}>
                        <Pressable style={[S.outlineAction, { flex: 1 }]} onPress={openChat}>
                          <Ionicons name="chatbubble-outline" size={17} color="#1A1C1F" />
                          <Text style={S.outlineActionText}>Message</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                )}
              </View> : null}
            </ScrollView>
            {isNewRequest ? (
              <View style={[S.fixedRequestActions, { paddingBottom: insets.bottom + 12 }]}>
                <Pressable style={S.requestRejectBtn} onPress={rejectRequest} disabled={secondaryLoading}>
                  {secondaryLoading ? <ActivityIndicator size="small" color="#1A1C1F" /> : <Text style={S.requestRejectText}>Reject</Text>}
                </Pressable>
                <Pressable style={S.requestAcceptBtn} onPress={acceptRequest} disabled={primaryLoading}>
                  {primaryLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.requestAcceptText}>Accept Offer</Text>}
                </Pressable>
              </View>
            ) : isAppliedPending ? (
              <View style={[S.fixedRequestActions, { paddingBottom: insets.bottom + 12 }]}>
                <Pressable style={S.appliedWithdrawBtn} onPress={cancelRequest} disabled={cancelLoading}>
                  {cancelLoading ? <ActivityIndicator size="small" color="#1A1C1F" /> : <Text style={S.appliedWithdrawText}>Withdraw</Text>}
                </Pressable>
              </View>
            ) : isInProgress && canMarkComplete ? (
              <View style={[S.fixedRequestActions, { paddingBottom: insets.bottom + 12 }]}>
                <Pressable style={S.progressCompleteBtn} onPress={completeHere} disabled={completing}>
                  {completing ? <ActivityIndicator color="#fff" /> : <Text style={S.progressCompleteText}>Mark as Completed</Text>}
                </Pressable>
              </View>
            ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailFact({ icon, text }) {
  return (
    <View style={S.detailFact}>
      <Ionicons name={icon} size={18} color="#4C4546" />
      <Text style={S.detailFactText}>{text}</Text>
    </View>
  );
}

function StatusSteps({ progress }) {
  const steps = [
    { label: "Posted", icon: "checkmark-circle" },
    { label: "Received", icon: "time-outline" },
    { label: "Accepted", icon: "ellipse-outline" },
  ];
  return (
    <View style={S.stepsWrap}>
      <View style={S.stepsLine}>
        <View style={[S.stepsLineActive, { width: progress <= 0 ? "0%" : progress === 1 ? "50%" : "100%" }]} />
      </View>
      {steps.map((step, index) => {
        const active = index <= progress;
        return (
          <View key={step.label} style={S.stepItem}>
            <View style={[S.stepCircle, active && S.stepCircleActive]}>
              <Ionicons name={step.icon} size={18} color={active ? "#fff" : "#7E7576"} />
            </View>
            <Text style={[S.stepLabel, active && S.stepLabelActive]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RequestStatusSteps() {
  const steps = [
    { label: "Request Sent", kind: "done" },
    { label: "Your Action", kind: "active" },
    { label: "Engagement", kind: "pending" },
  ];
  return (
    <View style={S.requestStepsWrap}>
      <View style={S.requestLine}>
        <View style={S.requestLineActive} />
      </View>
      {steps.map((step) => (
        <View key={step.label} style={S.requestStep}>
          <View
            style={[
              S.requestStepCircle,
              step.kind === "done" && S.requestStepDone,
              step.kind === "active" && S.requestStepActive,
              step.kind === "pending" && S.requestStepPending,
            ]}
          >
            {step.kind === "done" ? (
              <Ionicons name="checkmark" size={18} color="#fff" />
            ) : step.kind === "active" ? (
              <View style={S.requestStepDot} />
            ) : (
              <Ionicons name="ellipsis-horizontal" size={18} color="#5E5E60" />
            )}
          </View>
          <Text style={[S.requestStepLabel, step.kind === "active" && S.requestStepLabelActive]}>
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function AppliedStatusSteps() {
  const steps = [
    { label: "Applied", kind: "done" },
    { label: "Reviewing", kind: "active" },
    { label: "Hired", kind: "pending" },
  ];
  return (
    <View style={S.appliedStepsWrap}>
      <View style={S.appliedLine}>
        <View style={S.appliedLineActive} />
      </View>
      {steps.map((step) => (
        <View key={step.label} style={S.appliedStep}>
          <View
            style={[
              S.appliedStepCircle,
              step.kind === "done" && S.appliedStepDone,
              step.kind === "active" && S.appliedStepActive,
              step.kind === "pending" && S.appliedStepPending,
            ]}
          >
            {step.kind === "done" ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <View style={[S.appliedStepDot, step.kind === "pending" && S.appliedStepDotMuted]} />
            )}
          </View>
          <Text style={[S.appliedStepLabel, step.kind === "active" && S.appliedStepLabelActive, step.kind === "pending" && S.appliedStepLabelMuted]}>
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function InProgressStatusSteps({ completed }) {
  // TODO: Step 2 "Work Started" will be OTP-triggered when that feature is built.
  // Flow: Accepted → Poster gives OTP → Work Started → Completed
  const steps = [
    { label: "Accepted", kind: "done" },
    { label: "In Progress", kind: completed ? "done" : "active" },
    { label: "Completed",  kind: completed ? "done" : "pending" },
  ];
  return (
    <View style={S.progressStepsCard}>
      <View style={S.progressStepsWrap}>
        <View style={S.progressStepsLine}>
          <View style={S.progressStepsLineActive} />
        </View>
        {steps.map((step) => (
          <View key={step.label} style={S.progressStep}>
            <View style={[
              S.progressStepCircle,
              step.kind === "done" && S.progressStepDone,
              step.kind === "active" && S.progressStepActive,
            ]}>
              {step.kind === "done" ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <View style={S.progressStepDot} />
              )}
            </View>
            <Text style={[S.progressStepLabel, step.kind === "active" && S.progressStepLabelActive]}>
              {step.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function TimelineItem({ title, subtitle, active, last }) {
  return (
    <View style={[S.timelineItem, !last && S.timelineItemLine]}>
      <View style={[S.timelineDot, active && S.timelineDotActive]} />
      <View style={S.timelineCopy}>
        <Text style={[S.timelineTitle, active && S.timelineTitleActive]}>{title}</Text>
        <Text style={S.timelineSub}>{subtitle}</Text>
      </View>
    </View>
  );
}

function SheetStarPicker({ value, onChange }) {
  return (
    <View style={S.reviewStars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Ionicons name={n <= value ? "star" : "star-outline"} size={34} color={n <= value ? "#F59E0B" : "#CFC4C5"} />
        </Pressable>
      ))}
    </View>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F9F9FE" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    backgroundColor: "#fff",
    paddingHorizontal: spacing.md,
    paddingTop: 38,
    paddingBottom: 28,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 38,
    color: "#000",
    includeFontPadding: false,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#EDEDF2",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabItemActive: { borderBottomColor: "#000" },
  tabLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: "#9CA3AF",
    includeFontPadding: false,
  },
  tabLabelActive: { color: "#000" },
  tabBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#BA1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: "#fff",
    includeFontPadding: false,
  },

  controls: { paddingHorizontal: spacing.md, marginTop: 4, marginBottom: 12 },
  searchBox: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#F3F3F8",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingVertical: 0,
    fontFamily: fonts.body,
    fontSize: 14,
    color: "#000",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  clearBtn: { width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  filterRow: { gap: 8, paddingTop: 12, paddingBottom: 4 },
  filterChip: {
    height: 32,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: "#F3F3F8",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: "#000" },
  filterText: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#000", includeFontPadding: false },
  filterTextActive: { color: "#fff" },

  list: { paddingHorizontal: spacing.md, paddingTop: 18 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 22,
    ...shadow.sm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 19,
    lineHeight: 25,
    color: "#1A1C1F",
    includeFontPadding: false,
  },
  statusPill: {
    maxWidth: 132,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    textTransform: "none",
    includeFontPadding: false,
  },
  metaStack: { gap: 8, marginBottom: 14 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: "#5E5E60",
    includeFontPadding: false,
  },
  infoStrong: {
    fontFamily: fonts.bodyBold,
    color: "#1A1C1F",
  },
  infoSmall: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: "#5E5E60",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  cardUrgent: { borderLeftWidth: 3, borderLeftColor: "#BA1A1A" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F3F8",
  },
  cardFooterText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#5E5E60",
    includeFontPadding: false,
  },
  cardFooterUrgent: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: "#93000A",
    includeFontPadding: false,
  },

  empty: { alignItems: "center", paddingHorizontal: 24 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#EDEDF2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#1A1C1F" },
  emptySub: { marginTop: 6, fontFamily: fonts.body, fontSize: 14, color: "#5E5E60", textAlign: "center" },

  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(26,28,31,0.4)",
  },
  sheet: {
    height: "85%",
    backgroundColor: "#F9F9FE",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
  },
  requestSheet: {
    height: "90%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: "#fff",
    paddingHorizontal: 0,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D9DADE",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  sheetLoading: { flex: 1, alignItems: "center", justifyContent: "center" },
  sheetScroll: { paddingBottom: 28 },
  requestSheetScroll: { paddingHorizontal: spacing.md, paddingBottom: 132 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  requestSheetHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: 20,
    marginBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E2E7",
  },
  sheetTitle: { fontFamily: fonts.bodyBold, fontSize: 22, color: "#1A1C1F", includeFontPadding: false },
  requestSheetTitle: { flex: 1, textAlign: "center", fontSize: 27, lineHeight: 34 },
  progressSheetTitle: { flex: 1, fontSize: 28, lineHeight: 34 },
  sheetIconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  sheetIconSpacer: { width: 56 },
  requestCloseBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#F3F3F8" },
  progressCloseBtn: { width: 44, height: 44 },
  posterCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E2E7",
    ...shadow.sm,
    marginBottom: 30,
  },
  requesterCard: {
    minHeight: 118,
    padding: 24,
    borderRadius: 14,
    marginBottom: 38,
    borderWidth: 0,
  },
  progressExpertCard: {
    minHeight: 190,
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 34,
    paddingVertical: 42,
    marginBottom: 62,
  },
  appliedPosterCard: {
    minHeight: 72,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
    marginBottom: 58,
  },
  posterAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8E8ED",
    alignItems: "center",
    justifyContent: "center",
  },
  requesterAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  progressAvatar: { width: 64, height: 64, borderRadius: 32 },
  onlineDot: {
    position: "absolute",
    left: 76,
    top: 92,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#34C759",
    borderWidth: 3,
    borderColor: "#fff",
  },
  posterAvatarText: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#1A1C1F" },
  posterInfo: { flex: 1, minWidth: 0 },
  requesterNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  posterName: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1A1C1F", includeFontPadding: false },
  requesterName: { fontSize: 26, lineHeight: 32 },
  appliedPosterName: { fontSize: 17, lineHeight: 22 },
  progressExpertName: { fontSize: 28, lineHeight: 34 },
  posterMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  requesterMeta: { gap: 8, marginTop: 6 },
  appliedPosterMeta: { gap: 6, marginTop: 4 },
  progressExpertMeta: { marginTop: 6, gap: 5 },
  progressMetaText: { fontFamily: fonts.body, fontSize: 17, color: "#4C4546", includeFontPadding: false },
  progressVerifiedPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: "#EDEDF2",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
  },
  progressVerifiedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.8,
    color: "#1A1C1F",
  },
  posterMetaText: { fontFamily: fonts.body, fontSize: 12, color: "#4C4546", includeFontPadding: false },
  posterDot: { fontFamily: fonts.body, fontSize: 12, color: "#4C4546" },
  verifiedBadge: {
    flexShrink: 0,
    borderRadius: 999,
    backgroundColor: "#EDEDF2",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  verifiedBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#1A1C1F", textTransform: "uppercase" },
  detailTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 28,
    lineHeight: 36,
    color: "#1A1C1F",
    includeFontPadding: false,
    marginBottom: 8,
  },
  detailDesc: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: "#4C4546", marginBottom: 20 },
  requestTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 28,
  },
  appliedJobBlock: { marginBottom: 58 },
  appliedTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    lineHeight: 40,
    color: "#1A1C1F",
    includeFontPadding: false,
    marginBottom: 12,
  },
  appliedLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 36,
  },
  appliedLocationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 19,
    lineHeight: 26,
    color: "#4C4546",
  },
  appliedPricePill: {
    alignSelf: "flex-start",
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 36,
  },
  appliedPriceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: "#1A1C1F",
    includeFontPadding: false,
  },
  appliedDesc: {
    fontFamily: fonts.body,
    fontSize: 23,
    lineHeight: 34,
    color: "#4C4546",
  },
  progressSection: { marginBottom: 58 },
  progressSectionTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#5E5E60",
    marginBottom: 18,
  },
  progressJobCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 34,
    ...shadow.sm,
  },
  progressJobTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 18 },
  progressJobCopy: { flex: 1, minWidth: 0 },
  progressJobTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 32,
    lineHeight: 38,
    color: "#1A1C1F",
    includeFontPadding: false,
    marginBottom: 12,
  },
  progressFactRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  progressLocationText: { flex: 1, fontFamily: fonts.body, fontSize: 20, lineHeight: 28, color: "#4C4546" },
  progressPriceBlock: { alignItems: "flex-end", flexShrink: 0, maxWidth: 128 },
  progressPrice: { fontFamily: fonts.bodyBold, fontSize: 29, lineHeight: 34, color: "#1A1C1F", includeFontPadding: false },
  progressPriceUnit: { marginTop: 8, fontFamily: fonts.bodyBold, fontSize: 16, color: "#5E5E60" },
  progressDivider: { height: 1, backgroundColor: "#E2E2E7", marginVertical: 34 },
  progressDateText: { flex: 1, fontFamily: fonts.body, fontSize: 20, lineHeight: 28, color: "#4C4546" },
  requestTitleCopy: { flex: 1, minWidth: 0 },
  requestTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 30,
    lineHeight: 38,
    color: "#1A1C1F",
    includeFontPadding: false,
    marginBottom: 8,
  },
  requestDesc: { fontFamily: fonts.body, fontSize: 20, lineHeight: 30, color: "#5E5E60" },
  requestPriceBlock: { flexShrink: 0, alignItems: "flex-end", maxWidth: 130 },
  requestPrice: { fontFamily: fonts.bodyBold, fontSize: 28, lineHeight: 34, color: "#1A1C1F", includeFontPadding: false },
  requestPriceSub: { fontFamily: fonts.body, fontSize: 20, lineHeight: 28, color: "#5E5E60" },
  requestLocationPill: {
    alignSelf: "flex-start",
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F3F3F8",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 76,
  },
  requestLocationText: { fontFamily: fonts.body, fontSize: 19, color: "#5E5E60" },
  detailFacts: { gap: 12, marginBottom: 30 },
  detailFact: { flexDirection: "row", alignItems: "center", gap: 8 },
  detailFactText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: "#1A1C1F" },
  statusBlock: { marginBottom: 28 },
  requestStatusTitle: { fontSize: 18, textTransform: "none", letterSpacing: 0, color: "#1A1C1F", marginBottom: 30 },
  statusBlockTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#4C4546",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  stepsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
    paddingHorizontal: 4,
  },
  stepsLine: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 15,
    height: 1.5,
    backgroundColor: "#E2E2E7",
  },
  stepsLineActive: { height: 1.5, backgroundColor: "#000" },
  stepItem: { width: 74, alignItems: "center" },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E2E7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stepCircleActive: { backgroundColor: "#000", borderColor: "#000" },
  stepLabel: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#5E5E60", includeFontPadding: false },
  stepLabelActive: { color: "#1A1C1F" },
  requestStepsWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
    paddingHorizontal: 8,
    marginBottom: 38,
  },
  requestLine: {
    position: "absolute",
    left: 28,
    right: 28,
    top: 20,
    height: 2,
    backgroundColor: "#E2E2E7",
  },
  requestLineActive: { width: "50%", height: 2, backgroundColor: "#000" },
  requestStep: { width: 108, alignItems: "center" },
  requestStepCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  requestStepDone: { backgroundColor: "#000" },
  requestStepActive: { backgroundColor: "#fff", borderWidth: 3, borderColor: "#000" },
  requestStepPending: { backgroundColor: "#E8E8ED" },
  requestStepDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#000" },
  requestStepLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#5E5E60", textAlign: "center" },
  requestStepLabelActive: { color: "#000" },
  progressStepsCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    paddingHorizontal: 32,
    paddingVertical: 34,
    ...shadow.sm,
  },
  progressStepsWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  progressStepsLine: {
    position: "absolute",
    left: 52,
    right: 52,
    top: 13,
    height: 2,
    backgroundColor: "#E2E2E7",
  },
  progressStepsLineActive: { width: "50%", height: 2, backgroundColor: "#000" },
  progressStep: { width: 94, alignItems: "center" },
  progressStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  progressStepDone: { backgroundColor: "#000" },
  progressStepActive: { backgroundColor: "#fff", borderWidth: 3, borderColor: "#000" },
  progressStepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#000" },
  progressStepLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: "#1A1C1F", letterSpacing: 0.5 },
  progressStepLabelActive: { fontSize: 13 },
  proofCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 20,
    ...shadow.sm,
  },
  proofActionRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  proofUpload: {
    flex: 1,
    minHeight: 128,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CFC4C5",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  proofPreviewWrap: { height: 168, borderRadius: 8, overflow: "hidden", marginBottom: 12, backgroundColor: "#EDEDF2" },
  proofPreview: { width: "100%", height: "100%" },
  proofRemoveBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  proofUploadText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#1A1C1F" },
  proofHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: "#4C4546", textAlign: "center" },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 22,
    ...shadow.sm,
  },
  reviewTitle: { fontFamily: fonts.bodyBold, fontSize: 20, color: "#1A1C1F", includeFontPadding: false, marginBottom: 14 },
  reviewStars: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  reviewInput: {
    minHeight: 108,
    borderRadius: 8,
    backgroundColor: "#F3F3F8",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 15,
    color: "#1A1C1F",
    textAlignVertical: "top",
    marginBottom: 16,
  },
  reviewSubmitBtn: {
    height: 52,
    borderRadius: 4,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewSubmitText: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#fff", includeFontPadding: false },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 0,
    padding: 20,
    ...shadow.sm,
  },
  timelineItem: { flexDirection: "row", gap: 18, minHeight: 56, position: "relative" },
  timelineItemLine: { borderLeftWidth: 2, borderLeftColor: "#000", marginLeft: 10, paddingLeft: 6, paddingBottom: 18 },
  timelineDot: {
    position: "absolute",
    left: -11,
    top: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E2E7",
    borderWidth: 4,
    borderColor: "#fff",
  },
  timelineDotActive: { backgroundColor: "#000" },
  timelineCopy: { marginLeft: 22, flex: 1 },
  timelineTitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: "#5E5E60", marginBottom: 4 },
  timelineTitleActive: { color: "#1A1C1F" },
  timelineSub: { fontFamily: fonts.body, fontSize: 13, color: "#4C4546" },
  appliedStepsWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    position: "relative",
    marginTop: 8,
    marginBottom: 48,
  },
  appliedLine: {
    position: "absolute",
    left: 24,
    right: 24,
    top: 13,
    height: 2,
    backgroundColor: "#E2E2E7",
  },
  appliedLineActive: { width: "50%", height: 2, backgroundColor: "#000" },
  appliedStep: { width: 96, alignItems: "center" },
  appliedStepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  appliedStepDone: { backgroundColor: "#000" },
  appliedStepActive: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginTop: -5,
    backgroundColor: "#fff",
    borderWidth: 7,
    borderColor: "#000",
  },
  appliedStepPending: { backgroundColor: "#E8E8ED" },
  appliedStepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  appliedStepDotMuted: { backgroundColor: "#A1A1AA" },
  appliedStepLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#1A1C1F", textAlign: "center" },
  appliedStepLabelActive: { fontSize: 15, color: "#000" },
  appliedStepLabelMuted: { color: "#A1A1AA" },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "#F3F3F8",
    borderRadius: 10,
    padding: 20,
    marginTop: 4,
  },
  infoNoteText: { flex: 1, fontFamily: fonts.body, fontSize: 18, lineHeight: 27, color: "#5E5E60" },
  appliedInfoTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 21,
    color: "#1A1C1F",
    marginBottom: 8,
    includeFontPadding: false,
  },
  applicantCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E2E7",
    ...shadow.sm,
    marginBottom: 28,
  },
  applicantTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: "#1A1C1F", includeFontPadding: false },
  applicantSub: { marginTop: 5, fontFamily: fonts.body, fontSize: 13, color: "#4C4546", fontStyle: "italic" },
  avatarStack: { flexDirection: "row", alignItems: "center" },
  miniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8E8ED",
    borderWidth: 2,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: { fontFamily: fonts.bodyBold, fontSize: 11, color: "#1A1C1F" },
  detailActions: { gap: 12, marginBottom: 18 },
  completionHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F3F3F8",
    borderRadius: 10,
    padding: 16,
  },
  completionHintTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#1A1C1F",
    includeFontPadding: false,
    marginBottom: 5,
  },
  completionHintText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#4C4546",
  },
  repostBtn: {
    height: 56,
    borderRadius: 10,
    backgroundColor: "#000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  repostText: { fontFamily: fonts.bodyBold, fontSize: 15, color: "#fff", includeFontPadding: false },
  dualActions: { flexDirection: "row", gap: 10 },
  outlineAction: {
    flex: 1,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E2E7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  outlineActionText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#1A1C1F", includeFontPadding: false },
  dangerOutlineAction: { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
  dangerOutlineText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#BA1A1A", includeFontPadding: false },
  fixedRequestActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: spacing.md,
    paddingTop: 18,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E2E2E7",
  },
  requestRejectBtn: {
    flex: 1,
    height: 64,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: "#CFC4C5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  requestRejectText: { fontFamily: fonts.bodyBold, fontSize: 20, color: "#1A1C1F" },
  requestAcceptBtn: {
    flex: 1,
    height: 64,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  requestAcceptText: { fontFamily: fonts.bodyBold, fontSize: 20, color: "#fff" },
  appliedWithdrawBtn: {
    flex: 1,
    height: 64,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F2F7",
  },
  appliedWithdrawText: {
    fontFamily: fonts.bodyBold,
    fontSize: 20,
    color: "#1A1C1F",
  },
  progressCompleteBtn: {
    flex: 1,
    height: 56,
    borderRadius: 0,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCompleteText: { fontFamily: fonts.bodyBold, fontSize: 18, color: "#fff", includeFontPadding: false },
});
