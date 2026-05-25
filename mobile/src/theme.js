// KaamNow mobile — unified design tokens.
// One shared visual language. All screens import from here.
//
// Spec (Batch 1):
//   bg #F9F9FE · surface #FFFFFF · surfaceMuted #F3F3F8
//   text #1A1C1F · textSecondary #5E5E60 · textMuted #7E7576
//   border #E2E2E7
//   primary #000000 (CTAs) · accent #3F37C9 (brand moments only)
//
// All historical keys are PRESERVED to avoid breaking unmodified screens —
// their values are simply re-pointed to the unified palette.
export const colors = {
  // --- Core surfaces ---
  primary: "#000000",
  onPrimary: "#FFFFFF",
  primaryFixed: "#EEEDFE",       // soft accent surface (formerly indigo light)
  primaryContainer: "#1A1C1F",
  secondary: "#3F37C9",          // brand accent — use sparingly
  secondaryContainer: "#3F37C9",
  onSecondary: "#FFFFFF",

  background: "#F9F9FE",
  surface: "#F3F3F8",            // light surface tint (inputs/inactive chips)
  surfaceCard: "#FFFFFF",
  surfaceContainerLowest: "#FFFFFF",
  surfaceContainerLow: "#F3F3F8",
  surfaceContainer: "#ECEDF2",
  surfaceContainerHigh: "#E6E7EC",
  surfaceContainerHighest: "#E0E1E6",
  surfaceDim: "#D8D9DE",
  surfaceVariant: "#E0E1E6",

  // --- Text ---
  textHeading: "#1A1C1F",
  textBody: "#5E5E60",
  onSurface: "#1A1C1F",
  onSurfaceVariant: "#5E5E60",

  // --- Lines ---
  borderSubtle: "#E2E2E7",
  outline: "#7E7576",
  outlineVariant: "#C6C6CD",

  // --- Status ---
  statusSuccess: "#137A4A",
  error: "#B42318",
  errorContainer: "#FEE7E5",

  // --- Back-compat aliases (used across older screens) ---
  // saffron was the legacy primary CTA — repoint to black so unmodified
  // screens keep rendering the new primary without code changes.
  saffron:     "#000000",
  saffronDark: "#000000",
  saffronTint: "#F3F3F8",
  indigo:      "#3F37C9",        // kept for brand-accent usages
  indigoDark:  "#2F28A8",
  indigoTint:  "#EEEDFE",

  bg:            "#F9F9FE",
  text:          "#1A1C1F",
  textSecondary: "#5E5E60",
  textMuted:     "#7E7576",
  border:        "#E2E2E7",
  borderStrong:  "#C6C6CD",
  overlay:       "rgba(15, 17, 22, 0.45)",
  overlayDark:   "rgba(15, 17, 22, 0.65)",

  // --- Semantic aliases ---
  primaryDark:  "#1A1C1F",
  primaryLight: "#EEEDFE",       // gentle accent tint
  success:      "#137A4A",
  successLight: "#E6F5EC",
  danger:       "#B42318",
  dangerLight:  "#FEE7E5",
  warning:      "#92400E",
  warningLight: "#FEF3C7",
  info:         "#1D4ED8",
  infoLight:    "#EEF2FF",
  money:        "#137A4A",       // earnings/price highlight
  soft:         "#F3F3F8",
  surface2:     "#F3F3F8",
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
  xxl: 28,
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
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  lg: {
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
  },
};

// Typography — Plus Jakarta Sans family (per Batch 1 spec).
// Keys preserved so older usages (`fonts.display`, `fonts.body`, etc.) keep
// working without code changes. If the family fails to load (e.g. asset not
// bundled on a device), RN falls back to the platform default — sizes and
// weights still match the Plus Jakarta scale so layout doesn't shift.
export const fonts = {
  display:     "PlusJakartaSans_800ExtraBold",
  displayBold: "PlusJakartaSans_700Bold",
  headlineLg:  "PlusJakartaSans_700Bold",
  headlineMd:  "PlusJakartaSans_600SemiBold",
  headlineSm:  "PlusJakartaSans_700Bold",
  body:        "PlusJakartaSans_400Regular",
  bodyMedium:  "PlusJakartaSans_500Medium",
  bodySemi:    "PlusJakartaSans_600SemiBold",
  bodyBold:    "PlusJakartaSans_700Bold",
  labelMd:     "PlusJakartaSans_600SemiBold",
  labelSm:     "PlusJakartaSans_500Medium",
};

// Type scale. Screen titles 28, card titles 18-20, body 14-16.
export const sizes = {
  display:  44,
  h1:       28,   // screen title
  h2:       22,
  h3:       20,   // card title (top of range)
  h4:       18,
  bodyLg:   16,
  body:     15,
  labelMd:  13,
  labelSm:  12,
  small:    13,
  caption:  12,
  tiny:     11,   // small bold labels
  micro:    10,
};
