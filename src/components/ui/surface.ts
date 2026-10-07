/**
 * The surface a control sits on, so its fill and hover stay one step above it:
 * 0 the page, 1 a card (the default), 2 and 3 raised rows and panels, or an accent fill.
 */
export type Surface = 0 | 1 | 2 | 3 | 'accent' | 'accent-container';

/** The class for a surface (none for the default, surface 1). */
export const surfaceClass = (surface: Surface | undefined): string | false =>
  surface !== undefined && surface !== 1 && `on-${surface}`;
