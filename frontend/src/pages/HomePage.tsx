import { useEffect } from 'react';
import { useGetIdentity } from '@refinedev/core';
import { useNavigate } from 'react-router';

import AppBar from '../components/layout/AppBar';
import Hero from '../components/home/Hero';
import Tutorial from '../components/home/Tutorial';
import FeaturedFormats from '../components/home/FeaturedFormats';
import Reconnexion from '../components/home/Reconnexion';
import type { Identity } from '../types';

/** Public marketing home page. Logged-in users never see it — they land straight on
 *  `/events`, matching the current app's behavior. */
const HomePage = () => {
  const navigate = useNavigate();
  const { data: identity, isLoading } = useGetIdentity<Identity>();

  useEffect(() => {
    if (!isLoading && identity?.id) navigate('/events', { replace: true });
  }, [identity, isLoading, navigate]);

  if (isLoading || identity?.id) return null;

  return (
    <>
      <AppBar />
      <Hero />
      <Tutorial />
      <FeaturedFormats />
      <Reconnexion />
    </>
  );
};

export default HomePage;
