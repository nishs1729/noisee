# 🎧 Noisee — Ambient Soundscape Studio

[![PWA Ready](https://img.shields.io/badge/PWA-Ready-3b82f6.svg)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-10b981.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-f59e0b.svg)](#)
[![Offline Capable](https://img.shields.io/badge/Offline-100%25-6366f1.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

> **Noisee** is a sleek, offline-first ambient sound generator and soundscape mixer designed for deep focus, sleep, relaxation, and mindful productivity. Built entirely with vanilla web technologies and the Web Audio API, with zero build pipelines or external dependencies.

---

## ✨ Features at a Glance

### 🌊 Rich Ambient Sound Library
Mix and layer **12 ambient audio generators** to shape your acoustic environment:

| Sound | Icon | Type | Description |
|:------|:----:|:-----|:------------|
| **Rain** | 🌧️ | Audio Loop | Soothing, rhythmic rainfall |
| **River** | 🏞️ | Audio Loop | Steady bubbling freshwater stream |
| **Wind** | 🌬️ | Audio Loop | Gentle rustling atmospheric breeze |
| **Fire** | 🔥 | Audio Loop | Warm, crackling wood campfire |
| **Birds** | 🦜 | Audio Loop | Cheerful woodland birdsong |
| **Night Birds** | 🦉 | Audio Loop | Distant owl calls and nighttime forest ambiance |
| **Cicada** | 🦗 | Audio Loop | Calming twilight summer evening hum |
| **Sea** | 🌊 | Audio Loop | Soft rhythmic ocean waves lapping ashore |
| **Thunder** | ⛈️ | Audio Loop | Rolling thunder and distant stormy rumbles |
| **Forest** | 🌿 | Audio Loop | Lush canopy breeze and natural rustling foliage |
| **Train** | 🚂 | Audio Loop | Hypnotic rhythmic railroad journey |
| **Brown Noise** | 〰️ | **Synthesized** | Deep low-frequency noise procedurally generated in real time using the Web Audio API (no audio download required) |

---

### 🎛️ Master Audio & Mixing Deck
- **Individual Volume Sliders**: Fine-tune volume levels per track from 0% to 100% with live percentage readouts and animated mini-equalizers.
- **Master Play / Pause & Mute**: Toggle your master mix globally with a single click or keystroke (`Space`, `M`).
- **Solo Mode**: Hold <kbd>Alt</kbd> and click any sound card to isolate that track instantly, muting all other channels until toggled back.
- **Drag & Drop Reordering**: Drag sound cards to customize your preferred layout. Card ordering automatically persists to `localStorage`.
- **Real-Time Visualizer**: A responsive canvas visualizer powered by a Web Audio `AnalyserNode`, dynamically displaying frequency distribution and activity status.
- **One-Click Reset**: Restore all channel volumes to their balanced defaults with the Reset button.

---

### 🎨 Themes & Retro Visual Skins
Noisee adapts to your style with a full theme and skin engine:
- **Light & Dark Modes**: Automatic system-preference detection with instant manual toggle (<kbd>D</kbd>).
- **Multiple Visual Skins**:
  - 🌌 **Default**: A modern, translucent glassmorphism interface with subtle glow accents and dynamic visual depth.
  - 📟 **Cliamp**: A retro terminal/CRT phosphor-green aesthetic inspired by vintage audio players.
  - 📐 **Slick**: A hyper-minimalist, high-contrast monochrome design with hairline borders and zero visual distractions.

All skin and theme preferences are saved to your browser's local storage.

---

### 📚 Curated & Custom Presets
- **15 Built-in Curated Presets**:
  - *Deep Focus* • *Cozy Fireplace* • *Gentle Rain* • *Rainy Night* • *Tropical Beach* • *Thunderstorm* • *Summer Night* • *Forest Campfire* • *Windy River* • *Beach Day* • *Night Swamp* • *Storm Sleep* • *Forest Morning* • *Train Journey* • *Brown Rain*
- **Custom Mix Presets**: Save and name your own favorite sound combinations with one click. Custom presets are stored locally and accessible right from the preset selector.
- **Surprise Me (Randomizer)**: Need inspiration? Hit the **Surprise Me** button or press <kbd>R</kbd> to randomly generate a balanced, organic soundscape.

---

### ⏱️ Timers & Productivity Suite
Open the Timers panel (<kbd>T</kbd>) for specialized time management:
- 🌙 **Sleep Timer**: Choose preset durations (15m, 30m, 45m, 60m) or input custom minutes. Includes an optional **30-second smooth volume fade-out** so audio gently fades away as you drift off.
- 🎯 **Pomodoro Focus Timer**: Configurable Focus and Break intervals with an animated SVG circular progress ring, audio transition chimes, and a live header countdown badge.

---

### ⚡ Offline-First & Progressive Web App (PWA)
- **100% Offline Support**: Includes a Service Worker (`sw.js`) that caches all code, stylesheets, and audio tracks for seamless offline listening on flights, commutes, or off-grid retreats.
- **Installable PWA**: Install Noisee as a standalone desktop or mobile application directly from your browser.
- **Intelligent Preloading**: Silent background idle preloading (`requestIdleCallback`) fetches and decodes audio buffers when the browser is idle to ensure instant playback without UI lag.

---

## ⌨️ Keyboard Shortcuts

Noisee is built for effortless keyboard navigation:

| Key | Action |
|:---:|:-------|
| <kbd>Space</kbd> | Master Play / Pause active mix |
| <kbd>M</kbd> | Master Mute / Unmute |
| <kbd>R</kbd> | Randomize / "Surprise Me" mix |
| <kbd>S</kbd> or <kbd>0</kbd> | Stop all playing sounds |
| <kbd>T</kbd> | Open Timers (Sleep & Pomodoro) |
| <kbd>1</kbd> – <kbd>8</kbd> | Toggle sounds 1 through 8 |
| <kbd>Alt</kbd> + **Click** | Solo any sound track |
| <kbd>D</kbd> | Toggle Light / Dark mode |
| <kbd>Esc</kbd> | Close any open modal / panel |
| <kbd>?</kbd> | Open Keyboard Shortcuts guide |

---

## 🚀 Getting Started

Noisee requires **no build tools, bundlers, or package installations**. It runs directly in any modern browser.

### Option 1: Run with Python
```bash
# Clone the repository
git clone https://github.com/nishs1729/noisee.git
cd noisee

# Start a local static server
python3 -m http.server 8000
```
Open your browser at [http://localhost:8000](http://localhost:8000).

### Option 2: Run with Node.js / npx
```bash
npx serve .
```

### Option 3: Direct Browser Launch
You can also directly open `index.html` in any modern web browser (note: Service Worker registration and audio fetching may require a local HTTP server due to browser CORS policies for `file://` URLs).

---

## 🏗️ Project Architecture

```
noisee/
├── index.html          # Semantic HTML5 layout and modular dialogs
├── manifest.json       # Web App Manifest for PWA installation
├── sw.js               # Service Worker with cache-first offline strategy
├── css/
│   └── style.css       # Complete design system, skins, animations, and responsive layout
├── js/
│   └── app.js          # Web Audio API engine, state manager, visualizer & UI controller
└── assets/
    ├── favicon.svg     # Scalable SVG application logo
    └── sounds/         # High-quality audio loops (MP3)
        ├── birds.mp3
        ├── bonfire.mp3
        ├── cicada.mp3
        ├── forest.mp3
        ├── owl.mp3
        ├── rain.mp3
        ├── river.mp3
        ├── sea.mp3
        ├── thunder.mp3
        ├── train.mp3
        └── wind.mp3
```

---

## 🛠️ Audio Engine Details

- **Web Audio API**: Uses a single unified `AudioContext` with decoupled `GainNode` routing for each channel feeding into a `masterGain` and an `analyserNode`.
- **Procedural Brown Noise**: Rather than downloading an audio file, Brown Noise is synthesized algorithmically via Brownian random-walk equations and an 80ms loop-point crossfade buffer, producing a rich, continuous acoustic wall with zero bandwidth footprint.
- **Audio Context Auto-Unlock**: Audio contexts are lazily instantiated upon first user interaction to comply with modern browser autoplay policies.

---

## 🤝 Contributing & Customization

Adding a new sound is as simple as:
1. Dropping your loop into `assets/sounds/your-sound.mp3`.
2. Adding a definition entry to `SOUNDS_DEF` in `js/app.js`:
   ```javascript
   { id: 'coffee-shop', icon: '☕', name: 'Coffee Shop', src: 'assets/sounds/coffee.mp3', defaultVol: 0.5 }
   ```
3. Adding a corresponding `<article class="sound-card" data-id="coffee-shop">` markup in `index.html` (or letting the UI dynamically hook it).

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
