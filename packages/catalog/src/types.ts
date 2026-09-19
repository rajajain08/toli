/** Shape of one entry in cards.json. Kept free of zod so the browser bundle never pays for the validator. */
export interface CatalogCardJson {
  id: string;
  name: string;
  issuer: string;
  bank: string;
  tags: string[];
  perks: string[];
  color: string;
}

export interface CatalogJson {
  version: number;
  tags: string[];
  cards: CatalogCardJson[];
}
