import React from 'react';
import { IconProps } from './types';

// Shared stroke-icon shell so every glyph has identical sizing and stroke rules.
const StrokeIcon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 18,
  strokeWidth = 2,
  className = '',
  children,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

const FillIcon: React.FC<IconProps & { children: React.ReactNode }> = ({
  size = 18,
  className = '',
  children,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {children}
  </svg>
);

export const IconPlay: React.FC<IconProps> = p => (
  <FillIcon {...p}>
    <path d="M7 4.8v14.4a1 1 0 0 0 1.52.85l11.5-7.2a1 1 0 0 0 0-1.7L8.52 3.95A1 1 0 0 0 7 4.8z" />
  </FillIcon>
);

export const IconPause: React.FC<IconProps> = p => (
  <FillIcon {...p}>
    <rect x="6" y="4" width="4.5" height="16" rx="1.2" />
    <rect x="13.5" y="4" width="4.5" height="16" rx="1.2" />
  </FillIcon>
);

export const IconReset: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7" />
    <polyline points="3 3 3 9 9 9" />
  </StrokeIcon>
);

export const IconSkip: React.FC<IconProps> = p => (
  <FillIcon {...p}>
    <path d="M5 5.6v12.8a1 1 0 0 0 1.55.83l9.2-6.4a1 1 0 0 0 0-1.66l-9.2-6.4A1 1 0 0 0 5 5.6z" />
    <rect x="17" y="5" width="2.6" height="14" rx="1.1" />
  </FillIcon>
);

export const IconSoundOn: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </StrokeIcon>
);

export const IconSoundOff: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <line x1="23" y1="9" x2="17" y2="15" />
    <line x1="17" y1="9" x2="23" y2="15" />
  </StrokeIcon>
);

export const IconMiniPlayer: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="2" y="4" width="20" height="16" rx="3" />
    <rect x="12" y="11" width="7" height="6" rx="1.5" fill="currentColor" stroke="none" />
  </StrokeIcon>
);

export const IconPlus: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </StrokeIcon>
);

export const IconMinus: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </StrokeIcon>
);

export const IconCheck: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polyline points="20 6 9 17 4 12" />
  </StrokeIcon>
);

export const IconClose: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </StrokeIcon>
);

export const IconCalendar: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="3" y="4" width="18" height="18" rx="3" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </StrokeIcon>
);

export const IconClock: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 14" />
  </StrokeIcon>
);

export const IconPin: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M9 4h6l-1 5 4 3v2H6v-2l4-3-1-5z" />
    <line x1="12" y1="14" x2="12" y2="21" />
  </StrokeIcon>
);

export const IconLayers: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polygon points="12 3 22 8.5 12 14 2 8.5 12 3" />
    <polyline points="2 15.5 12 21 22 15.5" />
  </StrokeIcon>
);

export const IconExpand: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </StrokeIcon>
);

export const IconMore: React.FC<IconProps> = p => (
  <FillIcon {...p}>
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </FillIcon>
);

export const IconList: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </StrokeIcon>
);

export const IconGift: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polyline points="20 12 20 22 4 22 4 12" />
    <rect x="2" y="7" width="20" height="5" rx="1" />
    <line x1="12" y1="22" x2="12" y2="7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </StrokeIcon>
);

export const IconBell: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </StrokeIcon>
);

export const IconTimer: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="13" r="8" />
    <polyline points="12 9 12 13 14.5 15" />
    <line x1="9.5" y1="2.5" x2="14.5" y2="2.5" />
  </StrokeIcon>
);

export const IconTasks: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </StrokeIcon>
);

export const IconStats: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </StrokeIcon>
);

export const IconTarget: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </StrokeIcon>
);

export const IconChevronLeft: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polyline points="15 18 9 12 15 6" />
  </StrokeIcon>
);

export const IconChevronRight: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polyline points="9 18 15 12 9 6" />
  </StrokeIcon>
);

export const IconSearch: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </StrokeIcon>
);

export const IconUnlink: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M18.84 12.25l1.72-1.71a4.5 4.5 0 0 0-6.36-6.37l-1.72 1.72" />
    <path d="M5.16 11.75l-1.72 1.71a4.5 4.5 0 0 0 6.36 6.37l1.72-1.72" />
    <line x1="8" y1="2" x2="8" y2="5" />
    <line x1="2" y1="8" x2="5" y2="8" />
    <line x1="16" y1="19" x2="16" y2="22" />
    <line x1="19" y1="16" x2="22" y2="16" />
  </StrokeIcon>
);

export const IconFlag: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </StrokeIcon>
);

/** "Now playing" bars. Animates only while `playing` is true. */
export const IconEqualizer: React.FC<{ playing?: boolean; size?: number }> = ({ playing = false, size = 14 }) => (
  <span
    className={`equalizer ${playing ? 'is-playing' : ''}`}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <span />
    <span />
    <span />
  </span>
);
