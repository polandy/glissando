/** Every sampler's texture unit in one place; the transition shader's units must not collide. */
export const TEXTURE_UNITS = {
  from: { picture: 0, caption: 2, partner: 4, backdrop: 6, card: 8 },
  to: { picture: 1, caption: 3, partner: 5, backdrop: 7, card: 9 },
  /** The card item pass draws into its own target, so it reuses the from-card unit. */
  cardItem: 8,
} as const;
