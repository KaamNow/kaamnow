import { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, Pressable,
  TextInput, ScrollView, ActivityIndicator, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import api from "../api";
import { colors, fonts, radius, spacing, sizes } from "../theme";
import Overline from "../components/Overline";
import WorkerCard from "../components/WorkerCard";

const SKILLS = ["all","mason","farm work","painting","plumbing","electrical","helper","cleaning","carpentry","welding","cooking","driver"];
const AVAIL_OPTS = [{ v:"any", l:"All" }, { v:"true", l:"Available now" }];

export default function MarketplaceScreen({ navigation }) {
  const [workers, setWorkers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [skill, setSkill]       = useState("all");
  const [q, setQ]               = useState("");
  const [pincode, setPincode]   = useState("");
  const [avail, setAvail]       = useState("any");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (skill !== "all") params.skills = skill;
    if (q.trim()) params.q = q.trim();
    if (pincode.length === 6) params.pincode = pincode;
    if (avail === "true") params.available_only = true;

    api.get("/workers/search", { params })
      .then(r => setWorkers(Array.isArray(r.data) ? r.data : r.data?.workers || []))
      .catch(() => setWorkers([]))
      .finally(() => setLoading(false));
  }, [skill, q, pincode, avail]);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = [
    skill !== "all",
    pincode.length === 6,
    avail !== "any",
  ].filter(Boolean).length;

  const clearAll = () => { setSkill("all"); setPincode(""); setAvail("any"); setQ(""); };

  return (
    <SafeAreaView edges={["top"]} style={s.safe}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              style={s.searchInput}
              placeholder="Name, village or skill…"
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              returnKeyType="search"
            />
            {q.length > 0 && (
              <Pressable onPress={() => setQ("")}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[s.filterBtn, activeFilterCount > 0 && s.filterBtnActive]}
            onPress={() => setFiltersOpen(o => !o)}
          >
            <Ionicons name="options-outline" size={18} color={activeFilterCount > 0 ? "#fff" : colors.indigo} />
            {activeFilterCount > 0 && (
              <View style={s.filterBadge}>
                <Text style={s.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Skill chips — always visible */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={s.chipRow}>
            {SKILLS.map(sk => (
              <Pressable key={sk} onPress={() => setSkill(sk)} style={[s.chip, skill === sk && s.chipOn]}>
                <Text style={[s.chipText, skill === sk && s.chipTextOn]}>{sk === "all" ? "All skills" : sk}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Expandable filter panel */}
        {filtersOpen && (
          <View style={s.filterPanel}>
            <View style={s.filterRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>Pincode</Text>
                <TextInput
                  style={s.filterInput}
                  placeholder="6-digit pincode"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pincode}
                  onChangeText={v => setPincode(v.replace(/\D/g,"").slice(0,6))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.filterLabel}>Availability</Text>
                <View style={s.availRow}>
                  {AVAIL_OPTS.map(o => (
                    <Pressable key={o.v} onPress={() => setAvail(o.v)} style={[s.availChip, avail === o.v && s.availChipOn]}>
                      <Text style={[s.availChipText, avail === o.v && s.availChipTextOn]}>{o.l}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            {activeFilterCount > 0 && (
              <Pressable onPress={clearAll} style={s.clearBtn}>
                <Ionicons name="refresh-outline" size={13} color={colors.indigo} />
                <Text style={s.clearText}>Clear all filters</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={s.countRow}>
          <Text style={s.countText}>{workers.length} workers found</Text>
          {loading && <ActivityIndicator size="small" color={colors.indigo} />}
        </View>
      </View>

      {/* ── List ──────────────────────────────────────────────────────── */}
      <FlatList
        data={workers}
        keyExtractor={w => w.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onPress={() => navigation.navigate("WorkerProfile", { id: item.id })}
          />
        )}
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔍</Text>
              <Text style={s.emptyTitle}>No workers found</Text>
              <Text style={s.emptySub}>Try adjusting your filters or pincode.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  searchRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#f9f8f5", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, borderColor: colors.border },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  filterBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.indigoTint, borderWidth: 1.5, borderColor: colors.indigo, position: "relative" },
  filterBtnActive: { backgroundColor: colors.indigo },
  filterBadge: { position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.saffron, alignItems: "center", justifyContent: "center" },
  filterBadgeText: { fontFamily: fonts.bodyBold, fontSize: 9, color: "#fff" },
  chipRow: { flexDirection: "row", gap: 8, paddingBottom: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: "#fff" },
  chipOn: { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.5, color: colors.textSecondary },
  chipTextOn: { color: "#fff" },
  filterPanel: { marginTop: 12, backgroundColor: "#f9f8f5", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  filterRow: { flexDirection: "row", gap: 14 },
  filterLabel: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.textMuted, marginBottom: 6 },
  filterInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  availRow: { flexDirection: "row", gap: 6 },
  availChip: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: "#fff", borderWidth: 1.5, borderColor: colors.border },
  availChipOn: { backgroundColor: colors.indigoTint, borderColor: colors.indigo },
  availChipText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary },
  availChipTextOn: { color: colors.indigo },
  clearBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10, alignSelf: "flex-end" },
  clearText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.indigo },
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  countText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  empty: { padding: 40, alignItems: "center" },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.text, marginBottom: 6 },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
