# Homehomehome ⌂

A retro Web 0.1 operating system experience, imagined for a time before the world wide web was born. Built with vanilla HTML, CSS, and JavaScript with a Solarized color scheme and pixel-art aesthetic.

## Features

**Six Interactive Tabs:**

- **HOME** - Welcome screen with ASCII art and system status
- **BONK** - Physics-based bouncing ball game with collision detection
- **BUMP** - Classic breakout/brick-breaker game
- **CALC** - Functional calculator with persistent state
- **DRAW** - Simple pixel-art drawing canvas
- **NOTE** - On-screen keyboard notepad (uppercase only)

**Additional Features:**
- Dark/light theme toggle with Solarized color palette
- Sound effects with mute toggle
- Responsive design optimized for desktop and mobile
- Accessibility features (ARIA labels, keyboard navigation, screen reader support)
- Easter eggs: Double-tap interactions and randomization effects
- Retro pixel-art rendering with dithering effects

## Usage

Simply open `index.html` in a web browser. No build process or dependencies required.

### Controls

**General:**
- Click/tap tabs to switch between applications
- Theme toggle (▨) in menu bar
- Sound toggle (♫) in menu bar
- Reset app (☒) to reload to initial state
- Footer click to view credits

**BONK:**
- Drag balls to throw them
- Double-tap anywhere to reset

**BUMP:**
- Mouse/touch to move paddle
- Keyboard arrows or A/D keys also work
- Double-tap to toggle rainbow/random colors
- Break all bricks to win!

**CALC:**
- Click buttons or use keyboard for input
- Double-tap blank area to randomize number keys

**DRAW:**
- Touch/click and drag to draw
- Double-tap to clear canvas

**NOTE:**
- Click on-screen keyboard to type (uppercase only)
- Click in text area to move cursor
- Desktop keyboard also supported
- Hold backspace to delete continuously
- Double-tap text area to randomize keys

## File Structure

```
homehome/
├── index.html          # Main HTML with embedded CSS
├── bonk.js            # Bouncing balls physics game
├── bump.js            # Breakout/brick-breaker game
├── calc.js            # Calculator logic
├── draw.js            # Drawing canvas functionality
├── note.js            # Notepad with on-screen keyboard
├── utils.js           # Shared utilities and sound generation
└── sounds/
    ├── bonk.wav       # Collision sound effect
    └── click.wav      # UI click sound effect
```

## Technical Details

- **Pure vanilla JavaScript** - No frameworks or libraries
- **Solarized color scheme** by Ethan Schoonover
- **Pixel-perfect rendering** with dithering effects
- **Web Audio API** for sound effects with CC0 samples
- **Responsive canvas** rendering with device pixel ratio support
- **Touch-optimized** with proper event handling
- **Accessibility-first** approach with ARIA labels and keyboard support

## Inspirations

- **Ethos and image style:** [Low Tech Magazine](https://solar.lowtechmagazine.com)
- **The best fictitious OS:** [Windows93.net](https://www.windows93.net)
- **Colors and theme:** [Solarized by Ethan Schoonover](https://ethanschoonover.com/solarized/)

## Content Attribution

- **BUMP game** adapted from [Mozilla's 2D breakout tutorial](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript)
- **BONK and DRAW** adapted from [Playpip Games](https://playpip.games)

## Browser Compatibility

Tested and working on:
- Modern Chrome, Firefox, Safari, Edge
- Mobile Safari (iOS)
- Mobile Chrome (Android)

Requires JavaScript enabled and supports Web Audio API.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

[Lewis Dryburgh](https://lewisdryburgh.com), 2025

---

**Who needs the cloud? We're staying Homehomehome.**
