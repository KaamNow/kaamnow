import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api";
import AppScreen from "../components/AppScreen";
import EmptyState from "../components/EmptyState";
import LocationBar from "../components/LocationBar";
import ServiceCategoryCard from "../components/ServiceCategoryCard";
import WorkerCard from "../components/WorkerCard";
import { useLanguage } from "../contexts/LanguageContext";
import { colors, fonts, radius, shadow, spacing } from "../theme";

const SKILLS = ["all", "mason", "farm work", "painting", "plumbing", "electrical", "helper", "cleaning", "carpentry", "welding", "cooking", "driver"];
const AVAIL_OPTS = [{ v: "any", l: "All" }, { v: "true", l: "Available now" }];

const SKILL_ICONS = {
  all: "grid-outline",
  mason: "construct-outline",
  "farm work": "leaf-outline",
  painting: "color-palette-outline",
  plumbing: "water-outline",
  electrical: "flash-outline",
  helper: "hand-left-outline",
  cleaning: "sparkles-outline",
  carpentry: "hammer-outline",
  welding: "flame-outline",
  cooking: "restaurant-outline",
  driver: "car-outline",
};

function titleCase(value) {
  if (value === "all") return "All";
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MarketplaceScreen({ navigation, route }) {
  const { lang } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("all");
  const [q, setQ] = useState("");
  const [pincode, setPincode] = useState(route?.params?.filterPincode || "");
  const [avail, setAvail] = useState("any");
  const [searchFocused, setSearchFocused] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [tempPincode, setTempPincode] = useState("");

  useEffect(() => {
    if (route?.params?.filterPincode) setPincode(route.params.filterPincode);
  }, [route?.params?.filterPincode]);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (skill !== "all") params.skills = skill;
    if (q.trim()) params.q = q.trim();
    if (pincode.length === 6) params.pincode = pincode;
    if (avail === "true") params.available_only = true;

    api.get("/workers/search", { params })
      .then((r) => setWorkers(Array.isArray(r.data) ? r.data : r.data?.workers || []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [skill, q, pincode, avail]);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = [
    skill !== "all",
    pincode.length === 6,
    avail !== "any",
  ].filter(Boolean).length;

  const hasAnyFilter = activeFilterCount > 0 || q.trim().length > 0;
  const clearAll = () => {
    setSkill("all");
    setPincode("");
    setAvail("any");
    setQ("");
  };

  const renderWorker = ({ item }) => (
    <WorkerCard
      worker={item}
      size="full"
      showTrustBadge
      onPress={() => navigation.navigate("WorkerProfile", { id: item.id })}
    />
  );

  return (
    <AppScreen edges={["top"]} style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.titleTextBlock}>
            <Text style={styles.title}>Find Workers</Text>
            <Text style={styles.subtitle}>Aapke area ke trusted workers</Text>
          </View>
        </View>

        <LocationBar
          pincode={pincode}
          onPress={() => { setTempPincode(pincode); setShowLocModal(true); }}
          label="Workers near you"
          compact
          style={styles.locationBar}
        />

        <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Skill, name ya service search karein"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {q.length > 0 ? (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skillScroller}>
          <View style={styles.chipRow}>
            {SKILLS.map((sk) => (
              <ServiceCategoryCard
                key={sk}
                size="chip"
                label={sk === "all" ? "All" : titleCase(sk)}
                icon={SKILL_ICONS[sk] || "briefcase-outline"}
                selected={skill === sk}
                onPress={() => setSkill(sk)}
              />
            ))}
          </View>
        </ScrollView>


        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {workers.length} {lang === "hi" ? "कारीगर मिले" : "workers found"}
          </Text>
          <View style={styles.countActions}>
            <Pressable
              onPress={() => setAvail((value) => (value === "true" ? "any" : "true"))}
              style={[styles.availablePill, avail === "true" && styles.availablePillActive]}
            >
              <View style={[styles.availableDot, avail === "true" && styles.availableDotActive]} />
              <Text style={[styles.availablePillText, avail === "true" && styles.availablePillTextActive]}>
                Available now
              </Text>
            </Pressable>
            {hasAnyFilter ? (
              <Pressable onPress={clearAll} style={styles.resetPill}>
                <Ionicons name="refresh-outline" size={12} color={colors.danger} />
                <Text style={styles.resetPillText}>Reset</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <FlatList
        data={workers}
        keyExtractor={(worker, index) => String(worker.id ?? worker._id ?? index)}
        contentContainerStyle={styles.listContent}
        renderItem={renderWorker}
        ListHeaderComponent={loading ? (
          <View style={styles.loadingInline}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Workers load ho rahe hain...</Text>
          </View>
        ) : null}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="search-outline"
              title="Koi worker nahin mila"
              subtitle="Filter change karo ya pincode check karo"
              actionLabel={hasAnyFilter ? "Filters clear karo" : undefined}
              onAction={hasAnyFilter ? clearAll : undefined}
            />
          ) : null
        }
      />
      {/* ── Location Modal ── */}
      <Modal
        visible={showLocModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable style={styles.locModalBg} onPress={() => setShowLocModal(false)}>
            <Pressable style={styles.locModalSheet} onPress={() => {}}>
              <View style={styles.locModalHandle} />
              <Text style={styles.locModalTitle}>Set location</Text>
              <Text style={styles.locModalSub}>
                Pincode dal kar nearby workers dekhein
              </Text>
              <View style={styles.locModalInputWrap}>
                <Ionicons name="location-outline" size={18} color={colors.primary} />
                <TextInput
                  style={styles.locModalInput}
                  value={tempPincode}
                  onChangeText={(v) => setTempPincode(v.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                {tempPincode.length > 0 ? (
                  <Pressable onPress={() => setTempPincode("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.locModalBtns}>
                {pincode.length > 0 ? (
                  <Pressable
                    style={styles.locModalClear}
                    onPress={() => { setPincode(""); setShowLocModal(false); }}
                  >
                    <Text style={styles.locModalClearText}>Clear location</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.locModalApply, tempPincode.length !== 6 && { opacity: 0.4 }]}
                  disabled={tempPincode.length !== 6}
                  onPress={() => { setPincode(tempPincode); setShowLocModal(false); }}
                >
                  <Ionicons name="search-outline" size={16} color="#fff" />
                  <Text style={styles.locModalApplyText}>Apply location</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleTextBlock: { flex: 1 },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 31,
    color: colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    position: "relative",
  },
  filterIconBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.money,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  locationBar: {
    marginBottom: spacing.md,
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.xs,
  },
  searchBoxFocused: {
    borderColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 12,
  },
  skillScroller: {
    marginTop: spacing.md,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 6,
  },
  filterPanel: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.xs,
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  filterCol: { flex: 1 },
  filterLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  filterInput: {
    minHeight: 44,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.text,
  },
  availRow: {
    flexDirection: "row",
    gap: 6,
  },
  availChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 8,
  },
  availChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  availChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  availChipTextActive: { color: colors.primary },
  clearBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    alignSelf: "flex-end",
  },
  clearText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    color: colors.primary,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  countText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.textSecondary,
  },
  availablePill: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
  },
  availablePillActive: {
    backgroundColor: colors.successLight,
    borderColor: "#BBF7D0",
  },
  availableDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderStrong,
  },
  availableDotActive: { backgroundColor: colors.success },
  availablePillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textMuted,
  },
  availablePillTextActive: { color: colors.success },
  countActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger + "50",
    backgroundColor: "#FFF1F2",
  },
  resetPillText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.danger,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 80,
  },
  loadingInline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },

  // Filter panel — location change link
  filterChangeLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary + "40",
    minHeight: 44,
  },
  filterChangeLocText: {
    flex: 1,
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.primary,
  },

  // Location modal
  locModalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  locModalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  locModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  locModalTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    marginBottom: 4,
  },
  locModalSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  locModalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  locModalInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 18,
    color: colors.text,
    letterSpacing: 2,
  },
  locModalBtns: {
    flexDirection: "row",
    gap: 10,
  },
  locModalClear: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: "center",
    minHeight: 50,
  },
  locModalClearText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  locModalApply: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    minHeight: 50,
  },
  locModalApplyText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: "#fff",
  },
});
