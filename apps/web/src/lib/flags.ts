'use client';
import { useQuery } from '@tanstack/react-query';
import { loadFirebase, usingEmulators } from './firebase';

/** Remote Config flags (docs/architecture.md). Defaults apply offline, on the emulators and until the first fetch. */
export const FLAG_DEFAULTS = { directSharesEnabled: true } as const;
export type FlagName = keyof typeof FLAG_DEFAULTS;

async function fetchFlags(): Promise<Record<FlagName, boolean>> {
  if (typeof window === 'undefined' || usingEmulators()) return { ...FLAG_DEFAULTS };
  try {
    const [{ fb }, rc] = await Promise.all([loadFirebase(), import('firebase/remote-config')]);
    const config = rc.getRemoteConfig(fb.app);
    config.settings.minimumFetchIntervalMillis = 60 * 60 * 1000;
    config.defaultConfig = { ...FLAG_DEFAULTS };
    await rc.fetchAndActivate(config);
    return { directSharesEnabled: rc.getBoolean(config, 'directSharesEnabled') };
  } catch {
    return { ...FLAG_DEFAULTS };
  }
}

/** A flag ships dark and is switched on per cohort from the console. Renders with the default first, so no flash of nothing. */
export function useFlag(name: FlagName): boolean {
  const { data } = useQuery({ queryKey: ['flags'], queryFn: fetchFlags, staleTime: 60 * 60 * 1000 });
  return (data ?? FLAG_DEFAULTS)[name];
}
