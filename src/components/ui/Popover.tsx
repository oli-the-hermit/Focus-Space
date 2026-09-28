import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBlockingOverlay } from '../../lib/overlays';
import { cssDurationMs } from '../../lib/theme';

/** A viewport point to anchor to instead of an element (right-click menus). */
export interface AnchorPoint {
  x: number;
  y: number;
  /** Document the point belongs to (a Picture-in-Picture window has its own). */
  doc?: Document;
}

export interface PopoverProps {
  open: boolean;
  /** Element to anchor to. Either this or `anchorPoint` is required. */
  anchorRef?: React.RefObject<HTMLElement>;
  anchorPoint?: AnchorPoint | null;
  onClose: () => void;
  /** Called on Escape instead of onClose (e.g. to leave an inline sub-mode first). */
  onEscape?: () => void;
  children: React.ReactNode;
  align?: 'start' | 'end';
  /** Panel is at least as wide as the anchor. */
  matchWidth?: boolean;
  offset?: number;
  className?: string;
  role?: string;
  id?: string;
  ariaLabel?: string;
}

interface Position {
  top: number;
  left: number;
  maxHeight: number;
  minWidth: number;
  placement: 'below' | 'above';
}

const VIEWPORT_MARGIN = 8;

/**
 * Floating panel anchored to an element or a point. Renders into the anchor's own
 * document (so it also works inside a Picture-in-Picture window), flips above the
 * anchor when there is no room below, and swallows Escape so it never reaches an
 * enclosing modal.
 */
export const Popover: React.FC<PopoverProps> = ({
  open,
  anchorRef,
  anchorPoint,
  onClose,
  onEscape,
  children,
  align = 'start',
  matchWidth = true,
  offset = 6,
  className = '',
  role,
  id,
  ariaLabel
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Position | null>(null);
  // Stays true after `open` turns false while the exit (--dur-1 in popover.css) plays.
  const [mounted, setMounted] = useState(open);
  // Open menus pause the global keyboard shortcuts.
  useBlockingOverlay(role === 'menu' && (open || mounted));

  const onCloseRef = useRef(onClose);
  const onEscapeRef = useRef(onEscape);
  onCloseRef.current = onClose;
  onEscapeRef.current = onEscape;

  const getDoc = useCallback(
    () => anchorRef?.current?.ownerDocument || anchorPoint?.doc || document,
    [anchorRef, anchorPoint]
  );

  const getAnchorRect = useCallback((): DOMRect | null => {
    if (anchorPoint) return new DOMRect(anchorPoint.x, anchorPoint.y, 0, 0);
    return anchorRef?.current?.getBoundingClientRect() ?? null;
  }, [anchorRef, anchorPoint]);

  const reposition = useCallback(() => {
    const rect = getAnchorRect();
    const panel = panelRef.current;
    if (!rect || !panel) return;
    const win = getDoc().defaultView || window;
    // A point anchor opens right at the cursor, not a gap away from it.
    const gap = anchorPoint ? 2 : offset;
    const panelHeight = panel.scrollHeight;
    const panelWidth = Math.max(panel.offsetWidth, matchWidth ? rect.width : 0);

    const spaceBelow = win.innerHeight - rect.bottom - gap - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - gap - VIEWPORT_MARGIN;
    const placement: Position['placement'] =
      panelHeight <= spaceBelow || spaceBelow >= spaceAbove ? 'below' : 'above';
    const maxHeight = Math.max(120, placement === 'below' ? spaceBelow : spaceAbove);
    const height = Math.min(panelHeight, maxHeight);

    let left = align === 'end' ? rect.right - panelWidth : rect.left;
    left = Math.min(Math.max(VIEWPORT_MARGIN, left), win.innerWidth - panelWidth - VIEWPORT_MARGIN);
    const top = placement === 'below' ? rect.bottom + gap : rect.top - gap - height;

    setPos({ top, left, maxHeight, minWidth: matchWidth ? rect.width : 0, placement });
  }, [getAnchorRect, getDoc, anchorPoint, align, matchWidth, offset]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => {
      setMounted(false);
      setPos(null);
    }, cssDurationMs('--dur-1', getDoc()));
    return () => window.clearTimeout(t);
  }, [open, getDoc]);

  useLayoutEffect(() => {
    if (open && mounted) reposition();
  }, [open, mounted, reposition]);

  // Content can change height (search filtering, inline create) — keep placement right.
  useLayoutEffect(() => {
    if (!open || !mounted || !panelRef.current || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => reposition());
    ro.observe(panelRef.current);
    return () => ro.disconnect();
  }, [open, mounted, reposition]);

  useEffect(() => {
    if (!open) return;
    const doc = getDoc();
    const win = doc.defaultView || window;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onCloseRef.current();
    };

    // Capture phase on the document runs before the modal's window-level listener,
    // so stopping propagation here keeps Escape from also closing the modal.
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      (onEscapeRef.current || onCloseRef.current)();
    };

    // A point has nothing to follow: close on scroll/resize instead of drifting.
    const handleViewportChange = () => (anchorPoint ? onCloseRef.current() : reposition());

    doc.addEventListener('mousedown', handlePointerDown);
    doc.addEventListener('touchstart', handlePointerDown);
    doc.addEventListener('keydown', handleKeyDown, true);
    win.addEventListener('resize', handleViewportChange);
    win.addEventListener('scroll', handleViewportChange, true);
    win.addEventListener('blur', anchorPoint ? handleViewportChange : noop);
    return () => {
      doc.removeEventListener('mousedown', handlePointerDown);
      doc.removeEventListener('touchstart', handlePointerDown);
      doc.removeEventListener('keydown', handleKeyDown, true);
      win.removeEventListener('resize', handleViewportChange);
      win.removeEventListener('scroll', handleViewportChange, true);
      win.removeEventListener('blur', anchorPoint ? handleViewportChange : noop);
    };
  }, [open, anchorRef, anchorPoint, getDoc, reposition]);

  if (!open && !mounted) return null;
  const body = getDoc().body;
  const stateClass = !open ? 'is-leaving' : pos ? `is-${pos.placement}` : 'is-measuring';

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      role={role}
      aria-label={ariaLabel}
      className={`popover ${pos && !open ? `is-${pos.placement}` : ''} ${stateClass} ${className}`}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        maxHeight: pos?.maxHeight,
        minWidth: pos?.minWidth,
        pointerEvents: open ? undefined : 'none'
      }}
      // Portaled content still bubbles through the React tree; keep clicks from
      // reaching clickable ancestors such as a selectable session card.
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>,
    body
  );
};

function noop() {}
