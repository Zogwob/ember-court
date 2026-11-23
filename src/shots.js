// Ember Court — deterministic screenshot states. Every shot is reached by
// playing the real rules forward from a fixed seed with the autopilot, so
// the frame the judge sees is a frame a real duel can produce.
//   ?shot=title — fresh game on the title screen
//   ?shot=table — mid-game table, around round 6, both hands visible
//   ?shot=win   — autopilot plays aggressively until the rival falls
//   ?shot=loss  — autopilot never attacks until the player falls
import { endTurn, startGame } from './state.js';
import { runAiTurnSync, runPlayerTurnSync } from './ai.js';

// Play forward synchronously until `stop` says to stop. `playerMode` is
// 'attack' or 'passive'. Returns true when the stop condition was met.
function fastForward(game, playerMode, stop) {
  let guard = 0;
  while (game.phase === 'playing' && guard++ < 200) {
    if (game.turn === 'player') {
      runPlayerTurnSync(game, playerMode);
      if (game.phase !== 'playing') break;
      if (stop(game)) break;
      endTurn(game);
    } else {
      runAiTurnSync(game);
      if (game.phase !== 'playing') break;
      endTurn(game);
    }
  }
  return game.phase === 'playing';
}

// Apply the ?shot= state to a fresh game. Returns the shot name, or null
// when no shot was requested.
export function applyShot(game) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  if (shot === 'title') {
    // A fresh table behind the title panel: deal and hold on the title.
    startGame(game);
    game.phase = 'title';
    return 'title';
  }
  if (shot === 'table') {
    startGame(game);
    fastForward(game, 'attack', (g) => g.round >= 6 && g.turn === 'player');
    return 'table';
  }
  if (shot === 'win') {
    startGame(game);
    fastForward(game, 'attack', () => false);
    return 'win';
  }
  if (shot === 'loss') {
    startGame(game);
    fastForward(game, 'passive', () => false);
    return 'loss';
  }
  return null;
}
