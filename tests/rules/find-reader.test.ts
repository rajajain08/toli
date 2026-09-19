import { FindCardHolders } from '@toli/application';
import { CardId, GroupId, UserId } from '@toli/domain';
import { FirestoreAudienceReader, FirestoreGroupCardReader } from '@toli/infra-client';
import { assertFails, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, type Firestore } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createEnv } from './setup';

/** Find, exactly as the browser runs it: the real client adapters, through the real rules, on the emulator. */
let env: RulesTestEnvironment;
const dbFor = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const findFor = (uid: string) =>
  new FindCardHolders(
    new FirestoreGroupCardReader(dbFor(uid)),
    new FirestoreAudienceReader(dbFor(uid)),
  );

beforeAll(async () => {
  env = await createEnv();
});
afterAll(async () => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = new Date();
    const audience = async (
      id: string,
      type: 'group' | 'direct',
      name: string | undefined,
      members: Record<string, string>,
    ) => {
      await setDoc(doc(db, `audiences/${id}`), {
        type,
        ...(name ? { name } : {}),
        createdBy: Object.keys(members)[0],
        memberCount: Object.keys(members).length,
        cardCount: 0,
        createdAt: now,
      });
      for (const [uid, memberName] of Object.entries(members)) {
        await setDoc(doc(db, `audiences/${id}/members/${uid}`), {
          joinedAt: now,
          role: 'member',
          name: memberName,
        });
        await setDoc(doc(db, `users/${uid}/memberships/${id}`), {
          type,
          ...(name ? { name } : {}),
          joinedAt: now,
        });
      }
    };
    const row = (
      aid: string,
      id: string,
      ownerId: string,
      ownerName: string,
      cardId: string,
      name: string,
      tags: string[],
    ) =>
      setDoc(doc(db, `audiences/${aid}/cards/${id}`), {
        ownerId,
        ownerName,
        cardId,
        name,
        issuer: 'X',
        color: '#000000',
        tags,
        addedAt: now,
      });

    await audience('crew', 'group', 'Weekend Crew', { rahul: 'Rahul', priya: 'Priya' });
    await audience('office', 'group', 'Office lunch', { rahul: 'Rahul', karan: 'Karan' });
    await audience('direct_priya_rahul', 'direct', undefined, { priya: 'Priya', rahul: 'Rahul' });
    await audience('secret', 'group', 'Not yours', { zoya: 'Zoya' });
    await row('crew', 'p1', 'priya', 'Priya', 'axis-atlas', 'Atlas', ['travel', 'lounge']);
    await row('direct_priya_rahul', 'p1', 'priya', 'Priya', 'axis-atlas', 'Atlas', [
      'travel',
      'lounge',
    ]);
    await row('office', 'k1', 'karan', 'Karan', 'axis-atlas', 'Atlas', ['travel', 'lounge']);
    await row('office', 'k2', 'karan', 'Karan', 'sbi-elite', 'SBI Card ELITE', [
      'lounge',
      'movies',
    ]);
    await row('crew', 'r1', 'rahul', 'Rahul', 'axis-atlas', 'Atlas', ['travel', 'lounge']);
    await row('secret', 'z1', 'zoya', 'Zoya', 'axis-atlas', 'Atlas', ['travel', 'lounge']);
  });
});

describe('Find through the rules', () => {
  it('answers from every audience you are in, lists a person once, and never reaches a group you are not in', async () => {
    const holders = await findFor('rahul').execute({
      actor: UserId('rahul'),
      cardId: CardId('axis-atlas'),
    });
    expect(holders.map((h) => h.ownerName)).toEqual(['Karan', 'Priya']);
    expect(holders[1]!.via.map((v) => v.type).sort()).toEqual(['direct', 'group']);
    expect(JSON.stringify(holders)).not.toContain('Zoya');
  });

  it('finds by perk', async () => {
    const cards = await findFor('rahul').byTag({ actor: UserId('rahul'), tag: 'lounge' });
    expect(cards.map((c) => `${c.name}:${c.holders.length}`)).toEqual([
      'Atlas:2',
      'SBI Card ELITE:1',
    ]);
  });

  it('a non-member cannot query an audience’s cards even by guessing its id', async () => {
    const reader = new FirestoreGroupCardReader(dbFor('karan'));
    await assertFails(reader.findHolders([GroupId('crew')], CardId('axis-atlas')));
    await assertFails(reader.findByTag([GroupId('secret')], 'lounge'));
  });
});
