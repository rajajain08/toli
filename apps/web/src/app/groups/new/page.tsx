import { RequireAuth } from '@/components/RequireAuth';
import { NewGroup } from './NewGroup';

export const metadata = { title: 'Start a group · Toli' };

export default function NewGroupPage() {
  return (
    <RequireAuth>
      <NewGroup />
    </RequireAuth>
  );
}
