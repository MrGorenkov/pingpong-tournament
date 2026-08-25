import * as SDK from '@telegram-apps/sdk-react';

// The Telegram SDK surface drifts between versions, and the app must also run
// as a plain web page (dev + GitHub Pages preview). So every call goes through
// a permissive namespace + try/catch, and falls back to the classic
// window.Telegram.WebApp bridge (telegram-web-app.js) when the SDK isn't there.
const tg = SDK as unknown as Record<string, any>;
const legacy = (): any => (typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined);

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

export type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
export type HapticNotify = 'error' | 'success' | 'warning';

let started = false;

export function initTelegram(): void {
  if (started) return;
  started = true;

  safe(() => tg.init?.());
  safe(() => (tg.miniApp?.mountSync ? tg.miniApp.mountSync() : tg.miniApp?.mount?.()));
  safe(() => (tg.themeParams?.mountSync ? tg.themeParams.mountSync() : tg.themeParams?.mount?.()));
  safe(() => tg.viewport?.mount?.());
  safe(() => tg.mainButton?.mount?.());

  // Bind Telegram theme variables (--tg-theme-*) so CSS can inherit them.
  safe(() => tg.themeParams?.bindCssVars?.());
  safe(() => tg.miniApp?.bindCssVars?.());
  safe(() => tg.viewport?.bindCssVars?.());
  safe(() => tg.viewport?.expand?.());

  // classic bridge
  safe(() => legacy()?.ready?.());
  safe(() => legacy()?.expand?.());
}

export function isInTelegram(): boolean {
  const viaSdk = safe(() => (typeof tg.isTMA === 'function' ? Boolean(tg.isTMA()) : false));
  if (viaSdk) return true;
  return Boolean(legacy()?.initData);
}

export function hapticImpact(kind: HapticImpact = 'medium'): void {
  if (tg.hapticFeedback?.impactOccurred) {
    safe(() => tg.hapticFeedback.impactOccurred(kind));
    return;
  }
  safe(() => legacy()?.HapticFeedback?.impactOccurred?.(kind));
}

export function hapticNotify(type: HapticNotify = 'success'): void {
  if (tg.hapticFeedback?.notificationOccurred) {
    safe(() => tg.hapticFeedback.notificationOccurred(type));
    return;
  }
  safe(() => legacy()?.HapticFeedback?.notificationOccurred?.(type));
}

export function hapticSelection(): void {
  if (tg.hapticFeedback?.selectionChanged) {
    safe(() => tg.hapticFeedback.selectionChanged());
    return;
  }
  safe(() => legacy()?.HapticFeedback?.selectionChanged?.());
}

export interface MainButtonConfig {
  text: string;
  onClick: () => void;
  visible?: boolean;
  enabled?: boolean;
}

let detachClick: (() => void) | null = null;

/** Drive Telegram's native MainButton. Pass null to hide it. Safe no-op on web. */
export function setMainButton(cfg: MainButtonConfig | null): void {
  if (detachClick) {
    safe(detachClick);
    detachClick = null;
  }

  if (!cfg) {
    safe(() => tg.mainButton?.setParams?.({ isVisible: false }));
    safe(() => legacy()?.MainButton?.hide?.());
    return;
  }

  // Preferred: @telegram-apps SDK
  const usedSdk = safe(() => {
    if (!tg.mainButton?.setParams || !tg.mainButton?.onClick) return false;
    if (tg.mainButton.mount && tg.mainButton.isMounted && !tg.mainButton.isMounted()) {
      tg.mainButton.mount();
    }
    tg.mainButton.setParams({
      text: cfg.text,
      isVisible: cfg.visible !== false,
      isEnabled: cfg.enabled !== false,
    });
    const off = tg.mainButton.onClick(cfg.onClick);
    detachClick = typeof off === 'function' ? off : () => safe(() => tg.mainButton.offClick?.(cfg.onClick));
    return true;
  });
  if (usedSdk) return;

  // Fallback: classic bridge
  safe(() => {
    const mb = legacy()?.MainButton;
    if (!mb) return;
    mb.setText?.(cfg.text);
    if (cfg.enabled === false) mb.disable?.();
    else mb.enable?.();
    if (cfg.visible === false) mb.hide?.();
    else mb.show?.();
    mb.onClick?.(cfg.onClick);
    detachClick = () => safe(() => mb.offClick?.(cfg.onClick));
  });
}
