/// <reference types="vite/client" />

// Classic Telegram WebApp bridge (telegram-web-app.js). We only touch a tiny,
// stable subset as a fallback; everything else goes through @telegram-apps/sdk-react.
interface TelegramWebApp {
  ready?: () => void;
  expand?: () => void;
  themeParams?: Record<string, string>;
  colorScheme?: 'light' | 'dark';
  HapticFeedback?: {
    impactOccurred?: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred?: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged?: () => void;
  };
  onEvent?: (event: string, cb: () => void) => void;
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
