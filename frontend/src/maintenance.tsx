import { APP_LANG, APP_NAME } from './config/env';

declare global {
  interface Window {
    /** Set by /maintenance.js, written when the frontend container starts */
    MAINTENANCE?: { previewCodeHash: string } | null;
  }
}

const PREVIEW_CODE_KEY = 'maintenancePreviewCode';

const sha256 = async (text: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * While the maintenance mode is on, only the browsers that opened the app once with
 * `?preview=<code>` (MAINTENANCE_PREVIEW_CODE) get the app, so that it can be tested.
 */
export const isBlockedByMaintenance = async () => {
  const maintenance = window.MAINTENANCE;
  if (!maintenance) return false;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('preview');
  if (code !== null) {
    try {
      localStorage.setItem(PREVIEW_CODE_KEY, code);
    } catch {}
    url.searchParams.delete('preview');
    window.history.replaceState(null, '', url);
  }

  let storedCode: string | null = null;
  try {
    storedCode = localStorage.getItem(PREVIEW_CODE_KEY);
  } catch {}
  return !(maintenance.previewCodeHash && storedCode && (await sha256(storedCode)) === maintenance.previewCodeHash);
};

const texts = {
  fr: {
    title: `${APP_NAME} est en cours de mise à jour`,
    body: "L'application passe à une nouvelle version d'ActivityPods. L'opération peut prendre plusieurs heures, pendant lesquelles elle n'est pas accessible.",
    footer: 'Vos données sont conservées dans votre Pod. Merci de votre patience, et à très vite !'
  },
  en: {
    title: `${APP_NAME} is being updated`,
    body: 'The app is moving to a new version of ActivityPods. This may take several hours, during which it is not available.',
    footer: 'Your data is kept in your Pod. Thank you for your patience, see you soon!'
  }
};

/** Plain page, without the app's providers, shown instead of the app */
export const Maintenance = () => {
  const t = APP_LANG === 'fr' ? texts.fr : texts.en;
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: '#262626'
      }}
    >
      <main
        style={{
          maxWidth: '32rem',
          margin: '1rem',
          padding: '2rem',
          background: '#fff',
          borderRadius: 12,
          borderTop: '6px solid #FFA500',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
          textAlign: 'center',
          lineHeight: 1.5
        }}
      >
        <h1 style={{ marginTop: 0, fontSize: '1.6rem', color: '#FFA500' }}>{t.title}</h1>
        <p>{t.body}</p>
        <p>{t.footer}</p>
      </main>
    </div>
  );
};
