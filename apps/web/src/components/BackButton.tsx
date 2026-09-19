'use client';
import { Button, type ButtonProps } from '@toli/ui';
import { useRouter } from 'next/navigation';

/** Returns to wherever the person came from; `fallback` covers a page opened cold from a shared link. */
export function BackButton({
  fallback,
  children,
  ...rest
}: { fallback: string } & Omit<ButtonProps, 'onClick' | 'type'>) {
  const router = useRouter();
  return (
    <Button
      {...rest}
      onClick={() => (window.history.length > 1 ? router.back() : router.replace(fallback))}
    >
      {children}
    </Button>
  );
}
