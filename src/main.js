// Ember Court — boot. Creates the game from the ?seed= parameter (or the
// clock for a casual duel), applies a deterministic screenshot state when
// ?shot= is present, wires input, and raises the ready flag the capture
// script waits for.
import { createGame } from './state.js';
import { renderAll, renderTitleCard } from './render.js';
import { attachInput } from './input.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isSafeInteger(seedParam) ? seedParam : (Date.now() % 2147483647);

const game = createGame(seed);
window.__game = game;

applyShot(game);
renderTitleCard();
renderAll(game);
attachInput(game);

window.__gameReady = true;
