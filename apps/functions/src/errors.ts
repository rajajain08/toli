import {
  DomainError,
  InvalidArgument,
  InvalidInvite,
  LimitExceeded,
  NotAMember,
  NotConnected,
  NotFound,
  NotOwner,
  RateLimited,
} from '@toli/domain';
import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';

/** Maps domain errors onto callable error codes. Anything else is logged and hidden as internal. */
export function toHttpsError(err: unknown, useCase: string): HttpsError {
  if (err instanceof HttpsError) return err;
  if (err instanceof DomainError) {
    const code =
      err instanceof NotFound
        ? 'not-found'
        : err instanceof NotAMember || err instanceof NotOwner || err instanceof NotConnected
          ? 'permission-denied'
          : err instanceof InvalidArgument || err instanceof InvalidInvite
            ? 'invalid-argument'
            : err instanceof LimitExceeded
              ? 'failed-precondition'
              : err instanceof RateLimited
                ? 'resource-exhausted'
                : 'failed-precondition';
    return new HttpsError(code, err.message, { code: err.code });
  }
  logger.error('use case failed', { useCase, err });
  return new HttpsError('internal', 'something went wrong');
}
