import { useEffect, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';

const INACTIVITY_MS = 15 * 60 * 1000;
const WARNING_MS = 60 * 1000;

export function useInactivityLogout() {
  const { isAuthenticated, logout } = useAuth();
  const timer = useRef(null);
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = setTimeout(() => void logout(), WARNING_MS);
      }, INACTIVITY_MS - WARNING_MS);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isAuthenticated, logout]);
}
