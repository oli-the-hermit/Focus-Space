/**
 * Alerts: the end of a focus/break phase and upcoming calendar sessions.
 *
 * One payload shape travels everywhere:
 *   - in-app island (App visible)          → AlertIsland in App.tsx
 *   - desktop island window (app behind)   → src/island/IslandApp.tsx, shown by Rust
 *   - browser notification (tab hidden)    → public/notify-sw.js, with action buttons
 */
import { strings } from '../constants/strings';
import type { CalendarEvent, NotificationSettings, TimerPhase } from '../types';
import { format } from './i18n';

export type AlertKind = 'focus-done' | 'break-done' | 'event-soon';
export type AlertActionId = 'start-next' | 'start-session' | 'open-app';

export interface AlertAction {
  id: AlertActionId;
  label: string;
  primary?: boolean;
}

export interface AlertPayload {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  actions: AlertAction[];
  autoDismissSec: number;
  /** Session to start for `start-session`. */
  sessionId?: string | null;
}

/** Island → main (Tauri event) and service worker → page (postMessage). */
export const EVT_ALERT_ACTION = 'fs:alert-action';
export const SW_ALERT_MESSAGE = 'fs-alert-action';

export interface AlertActionMessage {
  action: AlertActionId | 'dismiss';
  payload: AlertPayload;
}

export const DEFAULT_AUTO_DISMISS_SEC = 10;

export function buildPhaseAlert(endedPhase: TimerPhase, settings: NotificationSettings): AlertPayload {
  const focusEnded = endedPhase === 'focus';
  return {
    id: `${endedPhase}-${Date.now()}`,
    kind: focusEnded ? 'focus-done' : 'break-done',
    title: focusEnded ? strings.alerts.focusDoneTitle : strings.alerts.breakDoneTitle,
    body: focusEnded ? strings.alerts.focusDoneBody : strings.alerts.breakDoneBody,
    actions: [
      { id: 'start-next', label: focusEnded ? strings.alerts.startBreak : strings.alerts.startFocus, primary: true },
      { id: 'open-app', label: strings.alerts.openApp }
    ],
    autoDismissSec: settings.autoDismissSec || DEFAULT_AUTO_DISMISS_SEC
  };
}

export function buildEventAlert(
  event: CalendarEvent,
  minutesLeft: number,
  settings: NotificationSettings
): AlertPayload {
  const actions: AlertAction[] = event.sessionId
    ? [
        { id: 'start-session', label: strings.actions.startSession, primary: true },
        { id: 'open-app', label: strings.alerts.openApp }
      ]
    : [{ id: 'open-app', label: strings.alerts.openApp, primary: true }];
  return {
    id: `event-${event.id}`,
    kind: 'event-soon',
    title: format(strings.alerts.eventSoonTitle, { time: event.startTime }),
    body: format(strings.alerts.eventSoonBody, { title: event.title, minutes: Math.max(0, minutesLeft) }),
    actions,
    autoDismissSec: settings.autoDismissSec || DEFAULT_AUTO_DISMISS_SEC,
    sessionId: event.sessionId ?? null
  };
}

// ── Web notifications ────────────────────────────────────────────────

export type WebPermission = NotificationPermission | 'unsupported';

export function webNotificationPermission(): WebPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export async function requestWebNotificationPermission(): Promise<WebPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

let swRegistration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the tiny worker that gives browser notifications their buttons. */
export function registerAlertWorker(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  swRegistration =
    'serviceWorker' in navigator && window.isSecureContext
      ? navigator.serviceWorker.register('/notify-sw.js').catch(() => null)
      : Promise.resolve(null);
  return swRegistration;
}

/** Shows a system notification; false if it couldn't (no permission, no support). */
export async function showWebNotification(payload: AlertPayload): Promise<boolean> {
  if (webNotificationPermission() !== 'granted') return false;
  const options = {
    body: payload.body,
    tag: payload.kind === 'event-soon' ? payload.id : 'fs-phase',
    renotify: true,
    icon: '/icon.svg',
    data: payload,
    actions: payload.actions.map(a => ({ action: a.id, title: a.label }))
  } as NotificationOptions;
  const reg = await registerAlertWorker();
  if (reg) {
    try {
      await reg.showNotification(payload.title, options);
      return true;
    } catch {}
  }
  try {
    // No worker: a plain notification (no buttons); clicking it focuses the tab.
    const n = new Notification(payload.title, { body: payload.body, tag: options.tag });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** The page is in front and can show the alert itself. */
export function pageIsInFront(): boolean {
  return document.visibilityState === 'visible' && document.hasFocus();
}
