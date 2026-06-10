# Claude Guide

This file provides project context for Claude or other AI coding assistants working on Infinite Balloons.

## Project Summary

Infinite Balloons is a browser-native arcade game built with:

- HTML in `index.html`
- CSS in `styles.css`
- Canvas and game logic in `game.js`

The game is endless: balloons rise from the bottom, drift slightly with wind, and disappear at the top. Popping balloons increments the score. Special balloons may grant bonuses, trigger penalties, or temporarily alter gameplay. The UI supports `pt-BR` and `en-US` through a persisted locale toggle.

## How To Run

Use either direct file opening or the Vite dev script:

```bash
npm run dev
```

No framework is currently used by the game code.

## Conventions

- Keep files plain and dependency-light.
- Prefer clear functions over premature abstraction.
- Keep Canvas drawing code in `game.js`.
- Keep styling responsive and avoid UI overlap on mobile.
- Keep runtime UI copy in the `I18N` dictionary in `game.js`.
- Use ASCII text unless there is a specific reason to preserve accents in user-facing Portuguese documentation.
- Do not rename storage keys casually; they are user data.

## Current Gameplay Systems

- Balloon spawning is controlled by `DIFFICULTY`, `SPECIALS`, and `spawnBalloon`.
- Balloon rendering is handled by `drawBalloon` and `drawSpecialMark`.
- Input is handled with `pointerdown`.
- Score persistence is handled with `localStorage`.
- The score history modal reads the last 10 saved runs.
- Locale persistence is handled with `balloonGame.locale`.
- Sound is generated through the Web Audio API and controlled by a persisted toggle.

## Safe Change Pattern

1. Inspect the relevant function before editing.
2. Make the smallest change that satisfies the request.
3. Run `node --check game.js` if Node is available.
4. Manually verify the browser experience when possible.
5. Update `README.md` and `README.pt-BR.md` for user-visible behavior changes.

## Common Pitfalls

- Adding a special balloon without updating its legend or README entry.
- Adding visible text outside `I18N`, which breaks locale switching.
- Changing difficulty values without preserving saved difficulty behavior.
- Forgetting that trap balloons intentionally reset the current score.
- Letting bottom controls overlap with the legend on medium screens.
- Using click-only handlers instead of pointer events, which weakens touch support.
