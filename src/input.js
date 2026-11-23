// Ember Court — mouse and keyboard input, and the rival's turn with its
// visible pauses. Input is locked while the rival thinks, on the title
// screen, and once the duel has ended.
import { playCard, endTurn, startGame, logLine } from './state.js';
import { chooseOnePlay } from './ai.js';
import { renderAll, floatFor } from './render.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The rival's turn, played out where the player can watch it: each card
// slides in with a pause between plays, then the turn passes back.
export async function runAiTurn(game) {
  game.busy = true;
  renderAll(game);
  await sleep(700);
  let plays = 0;
  while (plays < 3 && game.phase === 'playing') {
    const idx = chooseOnePlay(game);
    if (idx === -1) break;
    const card = game.ai.hand[idx];
    playCard(game, 'ai', idx);
    floatFor(card);
    renderAll(game);
    plays += 1;
    await sleep(750);
  }
  await sleep(350);
  game.busy = false;
  if (game.phase === 'playing') {
    endTurn(game);
    logLine(game, 'Your turn, Ember Warden.');
    renderAll(game);
  } else {
    renderAll(game);
  }
}

function tryPlay(game, handIndex) {
  if (game.phase !== 'playing' || game.turn !== 'player' || game.busy) return;
  const card = game.player.hand[handIndex];
  if (!card) return;
  if (card.cost > game.player.mana) {
    logLine(game, 'Not enough mana for ' + card.name + '.');
    renderAll(game);
    const node = document.querySelector('#player-hand .card[data-index="' + handIndex + '"]');
    if (node) {
      node.classList.remove('shake');
      void node.offsetWidth;
      node.classList.add('shake');
    }
    return;
  }
  playCard(game, 'player', handIndex);
  floatFor(card);
  renderAll(game);
}

function endPlayerTurn(game) {
  if (game.phase !== 'playing' || game.turn !== 'player' || game.busy) return;
  endTurn(game);
  logLine(game, "The Cinder Queen takes her turn…");
  renderAll(game);
  void runAiTurn(game);
}

function startOrRestart(game) {
  startGame(game);
  renderAll(game);
}

export function attachInput(game) {
  document.getElementById('player-hand').addEventListener('click', (event) => {
    const cardEl = event.target.closest('.card[data-index]');
    if (!cardEl) return;
    tryPlay(game, Number(cardEl.dataset.index));
  });
  document.getElementById('end-turn-btn').addEventListener('click', () => endPlayerTurn(game));
  document.getElementById('title-screen').addEventListener('click', () => {
    if (game.phase === 'title') startOrRestart(game);
  });
  document.getElementById('end-screen').addEventListener('click', () => {
    if (game.phase === 'won' || game.phase === 'lost') startOrRestart(game);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      if (game.phase === 'title' || game.phase === 'won' || game.phase === 'lost') {
        startOrRestart(game);
      }
      return;
    }
    if (event.key === 'r' || event.key === 'R') {
      if (game.phase === 'won' || game.phase === 'lost') startOrRestart(game);
      return;
    }
    if (game.phase !== 'playing' || game.turn !== 'player' || game.busy) return;
    if (event.key === ' ') {
      event.preventDefault();
      endPlayerTurn(game);
      return;
    }
    const n = Number(event.key);
    if (n >= 1 && n <= 7) tryPlay(game, n - 1);
  });
}
