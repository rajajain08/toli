/** Branded string ids. Construct through the helpers so a UserId can never be passed where a GroupId is expected. */
declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type UserId = Brand<string, 'UserId'>;
export type GroupId = Brand<string, 'GroupId'>;
export type UserCardId = Brand<string, 'UserCardId'>;
export type CardId = Brand<string, 'CardId'>;
export type InviteCode = Brand<string, 'InviteCode'>;

const nonEmpty = (kind: string, value: string): string => {
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`${kind} must be a non-empty string`);
  return value;
};

export const UserId = (v: string): UserId => nonEmpty('UserId', v) as UserId;
export const GroupId = (v: string): GroupId => nonEmpty('GroupId', v) as GroupId;
export const UserCardId = (v: string): UserCardId => nonEmpty('UserCardId', v) as UserCardId;
export const CardId = (v: string): CardId => nonEmpty('CardId', v) as CardId;
export const InviteCode = (v: string): InviteCode => nonEmpty('InviteCode', v) as InviteCode;
