import { z } from 'zod';

const hexColour = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'colour must be #RRGGBB');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id must be a kebab-case slug');

export const catalogCardSchema = z
  .object({
    id: slug,
    name: z.string().min(1).max(40),
    issuer: z.string().min(1).max(20),
    bank: z.string().min(1).max(40),
    tags: z.array(z.string().min(1)).min(1).max(6),
    perks: z.array(z.string().min(1).max(80)).min(1).max(5),
    color: hexColour,
  })
  .strict();

export const catalogSchema = z
  .object({
    version: z.number().int().positive(),
    tags: z.array(slug).min(1),
    cards: z.array(catalogCardSchema).min(1),
  })
  .strict()
  .superRefine((cat, ctx) => {
    const ids = new Set<string>();
    const known = new Set(cat.tags);
    cat.cards.forEach((card, i) => {
      if (ids.has(card.id))
        ctx.addIssue({
          code: 'custom',
          path: ['cards', i, 'id'],
          message: `duplicate id ${card.id}`,
        });
      ids.add(card.id);
      card.tags.forEach((t, j) => {
        if (!known.has(t))
          ctx.addIssue({
            code: 'custom',
            path: ['cards', i, 'tags', j],
            message: `unknown tag ${t}`,
          });
      });
    });
  });

export type CatalogCardJson = z.infer<typeof catalogCardSchema>;
export type CatalogJson = z.infer<typeof catalogSchema>;

/** Forbidden fields. The catalogue must never grow a slot for these; the test enforces it. */
export const FORBIDDEN_FIELD_PATTERN = /number|expiry|expir|cvv|cvc|limit|spend|pan\b|statement/i;
