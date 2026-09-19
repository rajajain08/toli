import { RequireAuth } from '@/components/RequireAuth';
import { Settings } from './Settings';

export const metadata = { title: 'Settings · Toli' };

export default function SettingsPage() {
  return (
    <RequireAuth>
      <Settings />
    </RequireAuth>
  );
}
