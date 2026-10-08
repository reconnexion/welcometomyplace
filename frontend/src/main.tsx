import React from 'react';
import { createRoot } from 'react-dom/client';

import { isBlockedByMaintenance, Maintenance } from './maintenance';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container!);
// The app is only loaded when it is not blocked, so that the maintenance page never
// depends on it.
isBlockedByMaintenance().then(async blocked => {
  if (blocked) {
    root.render(<Maintenance />);
    return;
  }
  const { default: App } = await import('./App');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
