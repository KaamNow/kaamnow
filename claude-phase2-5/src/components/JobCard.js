import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, radius, shadow, spacing } from "../theme";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";
import StatusBadge from "./StatusBadge";

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function daysAgo(dateValue) {
  if (!dateValue) return "";
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return "";
  const diff = Math.floor((Date.now() - time) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "1 day ago";
  return `${diff} days ago`;
}

function engagementStatus(engagement) {
  return engagement?.engagement_status || engagement?.status || null;
}

function isPending(status) {
  return ["requested", "pending", "applied"].includes(status);
}

function isAccepted(status) {
  return ["accepted", "hired", "booked"].includes(status);
}

export default function JobCard({
  job = {},
  engagement = null,
  onPress,
  onApply,
  onWithdraw,
  lang = "en",
  compact = false,
}) {
  const title = first(job.title, job.skill, job.category, "Kaam available");
  const category = first(job.category, job.skill);
  const rate = first(job.daily_rate, job.dailyRate, job.rate);
  const workersNeeded = first(job.workers_needed, job.workersNeeded);
  const date = first(job.job_date, job.work_date, job.date, job.startDate);
  const posted = daysAgo(first(job.posted_at, job.created_at));
  const location = [
    first(job.village, job.location?.village, job.address?.village),
    first(job.district, job.location?.district, job.address?.district),
    first(job.pincode, job.location?.pincode, job.address?.pincode),
  ].filter(Boolean).join(" · ");
  const matchedSkills = asArray(job.matched_skills || job.matchedSkills);
  const skills = asArray(job.skills);
  const status = engagementStatus(engagement);
  const urgent = job.urgent || job.urgency === "urgent" || job.urgency === "now" || job.urgency === "immediate";
  const customerName = first(job.customer_name, job.customerName);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        compact && styles.compactCard,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryIcon}>
          <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {category ? <Text style={styles.categoryText} numberOfLines={1}>{category}</Text> : null}
        </View>
        {urgent ? (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentText}>{job.urgency === "now" ? "Now" : "Urgent"}</Text>
          </View>
        ) : job.status ? (
          <StatusBadge status={job.status} size="small" />
        ) : null}
      </View>

      {location ? (
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
        </View>
      ) : null}

      <View style={styles.infoRow}>
        {rate ? (
          <View style={styles.ratePill}>
            <Text style={styles.rateText}>₹{rate}</Text>
            <Text style={styles.rateUnit}>/day</Text>
          </View>
        ) : null}
        {workersNeeded ? <InfoPill icon="people-outline" text={`${workersNeeded} needed`} /> : null}
        {date ? <InfoPill icon="calendar-outline" text={date} /> : null}
        {posted ? <InfoPill icon="time-outline" text={posted} /> : null}
      </View>

      {customerName ? (
        <View style={styles.customerRow}>
          <Ionicons name="person-outline" size={13} color={colors.textMuted} />
          <Text style={styles.customerText} numberOfLines={1}>{customerName}</Text>
        </View>
      ) : null}

      {matchedSkills.length > 0 || skills.length > 0 ? (
        <View style={styles.skillRow}>
          {(matchedSkills.length > 0 ? matchedSkills : skills).slice(0, 4).map((skill) => (
            <View key={skill} style={matchedSkills.length > 0 ? styles.matchedChip : styles.skillChip}>
              {matchedSkills.length > 0 ? <Ionicons name="checkmark" size={10} color={colors.success} /> : null}
              <Text style={matchedSkills.length > 0 ? styles.matchedText : styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {(onApply || onWithdraw || status) ? (
        <View style={styles.ctaArea}>
          {!status && onApply ? (
            <PrimaryButton
              title={lang === "hi" ? "Apply karo" : "Apply karo"}
              onPress={onApply}
              icon={<Ionicons name="hand-right-outline" size={15} color="#fff" />}
            />
          ) : isAccepted(status) ? (
            <View style={styles.acceptedRow}>
              <View style={styles.statusLine}>
                <StatusBadge status="accepted" />
                <Text style={styles.statusText}>Aap hire ho gaye</Text>
              </View>
              {engagement?.customer_phone ? (
                <SecondaryButton
                  title="Call"
                  fullWidth={false}
                  onPress={() => Linking.openURL(`tel:${engagement.customer_phone}`)}
                  icon={<Ionicons name="call-outline" size={14} color={colors.text} />}
                  style={styles.callButton}
                />
              ) : null}
            </View>
          ) : isPending(status) ? (
            <View style={styles.pendingRow}>
              <StatusBadge status="requested" />
              {onWithdraw ? (
                <SecondaryButton title="Withdraw" onPress={onWithdraw} fullWidth={false} style={styles.withdrawButton} />
              ) : null}
            </View>
          ) : status ? (
            <StatusBadge status={status} />
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function InfoPill({ icon, text }) {
  return (
    <View style={styles.infoPill}>
      <Ionicons name={icon} size={12} color={colors.textSecondary} />
      <Text style={styles.infoPillText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: 10,
    ...shadow.xs,
  },
  compactCard: {
    padding: 14,
  },
  pressed: {
    opacity: 0.94,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  categoryText: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  urgentBadge: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: colors.warningLight,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  urgentText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.warning,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  locationText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  infoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  ratePill: {
    flexDirection: "row",
    alignItems: "baseline",
    borderRadius: radius.pill,
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rateText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.money,
  },
  rateUnit: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  infoPill: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  infoPillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.textSecondary,
  },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
  },
  customerText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
  },
  skillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  matchedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchedText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.success,
  },
  skillChip: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  skillText: {
    fontFamily: fonts.bodySemi,
    fontSize: 11,
    color: colors.textSecondary,
  },
  ctaArea: {
    marginTop: 14,
  },
  statusLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  acceptedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  statusText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.success,
  },
  callButton: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  withdrawButton: {
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
});
