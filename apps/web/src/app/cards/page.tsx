import { AppShell } from '@/components/AppShell';
import { MyCards } from './MyCards';

export const metadata = { title: 'My cards · Toli' };

export default function MyCardsPage() {
  return (
    <AppShell active="cards" flush>
      <MyCards />
    </AppShell>
  );
}
