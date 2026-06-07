import * as Sentry from '@sentry/react'

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'
    enabled: import.meta.env.PROD,     // solo activo en producción
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0, // sin performance por ahora
    // No capturar errores de red de Supabase que ya manejamos
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
  })
}

export { Sentry }
