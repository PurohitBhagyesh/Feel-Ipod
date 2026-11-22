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
  - Interactive menu hierarchy: `Music`, `Import MP3`, `Extras`, `Settings` (Preferences, About), and `Shuffle Songs`.
  - Recessed dark LCD bezel border frame.

- **🎮 Authentic Concentric Procedural Click Wheel**
  - 100% mathematically aligned, concentric procedural vector click wheel with instant visual button flash feedback.
  - Replaces all old low-res textures with high-contrast highlighted typography (`#1e293b`) and razor-sharp vector symbols.
  - Continuous rotary drag detection using circular trigonometry (`atan2`) with mechanical piezo audio ticks.
  - 5 responsive physical control zones:
    - **Center Button**: `SELECT` / Play track / Open menu
    - **Top**: `MENU` (Navigate back up view hierarchy)
    - **Bottom**: `PLAY / PAUSE`
    - **Left**: `PREVIOUS TRACK`
    - **Right**: `NEXT TRACK`
  - Mouse scroll wheel support directly over the player for lightning-fast scrolling.

- **🎧 Real Wired Headphone Auto-Connect & White Earphone Tip**
  - **Auto-Connect**: Detects when you connect physical wired headphones or AirPods/Bluetooth to your computer or phone (`navigator.mediaDevices`), automatically triggering the 3D jack insertion!
  - **Authentic Apple Earphone Finish**: Pure white polymer insulator rings separating mirror-polished silver chrome conductors (`Tip`, `Ring 1`, `Ring 2`, `Sleeve`), with white polycarbonate barrel and flexible white cable (zero corrosion look).
  - **Earphone-Driven Audio**: Sound plays only when earphones are plugged in; unplugging immediately pauses and mutes.
  - **Immersive Modal**: YouTube-style animated **"Wear Headphones"** popup appears when connecting.

- **🎨 Interactive Color Wheel & Theme Customizer**
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

- **⚙️ Comprehensive Simulator Settings**
  - **Reduce Motion**: Toggle to disable floating breathing animations and enable instant transitions.
  - **Wheel Sensitivity**: Interactive slider (0.5x to 2.5x) to fine-tune rotary scrolling speed.
  - **On-Screen Virtual Wheel**: Toggle an authentic on-screen touch controller in the bottom right corner.
  - **Custom Background Wallpaper**: Upload any custom wallpaper image directly from your local device, with an instant Reset button.
  - **Auto-Plug Real Headphones**: Toggle automatic 3D jack insertion on physical audio device detection.
  - **Contact Us**: Connect directly with the developer via GitHub and Email.
  - **About**: Privacy Policy (100% client-side & private), Terms of Use, and MIT License.

- **📁 "Import MP3" Feature (Inside UI & Drag-and-Drop)**
  - Direct menu item `Import MP3` on the player screen and top navigation bar.
  - Select single or multiple audio files (.mp3, .wav, .m4a, .aac, .flac).
  - Drag-and-drop any audio file anywhere onto the player to instantly load and play it.
  - Automatic metadata extraction (title, artist, duration).

- **⚡ Alive "Now Playing" LCD Screen**
  - **10-Band Live Graphic Equalizer**: Real-time bouncing LCD spectrum visualizer bars with segmented bricks and peak hold dots.
  - **Animated Spinning Vinyl**: 3D vinyl record disc with spinning grooves, dynamic specular sheen wedges, and retro red center sticker.
  - **Live Progress Tracking**: Smooth elapsed time (`0:42`), remaining time (`-2:38`), and diamond playhead slider.
  - **Live Volume HUD**: Spinning the wheel in Now Playing mode smoothly adjusts volume with popup HUD.

- **🎵 Background Play & Media Session API**
  - Continuous background audio playback when switching tabs or minimizing the browser.
  - Integrated with OS media keys (Mac keyboard Play/Pause/Skip, Control Center, lock screen widgets).

---

## 🕹️ Controls Guide

| Action | Control |
|---|---|
| **Scroll Menus / Volume** | Drag circularly along the click wheel, or scroll mouse wheel |
| **Select / Confirm / Play** | Click Center Button |
| **Back / Up Menu** | Click **MENU** (Top of Wheel) |
| **Play / Pause** | Click **▶❚❚** (Bottom of Wheel) |
| **Previous Song** | Click **\|◀◀** (Left of Wheel) |
| **Next Song** | Click **▶▶\|** (Right of Wheel) |
| **Plug / Unplug Earphones** | Click the hovering 3.5mm plug, top jack opening, or top bar button |
| **Customize Colors** | Click **🎨 Color** in top bar |
| **Open Settings** | Click **⚙️ Settings** in top bar, or select **Preferences...** on screen |
| **Import Audio Files** | Click **📁 Import**, select on screen, or drag & drop files into window |
| **OS Media Keys** | Keyboard Play/Pause, Next, Prev, or Mac Control Center |

---

## 👨‍💻 Developer & Contact

- **Author**: Bhagyesh Purohit
- **GitHub**: [@PurohitBhagyesh](https://github.com/PurohitBhagyesh)
- **Email**: [Purohitunofficialbhagyesh@gmail.com](mailto:Purohitunofficialbhagyesh@gmail.com)

---

## 📄 License & Privacy

- **Privacy**: 100% client-side. No tracking, cookies, analytics, or audio files are ever uploaded or transmitted.
- **License**: Released under the open-source [MIT License](LICENSE). Copyright (c) 2026 Bhagyesh Purohit.
