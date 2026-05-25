import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

export default function SavedExpertsScreen({ navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/auth/me/saved-users");
        setWorkers(r.data?.profiles || r.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate("WorkerProfile", { id: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.display_name || item.name || "?")[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.display_name || item.name}</Text>
        <Text style={styles.skills}>{(item.skills || []).slice(0, 3).join(" · ")}</Text>
        {item.daily_rate ? <Text style={styles.rate}>₹{item.daily_rate}/day</Text> : null}
        {item.is_available_now ? (
          <View style={styles.availChip}>
            <View style={styles.availDot} />
            <Text style={styles.availChipText}>Available Now</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <FlatList
      data={workers}
      keyExtractor={(w) => w.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t("saved_experts_empty")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  center:   { flex: 1, justifyContent: "center", alignItems: "center" },
  row:      { flexDirection: "row", alignItems: "center", backgroundColor: colors.surfaceCard, paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, gap: spacing.sm },
  avatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  avatarText: { color: colors.onPrimary, fontFamily: fonts.bodyBold, fontSize: 18 },
  name:     { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading },
  skills:   { fontFamily: fonts.body, fontSize: 12, color: colors.outline },
  rate:     { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.statusSuccess },
  empty:    { alignItems: "center", marginTop: 80 },
  emptyText:{ fontFamily: fonts.body, fontSize: 14, color: colors.outline },
  availChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.successLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginTop: 4 },
  availDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  availChipText: { fontFamily: fonts.bodyBold, fontSize: 10, color: colors.success },
});
