'use client';
import { DomainError, maskPhone, parsePhone, type PhoneNumber } from '@toli/domain';
import { Button, Checkbox, Heading, Lede, Notice, TextField, Wordmark } from '@toli/ui';
import type { ConfirmationResult } from 'firebase/auth';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { track } from '@/lib/analytics';
import { callCompleteSignup } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { loadFirebase, usingEmulators } from '@/lib/firebase';

type Step = 'phone' | 'code' | 'profile';

const RECAPTCHA_ID = 'toli-recaptcha';

const messageOf = (err: unknown): string => {
  if (err instanceof DomainError) return err.message;
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code: unknown }).code);
    if (code.includes('invalid-verification-code'))
      return 'That code is not right. Check and try again.';
    if (code.includes('too-many-requests'))
      return 'Too many attempts. Wait a few minutes and try again.';
    if (code.includes('invalid-phone-number')) return 'Enter a valid phone number.';
    if (code.includes('invalid-argument') && 'message' in err)
      return String((err as { message: unknown }).message);
  }
  return 'Something went wrong. Try again.';
};

export function AuthFlow() {
  const { state, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next =
    params.get('next') && params.get('next')!.startsWith('/') ? params.get('next')! : '/groups';

  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [phone, setPhone] = useState<PhoneNumber | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [consent, setConsent] = useState(false);
  // Separate and unticked by default: marketing consent is never bundled with the consent to use Toli.
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const confirmation = useRef<ConfirmationResult | null>(null);
  // Set while this screen finishes a brand-new profile, so the signed-in effect below does not race
  // the onboarding redirect to Add cards.
  const onboarding = useRef(false);

  // Already signed in: finish the profile or leave.
  useEffect(() => {
    if (state.status !== 'signedIn') return;
    if (state.profile) {
      if (!onboarding.current) router.replace(next);
    } else {
      setStep('profile');
      setBusy(false);
      setError(undefined);
    }
  }, [state, next, router]);

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    let parsed: PhoneNumber;
    try {
      parsed = parsePhone(phoneInput);
    } catch (err) {
      return setError(messageOf(err));
    }
    setBusy(true);
    try {
      const { infra } = await loadFirebase();
      const [auth, { RecaptchaVerifier, signInWithPhoneNumber }] = await Promise.all([
        infra.loadAuth(),
        import('firebase/auth'),
      ]);
      if (usingEmulators()) auth.settings.appVerificationDisabledForTesting = true;
      const verifier = new RecaptchaVerifier(auth, RECAPTCHA_ID, { size: 'invisible' });
      confirmation.current = await signInWithPhoneNumber(auth, parsed, verifier);
      verifier.clear();
      setPhone(parsed);
      setStep('code');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!confirmation.current) return setStep('phone');
    setBusy(true);
    try {
      await confirmation.current.confirm(code.trim());
      void track('otp_completed');
      // onAuthStateChanged in AuthProvider now decides: profile exists → next, else → profile step.
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    if (!consent)
      return setError(
        'Tick the first box to continue. Toli stores your name, your phone number and the names of your cards.',
      );
    setBusy(true);
    try {
      await callCompleteSignup({ name, consent, marketingOptIn });
      onboarding.current = true;
      await refreshProfile();
      // New people go straight to adding cards, then on to wherever they were headed.
      router.replace(`/cards/add?onboarding=1&next=${encodeURIComponent(next)}`);
    } catch (err) {
      setError(messageOf(err));
      setBusy(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        maxWidth: 480,
        margin: '0 auto',
        padding: '52px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        backgroundImage: 'var(--toli-hero-glow)',
      }}
    >
      <Wordmark height={28} />

      {step === 'phone' ? (
        <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Heading>Know whose card to use before the bill comes</Heading>
            <Lede>Sign in with your phone. We text you a code; nothing to remember.</Lede>
          </div>
          <TextField
            id="phone"
            label="Your phone number"
            prefix="+91"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="98765 43210"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            error={error}
            autoFocus
          />
          <div id={RECAPTCHA_ID} />
          <Button type="submit" full disabled={busy}>
            {busy ? 'Sending…' : 'Get code by SMS'}
          </Button>
          <Notice>
            We only store card names. Never numbers, CVV, limits or balances.{' '}
            <Link href="/privacy" style={{ fontWeight: 600 }}>
              See exactly what friends see
            </Link>
          </Notice>
        </form>
      ) : null}

      {step === 'code' && phone ? (
        <form onSubmit={confirmCode} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Heading>Enter the code</Heading>
            <Lede>We sent a 6-digit code to {maskPhone(phone)}.</Lede>
          </div>
          <TextField
            id="code"
            label="Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            autoFocus
          />
          <Button type="submit" full disabled={busy || code.trim().length < 6}>
            {busy ? 'Checking…' : 'Continue'}
          </Button>
          <Button
            variant="ghost"
            size="small"
            onClick={() => {
              setStep('phone');
              setCode('');
              setError(undefined);
            }}
          >
            Use a different number
          </Button>
        </form>
      ) : null}

      {step === 'profile' ? (
        <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Heading>What should friends call you?</Heading>
            <Lede>Your name shows next to your cards in every group you join.</Lede>
          </div>
          <TextField
            id="name"
            label="Your name"
            type="text"
            autoComplete="given-name"
            placeholder="Rahul"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
            autoFocus
          />
          <Checkbox id="consent" checked={consent} onChange={setConsent}>
            I agree that Toli stores my name, my phone number and the names of cards I add, and
            shares card names with the groups I choose. Friends never see my number.{' '}
            <Link href="/privacy" style={{ fontWeight: 600 }}>
              Privacy
            </Link>
          </Checkbox>
          <Checkbox id="marketing" checked={marketingOptIn} onChange={setMarketingOptIn}>
            Optional: send me occasional updates and offers from Toli on this number. I can turn
            this off anytime.
          </Checkbox>
          <Button type="submit" full disabled={busy || name.trim().length === 0}>
            {busy ? 'Saving…' : 'Continue'}
          </Button>
        </form>
      ) : null}
    </main>
  );
}
