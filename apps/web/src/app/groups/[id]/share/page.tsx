import { RequireAuth } from '@/components/RequireAuth';
import { ShareWithGroup } from './ShareWithGroup';

export const metadata = { title: 'Share your cards · Toli' };

export default async function ShareWithGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <ShareWithGroup id={id} />
    </RequireAuth>
  );
}
