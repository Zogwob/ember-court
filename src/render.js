// Ember Court — DOM rendering. One function, renderAll, rebuilds the whole
// table from the game state, so the screen can never disagree with the
// rules. Card-play flourishes (the big centre card, floating numbers) are
// the only transient bits, and they ride on top of the same state.
import { SUITS, defById } from './cards.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// A face-up card. Cost gem top-left, big suit glyph centre, name, one line
// of rules text, power number bottom-right. `large` is the centre display.
export function buildCardEl(card, large) {
  const suit = SUITS[card.suit];
  const node = el('div', 'card suit-' + card.suit + (large ? ' large' : ''));
  const cost = el('div', 'card-cost', String(card.cost));
  const glyph = el('div', 'card-glyph', suit.glyph);
  glyph.style.color = suit.color;
  const name = el('div', 'card-name', card.name);
  const rules = el('div', 'card-text', card.text);
  const power = el('div', 'card-power', String(card.power));
  const suitName = el('div', 'card-suit-name', suit.name);
  node.append(cost, glyph, name, rules, power, suitName);
  return node;
}

function renderPortrait(node, side, deckCount) {
  node.innerHTML = '';
  const name = el('div', 'portrait-name', side.name);
  const life = el('div', 'portrait-life');
  life.append(el('span', 'heart', '♥'), el('span', 'life-num', String(side.life)));
  const shield = el('div', 'portrait-shield');
  const shieldIcon = el('span', 'shield-icon', '');
  shield.append(shieldIcon, el('span', 'shield-num', String(side.shield)));
  const deck = el('div', 'portrait-deck', 'Deck ' + deckCount);
  node.append(name, life, shield, deck);
}

function renderHand(node, side, interactive) {
  node.innerHTML = '';
  side.hand.forEach((card, i) => {
    const back = el('div', 'card-back');
    const rot = (i - (side.hand.length - 1) / 2) * 4;
    back.style.transform = 'rotate(' + rot + 'deg)';
    node.appendChild(back);
  });
  void interactive;
}

function renderPlayerHand(node, side) {
  node.innerHTML = '';
  side.hand.forEach((card, i) => {
    const cardEl = buildCardEl(card, false);
    cardEl.dataset.index = String(i);
    const rot = (i - (side.hand.length - 1) / 2) * 3;
    cardEl.style.transform = 'rotate(' + rot + 'deg)';
    if (card.cost > side.mana) cardEl.classList.add('unaffordable');
    node.appendChild(cardEl);
  });
}

function renderMana(game) {
  const gems = document.getElementById('mana-gems');
  gems.innerHTML = '';
  for (let i = 0; i < game.player.maxMana; i++) {
    const gem = el('div', 'mana-gem' + (i < game.player.mana ? ' filled' : ''));
    gems.appendChild(gem);
  }
  document.getElementById('mana-text').textContent =
    'Mana ' + game.player.mana + '/' + game.player.maxMana;
}

function renderCentre(game) {
  const centre = document.getElementById('centre-card');
  centre.innerHTML = '';
  if (game.lastPlayed) {
    centre.appendChild(buildCardEl(game.lastPlayed.card, true));
    const by = el('div', 'centre-by', game.lastPlayed.by === 'player' ? 'played by you' : 'played by the Cinder Queen');
    centre.appendChild(by);
  } else {
    centre.appendChild(el('div', 'centre-empty', 'The table waits…'));
  }
}

function renderLog(game) {
  const list = document.getElementById('log-list');
  list.innerHTML = '';
  for (const line of game.log) {
    list.appendChild(el('li', '', line));
  }
}

function renderOverlays(game) {
  const title = document.getElementById('title-screen');
  const end = document.getElementById('end-screen');
  const thinking = document.getElementById('thinking-banner');
  const stage = document.getElementById('stage');
  stage.classList.toggle('on-title', game.phase === 'title');
  // The centre card would poke out from behind the end panel and cross the
  // VICTORY/DEFEAT text — hide it whenever the duel is not in progress.
  const centre = document.getElementById('centre-card');
  centre.style.visibility = game.phase === 'playing' ? 'visible' : 'hidden';
  document.getElementById('float-layer').style.visibility = game.phase === 'playing' ? 'visible' : 'hidden';
  title.classList.toggle('hidden', game.phase !== 'title');
  thinking.classList.toggle('hidden', !game.busy);
  if (game.phase === 'won' || game.phase === 'lost') {
    end.classList.remove('hidden');
    const won = game.phase === 'won';
    document.getElementById('end-title').textContent = won ? 'VICTORY' : 'DEFEAT';
    document.getElementById('end-title').className = won ? 'end-title win' : 'end-title loss';
    document.getElementById('end-sub').textContent = won
      ? 'The Ember Court is yours'
      : 'The court falls to ash';
    document.getElementById('end-totals').textContent =
      'Ember Warden ' + game.player.life + '  —  Cinder Queen ' + game.ai.life;
    end.classList.toggle('loss', !won);
  } else {
    end.classList.add('hidden');
  }
  const banner = document.getElementById('turn-banner');
  banner.textContent = game.turn === 'player' ? 'YOUR TURN' : "RIVAL'S TURN";
  banner.className = game.turn === 'player' ? 'turn-banner yours' : 'turn-banner rival';
  document.getElementById('round-label').textContent = 'Round ' + game.round;
  const endBtn = document.getElementById('end-turn-btn');
  endBtn.disabled = game.phase !== 'playing' || game.turn !== 'player' || game.busy;
}

export function renderAll(game) {
  renderPortrait(document.getElementById('rival-portrait'), game.ai, game.ai.deck.length);
  renderPortrait(document.getElementById('player-portrait'), game.player, game.player.deck.length);
  renderHand(document.getElementById('rival-hand'), game.ai, false);
  renderPlayerHand(document.getElementById('player-hand'), game.player);
  renderMana(game);
  renderCentre(game);
  renderLog(game);
  renderOverlays(game);
}

// A floating number over the centre of the table: damage in red, shield in
// blue, healing in green. Interactive play only — screenshot states skip it.
export function floatFor(card) {
  const layer = document.getElementById('float-layer');
  if (!layer) return;
  let text = '';
  let kind = '';
  if (card.kind === 'attack' || card.kind === 'signature' || card.kind === 'ember') {
    text = '−' + card.power;
    kind = 'dmg';
  } else if (card.kind === 'guard') {
    text = '+' + card.power + ' shield';
    kind = 'shield';
  } else if (card.kind === 'mend') {
    text = '+' + card.power + ' life';
    kind = 'heal';
  }
  if (!text) return;
  const node = el('div', 'float-num ' + kind, text);
  layer.appendChild(node);
  node.addEventListener('animationend', () => node.remove());
}

// The signature card shown large on the title screen.
export function renderTitleCard() {
  const slot = document.getElementById('title-card');
  if (!slot) return;
  slot.innerHTML = '';
  slot.appendChild(buildCardEl(defById('ember-court'), true));
}
