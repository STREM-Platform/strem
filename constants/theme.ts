/**
 * STREM design tokens.
 *
 * Premium dark product UI with a disciplined monochrome base and restrained
 * Bulgarian green/red accents. The glow-heavy brand assets are inspiration,
 * not a default product surface treatment.
 */

export const Colors = {
  background: "#070809",
  backgroundElevated: "#0B0D10",
  surface: "#121418",
  surfaceRaised: "#181B20",
  surfaceMuted: "#20242A",
  surfaceInverse: "#F5F7F5",
  text: "#F6F7F2",
  textMuted: "#A8AFB5",
  textSubtle: "#707982",
  border: "#2A3036",
  borderStrong: "#3A4149",
  accentGreen: "#00966E",
  accentGreenBright: "#20C997",
  accentGreenSoft: "#0E241D",
  accentRed: "#D62612",
  accentRedSoft: "#301411",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type ColorToken = keyof typeof Colors;

export const Spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 44,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  pill: 999,
} as const;

export const Typography = {
  brand: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 3,
  },
  screenTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
} as const;

export const Shadows = {
  card: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.26,
    shadowRadius: 24,
    elevation: 8,
  },
  nav: {
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.24,
    shadowRadius: 20,
    elevation: 16,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.xl,
  appBottomInset: 112,
} as const;
