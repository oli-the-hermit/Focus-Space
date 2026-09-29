import React from 'react';
import { strings } from '../../constants/strings';
import { format } from '../../lib/i18n';
import { isTauri } from '../../lib/desktop';
import { platformLabel } from '../../lib/platform';
import { Button } from '../ui/Button';
import { IconLogo } from '../ui/icons';

interface CrashBoundaryProps {
  children: React.ReactNode;
}

interface CrashBoundaryState {
  error: Error | null;
  copied: boolean;
}

/** Text for a bug report: version, platform, message and stack. */
function crashDetails(error: Error, componentStack?: string | null): string {
  return [
    format(strings.help.versionLabel, { version: __APP_VERSION__ }),
    platformLabel(),
    // The web label already carries the user agent; on desktop it tells the web view version.
    ...(isTauri() ? [navigator.userAgent] : []),
    '',
    `${error.name}: ${error.message}`,
    error.stack ?? '',
    componentStack ? `\nComponent stack:${componentStack}` : ''
  ].join('\n');
}

/**
 * Catches a render crash anywhere below it and shows a calm recovery screen
 * instead of a blank window. Saved data lives on the server, so a reload is safe.
 */
export class CrashBoundary extends React.Component<CrashBoundaryProps, CrashBoundaryState> {
  state: CrashBoundaryState = { error: null, copied: false };
  private componentStack: string | null = null;

  static getDerivedStateFromError(error: Error): Partial<CrashBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.componentStack = info.componentStack ?? null;
    // Kept in the console (and the desktop log) for bug reports.
    console.error('Focus Space stopped rendering:', error, info.componentStack);
  }

  private copyDetails = () => {
    const { error } = this.state;
    if (!error) return;
    navigator.clipboard
      ?.writeText(crashDetails(error, this.componentStack))
      .then(() => this.setState({ copied: true }))
      .catch(() => { /* The clipboard can be blocked; the details are still in the console. */ });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="auth-screen" role="alert">
        <div className="auth-card">
          <div className="auth-logo">
            <IconLogo size={30} />
          </div>
          <h1 className="auth-title">{strings.crash.title}</h1>
          <p className="auth-subtitle">{strings.crash.body}</p>
          <div className="crash-actions">
            <Button variant="primary" onClick={() => window.location.reload()}>
              {strings.crash.reload}
            </Button>
            <Button onClick={this.copyDetails}>
              {this.state.copied ? strings.crash.copied : strings.crash.copyDetails}
            </Button>
          </div>
          <p className="crash-hint">{strings.crash.reportHint}</p>
        </div>
      </div>
    );
  }
}
