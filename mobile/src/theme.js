// Color palette: ONE primary color - Deep Teal
// Clean, professional, zero political/religious associations.
// Amber is reserved for money/rate display.
export const colors = {
  // Primary
  primary: "#0F766E",
  primaryDark: "#0D5F59",
  primaryLight: "#F0FDFA",

  // Backward-compatible aliases. Keep until screens are migrated.
  saffron: "#0F766E",
  saffronDark: "#0D5F59",
  saffronTint: "#F0FDFA",
  indigo: "#0F766E",
  indigoDark: "#0D5F59",
  indigoTint: "#F0FDFA",

  // Money (ONLY for amounts, rates, earnings)
  money: "#B45309",

  // Semantic
  success: "#16A34A",
  successLight: "#F0FDF4",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  info: "#0EA5E9",
  infoLight: "#F0F9FF",

  // Neutrals
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  surface2: "#F3F2EF",
  soft: "#F3F2EF",

  // Text
  text: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",

  // Borders
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",

  // Overlays
  overlay: "rgba(0,0,0,0.45)",
  overlayDark: "rgba(0,0,0,0.65)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const shadow = {
  none: { elevation: 0 },
  xs: {
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  sm: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  md: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  lg: {
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
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
  caption: 12,
  tiny: 11,
  micro: 10,
};
