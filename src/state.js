// Ember Court — the game state machine. Pure logic, no DOM: the same
// functions drive the interactive game, the AI turn, and the deterministic
// screenshot autopilot, so a screenshot frame is always a real game state.
import { CONFIG } from './config.js';
import { buildDeck } from './cards.js';

// Seeded RNG (mulberry32). A fixed seed deals the same decks and the same
// AI draws every time, which is what makes screenshot states reproducible.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function newSide(name, rng) {
  return {
    name,
    life: CONFIG.START_LIFE,
    shield: 0,
    mana: CONFIG.START_MANA,
    maxMana: CONFIG.START_MANA,
    turnsTaken: 0,
    deck: buildDeck(rng),
    hand: [],
    discard: [],
  };
}

export function createGame(seed) {
  const rng = mulberry32(seed);
  return {
    seed,
    rng,
    phase: 'title', // title | playing | won | lost
    turn: 'player',
    round: 1,
    busy: false,
    player: newSide('Ember Warden', rng),
    ai: newSide('Cinder Queen', rng),
    log: [],
    lastPlayed: null, // { card, by } — shown large in the centre
    winner: null,
  };
}

export function sideOf(game, who) {
  return who === 'player' ? game.player : game.ai;
}

export function otherOf(game, who) {
  return who === 'player' ? game.ai : game.player;
}

export function logLine(game, text) {
  game.log.push(text);
  while (game.log.length > CONFIG.LOG_LINES) game.log.shift();
}

export function drawCard(game, who) {
  const side = sideOf(game, who);
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return null;
    side.deck = side.discard;
    side.discard = [];
    for (let i = side.deck.length - 1; i > 0; i--) {
      const j = Math.floor(game.rng() * (i + 1));
      const tmp = side.deck[i];
      side.deck[i] = side.deck[j];
      side.deck[j] = tmp;
    }
    logLine(game, side.name + ' reshuffles the discard into the deck.');
  }
  const card = side.deck.pop();
  if (side.hand.length >= CONFIG.HAND_CAP) {
    side.discard.push(card);
    logLine(game, side.name + ' draws ' + card.name + ' but the hand is full — discarded.');
    return null;
  }
  side.hand.push(card);
  return card;
}

// Start a side's turn: shield from last turn falls away, the mana maximum
// grows by one (up to 10) after the first turn, mana refills, draw a card.
export function beginTurn(game, who) {
  const side = sideOf(game, who);
  side.shield = 0;
  if (side.turnsTaken > 0) side.maxMana = Math.min(CONFIG.MAX_MANA, side.maxMana + 1);
  side.mana = side.maxMana;
  side.turnsTaken += 1;
  drawCard(game, who);
}

export function startGame(game) {
  // A fresh duel means fresh sides: full life, fresh shuffled decks, empty
  // hands. Without this a restart would keep the last duel's totals.
  game.player = newSide('Ember Warden', game.rng);
  game.ai = newSide('Cinder Queen', game.rng);
  game.phase = 'playing';
  game.turn = 'player';
  game.round = 1;
  game.busy = false;
  game.log = [];
  game.lastPlayed = null;
  game.winner = null;
  for (let i = 0; i < CONFIG.HAND_START; i++) {
    drawCard(game, 'player');
    drawCard(game, 'ai');
  }
  beginTurn(game, 'player');
  logLine(game, 'The duel begins. Ember Warden, your move.');
}

// Damage hits shield first, then life. Returns what actually happened.
export function dealDamage(game, target, amount) {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const dealt = amount - absorbed;
  target.life -= dealt;
  return { absorbed, dealt };
}

function checkEnd(game) {
  if (game.ai.life <= 0) {
    game.ai.life = 0;
    game.phase = 'won';
    game.winner = 'player';
    logLine(game, 'The Cinder Queen falls. VICTORY!');
  } else if (game.player.life <= 0) {
    game.player.life = 0;
    game.phase = 'lost';
    game.winner = 'ai';
    logLine(game, 'The Ember Warden falls. DEFEAT.');
  }
}

function describePlay(side, card) {
  if (card.kind === 'attack' || card.kind === 'signature' || card.kind === 'ember') {
    return side.name + ' plays ' + card.name + ' — ' + card.power + ' damage.';
  }
  if (card.kind === 'guard') return side.name + ' plays ' + card.name + ' — +' + card.power + ' shield.';
  if (card.kind === 'mend') return side.name + ' plays ' + card.name + ' — restores ' + card.power + ' life.';
  return side.name + ' plays ' + card.name + '.';
}

// Play the card at handIndex for `who`. Returns false when the play is not
// legal (wrong phase, wrong turn, unaffordable, bad index); true otherwise.
// Every legal play resolves immediately and synchronously.
export function playCard(game, who, handIndex) {
  if (game.phase !== 'playing') return false;
  if (game.turn !== who) return false;
  const side = sideOf(game, who);
  const foe = otherOf(game, who);
  const card = side.hand[handIndex];
  if (!card) return false;
  if (card.cost > side.mana) return false;
  side.hand.splice(handIndex, 1);
  side.mana -= card.cost;
  side.discard.push(card);
  game.lastPlayed = { card, by: who };
  logLine(game, describePlay(side, card));
  if (card.kind === 'attack' || card.kind === 'signature') {
    const r = dealDamage(game, foe, card.power);
    if (r.absorbed > 0) logLine(game, foe.name + "'s shield absorbs " + r.absorbed + '.');
  } else if (card.kind === 'guard') {
    side.shield += card.power;
  } else if (card.kind === 'ember') {
    const r = dealDamage(game, foe, card.power);
    if (r.absorbed > 0) logLine(game, foe.name + "'s shield absorbs " + r.absorbed + '.');
    drawCard(game, who);
  } else if (card.kind === 'mend') {
    side.life = Math.min(CONFIG.START_LIFE, side.life + card.power);
  }
  checkEnd(game);
  return true;
}

// End `who`'s turn and begin the other side's turn. When the AI's turn
// ends, the round counter grows and it is the player's turn again.
export function endTurn(game) {
  if (game.phase !== 'playing') return;
  if (game.turn === 'player') {
    game.turn = 'ai';
    beginTurn(game, 'ai');
  } else {
    game.turn = 'player';
    game.round += 1;
    beginTurn(game, 'player');
  }
}
