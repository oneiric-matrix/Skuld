/**
 * Skuld Core Design Tokens
 * Adheres strictly to the 9 tenets in DESIGN.md:
 * Nordic Elemental Aesthetic (Midnight Obsidian, Glacial Cyan, Frost Silver, Slate).
 */

export const colors = {
  // Backgrounds
  background: '#0a0a12', // Midnight Obsidian
  surface: '#12121c', // Card Surface
  surfaceElevated: '#1a1a28', // Modals / Sheets
  surfaceSubtle: '#161622', // Subtle list item backgrounds

  // Aliases for Nordic palette
  midnightObsidian: '#0a0a12',
  cardSlate: '#12121c',
  cardElevated: '#1a1a28',
  cardBorder: '#1e1e2d',
  glacialCyan: '#00e5ff',
  frostSilver: '#dce4ec',
  slateMuted: '#64748b',
  runicGold: '#fbbf24',
  emeraldGreen: '#10b981',
  dangerRed: '#ef4444',
  amberWarning: '#f59e0b',

  // Borders & Dividers
  border: '#1e1e2d', // Micro-stroke border
  borderHighlighted: '#2e3048', // Focused / hovered border
  borderActiveRunic: '#00e5ff', // Active Glacial Cyan runic glow

  // Brand Accents
  accentCyan: '#00e5ff', // Glacial Cyan (Destiny glow, primary CTA, active states)
  accentFrost: '#dce4ec', // Frost Silver (Emblems, highlights)
  accentViolet: '#8b5cf6', // Subtle Aurora Violet
  accentGold: '#fbbf24', // Milestones / Achievements
  accentEmerald: '#10b981', // Health / Success / Done

  // Typography
  textPrimary: '#f8fafc', // Ultra-high legibility headers
  textSecondary: '#cbd5e1', // Primary body / subtitles
  textMuted: '#64748b', // Slate captions / metadata
  textDim: '#475569', // Placeholders

  // Semantic Status
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#00e5ff',

  // Overlays
  overlayBackdrop: 'rgba(5, 5, 10, 0.85)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const typography = {
  // Font sizes
  h1: 24,
  h2: 20,
  h3: 16,
  body: 14,
  caption: 12,
  micro: 10,

  // Line heights
  lineHeightH1: 30,
  lineHeightH2: 26,
  lineHeightH3: 22,
  lineHeightBody: 20,
  lineHeightCaption: 16,

  // Font weights
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,

  // Helper typography styles for direct spread in StyleSheet
  title: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700' as const,
    color: '#f8fafc',
  },
  bodyStyle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    color: '#cbd5e1',
  },
  captionStyle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    color: '#64748b',
  },
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
  round: 9999,
};

export const touchTargets = {
  min: 44,
  minTouchArea: 44, // Minimum 44x44px per WCAG / iOS Human Interface
  iconButtonSize: 48,
  hudButtonSize: 52,
};

export const animationTiming = {
  snappy: 150, // Micro-interactions, button presses
  normal: 220, // Tab switches, card expansions
  sheet: 280, // Modal / bottom sheet presentation
};
