# MP3 Player Simulator 3D

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An authentic, tactile 3D simulator for the classic portable MP3 player experience built with Three.js, Canvas LCD rendering, and the Web Audio API.

---

## Features

- **Embedded Album Cover Art Extraction (ID3v2 APIC)**
  - Native client-side ID3v2 parser extracts attached picture (`APIC`) artwork directly from imported MP3, M4A, and FLAC files.
  - Renders true high-resolution album cover art on the LCD display with subtle rounded corners and glossy glass reflections.
  - Intelligent fallback to an animated spinning vinyl record for audio tracks without embedded covers.

- **Interactive LCD Song Scrubber**
  - Smooth scrubbing and seeking: click or slide directly along the progress bar on the LCD screen to scrub forward and backward in real-time.
  - Real-time timecode updates (elapsed time and remaining time) as you slide.

- **Apple Liquid Glass Bottom Dock**
  - Sleek, translucent frosted-glass dock anchored at the bottom of the screen (`backdrop-filter: blur(32px) saturate(190%)`).
  - Completely clears the top space for the animated 3.5mm headphone cable.
  - High-precision neutral monochrome SVG vector icons and live mini equalizer track pill.
  - Pure neutral color palette adhering to modern Apple design standards.

- **Dynamic LCD Screen with Dedicated Front Display**
  - High-DPI canvas texture with authentic pixel-sharp typography, battery indicator, and animated status icons.
  - Interactive menu hierarchy: `Music`, `Import MP3`, `Extras`, `Settings` (Preferences, About), and `Shuffle Songs`.
  - Recessed dark LCD bezel border frame.

- **Authentic Concentric Procedural Click Wheel**
  - 100% mathematically aligned, concentric procedural vector click wheel with instant visual button flash feedback.
  - High-contrast highlighted typography (`#1e293b`) and razor-sharp vector symbols.
  - Continuous rotary drag detection using circular trigonometry (`atan2`) with mechanical piezo audio ticks.
  - 5 responsive physical control zones:
    - **Center Button**: Select / Play track / Open menu
    - **Top**: Menu (Navigate back up view hierarchy)
    - **Bottom**: Play / Pause
    - **Left**: Previous track
    - **Right**: Next track
  - Mouse scroll wheel support directly over the player for lightning-fast scrolling.

- **Real Wired Headphone Auto-Connect & White Earphone Tip**
  - **Auto-Connect**: Detects when you connect physical wired headphones or AirPods/Bluetooth to your device (`navigator.mediaDevices`), automatically triggering the 3D jack insertion.
  - **Authentic Apple EarPods Tip**: Real-life dual white polymer insulator rings separating mirror-polished silver chrome conductors (`Tip`, `Ring 1`, `Ring 2`, `Sleeve`), with white polycarbonate barrel and flexible white cable (zero corrosion look).
  - **Earphone-Driven Audio**: Sound plays only when earphones are plugged in; unplugging immediately pauses and mutes.
  - **Immersive Modal**: Sleek **"Wear Headphones"** popup appears when connecting.

- **Interactive Color Palette & Theme Customizer**
  - Real-time 3D color customizer with instant presets:
    - **Classic White**
    - **Stealth Black**
    - **U2 Special Edition** (Jet Black Casing & Crimson Red Click Wheel)
    - **Silver Aluminium**
    - **Space Gray**
    - **Pacific Blue**
    - **Hot Pink**
    - **Sage Mint**
    - **Sunset Gold**
    - **Royal Purple**
  - Custom color pickers for casing, click wheel, and headphone jack & cable.
  - Automatically saved to `localStorage`.

- **Comprehensive Simulator Settings**
  - **Reduce Motion**: Toggle to disable floating breathing animations and enable instant transitions.
  - **Wheel Sensitivity**: Interactive slider (0.5x to 2.5x) to fine-tune rotary scrolling speed.
  - **On-Screen Virtual Wheel**: Toggle an authentic on-screen touch controller in the bottom right corner.
  - **Custom Background Wallpaper**: Upload any custom wallpaper image directly from your local device, with an instant Reset button.
  - **Auto-Plug Real Headphones**: Toggle automatic 3D jack insertion on physical audio device detection.
  - **Contact Us**: Connect directly with the developer via GitHub and Email.
  - **About**: Privacy Policy (100% client-side & private), Terms of Use, and MIT License.

- **Import MP3 Feature (Inside UI & Drag-and-Drop)**
  - Direct menu item `Import MP3` on the player screen and bottom dock.
  - Select single or multiple audio files (.mp3, .wav, .m4a, .aac, .flac).
  - Drag-and-drop any audio file anywhere onto the player to instantly load and play it.
  - Automatic metadata extraction (title, artist, duration, cover art).

- **Alive "Now Playing" LCD Screen**
  - **10-Band Live Graphic Equalizer**: Real-time bouncing LCD spectrum visualizer bars with segmented bricks and peak hold dots.
  - **Live Progress Tracking**: Smooth elapsed time (`0:42`), remaining time (`-2:38`), and interactive playhead slider.
  - **Live Volume HUD**: Spinning the wheel in Now Playing mode smoothly adjusts volume with popup HUD.

- **Background Play & Media Session API**
  - Continuous background audio playback when switching tabs or minimizing the browser.
  - Integrated with OS media keys (Mac keyboard Play/Pause/Skip, Control Center, lock screen widgets).

---

## Controls Guide

| Action | Control |
|---|---|
| **Scroll Menus / Volume** | Drag circularly along the click wheel, or scroll mouse wheel |
| **Select / Confirm / Play** | Click Center Button |
| **Back / Up Menu** | Click **MENU** (Top of Wheel) |
| **Play / Pause** | Click bottom of Wheel |
| **Previous Song** | Click left of Wheel |
| **Next Song** | Click right of Wheel |
| **Scrub / Slide Song** | Click or drag directly on the LCD timeline bar |
| **Plug / Unplug Earphones** | Click the hovering 3.5mm plug, top jack opening, or bottom dock button |
| **Customize Colors** | Click **Color** in bottom dock |
| **Open Settings** | Click **Settings** in bottom dock, or select **Preferences...** on screen |
| **Import Audio Files** | Click **Import**, select on screen, or drag & drop files into window |
| **OS Media Keys** | Keyboard Play/Pause, Next, Prev, or Mac Control Center |

---

## Developer & Contact

- **Author**: Bhagyesh Purohit
- **GitHub**: [@PurohitBhagyesh](https://github.com/PurohitBhagyesh)
- **Email**: Purohitunofficialbhagyesh@gmail.com
- **Repository**: [https://github.com/PurohitBhagyesh/mp3-player-simulator-3d](https://github.com/PurohitBhagyesh/mp3-player-simulator-3d)
- **License**: MIT
