import type { UserId } from './ids';
import { InvalidArgument } from './errors';
import { LIMITS } from './limits';

/**
 * A person on Toli. Holds a phone HMAC (never the number) and the DPDP consent timestamp.
 * There is deliberately no field for a phone number, card number, limit or spend.
 */
/**
 * The version of the consent text a person agreed to. Bump it whenever that text changes what is stored
 * or how it is used; anyone on an older version is asked again at their next visit.
 *   1  name, a hash of the phone number, card names
 *   2  ADR-0013: the phone number itself is kept, with a separate optional marketing choice
 */
export const CONSENT_VERSION = 2;

export const needsConsent = (user: Pick<User, 'consentVersion'>): boolean =>
  user.consentVersion < CONSENT_VERSION;

export interface User {
  readonly id: UserId;
  readonly name: string;
  readonly phoneHash: string;
  readonly consentAt: Date;
  readonly consentVersion: number;
  readonly createdAt: Date;
}

export const normaliseDisplayName = (raw: string): string => {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length === 0) throw new InvalidArgument('name is required');
  if (name.length > LIMITS.nameMaxLength)
    throw new InvalidArgument(`name must be at most ${LIMITS.nameMaxLength} characters`);
  return name;
};

export const createUser = (input: {
  id: UserId;
  name: string;
  phoneHash: string;
  consentAt: Date;
  now: Date;
}): User => {
  if (input.consentAt.getTime() > input.now.getTime() + 60_000)
    throw new InvalidArgument('consent cannot be recorded in the future');
  if (input.phoneHash.length < 32) throw new InvalidArgument('phoneHash must be an HMAC digest');
  return {
    id: input.id,
    name: normaliseDisplayName(input.name),
    phoneHash: input.phoneHash,
    consentAt: input.consentAt,
    consentVersion: CONSENT_VERSION,
    createdAt: input.now,
  };
};
