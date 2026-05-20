import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const TABS = ["posted", "applied"];

const STATUS_COLOR = {
  requested:  "#fef3c7",
  accepted:   "#d1fae5",
  completed:  "#dbeafe",
  rejected:   "#fee2e2",
  cancelled:  "#f3f4f6",
  open:       "#d1fae5",
  booked:     "#dbeafe",
};

export default function ActivityScreen({ route, navigation }) {
  const { initialTab = "posted" } = route.params || {};
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(initialTab);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let r;
      if (tab === "posted") {
        r = await api.get("/jobs?mine=true");
        setItems(r.data?.jobs || r.data || []);
      } else {
        r = await api.get("/engagements?role=worker");
        setItems(r.data?.engagements || r.data || []);
      }
    } catch {}
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item }) => {
    const status = item.status || "open";
    const bg = STATUS_COLOR[status] || "#f3f4f6";
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          if (tab === "applied" && item.id) navigation.navigate("EngagementDetail", { id: item.id });
        }}
        activeOpacity={0.8}
      >
        <View style={styles.rowMain}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title || item.job_title}</Text>
          {item.job_date ? <Text style={styles.rowMeta}>{item.job_date}</Text> : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.tabs}>
        {TABS.map((tb) => (
          <TouchableOpacity
            key={tb}
            style={[styles.tabItem, tab === tb && styles.tabItemActive]}
            onPress={() => setTab(tb)}
          >
            <Text style={[styles.tabText, tab === tb && styles.tabTextActive]}>
              {t(`activity_${tb}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>
        : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t("activity_empty")}</Text>
              </View>
            }
          />
        )
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },
  tabs:      { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border },
  tabItem:   { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: colors.indigo },
  tabText:       { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
  tabTextActive: { fontFamily: fonts.bodyBold, color: colors.indigo },
  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  rowMain:    { flex: 1, marginRight: spacing.sm },
  rowTitle:   { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  rowMeta:    { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusText:  { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text, textTransform: "capitalize" },
  empty:       { alignItems: "center", marginTop: 80 },
  emptyText:   { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
