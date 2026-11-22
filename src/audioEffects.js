// Web Audio API Sound Generator & Real MP3 Playback Engine for FeelPod 3D
import { saveTrack, getAllStoredTracks, isTrackStored, getFileUniqueKey } from './db.js';

class iPodAudioEngine {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;
    this.freqArray = null;

    this.isPlaying = false;
    this.isHeadphonesPlugged = false;
    this.soundEnabled = true;
    this.hapticsEnabled = true;
    this.volume = 0.85;

    // Real audio element for user MP3 imports and background playback
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.muted = true; // Muted by default until earphones are plugged in!
    this.mediaSourceNode = null;

    // Playlist: Stored locally in IndexedDB (No dummy default songs!)
    this.currentTrackIndex = -1;
    this.tracks = [];

    this.progress = 0;
    this.musicInterval = null;
    this.setupAudioListeners();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();

      // Start muted if headphones not connected
      const initialGain = this.isHeadphonesPlugged ? this.volume : 0;
      this.gainNode.gain.setValueAtTime(initialGain, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;
      this.freqArray = new Uint8Array(this.analyser.frequencyBinCount);

      this.gainNode.connect(this.ctx.destination);
      this.setupMediaSessionHandlers();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupAudioListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement.duration && !isNaN(this.audioElement.duration)) {
        this.progress = this.audioElement.currentTime / this.audioElement.duration;
        window.dispatchEvent(new CustomEvent('ipod-timeupdate', {
          detail: {
            currentTime: this.audioElement.currentTime,
            duration: this.audioElement.duration,
            progress: this.progress
          }
        }));
      }
    });

    this.audioElement.addEventListener('ended', () => {
      // Continuous playback & repeat: seamlessly advance to next song (or loop back to first track)
      this.isPlaying = true;
      this.nextTrack(true);
      window.dispatchEvent(new CustomEvent('ipod-state-change'));
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.updateMediaSession();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updateMediaSession();
    });
  }

  // --- Background Play & System Media Session Support ---
  setupMediaSessionHandlers() {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          this.toggleMusic(true);
          window.dispatchEvent(new CustomEvent('ipod-state-change'));
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          this.toggleMusic(false);
          window.dispatchEvent(new CustomEvent('ipod-state-change'));
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.prevTrack();
          window.dispatchEvent(new CustomEvent('ipod-state-change'));
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.nextTrack();
          window.dispatchEvent(new CustomEvent('ipod-state-change'));
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && this.audioElement.duration) {
            this.audioElement.currentTime = details.seekTime;
          }
        });
      } catch (e) {}
    }
  }

  updateMediaSession() {
    if ('mediaSession' in navigator) {
      const track = this.getCurrentTrack();
      if (!track) return;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: track.artist,
          album: track.album || "FeelPod 3D",
          artwork: track.coverUrl ? [
            { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }
          ] : [
            { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
          ]
        });
        navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
      } catch (_) {}
    }
  }

  // --- Real-Time Frequency Data for LCD Equalizer ---
  getFrequencyData() {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(this.freqArray);
      let sum = 0;
      for (let i = 0; i < 16; i++) sum += this.freqArray[i];
      if (sum > 0) return this.freqArray;
    }

    // Lively simulated frequency spectrum when music is playing
    if (this.isPlaying) {
      const t = Date.now() * 0.007;
      const fakeData = new Uint8Array(16);
      for (let i = 0; i < 16; i++) {
        const v = Math.sin(t * (1.2 + i * 0.28) + i * 0.75) * 0.5 + 0.5;
        const beat = Math.pow(Math.sin(t * 1.9), 4);
        fakeData[i] = Math.min(255, Math.floor((v * 0.65 + beat * 0.35) * 235 + 20));
      }
      return fakeData;
    }
    return null;
  }

  // --- Haptic Feedback ---
  vibrate(ms = 8) {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // --- Tactile Synthesized Sound Effects ---

  // Mechanical Click Wheel Tick
  playWheelClick() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2400, this.ctx.currentTime);
      filter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(850, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.006);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.006);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.007);
      this.vibrate(6);
    } catch (e) {}
  }

  // Button Press Thump (Select / Menu / Play)
  playButtonPress() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(380, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.022);
      this.vibrate(12);
    } catch (e) {}
  }

  // 1.8-inch Microdrive Spin-Up Sound
  playDriveSpinUp() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.45);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
      this.vibrate(20);
    } catch (e) {}
  }

  // 3.5mm Headphone Jack Insertion (Snap & Metallic Click)
  playPlugIn() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;

      // Contact snap 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(500, now);
      osc1.frequency.exponentialRampToValueAtTime(140, now + 0.015);
      gain1.gain.setValueAtTime(0.5, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.02);

      // Final lock click
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      const filter2 = this.ctx.createBiquadFilter();
      filter2.type = "highpass";
      filter2.frequency.setValueAtTime(1800, now + 0.025);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(2600, now + 0.025);
      osc2.frequency.exponentialRampToValueAtTime(400, now + 0.045);
      gain2.gain.setValueAtTime(0.6, now + 0.025);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc2.connect(filter2);
      filter2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.025);
      osc2.stop(now + 0.055);

      this.vibrate([15, 30, 25]);
    } catch (e) {}
  }

  // 3.5mm Headphone Jack Disconnection (Pop & Slide)
  playUnplug() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.035);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
      this.vibrate(18);
    } catch (e) {}
  }

  // --- Headphone Plug State Management ---
  setHeadphonesPlugged(plugged) {
    this.isHeadphonesPlugged = plugged;
    this.init();

    if (plugged) {
      this.playPlugIn();
      // Unmute and restore volume for headphone listening
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
      this.audioElement.muted = false;

      // Start music automatically if not already playing
      if (!this.isPlaying) {
        this.toggleMusic(true);
      }
    } else {
      this.playUnplug();
      // Mute audio output immediately when headphones are removed
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.audioElement.muted = true;

      // Pause playback
      if (this.isPlaying) {
        this.toggleMusic(false);
      }
    }
  }

  // --- Local Database Persistence: Load Tracks from IndexedDB ---
  async loadPersistedTracks() {
    try {
      const records = await getAllStoredTracks();
      if (!records || records.length === 0) {
        this.tracks = [];
        this.currentTrackIndex = -1;
        return [];
      }

      const loadedList = [];
      for (const rec of records) {
        const audioUrl = URL.createObjectURL(rec.blob);
        let coverUrl = null;
        let coverImage = null;

        if (rec.coverBlob) {
          coverUrl = URL.createObjectURL(rec.coverBlob);
          const img = new Image();
          img.src = coverUrl;
          coverImage = img;
        }

        const track = {
          id: rec.id,
          uniqueKey: rec.uniqueKey,
          title: rec.title,
          artist: rec.artist,
          album: rec.album,
          duration: rec.duration,
          durationSec: rec.durationSec,
          url: audioUrl,
          coverUrl: coverUrl,
          coverImage: coverImage,
          isCustom: true
        };
        loadedList.push(track);
      }

      this.tracks = loadedList;
      if (this.tracks.length > 0) {
        this.currentTrackIndex = 0;
        this.loadTrack(this.tracks[0]);
      }
      return this.tracks;
    } catch (err) {
      console.warn('Error loading persisted tracks:', err);
      return [];
    }
  }

  // --- Multiple & Single Audio File Import with Deduplication & Local DB Storage ---
  async importAudioFiles(files) {
    this.init();
    const importedList = [];
    let duplicateCount = 0;

    for (const file of files) {
      const uniqueKey = getFileUniqueKey(file);

      // Deduplication: Check both memory and local IndexedDB so the song is not added again!
      const alreadyInMemory = this.tracks.some(t => t.uniqueKey === uniqueKey);
      const alreadyInDB = await isTrackStored(uniqueKey);

      if (alreadyInMemory || alreadyInDB) {
        duplicateCount++;
        continue;
      }

      const url = URL.createObjectURL(file);
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = "Imported Audio";
      let album = "My Library";
      let coverUrl = null;
      let coverImage = null;
      let coverBlob = null;

      // Parse ID3v2 metadata & APIC album cover
      try {
        const arrayBuf = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        const id3Data = parseID3v2(arrayBuf);
        if (id3Data.title) title = id3Data.title;
        if (id3Data.artist) artist = id3Data.artist;
        if (id3Data.album) album = id3Data.album;
        if (id3Data.coverBlob) {
          coverBlob = id3Data.coverBlob;
          coverUrl = id3Data.coverUrl;
          const img = new Image();
          img.src = coverUrl;
          coverImage = img;
        }
      } catch (err) {
        console.warn("ID3 parse skipped:", err);
      }

      if (!coverUrl && title.includes(" - ")) {
        const parts = title.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      }

      const tempAudio = new Audio(url);
      await new Promise((resolve) => {
        tempAudio.addEventListener('loadedmetadata', resolve, { once: true });
        tempAudio.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 800);
      });

      const totalSec = Math.round(tempAudio.duration) || 210;
      const mins = Math.floor(totalSec / 60);
      const secs = ('0' + (totalSec % 60)).slice(-2);

      const trackId = `track-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const trackRecord = {
        id: trackId,
        uniqueKey: uniqueKey,
        name: file.name,
        size: file.size,
        type: file.type,
        title: title,
        artist: artist,
        album: album,
        duration: `${mins}:${secs}`,
        durationSec: totalSec,
        blob: file,
        coverBlob: coverBlob,
        dateAdded: Date.now()
      };

      // Store in local IndexedDB so it persists across refreshes and restarts!
      await saveTrack(trackRecord);

      const track = {
        id: trackId,
        uniqueKey: uniqueKey,
        title: title,
        artist: artist,
        album: album,
        duration: `${mins}:${secs}`,
        durationSec: totalSec,
        url: url,
        coverUrl: coverUrl,
        coverImage: coverImage,
        isCustom: true
      };

      this.tracks.unshift(track);
      importedList.push(track);
    }

    if (importedList.length > 0) {
      this.currentTrackIndex = 0;
      this.progress = 0;
      this.playDriveSpinUp();
      this.loadTrack(importedList[0]);
    }

    return { imported: importedList, duplicates: duplicateCount };
  }

  // --- Interactive Seeking / Sliding ---
  seekTo(seconds) {
    const cur = this.getCurrentTrack();
    if (!cur) return;
    const duration = (cur.isCustom && this.audioElement.duration) ? this.audioElement.duration : (cur.durationSec || 200);
    const clampedTime = Math.max(0, Math.min(duration, seconds));

    if (cur.isCustom && this.audioElement) {
      this.audioElement.currentTime = clampedTime;
    }
    this.progress = duration > 0 ? (clampedTime / duration) : 0;

    window.dispatchEvent(new CustomEvent('ipod-timeupdate', {
      detail: {
        currentTime: clampedTime,
        duration: duration,
        progress: this.progress
      }
    }));
  }

  seekToProgress(fraction) {
    const cur = this.getCurrentTrack();
    if (!cur) return;
    const duration = (cur.isCustom && this.audioElement.duration) ? this.audioElement.duration : (cur.durationSec || 200);
    this.seekTo(fraction * duration);
  }

  // Alias for single file import
  async importAudioFile(file) {
    const res = await this.importAudioFiles([file]);
    return (res.imported && res.imported[0]) || null;
  }

  importLocalFile(file) {
    return this.importAudioFile(file);
  }

  // --- Track Playback ---
  loadTrack(track) {
    if (!track) return;
    if (track.isCustom && track.url) {
      this.stopSynthPlayback();
      this.audioElement.src = track.url;
      this.audioElement.currentTime = 0;

      // Connect media element source to Web Audio analyser
      if (!this.mediaSourceNode && this.ctx) {
        try {
          this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.mediaSourceNode.connect(this.analyser);
          this.analyser.connect(this.gainNode);
        } catch (e) {}
      }
    }
    this.updateMediaSession();
  }

  toggleMusic(forceState = null) {
    this.init();
    this.playButtonPress();

    if (this.tracks.length === 0) {
      this.isPlaying = false;
      return false;
    }

    if (forceState !== null) {
      this.isPlaying = forceState;
    } else {
      this.isPlaying = !this.isPlaying;
    }

    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) {
      this.isPlaying = false;
      return false;
    }

    if (this.isPlaying) {
      this.playDriveSpinUp();
      if (currentTrack.isCustom && currentTrack.url) {
        this.audioElement.play().catch(() => {});
      } else {
        this.startSynthPlayback();
      }
    } else {
      if (currentTrack.isCustom && currentTrack.url) {
        this.audioElement.pause();
      } else {
        this.stopSynthPlayback();
      }
    }

    this.updateMediaSession();
    return this.isPlaying;
  }

  nextTrack(forcePlay = false) {
    this.playButtonPress();
    if (this.tracks.length === 0) return null;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.progress = 0;
    const track = this.getCurrentTrack();
    if (track) {
      this.loadTrack(track);
      if (this.isPlaying || forcePlay) {
        this.isPlaying = true;
        this.playDriveSpinUp();
        if (track.isCustom && track.url) {
          this.audioElement.currentTime = 0;
          this.audioElement.play().catch((e) => console.log('Next track playback deferred:', e));
        } else {
          this.startSynthPlayback();
        }
      }
    }
    return track;
  }

  prevTrack(forcePlay = false) {
    this.playButtonPress();
    if (this.tracks.length === 0) return null;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.progress = 0;
    const track = this.getCurrentTrack();
    if (track) {
      this.loadTrack(track);
      if (this.isPlaying || forcePlay) {
        this.isPlaying = true;
        this.playDriveSpinUp();
        if (track.isCustom && track.url) {
          this.audioElement.currentTime = 0;
          this.audioElement.play().catch((e) => console.log('Prev track playback deferred:', e));
        } else {
          this.startSynthPlayback();
        }
      }
    }
    return track;
  }

  selectTrackById(id) {
    if (this.tracks.length === 0) return null;
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.currentTrackIndex = idx;
      this.progress = 0;
      const track = this.tracks[idx];
      this.loadTrack(track);
      if (this.isPlaying) {
        this.toggleMusic(true);
      }
      return track;
    }
    return this.getCurrentTrack();
  }

  getCurrentTrack() {
    if (this.tracks.length === 0) return null;
    return this.tracks[this.currentTrackIndex] || this.tracks[0] || null;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1.0, vol));
    if (this.isHeadphonesPlugged) {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
      this.audioElement.muted = false;
    } else {
      if (this.gainNode && this.ctx) {
        this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      this.audioElement.muted = true;
    }
    this.audioElement.volume = this.volume;
    return this.volume;
  }

  // --- Retro Lo-Fi Chord Synth Fallback (when no MP3 is imported) ---
  startSynthPlayback() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    const chordNotes = [
      [261.63, 329.63, 392.00, 523.25], // C major 7
      [220.00, 261.63, 329.63, 440.00], // A minor 7
      [174.61, 220.00, 261.63, 349.23], // F major 7
      [196.00, 246.94, 293.66, 392.00], // G dominant
    ];
    let step = 0;

    const playChordStep = () => {
      if (!this.isPlaying) return;
      const notes = chordNotes[step % chordNotes.length];
      const now = this.ctx.currentTime;
      const currentGain = this.isHeadphonesPlugged ? this.volume : 0;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04 * currentGain, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.analyser || this.gainNode || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.8);
      });

      // Bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(notes[0] / 2, now);
      bassGain.gain.setValueAtTime(0.08 * currentGain, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bassOsc.connect(bassGain);
      bassGain.connect(this.analyser || this.gainNode || this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 1.5);

      step++;
      this.progress = (this.progress + 0.015) % 1.0;
      window.dispatchEvent(new CustomEvent('ipod-timeupdate', {
        detail: { progress: this.progress }
      }));
    };

    playChordStep();
    this.musicInterval = setInterval(playChordStep, 1500);
  }

  stopSynthPlayback() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

// --- ID3v2 Tag & APIC Album Cover Extractor ---
function parseID3v2(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const metadata = { title: null, artist: null, album: null, coverUrl: null };

  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) { // 'ID3'
    const ver = bytes[3];
    const tagSize = ((bytes[6] & 0x7f) << 21) | ((bytes[7] & 0x7f) << 14) | ((bytes[8] & 0x7f) << 7) | (bytes[9] & 0x7f);
    let offset = 10;
    const maxOffset = Math.min(bytes.length, tagSize + 10);

    while (offset + 10 < maxOffset) {
      const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      if (frameId.charCodeAt(0) === 0) break;

      let frameSize = 0;
      if (ver === 4) {
        frameSize = ((bytes[offset + 4] & 0x7f) << 21) | ((bytes[offset + 5] & 0x7f) << 14) | ((bytes[offset + 6] & 0x7f) << 7) | (bytes[offset + 7] & 0x7f);
      } else {
        frameSize = (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
      }

      const frameDataOffset = offset + 10;
      if (frameSize <= 0 || frameDataOffset + frameSize > bytes.length) break;

      const frameBytes = bytes.subarray(frameDataOffset, frameDataOffset + frameSize);

      if (frameId === 'TIT2') {
        metadata.title = decodeTextFrame(frameBytes);
      } else if (frameId === 'TPE1') {
        metadata.artist = decodeTextFrame(frameBytes);
      } else if (frameId === 'TALB') {
        metadata.album = decodeTextFrame(frameBytes);
      } else if (frameId === 'APIC') {
        try {
          const encoding = frameBytes[0];
          let mimeEnd = 1;
          while (mimeEnd < frameBytes.length && frameBytes[mimeEnd] !== 0) mimeEnd++;
          let mime = 'image/jpeg';
          if (mimeEnd > 1) {
            mime = String.fromCharCode(...frameBytes.subarray(1, mimeEnd)).toLowerCase();
            if (!mime.includes('/')) mime = 'image/' + mime;
          }
          let descEnd = mimeEnd + 2;
          if (encoding === 1 || encoding === 2) {
            while (descEnd + 1 < frameBytes.length && !(frameBytes[descEnd] === 0 && frameBytes[descEnd + 1] === 0)) descEnd += 2;
            descEnd += 2;
          } else {
            while (descEnd < frameBytes.length && frameBytes[descEnd] !== 0) descEnd++;
            descEnd += 1;
          }
          const imgBytes = frameBytes.subarray(descEnd);
          if (imgBytes.length > 32) {
            const blob = new Blob([imgBytes], { type: mime });
            metadata.coverBlob = blob;
            metadata.coverUrl = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.warn('APIC cover parse error:', e);
        }
      }

      offset = frameDataOffset + frameSize;
    }
  }

  return metadata;
}

function decodeTextFrame(frameBytes) {
  if (!frameBytes || frameBytes.length < 2) return null;
  const encoding = frameBytes[0];
  const data = frameBytes.subarray(1);
  try {
    if (encoding === 0) {
      return new TextDecoder('iso-8859-1').decode(data).replace(/\0.*$/g, '').trim();
    } else if (encoding === 1) {
      return new TextDecoder('utf-16').decode(data).replace(/\0.*$/g, '').trim();
    } else if (encoding === 2) {
      return new TextDecoder('utf-16be').decode(data).replace(/\0.*$/g, '').trim();
    } else if (encoding === 3) {
      return new TextDecoder('utf-8').decode(data).replace(/\0.*$/g, '').trim();
    }
  } catch (e) {
    return String.fromCharCode(...data).replace(/\0.*$/g, '').trim();
  }
  return null;
}

export const audioEngine = new iPodAudioEngine();
