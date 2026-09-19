import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { createEnv } from './setup';

let env: RulesTestEnvironment;
const ALICE = 'alice';
const BOB = 'bob';
const AID = 'g1';

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/alice'), {
      name: 'Alice',
      phoneHash: 'h',
      consentAt: new Date(),
      createdAt: new Date(),
    });
    await setDoc(doc(db, 'users/bob'), {
      name: 'Bob',
      phoneHash: 'h',
      consentAt: new Date(),
      createdAt: new Date(),
    });
    await setDoc(doc(db, `audiences/${AID}`), {
      type: 'group',
      name: 'Crew',
      createdBy: ALICE,
      memberCount: 1,
      cardCount: 0,
    });
    await setDoc(doc(db, `audiences/${AID}/members/${ALICE}`), {
      joinedAt: new Date(),
      role: 'owner',
      name: 'Alice',
    });
    await setDoc(doc(db, `audiences/${AID}/cards/uc1`), {
      ownerId: ALICE,
      ownerName: 'Alice',
      cardId: 'hdfc-millennia',
      name: 'Millennia',
      issuer: 'HDFC',
      color: '#000000',
      tags: [],
      addedAt: new Date(),
    });
    await setDoc(doc(db, 'invites/ABCDEFGH'), {
      audienceId: AID,
      expiresAt: new Date(),
      uses: 0,
      maxUses: 50,
    });
    await setDoc(doc(db, 'contacts/alice'), {
      phone: '+919876543210',
      marketingOptIn: true,
      updatedAt: new Date(),
    });
    await setDoc(doc(db, 'catalog/hdfc-millennia'), { name: 'Millennia' });
    await setDoc(doc(db, `users/${ALICE}/memberships/${AID}`), {
      type: 'group',
      name: 'Crew',
      joinedAt: new Date(),
    });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();

describe('users/{uid}', () => {
  it('a user reads and updates their own profile', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), 'users/alice')));
    await assertSucceeds(updateDoc(doc(as(ALICE), 'users/alice'), { name: 'Alice J' }));
  });
  it('a user cannot read or write another profile', async () => {
    await assertFails(getDoc(doc(as(BOB), 'users/alice')));
    await assertFails(updateDoc(doc(as(BOB), 'users/alice'), { name: 'Mallory' }));
  });
  it('the client cannot create a profile; only completeSignup does', async () => {
    await assertFails(
      setDoc(doc(as('carol'), 'users/carol'), { name: 'Carol', consentAt: new Date() }),
    );
    await assertFails(
      setDoc(doc(as('carol'), 'users/carol'), { name: 'Carol', phoneHash: 'forged' }),
    );
  });
  it('the client cannot change phoneHash, consentAt, consentVersion or createdAt', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { phoneHash: 'forged' }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { consentAt: new Date(0) }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { createdAt: new Date(0) }));
    // Nobody can mark themselves as having agreed to a consent text they were never shown.
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { consentVersion: 99 }));
  });
  it('a rename must be a name of 1 to 40 characters', async () => {
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { name: '' }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { name: 'x'.repeat(41) }));
    await assertFails(updateDoc(doc(as(ALICE), 'users/alice'), { name: 42 }));
  });
  it('nobody deletes a user from the client', async () => {
    await assertFails(deleteDoc(doc(as(ALICE), 'users/alice')));
  });
  it('anonymous users see nothing', async () => {
    await assertFails(getDoc(doc(anon(), 'users/alice')));
  });
});

describe('users/{uid}/cards (write side)', () => {
  const card = { cardId: 'hdfc-millennia', visibleTo: [AID], addedAt: new Date() };
  it('the owner adds, reads, updates and removes a card', async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), 'users/alice/cards/uc1'), card));
    await assertSucceeds(getDocs(collection(as(ALICE), 'users/alice/cards')));
    await assertSucceeds(updateDoc(doc(as(ALICE), 'users/alice/cards/uc1'), { visibleTo: [] }));
    await assertSucceeds(deleteDoc(doc(as(ALICE), 'users/alice/cards/uc1')));
  });
  it('another user cannot touch it', async () => {
    await assertFails(setDoc(doc(as(BOB), 'users/alice/cards/uc2'), card));
    await assertFails(getDocs(collection(as(BOB), 'users/alice/cards')));
  });
  it('rejects unknown fields, so a card number can never be stored', async () => {
    await assertFails(
      setDoc(doc(as(ALICE), 'users/alice/cards/uc1'), { ...card, number: '4111111111111111' }),
    );
    await assertFails(setDoc(doc(as(ALICE), 'users/alice/cards/uc1'), { ...card, limit: 500000 }));
  });
  it('rejects more than 50 audiences', async () => {
    const visibleTo = Array.from({ length: 51 }, (_, i) => `g${i}`);
    await assertFails(setDoc(doc(as(ALICE), 'users/alice/cards/uc1'), { ...card, visibleTo }));
  });
});

describe('users/{uid}/memberships', () => {
  it('readable by the user, never writable from the client', async () => {
    await assertSucceeds(getDocs(collection(as(ALICE), 'users/alice/memberships')));
    await assertFails(
      setDoc(doc(as(ALICE), 'users/alice/memberships/g9'), {
        type: 'group',
        name: 'x',
        joinedAt: new Date(),
      }),
    );
    await assertFails(getDocs(collection(as(BOB), 'users/alice/memberships')));
  });
});

describe('audiences/{aid} (read side)', () => {
  it('a member reads the audience, its members and its cards', async () => {
    await assertSucceeds(getDoc(doc(as(ALICE), `audiences/${AID}`)));
    await assertSucceeds(getDocs(collection(as(ALICE), `audiences/${AID}/members`)));
    await assertSucceeds(getDocs(collection(as(ALICE), `audiences/${AID}/cards`)));
  });
  it('a non-member reads nothing', async () => {
    await assertFails(getDoc(doc(as(BOB), `audiences/${AID}`)));
    await assertFails(getDocs(collection(as(BOB), `audiences/${AID}/members`)));
    await assertFails(getDocs(collection(as(BOB), `audiences/${AID}/cards`)));
    await assertFails(getDoc(doc(anon(), `audiences/${AID}`)));
  });
  it('nobody writes shared state from the client, not even the owner', async () => {
    await assertFails(updateDoc(doc(as(ALICE), `audiences/${AID}`), { name: 'Renamed' }));
    await assertFails(
      setDoc(doc(as(ALICE), `audiences/${AID}/members/${BOB}`), {
        joinedAt: new Date(),
        role: 'member',
        name: 'Bob',
      }),
    );
    await assertFails(deleteDoc(doc(as(ALICE), `audiences/${AID}/cards/uc1`)));
  });
  it('a tampered ownerId on a read-model row is rejected', async () => {
    await assertFails(
      setDoc(doc(as(BOB), `audiences/${AID}/cards/uc1`), {
        ownerId: BOB,
        ownerName: 'Bob',
        cardId: 'x',
        name: 'x',
        issuer: 'x',
        color: '#000000',
        tags: [],
        addedAt: new Date(),
      }),
    );
    await assertFails(updateDoc(doc(as(ALICE), `audiences/${AID}/cards/uc1`), { ownerId: BOB }));
  });
});

describe('invites, ratelimits, catalog', () => {
  it('invites are never readable, so codes cannot be enumerated', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'invites/ABCDEFGH')));
    await assertFails(getDocs(collection(as(ALICE), 'invites')));
    await assertFails(setDoc(doc(as(ALICE), 'invites/ZZZZZZZZ'), { audienceId: AID }));
  });
  it('contacts are server-only: nobody reads a phone number, not even their own', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'contacts/alice')));
    await assertFails(getDoc(doc(as(BOB), 'contacts/alice')));
    await assertFails(getDocs(collection(as(ALICE), 'contacts')));
    await assertFails(
      setDoc(doc(as(ALICE), 'contacts/alice'), { phone: '+910000000000', marketingOptIn: true }),
    );
    await assertFails(updateDoc(doc(as(ALICE), 'contacts/alice'), { marketingOptIn: false }));
    await assertFails(deleteDoc(doc(as(ALICE), 'contacts/alice')));
  });
  it('ratelimits are server-only', async () => {
    await assertFails(getDoc(doc(as(ALICE), 'ratelimits/alice')));
    await assertFails(setDoc(doc(as(ALICE), 'ratelimits/alice'), { joinAttempts: [] }));
  });
  it('catalog is readable by any signed-in user and never writable', async () => {
    await assertSucceeds(getDoc(doc(as(BOB), 'catalog/hdfc-millennia')));
    await assertFails(getDoc(doc(anon(), 'catalog/hdfc-millennia')));
    await assertFails(setDoc(doc(as(ALICE), 'catalog/fake'), { name: 'Fake' }));
  });
});
