import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconLogo } from '../ui/icons';
import { TOUR_CHAPTERS, TOUR_STEPS, TourStep } from './tourSteps';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: string;
}

type Side = 'right' | 'left' | 'bottom' | 'top' | 'center';

interface CardPos {
  top: number;
  left: number;
  side: Side;
  /** Arrow offset along the card edge, in px. */
  arrow: number;
}

const GAP = 16;
const MARGIN = 16;
const SMALL_TARGET = 56;

const findTarget = (id?: string) =>
  id ? document.querySelector<HTMLElement>(`[data-tour="${id}"]`) : null;

const isVisible = (el: HTMLElement | null) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** A zero-size hole in the middle of the screen: the box-shadow becomes a full scrim. */
const centerBox = (): Box => ({
  top: window.innerHeight / 2,
  left: window.innerWidth / 2,
  width: 0,
  height: 0,
  radius: 'var(--radius-2xl)'
});

function boxFor(el: HTMLElement): Box {
  const r = el.getBoundingClientRect();
  const small = r.height <= SMALL_TARGET;
  const pad = small ? 6 : 8;
  // Keep the hole inside the viewport so tall pages don't push it off screen.
  const top = Math.max(MARGIN / 2, r.top - pad);
  const left = Math.max(MARGIN / 2, r.left - pad);
  const bottom = Math.min(window.innerHeight - MARGIN / 2, r.bottom + pad);
  const right = Math.min(window.innerWidth - MARGIN / 2, r.right + pad);
  return {
    top,
    left,
    width: right - left,
    height: bottom - top,
    radius: small ? 'var(--radius-pill)' : 'var(--radius-2xl)'
  };
}

function placeCard(box: Box, cardW: number, cardH: number): CardPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fits: Record<Exclude<Side, 'center'>, boolean> = {
    right: box.left + box.width + GAP + cardW <= vw - MARGIN,
    left: box.left - GAP - cardW >= MARGIN,
    bottom: box.top + box.height + GAP + cardH <= vh - MARGIN,
    top: box.top - GAP - cardH >= MARGIN
  };
  const side: Side = (['right', 'left', 'bottom', 'top'] as const).find(s => fits[s]) || 'center';
  const clampX = (x: number) => Math.min(Math.max(MARGIN, x), vw - cardW - MARGIN);
  const clampY = (y: number) => Math.min(Math.max(MARGIN, y), vh - cardH - MARGIN);
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;

  let top = 0;
  let left = 0;
  let arrow = 0;
  if (side === 'right' || side === 'left') {
    left = side === 'right' ? box.left + box.width + GAP : box.left - GAP - cardW;
    // Align with the top of big targets, centre on small ones.
    top = clampY(box.height > cardH ? box.top : cy - cardH / 2);
    arrow = Math.min(Math.max(20, cy - top), cardH - 20);
    if (box.height > cardH) arrow = Math.min(28, cardH - 20);
  } else if (side === 'bottom' || side === 'top') {
    top = side === 'bottom' ? box.top + box.height + GAP : box.top - GAP - cardH;
    left = clampX(cx - cardW / 2);
    arrow = Math.min(Math.max(20, cx - left), cardW - 20);
  } else {
    // Target fills the screen: float the card over its bottom-right corner.
    top = clampY(vh - cardH - MARGIN * 2);
    left = clampX(vw - cardW - MARGIN * 2);
  }
  return { top, left, side, arrow };
}

/**
 * First-run tour: a welcome slide, spotlight steps across every page, and a
 * closing slide. Everything outside the highlighted element is dimmed and inert.
 */
export const OnboardingTour: React.FC = () => {
  const { tourActive, endTour, profile, setActiveTab } = useApp();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box>(centerBox);
  const [cardPos, setCardPos] = useState<CardPos | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const directionRef = useRef<1 | -1>(1);

  const steps = TOUR_STEPS;
  const step: TourStep = steps[Math.min(index, steps.length - 1)];
  const isSpot = step.kind === 'spot';

  // Restart from the welcome slide each time the tour opens.
  useEffect(() => {
    if (tourActive) {
      setIndex(0);
      setBox(centerBox());
      setTarget(null);
    }
  }, [tourActive]);

  const measure = useCallback((el: HTMLElement | null) => {
    setBox(el && isVisible(el) ? boxFor(el) : centerBox());
  }, []);

  // Show the step's page, wait for its target to have a size, then spotlight it.
  useEffect(() => {
    if (!tourActive) return;
    if (!isSpot) {
      setTarget(null);
      setBox(centerBox());
      return;
    }
    if (step.tab) setActiveTab(step.tab);
    // Polls with timers rather than requestAnimationFrame, which pauses while
    // the window isn't painting (hidden, minimized, mid-transition in a hidden pane).
    let timer = 0;
    let tries = 0;
    const seek = () => {
      const el = findTarget(step.target);
      if (isVisible(el)) {
        el!.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setTarget(el);
        measure(el);
        return;
      }
      // ~0.5s: page transitions take 260ms. Missing target → skip this step.
      if (++tries > 30) {
        const next = index + directionRef.current;
        setIndex(Math.max(0, Math.min(steps.length - 1, next)));
        return;
      }
      timer = window.setTimeout(seek, 16);
    };
    timer = window.setTimeout(seek, 16);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourActive, index]);

  // Follow the target when the window resizes or content shifts.
  useEffect(() => {
    if (!tourActive) return;
    const onChange = () => measure(target);
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    const ro = target && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onChange) : null;
    if (target) ro?.observe(target);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
      ro?.disconnect();
    };
  }, [tourActive, target, measure]);

  // Place the card next to the hole once both sizes are known.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!tourActive || !card) return;
    if (!isSpot) {
      setCardPos(null);
      return;
    }
    if (box.width === 0) return;
    setCardPos(placeCard(box, card.offsetWidth, card.offsetHeight));
  }, [tourActive, isSpot, box, index]);

  useEffect(() => {
    if (!tourActive) return;
    const t = window.setTimeout(() => nextBtnRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [tourActive, index]);

  const go = useCallback(
    (delta: 1 | -1) => {
      directionRef.current = delta;
      setIndex(i => Math.max(0, Math.min(steps.length - 1, i + delta)));
    },
    [steps.length]
  );

  const finish = useCallback(() => {
    endTour();
    setActiveTab('timer');
  }, [endTour, setActiveTab]);

  // Keyboard: arrows move, Enter continues, Escape closes, Tab stays in the card.
  // Captured so app shortcuts and anything underneath never see these keys.
  useEffect(() => {
    if (!tourActive) return;
    const next = () => (index < steps.length - 1 ? go(1) : finish());
    const onKey = (e: KeyboardEvent) => {
      const onButton = (e.target as HTMLElement)?.tagName === 'BUTTON';
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Enter' && !onButton) next();
      else if (e.key === 'Tab') {
        const list = Array.from(cardRef.current?.querySelectorAll<HTMLElement>('button') || []);
        if (list.length) {
          const i = list.indexOf(document.activeElement as HTMLElement);
          list[e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i + 1) % list.length].focus();
        }
      } else if ((e.key === 'Enter' || e.key === ' ') && onButton) {
        // Let the focused button click itself.
        e.stopPropagation();
        return;
      } else {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [tourActive, index, steps.length, go, finish]);

  const chapterInfo = useMemo(() => {
    if (!step.chapter) return null;
    const inChapter = steps.filter(s => s.chapter === step.chapter);
    return {
      name: strings.onboarding.chapters[step.chapter],
      current: inChapter.indexOf(step) + 1,
      total: inChapter.length
    };
  }, [step, steps]);

  if (!tourActive) return null;

  const name = profile?.displayName?.trim() || profile?.username || '';
  const title = step.kind === 'welcome' ? step.title.replace('{name}', name) : step.title;
  const isLast = index === steps.length - 1;
  const cardStyle: React.CSSProperties = isSpot
    ? cardPos
      ? ({ top: cardPos.top, left: cardPos.left, '--arrow': `${cardPos.arrow}px` } as React.CSSProperties)
      : { top: -9999, left: -9999 }
    : {};

  return createPortal(
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label={strings.onboarding.dialogLabel}>
      <div
        className="tour-hole"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: box.radius }}
        aria-hidden="true"
      />

      <div
        ref={cardRef}
        key={step.id}
        className={`tour-card ${isSpot ? `is-spot side-${cardPos?.side ?? 'center'}` : 'is-center'} ${step.kind === 'welcome' ? 'is-welcome' : ''}`}
        style={cardStyle}
      >
        <IconButton label={strings.onboarding.closeBtn} size="sm" className="tour-close" onClick={finish}>
          <IconClose size={16} />
        </IconButton>

        {!isSpot && (
          <span className={`tour-badge ${step.kind === 'done' ? 'is-done' : ''}`} aria-hidden="true">
            {step.kind === 'done' ? (
              <IconCheck size={26} strokeWidth={2.6} />
            ) : (
              <IconLogo size={26} />
            )}
          </span>
        )}

        {chapterInfo && (
          <div className="tour-meta">
            <span className="overline">{chapterInfo.name}</span>
            <span className="tour-count">
              {strings.onboarding.stepCounter
                .replace('{current}', String(chapterInfo.current))
                .replace('{total}', String(chapterInfo.total))}
            </span>
          </div>
        )}

        <h2 className="tour-title">{title}</h2>
        <p className="tour-body" aria-live="polite">{step.body}</p>

        <div className="tour-footer">
          {isSpot && (
            <div className="tour-dots" aria-hidden="true">
              {TOUR_CHAPTERS.map(c => (
                <span key={c} className={`tour-dot ${c === step.chapter ? 'is-current' : ''}`} />
              ))}
            </div>
          )}
          <div className="tour-actions">
            {step.kind === 'welcome' ? (
              <Button onClick={finish}>
                {strings.onboarding.laterBtn}
              </Button>
            ) : (
              <Button onClick={() => go(-1)}>
                <IconChevronLeft size={16} />
                {strings.onboarding.backBtn}
              </Button>
            )}
            <Button
              variant="primary"
              ref={nextBtnRef}
              onClick={() => (isLast ? finish() : go(1))}
            >
              {step.kind === 'welcome'
                ? strings.onboarding.startBtn
                : isLast
                  ? strings.onboarding.doneBtn
                  : strings.onboarding.nextBtn}
              {!isLast && step.kind !== 'welcome' && <IconChevronRight size={16} />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
