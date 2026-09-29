import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProgressRing } from './ProgressRing';

const attr = (html: string, name: string) => [...html.matchAll(new RegExp(`${name}="([^"]+)"`, 'g'))].map(m => m[1]);

describe('ProgressRing', () => {
  it('draws the filled share of the circumference', () => {
    const html = renderToStaticMarkup(<ProgressRing value={0.25} box={40} radius={17} className="alert-ring" />);
    const c = 2 * Math.PI * 17;
    expect(html).toContain('viewBox="0 0 40 40"');
    expect(html).toContain('class="progress-ring alert-ring"');
    expect(attr(html, 'cx')).toEqual(['20', '20']);
    expect(Number(attr(html, 'stroke-dasharray')[0])).toBeCloseTo(c);
    expect(Number(attr(html, 'stroke-dashoffset')[0])).toBeCloseTo(c * 0.75);
  });

  it('clamps the value to 0–1', () => {
    const full = renderToStaticMarkup(<ProgressRing value={1.5} />);
    const empty = renderToStaticMarkup(<ProgressRing value={-1} />);
    expect(Number(attr(full, 'stroke-dashoffset')[0])).toBe(0);
    expect(Number(attr(empty, 'stroke-dashoffset')[0])).toBeCloseTo(2 * Math.PI * 46);
  });
});
