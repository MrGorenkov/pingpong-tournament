import { useEffect, useRef, useState } from 'react';

/** Returns 'animate-flash' briefly whenever `signature` changes (post-mount). */
export function useFlashClass(signature: string): string {
  const first = useRef(true);
  const prev = useRef(signature);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      prev.current = signature;
      return;
    }
    if (prev.current !== signature) {
      prev.current = signature;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      return () => clearTimeout(t);
    }
  }, [signature]);

  return flash ? 'animate-flash' : '';
}
