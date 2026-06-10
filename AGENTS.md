# Agent Guide

This repository contains a static HTML5 Canvas game called Infinite Balloons. Agents should keep changes focused, lightweight, and easy to run in a browser.

## Project Commands

- Start a local dev server: `npm run dev`
- Open directly without a server: `index.html`
- JavaScript syntax check, when Node is available: `node --check game.js`

## Source Map

- `index.html`: HUD, modal, controls, and script/style loading.
- `styles.css`: full-screen layout, mobile-first controls, modal, and visual polish.
- `game.js`: game loop, i18n, balloon spawning, special effects, scoring, local storage, and generated sound.

## Implementation Guidelines

- Use vanilla JavaScript, CSS, and HTML unless the project intentionally adopts a build step.
- Keep gameplay rendering in Canvas.
- Keep persistent data in `localStorage` with the existing `balloonGame.*` keys unless a migration is required.
- Preserve mouse and touch support through pointer events.
- Put visible runtime text in the `I18N` dictionary and support both `pt-BR` and `en-US`.
- Keep UI text consistent across `index.html`, `README.md`, and `README.pt-BR.md` when behavior changes.
- Avoid large framework additions for simple UI or gameplay updates.

## Special Balloon Checklist

When adding or changing a special balloon, update all relevant places:

- Spawn chance in `SPECIALS`.
- Visual marker in `drawSpecialMark`.
- Pop behavior in `popBalloon`.
- Score behavior in `popAllVisible` if needed.
- Legend markup and styles.
- Locale labels in `I18N` if new visible text is introduced.
- English and Portuguese README files.

## Storage Keys

- `balloonGame.highScore`
- `balloonGame.history`
- `balloonGame.sound`
- `balloonGame.difficulty`
- `balloonGame.locale`

## Review Focus

Before finishing a change, check:

- The game still starts without a build step.
- The Canvas resizes correctly on desktop and mobile viewports.
- Score and high score update immediately.
- Recent score history remains capped at 10 entries.
- Controls do not overlap on small screens and remain easy to tap.
- Locale switching updates controls, modal text, and history formatting.
