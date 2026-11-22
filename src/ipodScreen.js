// Realistic Apple iPod Classic LCD Screen Renderer via HTML5 Canvas

export class iPodScreenRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext('2d');
    this.needsUpdate = true;

    // View State: 'root', 'music', 'songs', 'nowPlaying'
    this.viewStack = ['root'];
    this.selectedIndices = {
      root: 0,
      music: 0,
      songs: 0
    };

    this.backlightOn = true;
    this.volumePopupTime = 0;
    this.volumeLevel = 0.85;

    // Dynamic library of tracks
    this.tracks = [];
    this.currentTrack = {
      title: "Retro Groove",
      artist: "Antigravity Sound",
      album: "Nostalgia Vibes",
      duration: "3:24",
      currentTimeStr: "0:00",
      progress: 0.0
    };

    this.isPlaying = false;
    this.isHeadphonesPlugged = false;
    this.batteryLevel = 0.90;
  }

  setTracks(tracks) {
    this.tracks = tracks;
    this.needsUpdate = true;
  }

  getCurrentView() {
    return this.viewStack[this.viewStack.length - 1];
  }

  getMenuItems() {
    const view = this.getCurrentView();
    if (view === 'root') {
      return [
        { id: 'music', label: 'Music', hasSub: true },
        { id: 'nowPlaying', label: 'Now Playing', hasSub: true },
        { id: 'backlight', label: `Backlight: ${this.backlightOn ? 'On' : 'Off'}`, hasSub: false },
        { id: 'shuffle', label: 'Shuffle Songs', hasSub: false },
        { id: 'import', label: 'Import MP3...', hasSub: false }
      ];
    } else if (view === 'music') {
      return [
        { id: 'songs', label: 'Songs', hasSub: true },
        { id: 'artists', label: 'Artists', hasSub: false },
        { id: 'albums', label: 'Albums', hasSub: false }
      ];
    } else if (view === 'songs') {
      return this.tracks.map((t, idx) => ({
        id: `song-${idx}`,
        trackId: t.id,
        label: t.title,
        sub: t.artist,
        hasSub: false
      }));
    }
    return [];
  }

  scroll(delta) {
    const view = this.getCurrentView();
    if (view === 'nowPlaying') {
      // Seek track forward/backward
      this.currentTrack.progress = Math.max(0, Math.min(1.0, this.currentTrack.progress + delta * 0.02));
      this.needsUpdate = true;
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

    if (view === 'root') {
      if (item.id === 'music') {
        this.viewStack.push('music');
        this.selectedIndices.music = 0;
      } else if (item.id === 'nowPlaying') {
        this.viewStack.push('nowPlaying');
      } else if (item.id === 'backlight') {
        this.backlightOn = !this.backlightOn;
      } else if (item.id === 'import') {
        window.dispatchEvent(new CustomEvent('ipod-request-import'));
      }
    } else if (view === 'music') {
      if (item.id === 'songs') {
        this.viewStack.push('songs');
        this.selectedIndices.songs = 0;
      }
    } else if (view === 'songs') {
      // User selected a song!
      this.viewStack.push('nowPlaying');
      this.needsUpdate = true;
      return { action: 'playTrack', trackId: item.trackId };
    } else if (view === 'nowPlaying') {
      // Toggle play/pause
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

  showVolume(vol) {
    this.volumeLevel = vol;
    this.volumePopupTime = Date.now() + 2000;
    this.needsUpdate = true;
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
    this.needsUpdate = true;
  }

  render() {
    if (!this.needsUpdate) return false;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. LCD Background
    if (this.backlightOn) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#fbfbfe');
      bgGrad.addColorStop(1, '#e5e5ea');
      ctx.fillStyle = bgGrad;
    } else {
      // Backlight off: authentic greenish-grey passive LCD
      ctx.fillStyle = '#8f9a88';
    }
    ctx.fillRect(0, 0, w, h);

    // 2. Status Bar
    this.drawStatusBar(ctx, w);

    // 3. Screen Content
    const view = this.getCurrentView();
    if (view === 'nowPlaying') {
      this.drawNowPlaying(ctx, w, h);
    } else {
      this.drawMenuList(ctx, w, h, view);
    }

    // 4. Volume HUD Overlay (if active)
    if (Date.now() < this.volumePopupTime) {
      this.drawVolumeOverlay(ctx, w, h);
      // Keep requesting update until popup fades
      this.needsUpdate = true;
    } else {
      this.needsUpdate = false;
    }

    return true;
  }

  drawStatusBar(ctx, w) {
    const h = 44;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (this.backlightOn) {
      grad.addColorStop(0, '#e2e2e7');
      grad.addColorStop(0.5, '#cbcbd0');
      grad.addColorStop(1, '#a6a6af');
    } else {
      grad.addColorStop(0, '#7d8876');
      grad.addColorStop(1, '#687361');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Bottom border
    ctx.fillStyle = this.backlightOn ? '#6b6b72' : '#4f5948';
    ctx.fillRect(0, h - 1, w, 1);

    // Play/Pause icon (Left)
    ctx.fillStyle = this.backlightOn ? '#111111' : '#1e241b';
    if (this.isPlaying) {
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(30, 22);
      ctx.lineTo(18, 30);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(18, 14, 4, 16);
      ctx.fillRect(26, 14, 4, 16);
    }

    // Headphones icon (if plugged)
    if (this.isHeadphonesPlugged) {
      ctx.font = '16px sans-serif';
      ctx.fillText('🎧', 40, 28);
    }

    // Screen Title (Center)
    let title = 'Player';
    const view = this.getCurrentView();
    if (view === 'music') title = 'Music';
    else if (view === 'songs') title = 'Songs';
    else if (view === 'nowPlaying') title = 'Now Playing';

    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 29);

    // Battery Indicator (Right)
    const bx = w - 58;
    const by = 14;
    ctx.strokeStyle = this.backlightOn ? '#2c2c2e' : '#1e241b';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 32, 16);
    ctx.fillRect(bx + 32, by + 4, 3, 8);
    ctx.fillStyle = '#34C759';
    ctx.fillRect(bx + 2, by + 2, 28 * this.batteryLevel, 12);
  }

  drawMenuList(ctx, w, h, view) {
    const items = this.getMenuItems();
    const itemHeight = 48;
    const startY = 46;
    const selectedIdx = this.selectedIndices[view] || 0;

    items.forEach((item, index) => {
      const y = startY + index * itemHeight;
      if (y + itemHeight > h - 20) return; // limit to screen

      const isSelected = index === selectedIdx;

      if (isSelected) {
        if (this.backlightOn) {
          const hl = ctx.createLinearGradient(0, y, 0, y + itemHeight);
          hl.addColorStop(0, '#5390fc');
          hl.addColorStop(0.5, '#2e6be6');
          hl.addColorStop(1, '#1851c7');
          ctx.fillStyle = hl;
        } else {
          ctx.fillStyle = '#4f5948';
        }
        ctx.fillRect(0, y, w, itemHeight);
      }

      ctx.textAlign = 'left';
      ctx.font = isSelected ? 'bold 21px -apple-system, sans-serif' : '21px -apple-system, sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : (this.backlightOn ? '#000000' : '#1e241b');

      // Label truncation if needed
      const maxTextWidth = w - 60;
      let label = item.label;
      if (ctx.measureText(label).width > maxTextWidth) {
        while (ctx.measureText(label + '...').width > maxTextWidth && label.length > 0) {
          label = label.slice(0, -1);
        }
        label += '...';
      }

      ctx.fillText(label, 20, y + 31);

      if (item.hasSub) {
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = isSelected ? '#ffffff' : (this.backlightOn ? '#8e8e93' : '#333b2e');
        ctx.fillText('›', w - 20, y + 31);
      }
    });

    // Subdued helper hint
    ctx.font = 'italic 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.backlightOn ? '#8e8e93' : '#333b2e';
    ctx.fillText('Scroll wheel to navigate • Center to select', w / 2, h - 14);
  }

  drawNowPlaying(ctx, w, h) {
    const artSize = 144;
    const artX = 32;
    const artY = 68;

    // Album Art Box with vinyl groove
    const artGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
    artGrad.addColorStop(0, '#fd746c');
    artGrad.addColorStop(1, '#ff9068');
    ctx.fillStyle = artGrad;
    ctx.fillRect(artX, artY, artSize, artSize);

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Metadata
    const textX = artX + artSize + 24;
    ctx.textAlign = 'left';

    ctx.font = 'bold 23px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#000000' : '#1e241b';
    const title = this.currentTrack.title.length > 18 ? this.currentTrack.title.slice(0, 16) + '...' : this.currentTrack.title;
    ctx.fillText(title, textX, 102);

    ctx.font = '19px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#3a3a3c' : '#2b3327';
    const artist = this.currentTrack.artist.length > 20 ? this.currentTrack.artist.slice(0, 18) + '...' : this.currentTrack.artist;
    ctx.fillText(artist, textX, 134);

    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#636366' : '#3d4737';
    ctx.fillText(this.currentTrack.album || "Album", textX, 164);

    // Progress Scrubber Bar
    const barX = 32;
    const barY = 246;
    const barW = w - 64;
    const barH = 12;

    ctx.fillStyle = this.backlightOn ? '#d1d1d6' : '#687361';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    const progressW = barW * Math.max(0, Math.min(1.0, this.currentTrack.progress || 0));
    ctx.fillStyle = this.backlightOn ? '#3478F6' : '#2b3327';
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
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Time elapsed and remaining
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#636366' : '#333b2e';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentTrack.currentTimeStr || "0:00", barX, barY + 34);

    ctx.textAlign = 'right';
    ctx.fillText('-' + this.currentTrack.duration, barX + barW, barY + 34);

    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.backlightOn ? '#8e8e93' : '#333b2e';
    ctx.fillText('Press MENU to go back', w / 2, h - 18);
  }

  drawVolumeOverlay(ctx, w, h) {
    const popW = 280;
    const popH = 68;
    const popX = (w - popW) / 2;
    const popY = (h - popH) / 2;

    // Translucent rounded card
    ctx.fillStyle = 'rgba(28, 28, 30, 0.92)';
    ctx.beginPath();
    ctx.roundRect(popX, popY, popW, popH, 14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Speaker icon
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('🔊', popX + 30, popY + 41);

    // Volume level bar
    const barX = popX + 54;
    const barY = popY + 28;
    const barW = 196;
    const barH = 12;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    const fillW = barW * this.volumeLevel;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(barX, barY, fillW, barH, 6);
    ctx.fill();
  }
}
