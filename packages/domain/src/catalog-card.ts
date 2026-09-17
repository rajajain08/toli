import type { CardId } from './ids';

/** Read-only reference data, shipped as JSON from packages/catalog (ADR-0006). */
export interface CatalogCard {
  readonly id: CardId;
  readonly name: string;
  readonly issuer: string;
  readonly bank: string;
  readonly tags: readonly string[];
  readonly perks: readonly string[];
  /** Hex colour used to tint the card object in the UI. */
  readonly color: string;
}
