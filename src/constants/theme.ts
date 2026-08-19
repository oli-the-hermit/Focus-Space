// SSoT Design Tokens (Plasmic & Component Design System)
export const theme = {
  colors: {
    bg: '#F8F9FA',
    bgCard: '#FFFFFF',
    bgCardSolid: '#FFFFFF',
    bgCardHover: '#F1F5F9',
    border: '#E3E6E3',
    borderLight: '#EDEEED',
    borderFocus: '#1A73E8',
    
    primary: '#1A73E8',
    primaryHover: '#1557B0',
    primaryGlow: 'rgba(26, 115, 232, 0.18)',
    
    secondary: '#5E6360',
    secondaryHover: '#334155',

    textMain: '#1F1F1F',
    textMuted: '#9AA19C',
    textDim: '#ABABAB',

    statusIdle: '#9AA19C',
    statusFocus: '#1A73E8',
    statusBreak: '#188038',
    statusPaused: '#B06000',

    danger: '#C5221F',
    dangerHover: '#A51D1A',
    success: '#188038',
    warning: '#B06000',

    ringTrack: '#E3E6E3',
    ringFocusProgress: '#1A73E8',
    ringBreakProgress: '#188038'
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    fontSizeXs: '0.75rem',
    fontSizeSm: '0.875rem',
    fontSizeBase: '1rem',
    fontSizeLg: '1.125rem',
    fontSizeXl: '1.25rem',
    fontSize2Xl: '1.5rem',
    fontSize3Xl: '2.5rem',
    fontSizeDigits: '2.6rem'
  },
  borderRadius: {
    sm: '8px',
    md: '14px',
    lg: '20px',
    pill: '999px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
    lg: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.06)'
  }
} as const;

export type ThemeTokens = typeof theme;
