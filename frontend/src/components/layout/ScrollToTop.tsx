import { useEffect } from 'react';
import { useLocation } from 'react-router';

/** Scrolls back to the top of the page on every route change. */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
