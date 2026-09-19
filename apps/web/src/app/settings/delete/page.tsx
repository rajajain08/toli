import { RequireAuth } from '@/components/RequireAuth';
import { DeleteAccount } from './DeleteAccount';

export const metadata = { title: 'Delete account · Toli' };

export default function DeleteAccountPage() {
  return (
    <RequireAuth>
      <DeleteAccount />
    </RequireAuth>
  );
}
