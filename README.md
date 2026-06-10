# Infinite Balloons

[Leia em Portugues](README.pt-BR.md)

Infinite Balloons is a small HTML5 arcade game built with vanilla JavaScript, CSS, and Canvas. Balloons rise from the bottom of the screen with light wind movement; the player pops them to score points while watching for special balloons with bonus or penalty effects.

## Features

- Endless balloon spawning with randomized colors, speed, and sway.
- Responsive pointer and touch controls designed for phones.
- Immediate score and high score display.
- High score stored in `localStorage` as soon as it is beaten.
- Last 10 finished scores stored in `localStorage` and shown in a modal.
- Persistent settings for sound, difficulty, and locale.
- Locale toggle for `pt-BR` and `en-US`.
- Smoother balloon motion with entrance scaling, wind trails, shield feedback, burst particles, and shockwave transitions.
- Special balloons:
  - Burst balloon: pops all visible balloons and adds their points.
  - Trap balloon: resets the current score.
  - Speed balloon: makes balloons rise faster for a short time.
  - Shell balloon: gives balloons a temporary three-hit shield.
  - Gold balloon: grants bonus points.
  - Freeze balloon: slows the wind and balloon rise briefly.

## Project Structure

```text
.
|-- index.html      # Game markup, HUD, controls, and modal
|-- styles.css      # Responsive layout and visual styling
|-- game.js         # Canvas game loop, i18n, spawning, scoring, storage, and audio
|-- package.json    # Development script
`-- README.pt-BR.md # Portuguese README
```

## Getting Started

The game is static and can be opened directly in a browser:

```text
index.html
```

For a local development server, run:

```bash
npm run dev
```

The current script uses Vite through `npx`, so no checked-in dependency installation is required.

## Gameplay

Pop normal balloons to gain points. Special balloons have slightly different colors, shapes, marks, or movement patterns. Some are intentionally disguised, so careful players can spot their subtle visual clues before tapping.

The game has no ending. Use the reset button to save the current run to the recent score list and start again.

## Persistence

The game stores data in browser `localStorage` using these keys:

- `balloonGame.highScore`
- `balloonGame.history`
- `balloonGame.sound`
- `balloonGame.difficulty`
- `balloonGame.locale`

## Development Notes

- Keep the project dependency-light and browser-native.
- Prefer Canvas drawing for gameplay objects.
- Keep UI controls accessible from both mouse and touch devices.
- Keep all visible game text in the `I18N` dictionary in `game.js`.
- When adding new special balloons, update the legend, drawing mark, scoring behavior, and README.
