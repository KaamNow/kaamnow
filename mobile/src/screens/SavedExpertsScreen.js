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
        const r = await api.get("/auth/me/saved-workers");
        setWorkers(r.data?.workers || r.data || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate("WorkerProfile", { workerId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.name || "?")[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.skills}>{(item.skills || []).slice(0, 3).join(" · ")}</Text>
        {item.daily_rate ? <Text style={styles.rate}>₹{item.daily_rate}/day</Text> : null}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>;
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
  row:      { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  avatar:   { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontFamily: fonts.bodyBold, fontSize: 18 },
  name:     { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  skills:   { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  rate:     { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.success },
  empty:    { alignItems: "center", marginTop: 80 },
  emptyText:{ fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },
});
