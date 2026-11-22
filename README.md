# FeelPod 3D

[![Three.js](https://img.shields.io/badge/Three.js-r187-black?style=flat&logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web%20Audio%20API-orange?style=flat)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![PWA Ready](https://img.shields.io/badge/PWA-Add%20to%20Home%20Screen-blue?style=flat)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An authentic, tactile 3D simulator for the classic portable MP3 player experience built with Three.js, Canvas LCD rendering, and the Web Audio API.

---

## Key Features

- **Pure Clean 3D Canvas (Zero On-Screen Floating Controls)**
  - Removed all overlay bottom docks and floating buttons from both desktop and mobile screens.
  - The 3D MP3 player floats freely, cleanly, and distraction-free in the center of the display, controlled entirely through its authentic hardware-modeled physical interface and built-in LCD software menus.

- **Embedded In-Device Settings & Controls**
  - All device controls are housed inside the MP3 player's own LCD **Settings** menu and modal:
    - *Color & Finish Studio*: Neutral classics, luxury pro finishes, and custom RGB pickers.
    - *Headphones Audio Jack*: Connect or disconnect the 3.5mm headphone plug with live status synchronization.
    - *Background Blend*: Toggle translucent glass casing that blends with custom wallpapers and videos.
    - *Media Library*: Import individual songs or entire directories recursively (`webkitdirectory`).
    - *Wallpaper Customizer*: Upload custom image or video wallpapers and reset to studio default.
    - *Preferences Modal*: Accessibility options, wheel sensitivity slider, reduce motion toggle, and contact/privacy tabs.
  - Full keyboard navigation support (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`/`Backspace`, `Space`, `S`, `C`, `H`).

- **Compact, Perfectly Proportioned Handheld Scaling (Desktop & Mobile)**
  - Re-engineered camera framing (`z = 4.25-4.90` on mobile, `z = 5.35` on desktop) making the MP3 player comfortably smaller and realistically proportioned.
  - On smartphones, the player occupies ~62% of the screen width with generous side and vertical margins, ensuring the device and hovering headphone jack are always fully visible.

- **Background Blend Mode (Transparent Frosted Glass Casing)**
  - When enabled, transforms the solid ceramic casing into a liquid frosted glass body (`opacity: 0.46–0.58`, `roughness: 0.22`, `metalness: 0.18`), allowing background wallpapers, live videos, or studio environments to shine directly through the device.
  - Procedural click wheel dynamically adopts a semi-transparent frosted acrylic finish.

- **Animated Liquid Glass "Wear Headphones" Modal**
  - Apple-grade liquid frosted glass (`backdrop-filter: blur(48px) saturate(220%)`, `background: rgba(255, 255, 255, 0.12–0.24)`).
  - Floating levitation animation with radiating audio ripples.
  - High-legibility bold typography (`font-weight: 700` heading, `font-weight: 600` subtext) for crisp clarity under all backgrounds.

- **PWA & Add to Home Screen with Native Logo**
  - Web App Manifest (`manifest.webmanifest`) and multi-resolution Apple Touch Icons (180x180, 192x192, 512x512).
  - Installable directly to your iOS or Android home screen with the custom FeelPod 3D logo emblem.

- **Comprehensive SEO & Social Metadata**
  - Rich Open Graph (`og:*`), Twitter Cards (`summary_large_image`), and Schema.org JSON-LD structured data for fast indexing and high-fidelity sharing previews.

- **Transparent Liquid Glass Loading Screen**
  - Features an Apple frosted liquid glass capsule (`backdrop-filter: blur(28px) saturate(180%)`) with a minimalist spinner and smooth transition.

- **Real Device Battery Synchronization**
  - Live battery percentage (`XX%`), battery level fill, and charging indicator (lightning bolt) rendered directly in the LCD status bar, dynamically synchronizing with the user's actual physical device battery state via `navigator.getBattery()`.

- **Continuous Playback State Memory (Resume Where You Left Off)**
  - Automatically saves the exact track, timestamp, and LCD menu view state in `localStorage` and `IndexedDB`.
  - When returning or refreshing the page, FeelPod 3D immediately restores your exact song and playback position so you can pick up right where you left off.

- **Import Entire Music Folder (`webkitdirectory`)**
  - Direct folder selection button in the bottom options dock and "Import Folder" option on the LCD screen.
  - Recursively imports all audio files (`.mp3, .m4a, .wav, .flac, .ogg`) from an entire folder at once, deduplicating and storing them in IndexedDB for continuous repeat listening.

- **Seamless Continuous Song Loop & Repeat in Background**
  - Seamless background audio playback via HTML5 Audio and Web Audio API.
  - When a song ends, FeelPod 3D automatically advances to the next track or loops back to the start of the playlist in an uninterrupted repeat cycle.
  - Fully integrated with the OS Media Session API (lock-screen album artwork, title, artist, and transport controls).

- **Center Button Play/Pause & Streamlined LCD Menu**
  - Pressing the Center Button in Now Playing or selecting "Now Playing" from the root menu toggles Play/Pause directly.
  - LCD root menu has been cleanly streamlined (removing extraneous "Extras" items) for a pure, distraction-free music listening experience.

- **Permanent Local Database Persistence for Songs & Custom Wallpapers (IndexedDB v2)**
  - Stores imported audio files (`Blob`), ID3 metadata, and extracted cover art permanently in browser local IndexedDB (`FeelPodMusicDB`).
  - Custom wallpaper images and background videos are stored as raw Blobs in IndexedDB, completely bypassing `localStorage` 5MB quota restrictions and temporary blob URL expirations—persisting reliably across device restarts, reloads, and browser sessions.
  - Automatic deduplication check prevents the same song from being added multiple times.

- **Direct Touch-to-Plug 3D Earphone Animation & Protected Unplugging**
  - Tapping or clicking directly on the 3.5mm headphone plug or top jack opening triggers a smooth cubic-bezier insertion animation with realistic mechanical latching and immediate audio playback.
  - Dedicated tactile hit-box proxy meshes (`plugHitProxy` and `socketHitProxy`) ensure 100% reliable finger tap registration.
  - **Explicit-Only Headphone Removal**: Accidental screen or body touches never disconnect the earphones. Unplugging only occurs when explicitly clicking the 3.5mm plug or the dock "Plug In / Unplug" toggle.

- **Dynamic Infinite List Scrolling with Vertical Scrollbar**
  - Scrolling the Click Wheel over the Music, Songs, or Settings menu dynamically scrolls lists of any length item-by-item.
  - Features an integrated iOS-style vertical scrollbar track and thumb indicating position in large music libraries.
  - Text labels that exceed the LCD display width automatically truncate gracefully with an ellipsis (`...`).

- **Immediate Auto-Navigation to Now Playing**
  - Whenever a song starts playing—whether from selecting a track, pressing the play button, shuffling, or connecting earphones—the LCD display automatically and instantly switches to the "Now Playing" view.

- **Floating Breathing Liquid Glass "Wear Headphones" Modal**
  - Redesigned with Apple-grade frosted liquid glass (`backdrop-filter: blur(48px) saturate(220%)`).
  - Features smooth floating and breathing levitation animation (`@keyframes immersive-card-float`) alongside 3 concentric radiating audio ripple waves (`@keyframes ripple-radiate`).
  - Dual-mode adaptation: high-contrast solid black typography on studio white, and luminous white frosted glass on custom wallpapers.

- **Mathematically Aligned Mobile Virtual Click Wheel**
  - Floating HUD (`160px × 160px` desktop, `124px × 124px` mobile) with exact quadrant positioning (`top/bottom: 50%`, `transform: translate(-50%, -50%)`).
  - Razor-sharp SVG vector icons for Previous, Next, and Play/Pause, eliminating unicode font misalignment.
  - Smooth thumb rotation around the wheel with mechanical click audio feedback and tactile tap zones.

- **Permanent Real-Life 3.5mm Plug Tip (White Delrin + Light Grey Chrome)**
  - 1:1 physical model based on genuine Apple EarPods:
    - Conductor metal (Tip dome, Ring 1, Ring 2, Sleeve) permanently locked to luminous light silver-grey chrome (`#d8dde6` / `#c4cbd6`) with dedicated upward fill lighting to prevent any dark shadowing.
    - Crisp pure white Delrin insulator rings (`#ffffff`) flush with the metal cylinder.
    - Locked color state: casing and wheel customizations never alter the plug tip's authentic white + light grey finish.

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
| **Import Audio Files** | Click **Songs** in bottom dock, select on screen, or drag & drop files |
| **Import Music Folder** | Click **Folder** in bottom dock, or select "Import Folder" on screen |
| **Feedback & Ideas** | Click **Submit Feedback & Ideas** in Settings (direct email) |
| **OS Media Keys** | Keyboard Play/Pause, Next, Prev, or Mac Control Center |

---

## Project Info

- **Repository**: [https://github.com/PurohitBhagyesh/FeelPod-3D](https://github.com/PurohitBhagyesh/FeelPod-3D)
- **License**: MIT Open Source
