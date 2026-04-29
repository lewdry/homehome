# Homehomehome ⌂

A retro web OS built with vanilla HTML, CSS, and JavaScript. Solarized color scheme, pixel-art style.

## Features

**Tabs:**

- **HOME** - Welcome screen with ASCII art and system status
- **BONK** - Bouncing ball physics game
- **BLOK** - Breakout/brick-breaker game
- **CALC** - Calculator with persistent state
- **DRAW** - Pixel-art drawing canvas
- **NOTE** - Notepad with on-screen keyboard (uppercase only)
- **BOOK** - E-reader for plain-text books in `books/` (search, page jump, adjustable text size)

**Other:**
- Dark/light theme toggle (Solarized)
- Sound effects with mute toggle
- Works on desktop and mobile
- PWA with offline support (manifest + service worker)
- ARIA labels, keyboard navigation, screen reader support
- Easter eggs: double-tap interactions and randomization effects

## Usage

Open `index.html` in a browser. No build step or dependencies needed.

### Controls

**General:**
- Click/tap tabs to switch apps
- Theme toggle (▨) in menu bar
- Sound toggle (♫) in menu bar
- Reset (☒) to reload
- Click footer to view credits

**BONK:**
- Drag balls to throw them
- Double-tap to reset

**BLOK:**
- Mouse/touch to move paddle
- Arrow keys or A/D also work
- Double-tap to toggle rainbow/random colors
- Break all bricks to win

**CALC:**
- Click buttons or use keyboard
- Double-tap blank area to randomize number keys

**DRAW:**
- Click/drag to draw
- Double-tap to clear

**NOTE:**
- Click on-screen keyboard to type (uppercase only)
- Click text area to move cursor
- Desktop keyboard also works
- Hold backspace to delete continuously
- Double-tap text area to randomize keys

**BOOK:**
- Browse and open any `.txt` file from `books/`
- Search, jump to a page, and change text size
- Progress saved to local storage
- Swipe to turn pages

## Deeplinks

Open the app directly to a specific tab or book using URL query parameters.

## File Structure

```
homehomehome/
├── index.html          # Main HTML
├── bonk.js             # Bouncing balls game
├── blok.js             # Breakout game
├── calc.js             # Calculator
├── draw.js             # Drawing canvas
├── note.js             # Notepad
├── book.js             # E-reader
├── utils.js            # Shared utilities and sound
└── sounds/
    ├── A2.mp3
    ├── B2.mp3
    ├── B3.mp3
    ├── D3.mp3
    ├── D4.mp3
    ├── E3.mp3
    ├── G2.mp3
    ├── G3.mp3
    ├── G4.mp3
    └── click.mp3

└── books/
    ├── aroundtheworld.txt
    ├── awakening.txt
    ├── callofcthulhu.txt
    ├── frankenstein.txt
    ├── janeeyre.txt
    ├── littlewomen.txt
    ├── mobydick.txt
    ├── prideandprejudice.txt
    ├── rubaiyat.txt
    ├── thirtyninesteps.txt
    ├── treasureisland.txt
    └── yellowwallpaper.txt
```

## Technical Notes

- No frameworks or libraries
- Solarized color scheme by Ethan Schoonover
- Web Audio API for sound with homemade CC0 samples
- Responsive canvas with device pixel ratio support

## Inspirations

- **Ethos and image style:** [Low Tech Magazine](https://solar.lowtechmagazine.com)
- **The best fictitious OS:** [Windows93.net](https://www.windows93.net)
- **Colors:** [Solarized by Ethan Schoonover](https://ethanschoonover.com/solarized/)

## Attribution

- **BLOK** adapted from [Mozilla's 2D breakout tutorial](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript)
- **BONK and DRAW** adapted from [Playpip Games](https://playpip.games)

## Browser Compatibility

Tested on:
- Chrome, Firefox, Safari, Edge
- Mobile Safari (iOS)
- Mobile Chrome (Android)

Requires JavaScript and Web Audio API support.

## License

MIT — see [LICENSE](LICENSE)

## Author

[Lewis Dryburgh](https://lewisdryburgh.com), 2025

---

**Who needs the cloud? We're staying Homehomehome.**
