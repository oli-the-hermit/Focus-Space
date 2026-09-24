// SSoT Design Tokens (Plasmic & Component Design System)
// Mirrors the dark theme in src/styles/tokens.css — keep both in sync.
export const theme = {
  colors: {
    bg: '#0E0F11',
    bgCard: '#16181B',
    bgCardSolid: '#16181B',
    bgCardHover: '#1E2024',
    surface2: '#1E2024',
    surface3: '#272A2F',
    surface4: '#31343A',

    primary: '#D1DD23',
    primaryHover: '#DDE84A',
    onPrimary: '#1A1D00',
    primaryContainer: '#3A3F0A',
    onPrimaryContainer: '#E8F07A',

    secondary: '#A9ACA4',
    secondaryHover: '#F1F2EC',

    textMain: '#F1F2EC',
    textMuted: '#A9ACA4',
    textDim: '#6F736B',

    statusIdle: '#6F736B',
    statusFocus: '#D1DD23',
    statusBreak: '#5EC8B8',
    statusPaused: '#F2B654',

    danger: '#FF8A7A',
    dangerHover: '#FFA597',
    success: '#8BD48B',
    warning: '#F2B654',

    ringTrack: '#272A2F',
    ringFocusProgress: '#D1DD23',
    ringBreakProgress: '#5EC8B8'
  },
  typography: {
    fontFamily: "'Geist', 'Segoe UI Variable', system-ui, -apple-system, sans-serif",
    fontSizeXs: '0.75rem',
    fontSizeSm: '0.875rem',
    fontSizeBase: '1rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    fontSize2Xl: '1.5rem',
    fontSize3Xl: '2.5rem',
    fontSizeDigits: '5.4rem'
  },
  borderRadius: {
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
    pill: '999px'
  },
  // Flat system: only floating overlays are elevated.
  shadows: {
    sm: 'none',
    md: 'none',
    lg: '0 12px 32px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.35)'
  }
} as const;

export type ThemeTokens = typeof theme;
