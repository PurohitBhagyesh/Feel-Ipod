# MP3 Player Simulator 3D

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An authentic, tactile 3D simulator for the classic portable MP3 player experience built with Three.js, Canvas LCD rendering, and the Web Audio API.

---

## ✨ Features

- **📺 Dynamic LCD Screen with Dedicated Front Display**
  - High-DPI canvas texture with authentic pixel-sharp typography, battery indicator, and animated status icons.
  - Interactive menu hierarchy: `Music`, `Import MP3`, `Extras`, `Settings`, and `Shuffle Songs`.
  - Recessed dark LCD bezel border frame.

- **🎮 Authentic Interactive Click Wheel**
  - 100% mathematically aligned, concentric procedural vector click wheel with instant visual button flash feedback.
  - Continuous rotary drag detection using circular trigonometry (`atan2`) with mechanical piezo audio ticks (~14° per notch).
  - 5 responsive physical control zones:
    - **Center Button**: `SELECT` / Play track / Open menu
    - **Top**: `MENU` (Navigate back up view hierarchy)
    - **Bottom**: `PLAY / PAUSE`
    - **Left**: `PREVIOUS TRACK`
    - **Right**: `NEXT TRACK`
  - Mouse scroll wheel support directly over the player for lightning-fast scrolling.

- **🎧 Physical 3.5mm Headphone Jack & Earphone-Driven Playback**
  - Gleaming, corrosion-free mirror-polished nickel/chrome 3.5mm plug with authentic bullet tip, spring detent groove, and thin polymer insulator rings.
  - Realistic smooth insertion and unplug animation into the top port.
  - Earphone-driven audio: audio is muted until earphones are plugged in.
  - YouTube-style animated **"Wear Headphones"** immersive audio modal appears on connection.
  - Synthesized dual-contact mechanical snap sound on plug-in, slide/pop sound on unplug.

- **📁 "Import MP3" Feature (Inside UI & Drag-and-Drop)**
  - Direct menu item `Import MP3` on the player screen (Root and Music menus).
  - Selecting it triggers the native file picker to select single or multiple audio files (.mp3, .wav, .m4a, .aac, .flac).
  - Drag-and-drop any audio file anywhere onto the player to instantly load and play it.
  - Automatic metadata extraction (title, artist, duration).

- **⚡ Alive "Now Playing" LCD Screen**
  - **10-Band Live Graphic Equalizer**: Real-time bouncing LCD spectrum visualizer bars with segmented bricks and peak hold dots driven by the Web Audio Analyser.
  - **Animated Spinning Vinyl**: 3D vinyl record disc with spinning grooves, dynamic specular sheen wedges, and retro red center sticker that rotates in real-time while playing.
  - **Live Progress Tracking**: Smooth elapsed time (`0:42`), remaining time (`-2:38`), and diamond playhead slider.
  - **Live Volume HUD**: Spinning the wheel in Now Playing mode smoothly adjusts volume and brings up an authentic volume popup slider.
  - **Status Header**: Animated mini equalizer wave icon and Play/Pause symbol in the top status bar.

- **🎵 Background Play & Media Session API**
  - Supports continuous background audio playback when switching tabs or minimizing the browser.
  - Integrated with the **Media Session API** (`navigator.mediaSession`), supporting OS media keys (Mac keyboard Play/Pause/Skip, Control Center, lock screen widgets).

- **🏛️ High-End 3D Studio Presentation**
  - 100% opaque, glossy white polycarbonate front casing (zero internal bleed-through).
  - Sleek radial studio vignette backdrop with custom soft contact floor shadow.
  - Multi-point studio lighting: warm key spotlight, soft cool fill light, top jack rim, and chrome contour edge light.
  - Fixed front-facing locked perspective with comfortable framing and headspace.

---

## 🕹️ Controls Guide

| Action | Control |
|---|---|
| **Scroll Menus / Volume** | Drag circularly along the click wheel, or scroll mouse wheel |
| **Select / Confirm / Play** | Click Center Button |
| **Back / Up Menu** | Click **MENU** (Top of Wheel) |
| **Play / Pause** | Click **▶❚❚** (Bottom of Wheel) |
| **Previous Song** | Click **|◀◀** (Left of Wheel) |
| **Next Song** | Click **▶▶|** (Right of Wheel) |
| **Plug / Unplug Earphones** | Click the hovering 3.5mm plug or top jack opening |
| **Import MP3 Files** | Select **Import MP3** on screen, or drag & drop files onto window |
| **OS Media Keys** | Keyboard Play/Pause, Next, Prev, or Mac Control Center |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Installation
```bash
git clone https://github.com/PurohitBhagyesh/mp3-player-simulator-3d.git
cd mp3-player-simulator-3d
npm install
```

### Running Locally
```bash
npm run dev
```
Open your browser at `http://localhost:5173/` to enjoy the simulator.

### Production Build
```bash
npm run build
```
Production assets are generated in the `dist/` directory.

---

## 🛠️ Tech Stack

- **3D Graphics**: [Three.js](https://threejs.org/) (WebGL, PBR materials, procedural geometry)
- **Audio Engine**: Web Audio API (Synthesized oscillators, AnalyserNode FFT, GainNode) + HTML5 Audio
- **Screen Simulation**: High-DPI 2D HTML5 Canvas dynamic texture
- **OS Integration**: Web Media Session API (`navigator.mediaSession`)
- **Bundler & Dev Server**: [Vite](https://vitejs.dev/)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
