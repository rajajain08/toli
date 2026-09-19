'use client';
import { Button, Panel } from '@toli/ui';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'toli:install-dismissed-at';
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

const snoozed = (): boolean => {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY) ?? 0);
    return Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
};

/**
 * "Add Toli to your home screen". Android and desktop Chrome hand us an install event to replay on a tap;
 * iOS Safari has no such event, so there it is a one-line hint. Never shown once installed, and "Not now"
 * is respected for a month.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone || snoozed()) return;
    setHidden(false);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    const ua = navigator.userAgent;
    setIosHint(/iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua));
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // no storage: it simply shows again next time
    }
    setHidden(true);
  };

  if (hidden || (!event && !iosHint)) return null;

  return (
    <Panel>
      <div
        role="region"
        aria-label="Install Toli"
        style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ color: 'var(--toli-ink)', fontWeight: 600 }}>
          Keep Toli on your home screen
        </div>
        <div>
          {event
            ? 'It opens like an app, and works when the network doesn’t.'
            : 'Tap the Share button, then “Add to Home Screen”.'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {event ? (
            <Button
              size="small"
              onClick={async () => {
                await event.prompt();
                const choice = await event.userChoice;
                if (choice.outcome === 'accepted') setHidden(true);
                else dismiss();
              }}
            >
              Install
            </Button>
          ) : null}
          <Button variant="ghost" size="small" onClick={dismiss}>
            Not now
          </Button>
        </div>
      </div>
    </Panel>
  );
}
