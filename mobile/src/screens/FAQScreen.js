import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const CATEGORIES = ["all", "general", "local_expert", "customer", "payments", "safety"];

export default function FAQScreen({ navigation }) {
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/faq?lang=${lang}`);
      setFaqs(r.data?.items || r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const filtered = faqs.filter((f) => {
    const q = lang === "en" ? f.question_en : f.question_hi || f.question_en;
    const a = lang === "en" ? f.answer_en   : f.answer_hi   || f.answer_en;
    const matchCat = category === "all" || f.category === category;
    const matchQ   = !search || q?.toLowerCase().includes(search.toLowerCase()) || a?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQ;
  });

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === id ? null : id));
  };

  const renderItem = ({ item }) => {
    const question = lang === "en" ? item.question_en : item.question_hi || item.question_en;
    const answer   = lang === "en" ? item.answer_en   : item.answer_hi   || item.answer_en;
    const open = expanded === item.id;
    return (
      <TouchableOpacity style={styles.faqItem} onPress={() => toggle(item.id)} activeOpacity={0.85}>
        <View style={styles.faqHeader}>
          <Text style={styles.faqQ} numberOfLines={open ? undefined : 2}>{question}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </View>
        {open ? <Text style={styles.faqA}>{answer}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t("faq_search_placeholder")}
          placeholderTextColor={colors.textMuted}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, category === item && styles.chipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.chipText, category === item && styles.chipTextActive]}>
              {t(`faq_cat_${item}`)}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading
        ? <View style={styles.center}><ActivityIndicator color={colors.saffron} /></View>
        : (
          <FlatList
            data={filtered}
            keyExtractor={(f) => f.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>{t("faq_empty")}</Text>
              </View>
            }
          />
        )
      }

      {/* Support CTA */}
      <View style={[styles.supportBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate("SupportChat")}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
          <Text style={styles.supportBtnText}>{t("faq_chat_support")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#fff", marginHorizontal: spacing.md, marginVertical: spacing.sm,
    borderRadius: radius.lg, paddingHorizontal: spacing.sm, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },

  chips: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff",
  },
  chipActive:     { backgroundColor: colors.indigo, borderColor: colors.indigo },
  chipText:       { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  chipTextActive: { color: "#fff", fontFamily: fonts.bodyBold },

  faqItem: {
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  faqHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  faqQ:      { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  faqA:      { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 22 },

  empty:     { alignItems: "center", marginTop: 60 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted },

  supportBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.sm, paddingHorizontal: spacing.md,
  },
  supportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.indigo, borderRadius: radius.lg, paddingVertical: 12, gap: spacing.xs,
  },
  supportBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: "#fff" },
});
