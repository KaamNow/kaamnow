import { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, SectionList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, LayoutAnimation,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n";
import { colors, fonts, spacing, radius } from "../theme";
import api from "../lib/api";

const CATEGORY_META = {
  general:      { icon: "help-circle-outline",    label: "General" },
  local_expert: { icon: "person-outline",          label: "For Experts" },
  customer:     { icon: "people-outline",           label: "For Customers" },
  payments:     { icon: "card-outline",             label: "Payments" },
  safety:       { icon: "shield-checkmark-outline", label: "Safety" },
};

export default function FAQScreen({ navigation }) {
  const { lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/faq?lang=${lang}`);
      const raw = r.data?.items || r.data || [];
      setFaqs(raw);
    } catch {}
    finally { setLoading(false); }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const sections = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = faqs.filter((f) => {
      if (!q) return true;
      const question = f.question || "";
      const answer   = f.answer   || "";
      return question.toLowerCase().includes(q) || answer.toLowerCase().includes(q);
    });

    const grouped = {};
    filtered.forEach((f) => {
      const cat = f.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(f);
    });

    return Object.entries(grouped).map(([cat, data]) => ({
      key: cat,
      title: CATEGORY_META[cat]?.label || cat,
      icon:  CATEGORY_META[cat]?.icon  || "help-circle-outline",
      data,
    }));
  }, [faqs, search]);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === id ? null : id));
  };

  const renderItem = ({ item }) => {
    const question = item.question || "";
    const answer   = item.answer   || "";
    const open = expanded === item.id;

    return (
      <TouchableOpacity
        style={[styles.faqItem, open && styles.faqItemOpen]}
        onPress={() => toggle(item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.faqRow}>
          <Text style={styles.faqQ} numberOfLines={open ? undefined : 2}>{question}</Text>
          <Ionicons
            name={open ? "remove-circle-outline" : "add-circle-outline"}
            size={20}
            color={open ? colors.primary : colors.outline}
          />
        </View>
        {open && <Text style={styles.faqA}>{answer}</Text>}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={section.icon} size={14} color={colors.primary} />
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.outline} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search questions…"
          placeholderTextColor={colors.outline}
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.outline} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="help-circle-outline" size={44} color={colors.outline} style={{ marginBottom: 10 }} />
          <Text style={styles.emptyText}>{search ? "No results found" : "No FAQs available"}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(f) => f.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.supportBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity
          style={styles.supportBtn}
          onPress={() => navigation.navigate("ContactSupport")}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
          <Text style={styles.supportBtnText}>Chat with Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center:    { flex: 1, justifyContent: "center", alignItems: "center" },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surfaceCard,
    marginHorizontal: spacing.md, marginVertical: spacing.sm,
    borderRadius: radius.xxl, paddingHorizontal: spacing.sm, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.borderSubtle,
  },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.textHeading },

  sectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  sectionHeaderText: {
    fontFamily: fonts.bodyBold, fontSize: 12, color: colors.primary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },

  faqItem: {
    backgroundColor: colors.surfaceCard,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  faqItemOpen: { borderColor: colors.primary + "66" },
  faqRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  faqQ:   { flex: 1, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textHeading, lineHeight: 20 },
  faqA:   { fontFamily: fonts.body, fontSize: 14, color: colors.textBody, marginTop: spacing.sm, lineHeight: 22 },

  empty:     { alignItems: "center", marginTop: 80 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: colors.outline },

  supportBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surfaceCard,
    borderTopWidth: 1, borderTopColor: colors.borderSubtle,
    paddingTop: spacing.sm, paddingHorizontal: spacing.md,
  },
  supportBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: colors.primary, borderRadius: radius.xxl,
    paddingVertical: 12, gap: spacing.xs,
  },
  supportBtnText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.onPrimary },
});
