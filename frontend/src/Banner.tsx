import { useState } from 'react';
import { Alert } from 'antd';

declare global {
  interface Window {
    /** Set by /maintenance.js, written when the frontend container starts (empty: no banner) */
    BANNER_MESSAGE?: string;
  }
}

const DISMISSED_KEY = 'dismissedBannerMessage';

/** Turns the email addresses of the message into mailto links */
const linkify = (text: string) =>
  text.split(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+)/g).map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={`mailto:${part}`}>
        {part}
      </a>
    ) : (
      part
    )
  );

/**
 * Shown on top of every page while the BANNER_MESSAGE env var of the frontend container is
 * set. Fixed rather than in the flow, so that the full-height layouts are not pushed down.
 * Once closed, it stays hidden in this browser until the message changes.
 */
const Banner = () => {
  const message = window.BANNER_MESSAGE;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === message;
    } catch {
      return false;
    }
  });

  if (!message || dismissed) return null;

  return (
    <Alert
      type="warning"
      banner
      closable
      message={<span style={{ whiteSpace: 'pre-line' }}>{linkify(message)}</span>}
      onClose={() => {
        try {
          localStorage.setItem(DISMISSED_KEY, message);
        } catch {}
        setDismissed(true);
      }}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1100, justifyContent: 'center', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}
    />
  );
};

export default Banner;
