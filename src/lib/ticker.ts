/**
 * A repeating tick that keeps running in a hidden tab or minimized window.
 *
 * Chromium throttles chained timers on hidden pages to about once a minute, which
 * delayed the end of a phase (and its alert). Timers inside a dedicated worker are
 * exempt, so the worker only posts "tick" and the page does the work.
 */
const WORKER_SOURCE = `
let id = null;
onmessage = e => {
  clearInterval(id);
  if (e.data > 0) id = setInterval(() => postMessage(0), e.data);
};
`;

let sharedUrl: string | null = null;

export function startTicker(onTick: () => void, intervalMs: number): () => void {
  try {
    sharedUrl ??= URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' }));
    const worker = new Worker(sharedUrl);
    worker.onmessage = () => onTick();
    worker.postMessage(intervalMs);
    return () => worker.terminate();
  } catch {
    // Workers blocked (strict CSP, old browser): a plain interval still works while visible.
    const id = window.setInterval(onTick, intervalMs);
    return () => window.clearInterval(id);
  }
}
