// Ember Court — the Cinder Queen's strategy, and the autopilot the
// screenshot states drive. Both pick from the same hand with the same
// rules the player follows, so every frame is a legal game state.
import { CONFIG } from './config.js';
import { playCard, sideOf } from './state.js';

// Score one candidate play for the AI. Attacks score by power; when the
// Queen is low she would rather guard or mend than swing. Guards and mends
// keep a small positive score even when she is healthy: a shield banked now
// still blocks the player's next turn, and a card played is a card drawn —
// without that, a hand of only guards and mends would stall the duel
// forever, discarding every fresh draw into a full hand.
function scoreAiPlay(game, card) {
  const ai = game.ai;
  const low = ai.life <= CONFIG.AI_LOW_LIFE;
  if (card.kind === 'attack' || card.kind === 'signature') return card.power * 10 - card.cost;
  if (card.kind === 'ember') return card.power * 10 - card.cost + 2;
  if (card.kind === 'guard') return low ? card.power * 10 - card.cost + 4 : card.power * 2;
  if (card.kind === 'mend') return low ? card.power * 10 - card.cost + 6 : 1;
  return -100;
}

// The single best play the AI can afford right now, as a hand index,
// or -1 when nothing is worth playing. Deterministic: ties break toward
// the earliest card in the hand.
export function chooseOnePlay(game) {
  const ai = game.ai;
  let best = -1;
  let bestScore = -100;
  for (let i = 0; i < ai.hand.length; i++) {
    const card = ai.hand[i];
    if (card.cost > ai.mana) continue;
    const score = scoreAiPlay(game, card);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// The player's best affordable attack, as a hand index, or -1.
export function chooseBestAttack(game) {
  const player = game.player;
  let best = -1;
  let bestPower = -1;
  let bestCost = 99;
  for (let i = 0; i < player.hand.length; i++) {
    const card = player.hand[i];
    if (card.cost > player.mana) continue;
    if (card.kind !== 'attack' && card.kind !== 'signature' && card.kind !== 'ember') continue;
    if (card.power > bestPower || (card.power === bestPower && card.cost < bestCost)) {
      best = i;
      bestPower = card.power;
      bestCost = card.cost;
    }
  }
  return best;
}

// Run one full AI turn synchronously (no animation delays): up to three
// plays, then pass. Used by the screenshot autopilot; the interactive game
// calls chooseOnePlay step by step with pauses between plays instead.
export function runAiTurnSync(game) {
  let plays = 0;
  while (plays < CONFIG.MAX_AI_PLAYS && game.phase === 'playing') {
    const idx = chooseOnePlay(game);
    if (idx === -1) break;
    playCard(game, 'ai', idx);
    plays += 1;
  }
}

// The player's autopilot for screenshot states. 'attack' plays the best
// affordable attack until none is left, then ends the turn. 'passive'
// never plays a card. Returns false when the game has ended.
export function runPlayerTurnSync(game, mode) {
  if (mode === 'attack') {
    let guard = 0;
    while (guard++ < 12 && game.phase === 'playing') {
      const idx = chooseBestAttack(game);
      if (idx === -1) break;
      playCard(game, 'player', idx);
    }
  }
}
