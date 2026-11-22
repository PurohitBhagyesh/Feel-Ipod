// Web Audio API Sound Generator for authentic iPod haptics and music playback

class iPodAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.musicInterval = null;
    this.currentTrackIndex = 0;
    this.tracks = [
      { title: "Feel Good Inc.", artist: "Gorillaz", duration: "3:42", album: "Demon Days (2005)" },
      { title: "1901", artist: "Phoenix", duration: "3:13", album: "Wolfgang Amadeus (2009)" },
      { title: "Viva La Vida", artist: "Coldplay", duration: "4:02", album: "Viva La Vida (2008)" },
      { title: "Digital Love", artist: "Daft Punk", duration: "4:58", album: "Discovery (2001)" },
      { title: "Clocks", artist: "Coldplay", duration: "5:07", album: "A Rush of Blood (2002)" }
    ];
    this.progress = 0.25;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // The unmistakable mechanical iPod Click sound
  playClick() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2200, this.ctx.currentTime);
      filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.007);

      gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.007);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.008);

      // Mobile haptics vibration if supported
      if (navigator.vibrate) {
        navigator.vibrate(6);
      }
    } catch (e) {
      // AudioContext not unlocked yet
    }
  }

  // Play mechanical button click (Menu / Select / Play)
  playButtonPress() {
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + 0.025);

      if (navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (e) {}
  }

  // Authentic 1.8-inch hard drive spin up sound
  playDriveSpinUp() {
    try {
      this.init();
      const now = this.ctx.currentTime;
      // High pitch spin
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.5);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.65);
    } catch (e) {}
  }

  // Built-in lo-fi chord synth so music plays immediately without external assets
  toggleMusic() {
    this.init();
    this.playButtonPress();
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.playDriveSpinUp();
      this.startSynthPlayback();
    } else {
      this.stopSynthPlayback();
    }
    return this.isPlaying;
  }

  nextTrack() {
    this.playButtonPress();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.progress = 0;
    if (this.isPlaying) {
      this.playDriveSpinUp();
    }
    return this.getCurrentTrack();
  }

  prevTrack() {
    this.playButtonPress();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.progress = 0;
    if (this.isPlaying) {
      this.playDriveSpinUp();
    }
    return this.getCurrentTrack();
  }

  getCurrentTrack() {
    return this.tracks[this.currentTrackIndex];
  }

  startSynthPlayback() {
    if (this.musicInterval) clearInterval(this.musicInterval);
    
    // Play warm melodic chords
    const chordNotes = [
      [261.63, 329.63, 392.00, 523.25], // C major
      [220.00, 261.63, 329.63, 440.00], // A minor
      [174.61, 220.00, 261.63, 349.23], // F major
      [196.00, 246.94, 293.66, 392.00], // G major
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

        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.8);
      });

      // Bass note
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "sine";
      bassOsc.frequency.setValueAtTime(notes[0] / 2, now);
      bassGain.gain.setValueAtTime(0.09, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 1.5);

      step++;
      this.progress = (this.progress + 0.015) % 1.0;
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
