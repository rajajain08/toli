'use client';
import { useEffect } from 'react';

/** Registers /sw.js once the page has loaded, in production builds only (the dev server and HMR fight a SW). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    const register = () => void navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
