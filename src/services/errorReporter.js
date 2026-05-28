function toSafeErrorPayload(error, context = {}) {
  const base = {
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    ...context,
  };

  if (error instanceof Error) {
    return {
      ...base,
      type: 'runtime_error',
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }

  if (error && typeof error === 'object' && 'status' in error) {
    return {
      ...base,
      type: 'route_error_response',
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    };
  }

  return {
    ...base,
    type: 'unknown_error',
    message: String(error),
  };
}

export function reportAppError(error, context = {}) {
  const payload = toSafeErrorPayload(error, context);

  // Swap this transport with Sentry/Datadog/NewRelic in production.
  if (import.meta.env.DEV) {
    console.error('[ErrorReporter]', payload);
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon('/api/client-errors', blob);
      return;
    }

    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never let reporting crash UI.
  }
}
