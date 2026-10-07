import type { ReactNode } from 'react';

/** Section heading with the orange gradient "pill" badge behind the label text (see
 *  `.ap-body-label` in index.css) — used throughout the event show page. */
const BodyLabel = ({ children }: { children: ReactNode }) => (
  <h2 className="ap-body-label">
    <span>{children}</span>
  </h2>
);

export default BodyLabel;
