import React, { FormEvent, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import { strings } from '../../constants/strings';
import { Button } from '../ui/Button';
import { Field, TextInput } from '../ui/Field';
import { IconLogo } from '../ui/icons';
import { LIMITS } from '../../constants/limits';
import { format } from '../../lib/i18n';

export const LoginScreen: React.FC = () => {
  const { login, setup } = useApp();
  const [mode, setMode] = useState<'login' | 'setup'>('login');
  const [serverUp, setServerUp] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Poll the local API until it is reachable (it may boot slightly after Vite).
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const check = async () => {
      try {
        const res = await api.get<{ ok: boolean; requiresSetup: boolean }>('/api/health');
        if (cancelled) return;
        setServerUp(true);
        setMode(res.requiresSetup ? 'setup' : 'login');
        setError('');
      } catch (err) {
        if (cancelled) return;
        setServerUp(false);
        setError(err instanceof Error ? err.message : strings.auth.serverUnreachable);
        timer = window.setTimeout(check, 3000);
      }
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const switchMode = () => {
    setMode(m => (m === 'login' ? 'setup' : 'login'));
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(strings.auth.fieldRequired);
      return;
    }
    if (mode === 'setup') {
      if (!displayName.trim()) {
        setError(strings.auth.fieldRequired);
        return;
      }
      if (password.length < LIMITS.password.min) {
        setError(format(strings.auth.weakPassword, { min: LIMITS.password.min }));
        return;
      }
      if (password !== confirm) {
        setError(strings.auth.passwordsDontMatch);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'setup') {
        await setup(username.trim(), displayName.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.requestInterrupted);
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <IconLogo size={30} />
        </div>
        <h1 className="auth-title">
          {mode === 'setup' ? strings.auth.setupTitle : strings.auth.signInTitle}
        </h1>
        <p className="auth-subtitle">
          {mode === 'setup' ? strings.auth.setupSubtitle : strings.auth.signInSubtitle}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'setup' && (
            <Field label={strings.auth.displayNameLabel}>
              <TextInput
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder={strings.auth.displayNamePlaceholder}
                maxLength={LIMITS.displayName.max}
                autoFocus
              />
            </Field>
          )}

          <Field label={strings.auth.usernameLabel}>
            <TextInput
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={strings.auth.usernamePlaceholder}
              autoComplete="username"
              autoFocus={mode === 'login'}
              maxLength={LIMITS.username.max}
            />
          </Field>

          <Field label={strings.auth.passwordLabel}>
            <TextInput
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'setup' ? 'new-password' : 'current-password'}
            />
          </Field>

          {mode === 'setup' && (
            <Field label={strings.auth.confirmPasswordLabel}>
              <TextInput
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </Field>
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <Button variant="primary" className="auth-submit" type="submit" disabled={busy || !serverUp}>
            {busy
              ? mode === 'setup'
                ? strings.auth.creating
                : strings.auth.signingIn
              : mode === 'setup'
                ? strings.auth.createAccountBtn
                : strings.auth.signInBtn}
          </Button>
        </form>

        {serverUp && (
          <button type="button" className="auth-switch" onClick={switchMode}>
            {mode === 'login' ? strings.auth.switchToSetup : strings.auth.switchToLogin}
          </button>
        )}
      </div>
    </div>
  );
};