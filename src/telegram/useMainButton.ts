import { useEffect, useRef } from 'react';
import { setMainButton } from './index';

/**
 * Bind Telegram's MainButton for the lifetime of a component. No-ops outside
 * Telegram — screens always ship their own in-app buttons too.
 */
export function useMainButton(active: boolean, text: string, onClick: () => void, enabled = true): void {
  const cb = useRef(onClick);
  cb.current = onClick;
  useEffect(() => {
    if (!active) {
      setMainButton(null);
      return;
    }
    setMainButton({ text, onClick: () => cb.current(), enabled });
    return () => setMainButton(null);
  }, [active, text, enabled]);
}
