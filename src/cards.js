// Ember Court — the card set. Four suits told apart by colour AND shape:
// Flame is red with a triangle, Blade is steel blue with a diamond,
// Leaf is green with a circle, Star is gold with a star. The glyphs are
// plain Unicode shapes (DejaVu covers them), never emoji, so they render
// identically in every Chromium.

// Each card: id, name, suit, kind, cost, power, one line of rules text.
// kind: attack deals damage, guard gains shield, ember deals damage and
// draws a card, mend restores life, signature is the deck's finisher.
export const SUITS = {
  flame: { name: 'Flame', color: '#e5484d', glyph: '▲' },
  blade: { name: 'Blade', color: '#7aa2ff', glyph: '◆' },
  leaf: { name: 'Leaf', color: '#46a758', glyph: '●' },
  star: { name: 'Star', color: '#f5b301', glyph: '★' },
};

export const CARD_DEFS = [
  { id: 'flame-strike', name: 'Flame Strike', suit: 'flame', kind: 'attack', cost: 1, power: 3, text: 'Deal 3 damage.' },
  { id: 'leaf-thorn', name: 'Leaf Thorn', suit: 'leaf', kind: 'attack', cost: 1, power: 2, text: 'Deal 2 damage.' },
  { id: 'blade-cut', name: 'Blade Cut', suit: 'blade', kind: 'attack', cost: 2, power: 4, text: 'Deal 4 damage.' },
  { id: 'star-lance', name: 'Star Lance', suit: 'star', kind: 'attack', cost: 3, power: 6, text: 'Deal 6 damage.' },
  { id: 'ember-slash', name: 'Ember Slash', suit: 'flame', kind: 'attack', cost: 4, power: 7, text: 'Deal 7 damage.' },
  { id: 'flame-ward', name: 'Flame Ward', suit: 'flame', kind: 'guard', cost: 1, power: 3, text: 'Gain 3 shield.' },
  { id: 'stone-leaf', name: 'Stone Leaf', suit: 'leaf', kind: 'guard', cost: 2, power: 5, text: 'Gain 5 shield.' },
  { id: 'star-aegis', name: 'Star Aegis', suit: 'star', kind: 'guard', cost: 3, power: 6, text: 'Gain 6 shield.' },
  { id: 'ember-spark', name: 'Ember Spark', suit: 'flame', kind: 'ember', cost: 3, power: 3, text: 'Deal 3 damage. Draw a card.' },
  { id: 'leaf-mend', name: 'Leaf Mend', suit: 'leaf', kind: 'mend', cost: 2, power: 3, text: 'Restore 3 life.' },
  { id: 'star-mend', name: 'Star Mend', suit: 'star', kind: 'mend', cost: 3, power: 5, text: 'Restore 5 life.' },
  { id: 'ember-court', name: 'Ember Court', suit: 'star', kind: 'signature', cost: 5, power: 8, text: 'Deal 8 damage. The court ignites.' },
];

export function defById(id) {
  return CARD_DEFS.find((d) => d.id === id);
}

// Build a fresh 24-card deck: two copies of each of the 12 designs,
// shuffled with the game's seeded RNG so a seed always deals the same deck.
export function buildDeck(rng) {
  const deck = [];
  let uid = 0;
  for (const def of CARD_DEFS) {
    for (let copy = 0; copy < 2; copy++) {
      deck.push({ ...def, uid: uid++ });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}
