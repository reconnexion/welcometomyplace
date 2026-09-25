import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useSearchParams } from 'react-router';
import { Layout, Spin } from 'antd';

import { authProvider } from '../providers';
import { DEFAULT_POD_PROVIDER } from '../config/env';

/**
 * Account creation. There is no signup UI of our own to show: the Pod provider owns that screen,
 * so this route only starts the Solid-OIDC flow with `is_signup` set (`authProvider.register`)
 * and hands over. Once the account exists and the app has been registered, `AntdAuthPage`
 * finishes the flow and returns the user to `?redirect` — which, coming from a public event
 * link, is the event page carrying `?join=true`.
 *
 * Without a configured Pod provider there is nobody to sign up with, so fall back to the login
 * page and its provider picker.
 */
const SignupPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/events';
  const { register } = authProvider;
  const canSignup = !!DEFAULT_POD_PROVIDER && !!register;

  useEffect(() => {
    if (canSignup) register!({ issuer: DEFAULT_POD_PROVIDER, redirect });
  }, [canSignup, register, redirect]);

  if (!canSignup) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return (
    <Layout style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" tip={t('pages.signup_redirecting')}>
        <div style={{ padding: 48 }} />
      </Spin>
    </Layout>
  );
};

export default SignupPage;
