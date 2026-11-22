# FeelPod 3D

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![PWA Ready](https://img.shields.io/badge/PWA-Add%20to%20Home%20Screen-blue?style=flat)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An authentic, tactile 3D simulator for the classic portable MP3 player experience built with Three.js, Canvas LCD rendering, and the Web Audio API.

---

## Key Features

- **PWA & Add to Home Screen with Native Logo**
  - Web App Manifest (`manifest.webmanifest`) and multi-resolution Apple Touch Icons (180x180, 192x192, 512x512).
  - Installable directly to your iOS or Android home screen with the custom FeelPod 3D logo emblem.

- **Comprehensive SEO & Social Metadata**
  - Rich Open Graph (`og:*`), Twitter Cards (`summary_large_image`), and Schema.org JSON-LD structured data for fast indexing and high-fidelity sharing previews.

- **Real Headphone Auto-Connect & Auto-Disconnect**
  - Intelligently detects physical audio hardware changes via `navigator.mediaDevices`:
    - **Connect**: When you plug in wired headphones or connect AirPods/Bluetooth, the 3D earphone plug automatically animates into the top jack and initiates playback.
    - **Remove**: When you disconnect or remove headphones, the 3D plug automatically unplugs and pauses playback immediately.

- **Mobile Virtual Click Wheel Optimization**
  - Ergonomic floating HUD on mobile (`140px × 140px`) with touch gesture rotary dragging and tap-zone detection.
  - Smooth thumb rotation around the wheel with mechanical click audio feedback; tap anywhere on the quadrants to trigger MENU, PLAY/PAUSE, PREV, and NEXT.

- **Direct Files App Audio Import**
  - File picker explicitly targets audio file extensions (`.mp3, .m4a, .wav, .aac, .flac, .ogg`), bypassing camera/photo prompts on mobile devices and directly opening your device's native Files app.

- **Seamless Edge-to-Edge LCD Display (Zero Black Bar)**
  - LCD screen plane precision-calibrated (0.818 x 0.618 world units) to fill the front casing window seamlessly with zero black gap or dark bezel outline.

- **Studio White Default Aesthetic**
  - Default background is a pristine Apple design studio white radial backdrop (`#ffffff` fading gently to `#f6f7fa` and `#e8ebf2` at the edges), providing high-end contrast for the 3D player, metallic rim highlights, and soft contact drop shadow.

- **Background Video & Wallpaper Support**
  - Custom background uploader supports both high-resolution images and live background videos (`.mp4`, `.webm`, `.mov`) playing seamlessly behind the 3D player. Includes an instant Reset to Studio White button.

- **Collapsible Background-Adaptive Liquid Glass Options Dock**
  - **Studio White Default**: Transparent liquid glass dock with dark slate typography and icons (`#0f172a`) that float cleanly above the studio backdrop.
  - **Dynamic Wallpaper Adaptation**: When a custom wallpaper or background video is loaded, the dock automatically adapts to dark frosted liquid glass (`rgba(18, 22, 34, 0.74)`) with crisp white/silver text and icons.
  - Sleek `>` toggle button collapses the dock downward for an uncluttered view, with a floating liquid glass `Controls` pill to expand it back at any time.

- **Background-Blending Settings Modal**
  - The Settings modal card, rows, and buttons seamlessly blend with whichever background is active (ultra-clean translucent light glass on default studio white, or dark frosted glass on custom wallpapers).

- **Text Size Selector in Settings**
  - Choose between **Small**, **Medium**, and **Large** text sizes under Preferences in Settings.
  - Dynamically scales LCD screen typography and menu labels in real-time.

- **Ultra HD Retina LCD Text Quality**
  - 2x Retina canvas scale (`1024 × 768`) with subpixel antialiasing and high-precision font rendering.
  - Eliminates all pixelation and blur, rendering text and interface elements in smooth, razor-sharp HD clarity.

- **Generous Pod-to-Dock Spacing & Responsive Auto-Framing**
  - Camera distance and vertical centering are auto-calibrated to preserve 100px–120px of breathing room between the bottom of the player and the options bar across desktop, widescreen, tablet, and mobile portrait viewports.
  - Phones feature a prominent, large pod presentation (~76% screen width) that feels tactile and immersive.

- **Permanent Real-Life 3.5mm Plug Tip (White + Light Grey)**
  - 1:1 physical model based on genuine Apple EarPods:
    - Conductor metal (Tip dome, Ring 1, Ring 2, Sleeve) permanently locked to luminous light grey silver chrome (`#f4f6fa` / `#dde2ea`) with dedicated upward fill lighting to prevent any dark shadowing.
    - Crisp pure white Delrin insulator rings (`#ffffff`) flush with the metal cylinder.
    - Locked color state: casing and wheel customizations never alter the plug tip's authentic white + light grey finish.

- **Local Database Persistence & Deduplication (IndexedDB)**
  - Stores imported audio files (`Blob`), ID3 metadata, and extracted cover art permanently in browser local IndexedDB (`FeelPodMusicDB`).
  - Songs persist across browser restarts, page refreshes, and tabs without re-uploading.
  - Automatic deduplication check prevents the same song from being added multiple times.
  - Starts fresh with authentic "No Music" empty state.

- **Curated Neutral & Premium Pro Color Editions**
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
  - Custom real-time RGB/Hex color pickers for casing, wheel, and cable.

- **Embedded Album Cover Art Extraction (ID3v2 APIC)**
  - Native client-side ID3v2 parser extracts attached picture (`APIC`) artwork directly from imported MP3, M4A, and FLAC files.
  - Renders true high-resolution album cover art on the LCD display with subtle rounded corners and glossy glass reflections.
  - Intelligent fallback to an animated spinning vinyl record for audio tracks without embedded covers.

- **Interactive LCD Song Scrubber**
  - Smooth scrubbing and seeking: click or slide directly along the progress bar on the LCD screen to scrub forward and backward in real-time.
  - Real-time timecode updates (elapsed time and remaining time) as you slide.

- **Authentic Concentric Procedural Click Wheel**
  - 100% mathematically aligned concentric procedural vector click wheel with instant visual button flash feedback.
  - High-contrast highlighted typography (`#1e293b`) and razor-sharp vector symbols.
  - Continuous rotary drag detection using circular trigonometry (`atan2`) with mechanical piezo audio ticks.

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
| **Hide / Collapse Options Bar** | Click **`>`** in the bottom dock |
| **Show / Expand Options Bar** | Click floating **Controls** pill at bottom center |
| **Customize Colors** | Click **Color** in bottom dock |
| **Open Settings** | Click **Settings** in bottom dock, or select **Preferences...** on screen |
| **Import Audio Files** | Click **Import**, select on screen, or drag & drop files into window |
| **Feedback & Ideas** | Click **Submit Feedback & Ideas** in Settings (direct email) |
| **OS Media Keys** | Keyboard Play/Pause, Next, Prev, or Mac Control Center |

---

## Project Info

- **Repository**: [https://github.com/PurohitBhagyesh/FeelPod-3D](https://github.com/PurohitBhagyesh/FeelPod-3D)
- **License**: MIT Open Source
