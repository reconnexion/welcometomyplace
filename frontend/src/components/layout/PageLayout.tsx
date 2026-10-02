import type { ReactNode } from 'react';
import { AntdBackgroundChecks } from '@activitypods/refine-providers/antd-background-checks';

import { authProvider } from '../../providers';
import useOwnActor from '../../hooks/useOwnActor';
import AppBar, { APP_BAR_HEIGHT } from './AppBar';
import ScrollToTop from './ScrollToTop';

/**
 * Chrome around every page but the home/login/signup ones: the (always-opaque) app bar plus top
 * offset for its fixed height, wrapped — like the old app's `Layout` — in `AntdBackgroundChecks`,
 * which refuses to render the page while the backend is offline, sends the user back through the
 * consent screen when the app's access needs changed, and checks the backend is listening to the
 * user's inbox and outbox (it needs both to relay invitations and contact requests). Nothing of
 * that applies while logged out: public pages (formats, shared event links) render as usual.
 */
const PageLayout = ({ children }: { children: ReactNode }) => {
  // `listeningTo` is empty until the actor document is loaded; the checks re-run once it is.
  const { data: ownActor } = useOwnActor();
  const listeningTo = [ownActor?.inbox, ownActor?.outbox].filter((uri): uri is string => !!uri);

  return (
    <AntdBackgroundChecks authProvider={authProvider} listeningTo={listeningTo}>
      <ScrollToTop />
      <AppBar opaque />
      <div style={{ marginTop: APP_BAR_HEIGHT }}>{children}</div>
    </AntdBackgroundChecks>
  );
};

export default PageLayout;
