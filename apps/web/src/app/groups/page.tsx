import { AppShell } from '@/components/AppShell';
import { Groups } from './Groups';

export const metadata = { title: 'Groups · Toli' };

export default function GroupsPage() {
  return (
    <AppShell active="groups">
      <Groups />
    </AppShell>
  );
}
