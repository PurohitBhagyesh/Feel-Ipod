// Authentic LCD Screen Renderer for MP3 Player Simulator 3D

export class iPodScreenRenderer {
  constructor() {
    this.dpr = 2; // HD 2x Retina scale for ultra-smooth crystal-clear typography & graphics
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512 * this.dpr;
    this.canvas.height = 384 * this.dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.needsUpdate = true;

    // View State: 'root', 'music', 'songs', 'nowPlaying', 'settings'
    this.viewStack = ['root'];
    this.selectedIndices = {
      root: 0,
      music: 0,
      songs: 0,
      settings: 0
    };

    this.textSize = 'medium'; // 'small' | 'medium' | 'large'
    this.textSizeScale = 1.0;

    this.batteryLevel = 1.0;
    this.isBatteryCharging = false;
    this.isPlaying = false;
    this.vinylAngle = 0;
    this.volumeHUDTimer = 0;
    this.currentVolume = 0.85;

    // Peak levels for live 10-band LCD equalizer
    this.eqPeakBars = new Array(10).fill(0);

    this.tracks = [];
    this.currentTrack = {
      title: "Retro Groove",
      artist: "Antigravity Sound",
      album: "Nostalgia Vibes",
      duration: "3:24",
      currentTimeStr: "0:00",
      progress: 0.0
    };
  }

  setTextSize(size) {
    this.textSize = size;
    if (size === 'small') {
      this.textSizeScale = 0.88;
    } else if (size === 'large') {
      this.textSizeScale = 1.15;
    } else {
      this.textSizeScale = 1.0;
    }
    this.needsUpdate = true;
  }

  setBattery(level, charging = false) {
    this.batteryLevel = Math.max(0.04, Math.min(1.0, level));
    this.isBatteryCharging = Boolean(charging);
    this.needsUpdate = true;
  }

  getFont(spec) {
    return spec.replace(/(\d+)px/, (_, px) => {
      const scaled = Math.round(parseInt(px, 10) * this.textSizeScale);
      return `${scaled}px`;
    });
  }

  setTracks(tracks) {
    this.tracks = tracks;
    this.needsUpdate = true;
  }

  getCurrentView() {
    return this.viewStack[this.viewStack.length - 1];
  }

  showVolumeHUD(vol) {
    this.currentVolume = vol;
    this.volumeHUDTimer = 75; // show for ~75 frames (~1.2s)
    this.needsUpdate = true;
  }

  getMenuItems() {
    const view = this.getCurrentView();
    if (view === 'root') {
      return [
        { id: 'music', label: 'Music', hasSub: true },
        { id: 'nowPlaying', label: 'Now Playing', hasSub: false },
        { id: 'import', label: 'Import Songs', hasSub: false },
        { id: 'importFolder', label: 'Import Folder', hasSub: false },
        { id: 'settings', label: 'Settings', hasSub: true },
        { id: 'shuffle', label: 'Shuffle Songs', hasSub: false }
      ];
    } else if (view === 'music') {
      return [
        { id: 'songs', label: 'Songs', hasSub: true },
        { id: 'import', label: 'Import Songs', hasSub: false },
        { id: 'importFolder', label: 'Import Folder', hasSub: false },
        { id: 'artists', label: 'Artists', hasSub: false },
        { id: 'albums', label: 'Albums', hasSub: false }
      ];
    } else if (view === 'settings') {
      return [
        { id: 'settingsModal', label: 'Preferences...', hasSub: false },
        { id: 'about', label: 'About', hasSub: true },
        { id: 'repeat', label: 'Repeat: All', hasSub: false }
      ];
    } else if (view === 'songs') {
      if (this.tracks.length === 0) {
        return [
          { id: 'import', label: 'Import Songs...', hasSub: false }
        ];
      }
      return this.tracks.map((t, idx) => ({
        id: `song-${idx}`,
        trackId: t.id,
        label: t.title,
        hasSub: false
      }));
    }
    return [];
  }

  scroll(delta) {
    const view = this.getCurrentView();
    if (view === 'nowPlaying') {
      return;
    }

    const items = this.getMenuItems();
    if (!items.length) return;

    const currIdx = this.selectedIndices[view] || 0;
    const newIdx = Math.max(0, Math.min(items.length - 1, currIdx + delta));
    if (newIdx !== currIdx) {
      this.selectedIndices[view] = newIdx;
      this.needsUpdate = true;
    }
  }

  selectCurrent() {
    const view = this.getCurrentView();
    const items = this.getMenuItems();
    const currIdx = this.selectedIndices[view] || 0;
    const item = items[currIdx];

    if (!item) return null;

    if (item.id === 'import') {
      return { action: 'importMp3' };
    }

    if (item.id === 'importFolder') {
      return { action: 'importFolder' };
    }

    if (item.id === 'settingsModal') {
      return { action: 'openSettings' };
    }

    if (view === 'root') {
      if (item.id === 'music') {
        this.viewStack.push('music');
        this.selectedIndices.music = 0;
      } else if (item.id === 'nowPlaying') {
        this.viewStack.push('nowPlaying');
        this.needsUpdate = true;
        return { action: 'togglePlay' };
      } else if (item.id === 'settings') {
        this.viewStack.push('settings');
        this.selectedIndices.settings = 0;
      } else if (item.id === 'shuffle') {
        return { action: 'shuffle' };
      }
    } else if (view === 'settings') {
      if (item.id === 'about') {
        this.viewStack.push('about');
        this.selectedIndices.about = 0;
      }
    } else if (view === 'music') {
      if (item.id === 'songs') {
        this.viewStack.push('songs');
        this.selectedIndices.songs = 0;
      }
    } else if (view === 'songs') {
      this.viewStack.push('nowPlaying');
      this.needsUpdate = true;
      return { action: 'playTrack', trackId: item.trackId };
    } else if (view === 'nowPlaying') {
      return { action: 'togglePlay' };
    }

    this.needsUpdate = true;
    return null;
  }

  goBack() {
    if (this.viewStack.length > 1) {
      this.viewStack.pop();
      this.needsUpdate = true;
      return true;
    }
    return false;
  }

  setTrack(track, isPlaying) {
    this.currentTrack = {
      ...this.currentTrack,
      ...track,
      duration: track.duration || "3:30"
    };
    this.isPlaying = isPlaying;
    this.needsUpdate = true;
  }

  setTimeUpdate(currentTime, duration, progress) {
    this.currentTrack.progress = progress;
    if (currentTime !== undefined) {
      const mins = Math.floor(currentTime / 60);
      const secs = ('0' + Math.floor(currentTime % 60)).slice(-2);
      this.currentTrack.currentTimeStr = `${mins}:${secs}`;
    }
    if (duration !== undefined && currentTime !== undefined) {
      const remainingSec = Math.max(0, Math.floor(duration - currentTime));
      const remMins = Math.floor(remainingSec / 60);
      const remSecs = ('0' + Math.floor(remainingSec % 60)).slice(-2);
      this.currentTrack.remainingTimeStr = `-${remMins}:${remSecs}`;
    }
    this.needsUpdate = true;
  }

  render(freqData = null) {
    const view = this.getCurrentView();
    // Continuous rendering when nowPlaying and playing for EQ & spinning vinyl
    if (view === 'nowPlaying' && this.isPlaying) {
      this.needsUpdate = true;
    }

    if (!this.needsUpdate && this.volumeHUDTimer <= 0) return false;

    const ctx = this.ctx;
    const w = 512;
    const h = 384;

    // Clear full physical canvas buffer at HD 2x Retina resolution
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 1. Crisp authentic white LCD display
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // 2. Status Bar Header
    this.drawHeader(ctx, w);

    // 3. Content
    if (view === 'nowPlaying') {
      this.drawNowPlaying(ctx, w, h, freqData);
    } else if (view === 'about') {
      this.drawAbout(ctx, w, h);
    } else {
      this.drawMenuList(ctx, w, h, view);
    }

    if (this.volumeHUDTimer > 0) {
      this.volumeHUDTimer--;
    }

    ctx.restore();

    this.needsUpdate = false;
    return true;
  }

  drawHeader(ctx, w) {
    const headerH = 46;

    // Header Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, headerH);

    // Thin separator line below header
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, headerH - 1, w, 1);

    // Play/Pause icon (top left)
    ctx.fillStyle = '#333333';
    if (this.isPlaying) {
      // Play symbol
      ctx.beginPath();
      ctx.moveTo(16, 15);
      ctx.lineTo(26, 23);
      ctx.lineTo(16, 31);
      ctx.closePath();
      ctx.fill();

      // Mini animated sound wave icon
      const t = Date.now() * 0.008;
      const h1 = 6 + Math.abs(Math.sin(t * 1.5)) * 10;
      const h2 = 6 + Math.abs(Math.sin(t * 2.2)) * 14;
      const h3 = 6 + Math.abs(Math.sin(t * 1.8)) * 12;

      ctx.fillStyle = '#5b7298';
      ctx.fillRect(32, 23 - h1 / 2, 2.5, h1);
      ctx.fillRect(37, 23 - h2 / 2, 2.5, h2);
      ctx.fillRect(42, 23 - h3 / 2, 2.5, h3);
    } else {
      // Pause symbol (two bars)
      ctx.fillRect(16, 15, 3.5, 16);
      ctx.fillRect(23, 15, 3.5, 16);
    }

    // Title in center
    let title = 'FeelPod';
    const view = this.getCurrentView();
    if (view === 'music') title = 'Music';
    else if (view === 'songs') title = 'Songs';
    else if (view === 'nowPlaying') title = 'Now Playing';
    else if (view === 'extras') title = 'Extras';
    else if (view === 'settings') title = 'Settings';

    ctx.font = this.getFont('bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111111';
    ctx.fillText(title, w / 2, 31);

    // Real Device Battery Readout on Right
    const pct = Math.round(this.batteryLevel * 100);
    const pctStr = `${pct}%`;

    // Battery Percentage Text
    ctx.font = this.getFont('600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#222222';
    ctx.fillText(pctStr, w - 50, 29);

    // Battery Shell
    const bx = w - 44;
    const by = 15;
    const bw = 30;
    const bh = 16;

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(bx, by, bw, bh);

    // Battery positive terminal nub
    ctx.fillStyle = '#333333';
    ctx.fillRect(bx + bw, by + 4, 2.5, bh - 8);

    // Battery Charge Fill
    const fillW = Math.max(2, (bw - 4) * this.batteryLevel);
    if (this.isBatteryCharging) {
      ctx.fillStyle = '#16a34a'; // Vibrant green when charging
    } else if (this.batteryLevel <= 0.20) {
      ctx.fillStyle = '#dc2626'; // Alert red
    } else {
      ctx.fillStyle = '#22c55e'; // Normal Apple battery green
    }
    ctx.fillRect(bx + 2, by + 2, fillW, bh - 4);

    // Crisp lightning bolt indicator if device is charging
    if (this.isBatteryCharging) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(bx + bw / 2 + 1, by + 2);
      ctx.lineTo(bx + bw / 2 - 2, by + 8);
      ctx.lineTo(bx + bw / 2, by + 8);
      ctx.lineTo(bx + bw / 2 - 1, by + bh - 2);
      ctx.lineTo(bx + bw / 2 + 3, by + 7);
      ctx.lineTo(bx + bw / 2 + 1, by + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawMenuList(ctx, w, h, view) {
    const items = this.getMenuItems();
    const itemHeight = 48;
    const startY = 48;
    const selectedIdx = this.selectedIndices[view] || 0;

    items.forEach((item, index) => {
      const y = startY + index * itemHeight;
      if (y + itemHeight > h) return;

      const isSelected = index === selectedIdx;

      if (isSelected) {
        // Classic muted slate/indigo-blue selection bar
        ctx.fillStyle = '#6f82a5';
        ctx.fillRect(0, y, w, itemHeight);
      }

      // Label text
      ctx.textAlign = 'left';
      ctx.font = this.getFont('bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
      ctx.fillText(item.label, 20, y + 33);

      // Chevron arrow (›) on right
      if (item.hasSub) {
        ctx.textAlign = 'right';
        ctx.font = this.getFont('bold 24px sans-serif');
        ctx.fillStyle = isSelected ? '#ffffff' : '#555555';
        ctx.fillText('›', w - 20, y + 33);
      } else if (item.id === 'import') {
        // Clean + indicator for importing
        ctx.textAlign = 'right';
        ctx.font = this.getFont('bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
        ctx.fillStyle = isSelected ? '#ffffff' : '#68758d';
        ctx.fillText('+', w - 20, y + 33);
      }
    });
  }

  drawAbout(ctx, w, h) {
    const startY = 72;
    const lineHeight = 42;
    const items = [
      { label: 'Songs', val: `${this.tracks.length}` },
      { label: 'Capacity', val: '80.0 GB' },
      { label: 'Available', val: '74.2 GB' },
      { label: 'Version', val: '1.4.1' },
      { label: 'Model', val: 'FeelPod 3D' },
      { label: 'Format', val: 'Web Audio / HTML5' }
    ];

    items.forEach((item, idx) => {
      const y = startY + idx * lineHeight;
      ctx.textAlign = 'left';
      ctx.font = this.getFont('bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      ctx.fillStyle = '#222222';
      ctx.fillText(item.label, 28, y);

      ctx.textAlign = 'right';
      ctx.font = this.getFont('500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      ctx.fillStyle = '#666666';
      ctx.fillText(item.val, w - 28, y);

      // Light separator
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(28, y + 12, w - 56, 1);
    });

    ctx.textAlign = 'center';
    ctx.font = this.getFont('italic 16px sans-serif');
    ctx.fillStyle = '#888888';
    ctx.fillText('Press MENU to return', w / 2, h - 22);
  }

  drawVinylRecord(ctx, artX, artY, artSize) {
    if (this.isPlaying) {
      this.vinylAngle += 0.045;
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(artX, artY, artSize, artSize, 8);
    ctx.clip();

    ctx.fillStyle = '#14171f';
    ctx.fillRect(artX, artY, artSize, artSize);

    const cx = artX + artSize / 2;
    const cy = artY + artSize / 2;
    ctx.translate(cx, cy);
    ctx.rotate(this.vinylAngle);

    ctx.strokeStyle = '#282d3c';
    ctx.lineWidth = 1.2;
    for (let r = 24; r < 64; r += 7) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const gradSheen = ctx.createRadialGradient(0, 0, 10, 0, 0, 64);
    gradSheen.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
    gradSheen.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
    ctx.fillStyle = gradSheen;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 64, -0.4, 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 64, Math.PI - 0.4, Math.PI + 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#cf352e';
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawNowPlaying(ctx, w, h, freqData) {
    if (!this.currentTrack) {
      ctx.textAlign = 'center';
      ctx.font = this.getFont('bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      ctx.fillStyle = '#1e293b';
      ctx.fillText('No Music', w / 2, 130);

      ctx.font = this.getFont('16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif');
      ctx.fillStyle = '#64748b';
      ctx.fillText('Select Import MP3 to add songs', w / 2, 165);

      ctx.font = this.getFont('italic 13px -apple-system, sans-serif');
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Stored locally in your browser', w / 2, 205);
      return;
    }

    const artSize = 138;
    const artX = 24;
    const artY = 62;

    // 1. Album Artwork: Real Embedded Cover or Spinning Vinyl Record
    const hasCover = this.currentTrack && this.currentTrack.coverImage && this.currentTrack.coverImage.complete && this.currentTrack.coverImage.naturalWidth > 0;

    if (hasCover) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(artX, artY, artSize, artSize, 8);
      ctx.clip();
      ctx.drawImage(this.currentTrack.coverImage, artX, artY, artSize, artSize);

      // Glossy sheen overlay
      const glossGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
      glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      glossGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = glossGrad;
      ctx.fillRect(artX, artY, artSize, artSize);
      ctx.restore();

      // Delicate outer frame
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(artX, artY, artSize, artSize);
    } else {
      this.drawVinylRecord(ctx, artX, artY, artSize);
    }

    // 2. Track Metadata (Right Column)
    const textX = artX + artSize + 20;

    // Track Counter (e.g. "1 of 4")
    const trackIndex = this.tracks.findIndex(t => t.id === this.currentTrack.id);
    const countStr = trackIndex !== -1 ? `${trackIndex + 1} of ${this.tracks.length}` : `1 of ${this.tracks.length || 1}`;
    ctx.font = this.getFont('bold 13px -apple-system, sans-serif');
    ctx.fillStyle = '#8e99a8';
    ctx.textAlign = 'left';
    ctx.fillText(countStr, textX, 78);

    // Track Title
    ctx.font = this.getFont('bold 22px -apple-system, sans-serif');
    ctx.fillStyle = '#000000';
    const title = this.currentTrack.title.length > 18 ? this.currentTrack.title.slice(0, 16) + '...' : this.currentTrack.title;
    ctx.fillText(title, textX, 104);

    // Artist
    ctx.font = this.getFont('18px -apple-system, sans-serif');
    ctx.fillStyle = '#333333';
    const artist = this.currentTrack.artist.length > 20 ? this.currentTrack.artist.slice(0, 18) + '...' : this.currentTrack.artist;
    ctx.fillText(artist, textX, 130);

    // Album
    ctx.font = this.getFont('15px -apple-system, sans-serif');
    ctx.fillStyle = '#666666';
    const album = this.currentTrack.album || "FeelPod 3D";
    const albumShort = album.length > 22 ? album.slice(0, 20) + '...' : album;
    ctx.fillText(albumShort, textX, 153);

    // Format Pill Badge: [ MP3 • 320 KBPS ]
    const badgeW = 120;
    const badgeH = 20;
    const badgeY = 166;
    ctx.fillStyle = '#f0f3f8';
    ctx.strokeStyle = '#d0d8e4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(textX, badgeY, badgeW, badgeH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = this.getFont('bold 11px sans-serif');
    ctx.fillStyle = '#55667e';
    ctx.textAlign = 'center';
    ctx.fillText('MP3 • 320 KBPS', textX + badgeW / 2, badgeY + 14);

    // 3. Real-Time 10-Band LCD Graphic Equalizer
    const eqX = textX;
    const eqY = 196;
    const eqTotalW = w - textX - 24;
    const numBars = 10;
    const barWidth = Math.floor(eqTotalW / numBars) - 3;
    const numSegments = 6;
    const segHeight = 4;
    const segGap = 2;

    for (let i = 0; i < numBars; i++) {
      let rawVal = 0;
      if (freqData && this.isPlaying) {
        rawVal = freqData[i] || 0;
      }
      const targetSegs = Math.round((rawVal / 255) * numSegments);

      // Smooth peak hold falloff
      if (targetSegs >= this.eqPeakBars[i]) {
        this.eqPeakBars[i] = targetSegs;
      } else {
        this.eqPeakBars[i] = Math.max(0, this.eqPeakBars[i] - 0.25);
      }

      const activeSegs = Math.min(numSegments, Math.max(0, targetSegs));
      const bx = eqX + i * (barWidth + 3);

      for (let s = 0; s < numSegments; s++) {
        const sy = eqY + (numSegments - 1 - s) * (segHeight + segGap);
        if (s < activeSegs) {
          ctx.fillStyle = s >= numSegments - 2 ? '#455d82' : '#6f82a5';
        } else {
          ctx.fillStyle = '#e8ebf0';
        }
        ctx.fillRect(bx, sy, barWidth, segHeight);
      }

      // Peak dot
      const peakIdx = Math.min(numSegments - 1, Math.floor(this.eqPeakBars[i]));
      if (peakIdx > 0 && this.isPlaying) {
        const py = eqY + (numSegments - 1 - peakIdx) * (segHeight + segGap);
        ctx.fillStyle = '#2b3a52';
        ctx.fillRect(bx, py - 1, barWidth, 2);
      }
    }

    // 4. Progress Bar & Elapsed/Remaining Timers
    const barX = 24;
    const barY = 260;
    const barW = w - 48;
    const barH = 12;

    // Track groove
    ctx.fillStyle = '#e4e7ed';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    const progressW = barW * Math.max(0, Math.min(1.0, this.currentTrack.progress || 0));
    ctx.fillStyle = '#6f82a5';
    ctx.beginPath();
    ctx.roundRect(barX, barY, progressW, barH, 6);
    ctx.fill();

    // Diamond playhead
    const px = barX + progressW;
    const py = barY + barH / 2;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2c2c2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Elapsed / Remaining Time
    ctx.font = this.getFont('16px -apple-system, sans-serif');
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentTrack.currentTimeStr || "0:00", barX, barY + 34);

    ctx.textAlign = 'right';
    const remStr = this.currentTrack.remainingTimeStr || ('-' + this.currentTrack.duration);
    ctx.fillText(remStr, barX + barW, barY + 34);

    // 5. Volume HUD Overlay or Navigation Hint
    if (this.volumeHUDTimer > 0) {
      // Sleek Volume HUD
      const vW = 240;
      const vH = 34;
      const vx = (w - vW) / 2;
      const vy = h - 54;

      ctx.fillStyle = 'rgba(28, 34, 46, 0.92)';
      ctx.beginPath();
      ctx.roundRect(vx, vy, vW, vH, 8);
      ctx.fill();

      // Speaker vector icon (no emojis)
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const sx = vx + 14;
      const sy = vy + 17;
      ctx.rect(sx, sy - 3, 3, 6);
      ctx.moveTo(sx + 3, sy - 3);
      ctx.lineTo(sx + 8, sy - 7);
      ctx.lineTo(sx + 8, sy + 7);
      ctx.lineTo(sx + 3, sy + 3);
      ctx.closePath();
      ctx.fill();

      // Volume bar
      const barTrackX = vx + 40;
      const barTrackW = vW - 54;
      const barTrackY = vy + 12;
      ctx.fillStyle = '#556075';
      ctx.fillRect(barTrackX, barTrackY, barTrackW, 10);

      ctx.fillStyle = '#4cd964';
      ctx.fillRect(barTrackX, barTrackY, barTrackW * this.currentVolume, 10);
    } else {
      ctx.font = this.getFont('italic 15px sans-serif');
      ctx.textAlign = 'center';
      ctx.fillStyle = '#888888';
      ctx.fillText('Press MENU to return  •  Spin wheel for Volume', w / 2, h - 20);
    }
  }
}
