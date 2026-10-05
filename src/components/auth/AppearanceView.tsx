import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { strings } from '../../constants/strings';
import { ACCENT_GROUPS, ACCENT_PRESETS, type AccentId } from '../../constants/accents';
import type { ThemeMode } from '../../types';
import { accentTokens, pushRecentAccent, recentAccents, resolveTheme, type ResolvedTheme } from '../../lib/theme';
import { ColorSwatchGrid, type SwatchOption } from '../ui/ColorSwatchGrid';
import { SegmentedControl } from '../ui/SegmentedControl';

const s = strings.appearance;

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: s.themeLight },
  { value: 'dark', label: s.themeDark },
  { value: 'system', label: s.themeSystem }
];

/** Swatches as they look in the current theme. */
const toOptions = (ids: readonly AccentId[], theme: ResolvedTheme): SwatchOption[] =>
  ids.map(id => {
    const t = accentTokens(id, theme);
    return { value: id, label: s.colors[id], color: t['--accent'], onColor: t['--on-accent'] };
  });

export const AppearanceView: React.FC = () => {
  const { state, updateTheme, updateAccent } = useApp();
  const theme = resolveTheme(state.theme);

  // Recent colors stay put while the view is open, so the grid doesn't shift under
  // the pointer; the colors used here are remembered when it closes.
  const [recent] = useState(recentAccents);
  const openedWith = useRef(state.accent);
  const current = useRef(state.accent);
  current.current = state.accent;
  useEffect(() => () => {
    if (current.current === openedWith.current) return;
    pushRecentAccent(openedWith.current);
    pushRecentAccent(current.current);
  }, []);

  return (
    <>
      <h4 className="section-title">{s.themeTitle}</h4>
      <SegmentedControl
        options={THEME_OPTIONS}
        value={state.theme}
        onChange={updateTheme}
        ariaLabel={s.themeTitle}
        size="lg"
        surface={1}
      />

      <div className="section-divider" />
      <h4 className="section-title">{s.accentTitle}</h4>
      <p className="settings-subtitle">{s.accentDesc}</p>

      {recent.length > 0 && (
        <section className="swatch-section">
          <h5 className="swatch-section-title">{s.recentTitle}</h5>
          <ColorSwatchGrid options={toOptions(recent, theme)} value={state.accent} onChange={id => updateAccent(id as AccentId)} ariaLabel={s.recentTitle} />
        </section>
      )}

      <section className="swatch-section">
        <h5 className="swatch-section-title">{s.spaceColorsTitle}</h5>
        {ACCENT_GROUPS.map(group => (
          <div className="swatch-group" key={group}>
            <span className="swatch-group-label" aria-hidden="true">{s.groups[group]}</span>
            <ColorSwatchGrid
              options={toOptions(ACCENT_PRESETS.filter(p => p.group === group).map(p => p.id), theme)}
              value={state.accent}
              onChange={id => updateAccent(id as AccentId)}
              ariaLabel={s.groups[group]}
            />
          </div>
        ))}
      </section>
    </>
  );
};
