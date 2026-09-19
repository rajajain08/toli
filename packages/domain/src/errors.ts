export abstract class DomainError extends Error {
  abstract readonly code: string;
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFound extends DomainError {
  readonly code = 'not-found';
  constructor(readonly entity: string) {
    super(`${entity} not found`);
  }
}

export class NotAMember extends DomainError {
  readonly code = 'not-a-member';
  constructor() {
    super('actor is not a member of this audience');
  }
}

export class NotOwner extends DomainError {
  readonly code = 'not-owner';
  constructor() {
    super('actor does not own this resource');
  }
}

export class LimitExceeded extends DomainError {
  readonly code: string = 'limit-exceeded';
  constructor(
    readonly what: string,
    readonly limit: number,
  ) {
    super(`${what} limit of ${limit} exceeded`);
  }
}

export class AudienceFull extends LimitExceeded {
  override readonly code = 'audience-full';
  constructor(limit: number) {
    super('members per audience', limit);
  }
}

export class InvalidInvite extends DomainError {
  readonly code = 'invalid-invite';
  constructor(readonly reason: 'expired' | 'exhausted' | 'malformed' | 'unknown') {
    super(`invite is ${reason}`);
  }
}

export class RateLimited extends DomainError {
  readonly code = 'rate-limited';
  constructor(readonly retryAfterMs: number) {
    super('too many attempts, try again later');
  }
}

export class InvalidArgument extends DomainError {
  readonly code = 'invalid-argument';
  constructor(message: string) {
    super(message);
  }
}

/** The two people share no group, so one cannot open a 1:1 share with the other. */
export class NotConnected extends DomainError {
  readonly code = 'not-connected';
  constructor() {
    super('you can only share with someone who is in one of your groups');
  }
}
