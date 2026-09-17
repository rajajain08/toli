import { randomInt, randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '@toli/application';

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class CryptoIdGenerator implements IdGenerator {
  newId(): string {
    return randomUUID().replace(/-/g, '').slice(0, 20);
  }
  randomIndices(count: number, bound: number): number[] {
    return Array.from({ length: count }, () => randomInt(bound));
  }
}
