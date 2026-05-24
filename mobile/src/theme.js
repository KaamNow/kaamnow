// Stitch design system tokens for KaamNow mobile.
// Backward-compatible aliases are intentionally kept for existing screens.
export const colors = {
  primary: "#000000",
  onPrimary: "#ffffff",
  primaryFixed: "#dae2fd",
  primaryContainer: "#131b2e",
  secondary: "#6537dc",
  secondaryContainer: "#7e55f6",
  onSecondary: "#ffffff",

  background: "#FAFAFA",
  surface: "#f7f9fb",
  surfaceCard: "#FFFFFF",
  surfaceContainerLowest: "#ffffff",
  surfaceContainerLow: "#f2f4f6",
  surfaceContainer: "#eceef0",
  surfaceContainerHigh: "#e6e8ea",
  surfaceContainerHighest: "#e0e3e5",
  surfaceDim: "#d8dadc",
  surfaceVariant: "#e0e3e5",

  textHeading: "#0F172A",
  textBody: "#475569",
  onSurface: "#191c1e",
  onSurfaceVariant: "#45464d",
  borderSubtle: "#E2E8F0",
  outline: "#76777d",
  outlineVariant: "#c6c6cd",
  statusSuccess: "#10B981",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",

  // Backward-compat aliases used across existing screens.
  saffron: "#FF6B35",
  saffronDark: "#E85520",
  saffronTint: "#FFF3EE",
  indigo: "#3F37C9",
  indigoDark: "#2D27A8",
  indigoTint: "#EEEEFF",
  bg: "#FAFAFA",
  text: "#0F172A",
  textSecondary: "#475569",
  textMuted: "#76777d",
  border: "#E2E8F0",
  borderStrong: "#c6c6cd",
  overlay: "rgba(0,0,0,0.45)",
  overlayDark: "rgba(0,0,0,0.65)",

  // Existing semantic aliases.
  primaryDark: "#191c1e",
  primaryLight: "#dae2fd",
  success: "#10B981",
  successLight: "#ECFDF5",
  danger: "#ba1a1a",
  dangerLight: "#ffdad6",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  info: "#2563EB",
  infoLight: "#EFF6FF",
  money: "#0F766E",
  soft: "#f2f4f6",
  surface2: "#f2f4f6",
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
  pill: 9999,
};

export const shadow = {
  none: { elevation: 0 },
  xs: {
    elevation: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  sm: {
    elevation: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  md: {
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },
  lg: {
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
  },
};

export const fonts = {
  display: "Manrope_800ExtraBold",
  displayBold: "Manrope_700Bold",
  headlineLg: "Manrope_700Bold",
  headlineMd: "Manrope_600SemiBold",
  headlineSm: "Manrope_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  labelMd: "Inter_600SemiBold",
  labelSm: "Inter_500Medium",
};

export const sizes = {
  display: 48,
  h1: 32,
  h2: 24,
  h3: 24,
  h4: 18,
  bodyLg: 18,
  body: 16,
  labelMd: 14,
  labelSm: 12,
  small: 13,
  caption: 12,
  tiny: 11,
  micro: 10,
};
