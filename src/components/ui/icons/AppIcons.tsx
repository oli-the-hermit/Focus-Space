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

/** The Focus Space mark: a clock face with a bolder stroke than IconClock. */
export const IconLogo: React.FC<IconProps> = ({ strokeWidth = 2.4, ...p }) => (
  <StrokeIcon strokeWidth={strokeWidth} {...p}>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15.5 14" />
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

export const IconUser: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </StrokeIcon>
);

export const IconSettings: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </StrokeIcon>
);

export const IconLogOut: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </StrokeIcon>
);

export const IconHelp: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4" />
    <line x1="12" y1="17.6" x2="12" y2="17.6" />
  </StrokeIcon>
);

export const IconInfo: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <circle cx="12" cy="12" r="9.5" />
    <line x1="12" y1="11" x2="12" y2="16.5" />
    <line x1="12" y1="7.6" x2="12" y2="7.6" />
  </StrokeIcon>
);

export const IconKeyboard: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
    <line x1="6.5" y1="9.5" x2="6.5" y2="9.5" />
    <line x1="10" y1="9.5" x2="10" y2="9.5" />
    <line x1="13.5" y1="9.5" x2="13.5" y2="9.5" />
    <line x1="17.5" y1="9.5" x2="17.5" y2="9.5" />
    <line x1="8" y1="14.5" x2="16" y2="14.5" />
  </StrokeIcon>
);

export const IconSparkle: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
    <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
  </StrokeIcon>
);

export const IconBug: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="7" y="8" width="10" height="13" rx="5" />
    <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <line x1="3" y1="13" x2="7" y2="13" />
    <line x1="17" y1="13" x2="21" y2="13" />
    <path d="M4 8.5l3.2 1.8M20 8.5l-3.2 1.8M4 19l3.2-2M20 19l-3.2-2" />
  </StrokeIcon>
);

export const IconBook: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
    <line x1="8" y1="7.5" x2="16" y2="7.5" />
  </StrokeIcon>
);

export const IconStar: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <polygon points="12 2.8 14.9 8.7 21.4 9.6 16.7 14.2 17.8 20.6 12 17.6 6.2 20.6 7.3 14.2 2.6 9.6 9.1 8.7" />
  </StrokeIcon>
);

export const IconGithub: React.FC<IconProps> = p => (
  <FillIcon {...p}>
    <path d="M12 1.8a10.2 10.2 0 0 0-3.23 19.88c.51.1.7-.22.7-.49v-1.7c-2.84.62-3.44-1.37-3.44-1.37-.46-1.18-1.13-1.49-1.13-1.49-.93-.63.07-.62.07-.62 1.03.07 1.57 1.06 1.57 1.06.91 1.56 2.39 1.11 2.97.85.09-.66.36-1.11.65-1.37-2.27-.26-4.65-1.13-4.65-5.04 0-1.11.4-2.03 1.05-2.74-.1-.26-.46-1.3.1-2.7 0 0 .86-.28 2.8 1.04a9.7 9.7 0 0 1 5.1 0c1.94-1.32 2.8-1.04 2.8-1.04.56 1.4.2 2.44.1 2.7.65.71 1.05 1.63 1.05 2.74 0 3.92-2.39 4.78-4.66 5.03.37.32.7.94.7 1.9v2.81c0 .27.18.6.7.49A10.2 10.2 0 0 0 12 1.8z" />
  </FillIcon>
);

export const IconExternal: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </StrokeIcon>
);

export const IconLock: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="4" y="10.5" width="16" height="10.5" rx="2.5" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </StrokeIcon>
);

export const IconMinimize: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <line x1="5.5" y1="12" x2="18.5" y2="12" />
  </StrokeIcon>
);

export const IconMaximize: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="5" y="5" width="14" height="14" rx="2.5" />
  </StrokeIcon>
);

export const IconRestore: React.FC<IconProps> = p => (
  <StrokeIcon {...p}>
    <rect x="4.5" y="8" width="11.5" height="11.5" rx="2.2" />
    <path d="M8.5 5.2A2.2 2.2 0 0 1 10.6 4H17.8A2.2 2.2 0 0 1 20 6.2v7.2a2.2 2.2 0 0 1-1.2 2" />
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

/* ── Row actions (smaller default size for dense list rows) ── */
export const IconEdit: React.FC<IconProps> = ({ size = 13, ...p }) => (
  <StrokeIcon size={size} {...p}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </StrokeIcon>
);

export const IconTrash: React.FC<IconProps> = ({ size = 13, ...p }) => (
  <StrokeIcon size={size} {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </StrokeIcon>
);

export const IconCopy: React.FC<IconProps> = ({ size = 13, ...p }) => (
  <StrokeIcon size={size} {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </StrokeIcon>
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 16, strokeWidth = 2.2, ...p }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...p}>
    <polyline points="6 9 12 15 18 9" />
  </StrokeIcon>
);

export const IconChevronUp: React.FC<IconProps> = ({ size = 16, strokeWidth = 2.2, ...p }) => (
  <StrokeIcon size={size} strokeWidth={strokeWidth} {...p}>
    <polyline points="18 15 12 9 6 15" />
  </StrokeIcon>
);

/** Drag handle: two columns of three dots. The span carries the class and the title tooltip. */
export const IconGrip: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className = 'drag-handle', ...props }) => (
  <span className={className} {...props}>
    {/* Tight box (not the 24-unit icon grid) so the handle takes little room in a row. */}
    <svg width="8" height="14" viewBox="0 0 8 14" fill="currentColor" aria-hidden="true">
      <circle cx="2" cy="3" r="1.25" />
      <circle cx="6" cy="3" r="1.25" />
      <circle cx="2" cy="7" r="1.25" />
      <circle cx="6" cy="7" r="1.25" />
      <circle cx="2" cy="11" r="1.25" />
      <circle cx="6" cy="11" r="1.25" />
    </svg>
  </span>
);
