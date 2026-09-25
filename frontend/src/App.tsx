import { Authenticated, Refine } from '@refinedev/core';
import { useNotificationProvider, ErrorComponent } from '@refinedev/antd';
import routerProvider, { CatchAllNavigate, UnsavedChangesNotifier } from '@refinedev/react-router';
import { AntdAuthPage } from '@activitypods/refine-providers/antd-auth-page';
import { BrowserRouter, Routes, Route, Outlet } from 'react-router';
import { App as AntdApp, ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import frFR from 'antd/locale/fr_FR';

import '@refinedev/antd/dist/reset.css';
import './index.css';

import { authProvider, dataProvider, formatDataProvider } from './providers';
import { i18nProvider } from './i18n';
import { APP_LANG, DEFAULT_POD_PROVIDER } from './config/env';
import theme from './theme';
import PageLayout from './components/layout/PageLayout';
import HomePage from './pages/HomePage';
import EventListPage from './pages/EventListPage';
import EventShowPage from './pages/EventShowPage';
import EventCreatePage from './pages/EventCreatePage';
import EventEditPage from './pages/EventEditPage';
import FormatListPage from './pages/FormatListPage';
import FormatShowPage from './pages/FormatShowPage';
import FormatCreatePage from './pages/FormatCreatePage';
import FormatEditPage from './pages/FormatEditPage';
import SignupPage from './pages/SignupPage';

const antdLocale = APP_LANG === 'fr' ? frFR : enUS;

const App = () => (
  <BrowserRouter>
    <ConfigProvider locale={antdLocale} theme={theme}>
      <AntdApp>
        <Refine
          authProvider={authProvider}
          dataProvider={{ default: dataProvider, appServer: formatDataProvider }}
          routerProvider={routerProvider}
          i18nProvider={i18nProvider}
          resources={[
            { name: 'event', list: '/events', show: '/events/:id', create: '/events/create', edit: '/events/:id/edit' },
            { name: 'location' },
            { name: 'profile' },
            { name: 'group' },
            {
              name: 'format',
              list: '/formats',
              show: '/formats/:id',
              create: '/formats/create',
              edit: '/formats/:id/edit',
              meta: { dataProviderName: 'appServer' }
            }
          ]}
          notificationProvider={useNotificationProvider}
          options={{
            syncWithLocation: true,
            warnWhenUnsavedChanges: true,
            disableTelemetry: true
          }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />

            {/* Public, reachable anonymously — matches the old app's `disableAuthentication` list/show. */}
            <Route path="/formats" element={<FormatListPage />} />
            <Route path="/formats/:id" element={<FormatShowPage />} />

            {/*
              Not wrapped in <Authenticated>: AntdAuthPage handles every stage (provider picker,
              OAuth callback, app registration) from the URL's search params, so this single
              route doubles as the OIDC redirectUri (defaults to `${origin}/login`, matching what
              the backend registers this app's OIDC client with — see app.service.js).
            */}
            <Route
              path="/login"
              element={<AntdAuthPage authProvider={authProvider} defaultPodProvider={DEFAULT_POD_PROVIDER} redirect="/events" />}
            />

            {/* Kicks off the Solid-OIDC flow in signup mode, then hands back to /login's callback */}
            <Route path="/signup" element={<SignupPage />} />

            {/*
              Public on purpose, unlike every other event route: an event shared with a public
              link is opened by people who have no account yet. EventShowPage itself sends a
              visitor with neither a session nor a `?cap=` credential on to /login.
            */}
            <Route path="/events/:id" element={<EventShowPage />} />

            <Route
              element={
                <Authenticated key="authenticated-routes" fallback={<CatchAllNavigate to="/login" />}>
                  <Outlet />
                </Authenticated>
              }
            >
              <Route path="/events" element={<EventListPage />} />
              <Route path="/events/create" element={<EventCreatePage />} />
              <Route path="/events/:id/edit" element={<EventEditPage />} />
              {/* No button anywhere links here — matches the old app, where these routes existed
                  but weren't linked from the UI either (Format isn't meant to be user-writable). */}
              <Route path="/formats/create" element={<FormatCreatePage />} />
              <Route path="/formats/:id/edit" element={<FormatEditPage />} />
            </Route>

            <Route
              element={
                <Authenticated key="catch-all">
                  <PageLayout>
                    <Outlet />
                  </PageLayout>
                </Authenticated>
              }
            >
              <Route path="*" element={<ErrorComponent />} />
            </Route>
          </Routes>
          <UnsavedChangesNotifier />
        </Refine>
      </AntdApp>
    </ConfigProvider>
  </BrowserRouter>
);

export default App;
