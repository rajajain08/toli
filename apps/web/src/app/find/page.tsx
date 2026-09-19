import { AppShell } from '@/components/AppShell';
import { Find } from './Find';

export const metadata = { title: 'Find · Toli' };

export default function FindPage() {
  return (
    <AppShell active="find">
      <Find />
    </AppShell>
  );
}
