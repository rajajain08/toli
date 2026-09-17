import type { GroupId, InviteCode } from './ids';
import { InviteCode as makeInviteCode } from './ids';
import { InvalidInvite } from './errors';
import { LIMITS } from './limits';

/** 32-character alphabet: uppercase letters without I, L, O, U plus digits. Unambiguous when read aloud. */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ0123456789';
const CODE_PATTERN = new RegExp(`^[${INVITE_ALPHABET}]{${LIMITS.inviteCodeLength}}$`);

export class Invite {
  private constructor(
    readonly code: InviteCode,
    readonly audienceId: GroupId,
    readonly createdAt: Date,
    readonly expiresAt: Date,
    readonly uses: number,
    readonly maxUses: number,
  ) {}

  /** `randomIndices` must have `inviteCodeLength` entries in [0, 32). Supplied by the IdGenerator port. */
  static create(input: {
    audienceId: GroupId;
    randomIndices: readonly number[];
    now: Date;
    maxUses?: number;
  }): Invite {
    if (input.randomIndices.length !== LIMITS.inviteCodeLength)
      throw new InvalidInvite('malformed');
    const code = input.randomIndices
      .map((i) => {
        const ch = INVITE_ALPHABET[i];
        if (ch === undefined) throw new InvalidInvite('malformed');
        return ch;
      })
      .join('');
    const maxUses = input.maxUses ?? LIMITS.inviteDefaultMaxUses;
    if (!Number.isInteger(maxUses) || maxUses < 1) throw new InvalidInvite('malformed');
    return new Invite(
      makeInviteCode(code),
      input.audienceId,
      input.now,
      new Date(input.now.getTime() + LIMITS.inviteTtlMs),
      0,
      maxUses,
    );
  }

  static rehydrate(input: {
    code: InviteCode;
    audienceId: GroupId;
    createdAt: Date;
    expiresAt: Date;
    uses: number;
    maxUses: number;
  }): Invite {
    return new Invite(
      input.code,
      input.audienceId,
      input.createdAt,
      input.expiresAt,
      input.uses,
      input.maxUses,
    );
  }

  /** Normalises user-typed input (case, whitespace, ambiguous characters) and validates the shape. */
  static parseCode(raw: string): InviteCode {
    const cleaned = raw
      .trim()
      .toUpperCase()
      .replace(/[\s-]/g, '')
      .replace(/O/g, '0')
      .replace(/[IL]/g, '1');
    if (!CODE_PATTERN.test(cleaned)) throw new InvalidInvite('malformed');
    return makeInviteCode(cleaned);
  }

  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  isExhausted(): boolean {
    return this.uses >= this.maxUses;
  }

  isValidAt(now: Date): boolean {
    return !this.isExpiredAt(now) && !this.isExhausted();
  }

  assertValidAt(now: Date): void {
    if (this.isExpiredAt(now)) throw new InvalidInvite('expired');
    if (this.isExhausted()) throw new InvalidInvite('exhausted');
  }

  /** Returns the invite with one more use recorded. Throws if it was not valid. */
  consume(now: Date): Invite {
    this.assertValidAt(now);
    return new Invite(
      this.code,
      this.audienceId,
      this.createdAt,
      this.expiresAt,
      this.uses + 1,
      this.maxUses,
    );
  }
}
