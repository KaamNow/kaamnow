// KaamNow Design System — Archetype 4: Swiss + Saffron/Indigo
// Primary: #FF6B35 Saffron (CTAs, active states)
// Trust:   #3F37C9 Indigo (headers, trust badges, structure)
// Bg:      #FCFBF9 warm off-white
export const colors = {
  // Brand — Saffron (CTAs, primary actions, high energy)
  primary: "#FF6B35",
  primaryDark: "#E85520",
  primaryLight: "#FFF3EE",

  // Brand — Indigo (trust, headers, structure, badges)
  indigo: "#3F37C9",
  indigoDark: "#2D27A8",
  indigoLight: "#EEEEFF",

  // Backward-compat aliases used across all screens
  saffron: "#FF6B35",
  saffronDark: "#E85520",
  saffronTint: "#FFF3EE",
  indigoTint: "#EEEEFF",

  // Semantic
  success: "#16A34A",
  successLight: "#F0FDF4",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  warning: "#D97706",
  warningLight: "#FFFBEB",
  info: "#0EA5E9",
  infoLight: "#F0F9FF",

  // Neutrals — warm off-white base (not cold gray)
  bg: "#FCFBF9",
  surface: "#FFFFFF",
  surface2: "#F5F4F1",
  soft: "#F5F4F1",

  // Text — design_guidelines.json values
  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",

  // Borders — flat design, 1px structural lines
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
