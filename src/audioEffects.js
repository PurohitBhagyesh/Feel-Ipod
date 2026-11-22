// Web Audio API Sound Generator & Real MP3 Playback Engine for Feel iPod

class iPodAudioEngine {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.analyser = null;

    this.isPlaying = false;
    this.isHeadphonesPlugged = false;
    this.soundEnabled = true;
    this.hapticsEnabled = true;
    this.volume = 0.85;

    // Real audio element for user MP3 imports and streaming
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.crossOrigin = 'anonymous';
    this.mediaSourceNode = null;

    // Playlist
    this.currentTrackIndex = 0;
    this.tracks = [
      {
        id: 'track-1',
        title: "Retro Groove",
        artist: "Antigravity Sound",
        duration: "3:24",
        durationSec: 204,
        album: "Nostalgia Vibes",
        isCustom: false
      },
      {
        id: 'track-2',
        title: "Midnight Lo-Fi",
        artist: "Antigravity Sound",
        duration: "2:48",
        durationSec: 168,
        album: "Chill Session",
        isCustom: false
      },
      {
        id: 'track-3',
        title: "Digital Horizon",
        artist: "Antigravity Sound",
        duration: "3:55",
        durationSec: 235,
        album: "Classic Memories",
        isCustom: false
      },
      {
        id: 'track-4',
        title: "Summer Sunshine",
        artist: "Antigravity Sound",
        duration: "3:10",
        durationSec: 190,
        album: "Analog Days",
        isCustom: false
      }
    ];

    this.progress = 0;
    this.musicInterval = null;
    this.setupAudioListeners();
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;

      this.gainNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupAudioListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement.duration) {
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
      this.nextTrack();
    });
  }

  // --- Haptic Feedback ---
  vibrate(ms = 8) {
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (e) {}
    }
  }

  // --- Tactile Sound Effects ---

  // Mechanical Click Wheel Tick
  playClick() {
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

  // Button Press Thump (Menu / Center / Play)
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

  // 1.8-inch Hard Drive Spin-Up Spool
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

      // Contact snap 1 (sleeve entering)
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

      // Final lock click (tip locking into spring contact)
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
    if (plugged) {
      this.playPlugIn();
    } else {
      this.playUnplug();
      // Authentic iPod behavior: unplugging headphones pauses music!
      if (this.isPlaying) {
        this.toggleMusic(false);
      }
    }
  }

  // --- User MP3 & Audio File Import ---
  async importAudioFile(file) {
    this.init();
    try {
      const url = URL.createObjectURL(file);
      
      // Clean display title from filename
      let title = file.name.replace(/\.[^/.]+$/, "");
      let artist = "Imported Audio";
      
      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      }

      // Read audio duration
      const tempAudio = new Audio(url);
      await new Promise((resolve) => {
        tempAudio.addEventListener('loadedmetadata', resolve, { once: true });
        tempAudio.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 1500); // fallback timeout
      });

      const totalSec = Math.round(tempAudio.duration) || 210;
      const mins = Math.floor(totalSec / 60);
      const secs = ('0' + (totalSec % 60)).slice(-2);
      const durationStr = `${mins}:${secs}`;

      const newTrack = {
        id: `custom-${Date.now()}`,
        title: title,
        artist: artist,
        album: "My Music",
        duration: durationStr,
        durationSec: totalSec,
        url: url,
        isCustom: true
      };

      // Add to beginning of library
      this.tracks.unshift(newTrack);
      this.currentTrackIndex = 0;
      this.progress = 0;

      this.playDriveSpinUp();
      this.loadTrack(newTrack);

      return newTrack;
    } catch (err) {
      console.error("Audio import error:", err);
      throw err;
    }
  }

  // --- Track Playback ---
  loadTrack(track) {
    if (track.isCustom && track.url) {
      this.stopSynthPlayback();
      this.audioElement.src = track.url;
      this.audioElement.currentTime = 0;

      // Connect media element source if needed
      if (!this.mediaSourceNode && this.ctx) {
        try {
          this.mediaSourceNode = this.ctx.createMediaElementSource(this.audioElement);
          this.mediaSourceNode.connect(this.gainNode);
        } catch (e) {}
      }
    }
  }

  toggleMusic(forceState = null) {
    this.init();
    this.playButtonPress();

    if (forceState !== null) {
      this.isPlaying = forceState;
    } else {
      this.isPlaying = !this.isPlaying;
    }

    const currentTrack = this.getCurrentTrack();

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

    return this.isPlaying;
  }

  nextTrack() {
    this.playButtonPress();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.progress = 0;
    const track = this.getCurrentTrack();
    this.loadTrack(track);

    if (this.isPlaying) {
      this.playDriveSpinUp();
      if (track.isCustom && track.url) {
        this.audioElement.play().catch(() => {});
      } else {
        this.startSynthPlayback();
      }
    }
    return track;
  }

  prevTrack() {
    this.playButtonPress();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.progress = 0;
    const track = this.getCurrentTrack();
    this.loadTrack(track);

    if (this.isPlaying) {
      this.playDriveSpinUp();
      if (track.isCustom && track.url) {
        this.audioElement.play().catch(() => {});
      } else {
        this.startSynthPlayback();
      }
    }
    return track;
  }

  selectTrackById(id) {
    const idx = this.tracks.findIndex(t => t.id === id);
    if (idx !== -1) {
      this.currentTrackIndex = idx;
      this.progress = 0;
      const track = this.getCurrentTrack();
      this.loadTrack(track);
      if (this.isPlaying) {
        this.toggleMusic(true);
      }
      return track;
    }
    return this.getCurrentTrack();
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    this.audioElement.volume = this.volume;
    return this.volume;
  }

  // --- Retro Lo-Fi Chord Synth Fallback (when no MP3 loaded) ---
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

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = idx % 2 === 0 ? "triangle" : "sine";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.04 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.gainNode || this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.8);
      });

      // Bass
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(notes[0] / 2, now);
      bassGain.gain.setValueAtTime(0.08 * this.volume, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bassOsc.connect(bassGain);
      bassGain.connect(this.gainNode || this.ctx.destination);
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

export const audioEngine = new iPodAudioEngine();
