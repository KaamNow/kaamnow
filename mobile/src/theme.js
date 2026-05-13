// Color palette: ONE primary color — Deep Teal
// Clean, professional, zero political/religious associations
// Amber used ONLY for ₹ money/rate display
export const colors = {
  // ── Primary: Deep Teal ────────────────────────────────────────
  saffron: "#0F766E",      // primary — buttons, active tabs, key CTAs
  saffronDark: "#0D5F59",  // pressed/hover state
  saffronTint: "#F0FDFA",  // light teal bg for chips, selected rows

  // ── Secondary: Medium Teal (for less prominent selected states) ──
  indigo: "#0F766E",       // unified with primary — chips, links, icons
  indigoDark: "#0D5F59",
  indigoTint: "#F0FDFA",   // same tint — consistent

  // ── Money color — Amber (ONLY for ₹ amounts, rates, earnings) ──
  money: "#B45309",        // dark amber — use ONLY on ₹ numbers/rates

  // ── Neutrals ──────────────────────────────────────────────────
  bg: "#F8F7F4",           // warm off-white background
  surface: "#FFFFFF",
  soft: "#F3F2EF",         // subtle card / secondary bg

  // ── Text ──────────────────────────────────────────────────────
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",

  // ── Borders ───────────────────────────────────────────────────
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",

  // ── Semantic (use sparingly) ───────────────────────────────────
  success: "#16A34A",      // green — confirmed/hired states only
  danger: "#DC2626",       // red — errors, destructive actions
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  pill: 999,
};

export const fonts = {
  display: "Outfit_800ExtraBold",
  displayBold: "Outfit_700Bold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemi: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
};

export const sizes = {
  h1: 36,
  h2: 28,
  h3: 22,
  h4: 18,
  body: 15,
  small: 13,
  tiny: 11,
};
