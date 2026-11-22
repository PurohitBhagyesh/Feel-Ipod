# FeelPod 3D (MP3 Player Simulator)

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An authentic, tactile 3D simulator for the classic portable MP3 player experience built with Three.js, Canvas LCD rendering, and the Web Audio API.

---

## Features

- **Responsive Auto-Framing & Layout Engine**
  - Camera distance and vertical centering automatically adapt to any screen size (desktop, widescreen, tablet, and mobile portrait).
  - Preserves breathing room (40px–80px clearance) above the bottom dock and top view so the device, click wheel, and headphone cable are always in view.

- **Local Database Persistence & Deduplication (IndexedDB)**
  - Stores imported audio files (`Blob`), ID3 metadata, and extracted cover art permanently in browser local IndexedDB (`FeelPodMusicDB`).
  - Songs persist across browser restarts, page refreshes, and tabs without re-uploading.
  - Automatic deduplication check prevents the same song from being added multiple times.
  - Clean initial state: dummy default songs removed; starts fresh with authentic "No Music" empty state.

- **Real-Life 3.5mm Earphone Plug Tip (Pure White + Light Grey)**
  - 1:1 physical model based on genuine Apple EarPods:
    - Luminous light grey silver conductors (Tip, Ring 1, Ring 2, Sleeve) with satin metallic sheen.
    - Pure white Delrin insulator rings flush with the metal cylinder.
    - Machined light grey detent latching groove and smooth bullet/chamfered dome nose.
    - Pure white polycarbonate cylindrical barrel with seamless silicone strain relief and white cable.
  - Automatically animates into the top jack when headphones are plugged in or detected.

- **Transparent Apple Liquid Glass Settings & Dock**
  - Settings modal and bottom dock feature frosted glass (`backdrop-filter: blur(48px) saturate(210%)` and `rgba(18, 22, 34, 0.45)`).
  - Background wallpapers softly blur through modals and navigation bars.
  - Privacy-first: no personal IDs or email addresses exposed in the interface.

- **Curated Neutral & Premium Color Editions**
  - **Neutral Classics**:
    - *Pure Ceramic White* (`#fcfcfd`)
    - *Anodized Silver* (`#d5d8de`)
    - *Natural Titanium* (`#c8c3b9`)
    - *Space Graphite* (`#374151`)
    - *Matte Obsidian* (`#121316`)
  - **Premium Pro Editions**:
    - *Space Gray Pro* (`#4b5563`)
    - *Desert Champagne* (`#dfd3c3`)
    - *Pacific Deep Navy* (`#1e293b`)
    - *Alpine Pine* (`#2d4030`)
    - *Cabernet Velvet* (`#4a1525`)
    - *U2 Collector Edition* (Jet Black & Crimson Red)
  - Custom real-time RGB/Hex color pickers for casing, wheel, and jack.

- **Mobile-Optimized Interface**
  - Dedicated mobile stylesheet supporting modern smartphone viewports (`100dvh` and safe-area insets).
  - Compact dock layout prioritizing icons and track status badges.
  - Scaled touch-target click wheel and popover panels.

- **Embedded Album Cover Art Extraction (ID3v2 APIC)**
  - Native client-side ID3v2 parser extracts attached picture (`APIC`) artwork directly from imported MP3, M4A, and FLAC files.
  - Renders true high-resolution album cover art on the LCD display with subtle rounded corners and glossy glass reflections.
  - Intelligent fallback to an animated spinning vinyl record for audio tracks without embedded covers.

- **Interactive LCD Song Scrubber**
  - Smooth scrubbing and seeking: click or slide directly along the progress bar on the LCD screen to scrub forward and backward in real-time.
  - Real-time timecode updates (elapsed time and remaining time) as you slide.

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

- **Real Wired Headphone Auto-Connect**
  - **Auto-Connect**: Detects when you connect physical wired headphones or AirPods/Bluetooth to your device (`navigator.mediaDevices`), automatically triggering the 3D jack insertion.
  - **Earphone-Driven Audio**: Sound plays only when earphones are plugged in; unplugging immediately pauses and mutes.
  - **Immersive Modal**: Sleek **"Wear Headphones"** popup appears when connecting.

- **Comprehensive Simulator Settings**
  - **Reduce Motion**: Toggle to disable floating breathing animations and enable instant transitions.
  - **Wheel Sensitivity**: Interactive slider (0.5x to 2.5x) to fine-tune rotary scrolling speed.
  - **On-Screen Virtual Wheel**: Toggle an authentic on-screen touch controller in the bottom right corner.
  - **Custom Background Wallpaper**: Upload any custom wallpaper image directly from your local device, with an instant Reset button.
  - **Auto-Plug Real Headphones**: Toggle automatic 3D jack insertion on physical audio device detection.

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

## Project Info

- **Repository**: [https://github.com/PurohitBhagyesh/FeelPod-3D](https://github.com/PurohitBhagyesh/FeelPod-3D)
- **License**: MIT Open Source
