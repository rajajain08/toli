import { InvalidArgument } from './errors';

declare const phoneBrand: unique symbol;
/** E.164 string. Transient: parsed on the way in, hashed on the server, never stored on any entity. */
export type PhoneNumber = string & { readonly [phoneBrand]: 'PhoneNumber' };

const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * Normalises what a person typed into E.164. Bare 10-digit numbers are assumed to be Indian mobiles
 * (the MVP market); anything else must carry its country code.
 */
export const parsePhone = (raw: string, defaultCountryCode = '+91'): PhoneNumber => {
  let s = raw.replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) {
    if (/^0\d{10}$/.test(s)) s = s.slice(1);
    if (/^\d{10}$/.test(s)) s = `${defaultCountryCode}${s}`;
    else if (/^91\d{10}$/.test(s)) s = `+${s}`;
  }
  if (!E164.test(s)) throw new InvalidArgument('enter a valid phone number');
  if (s.startsWith('+91') && !/^\+91[6-9]\d{9}$/.test(s))
    throw new InvalidArgument('enter a valid Indian mobile number');
  return s as PhoneNumber;
};

/** Last two digits only, for "we sent a code to …10" copy. Never render more. */
export const maskPhone = (phone: PhoneNumber): string => `••••• •••${phone.slice(-2)}`;
