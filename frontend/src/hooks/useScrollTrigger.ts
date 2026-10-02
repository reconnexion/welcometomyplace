import { useEffect, useState } from 'react';

/** Whether the page has been scrolled past `threshold` pixels. Antd has no built-in equivalent
 *  of MUI's `useScrollTrigger`, used by the old `AppBar` to switch from transparent to opaque. */
const useScrollTrigger = (threshold: number): boolean => {
  const [trigger, setTrigger] = useState(() => window.scrollY > threshold);

  useEffect(() => {
    const onScroll = () => setTrigger(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return trigger;
};

export default useScrollTrigger;
