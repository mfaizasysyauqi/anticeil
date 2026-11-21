import './polyfills';
import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import './i18n';
import { App } from './app/app';
import { acquisitionUtils } from './lib/acquisition-utils';
import { errorReporting } from './lib/error-reporting';
import { reloadOnceForStaleChunk } from './lib/lazy-with-retry';
import { authenticationSession } from './lib/authentication-session';

// ── SSO Token Handoff (?token=...) ──────────────────────────────────────────
try {
  const searchParams = new URLSearchParams(window.location.search);
  const ssoToken = searchParams.get('token');
  if (ssoToken && !authenticationSession.isJwtExpired(ssoToken)) {
    authenticationSession.saveToken(ssoToken);
    searchParams.delete('token');
    const newSearch = searchParams.toString() ? `?${searchParams.toString()}` : '';
    window.history.replaceState(null, document.title, window.location.pathname + newSearch + window.location.hash);
  }
} catch (e) {
  console.error('Failed to handle SSO token handoff:', e);
}

acquisitionUtils.stashAcquisitionParams();

window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForStaleChunk('vite-preload')) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  if (errorReporting.isChunkLoadError(event.error ?? event.message)) {
    if (reloadOnceForStaleChunk('window-chunk')) {
      return;
    }
  }
  errorReporting.report({
    error: event.error ?? event.message,
    source: 'window-error',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  if (errorReporting.isChunkLoadError(event.reason)) {
    if (reloadOnceForStaleChunk('window-chunk')) {
      return;
    }
  }
  errorReporting.report({ error: event.reason, source: 'unhandled-rejection' });
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
