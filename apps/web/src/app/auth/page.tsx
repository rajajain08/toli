import { AuthFlow } from './AuthFlow';

export const metadata = { title: 'Sign in · Toli' };

/** Statically rendered with the phone form in the HTML, so it paints before any JavaScript arrives. */
export default function AuthPage() {
  return <AuthFlow />;
}
