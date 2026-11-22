// Authentic iPod Classic LCD Screen Renderer matching the classic interface

export class iPodScreenRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext('2d');
    this.needsUpdate = true;

    // View State: 'root', 'music', 'songs', 'nowPlaying', 'extras', 'settings'
    this.viewStack = ['root'];
    this.selectedIndices = {
      root: 3, // Default to 'Shuffle Songs' matching user reference image!
      music: 0,
      songs: 0,
      extras: 0,
      settings: 0
    };

    this.backlightOn = true;
    this.batteryLevel = 0.88;
    this.isPlaying = false;

    this.tracks = [];
    this.currentTrack = {
      title: "Retro Groove",
      artist: "Nostalgia Sound",
      album: "Classic 2004",
      duration: "3:24",
      currentTimeStr: "0:00",
      progress: 0.0
    };
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
        { id: 'extras', label: 'Extras', hasSub: true },
        { id: 'settings', label: 'Settings', hasSub: true },
        { id: 'shuffle', label: 'Shuffle Songs', hasSub: false },
        { id: 'backlight', label: 'Backlight', hasSub: false }
      ];
    } else if (view === 'music') {
      return [
        { id: 'songs', label: 'Songs', hasSub: true },
        { id: 'artists', label: 'Artists', hasSub: false },
        { id: 'albums', label: 'Albums', hasSub: false }
      ];
    } else if (view === 'extras') {
      return [
        { id: 'clock', label: 'Clock', hasSub: false },
        { id: 'games', label: 'Games', hasSub: false },
        { id: 'notes', label: 'Notes', hasSub: false }
      ];
    } else if (view === 'settings') {
      return [
        { id: 'about', label: 'About', hasSub: false },
        { id: 'timer', label: 'Backlight Timer', hasSub: false },
        { id: 'repeat', label: 'Repeat: All', hasSub: false }
      ];
    } else if (view === 'songs') {
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
      this.currentTrack.progress = Math.max(0, Math.min(1.0, this.currentTrack.progress + delta * 0.03));
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
      } else if (item.id === 'extras') {
        this.viewStack.push('extras');
        this.selectedIndices.extras = 0;
      } else if (item.id === 'settings') {
        this.viewStack.push('settings');
        this.selectedIndices.settings = 0;
      } else if (item.id === 'shuffle') {
        return { action: 'shuffle' };
      } else if (item.id === 'backlight') {
        this.backlightOn = !this.backlightOn;
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
    this.needsUpdate = true;
  }

  render() {
    if (!this.needsUpdate) return false;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. LCD Background (Matching user reference image: clean crisp white)
    if (this.backlightOn) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#9aa594'; // Passive monochrome LCD look
    }
    ctx.fillRect(0, 0, w, h);

    // 2. Status Bar Header
    this.drawHeader(ctx, w);

    // 3. Content
    const view = this.getCurrentView();
    if (view === 'nowPlaying') {
      this.drawNowPlaying(ctx, w, h);
    } else {
      this.drawMenuList(ctx, w, h, view);
    }

    this.needsUpdate = false;
    return true;
  }

  drawHeader(ctx, w) {
    const headerH = 46;

    // Header Background
    ctx.fillStyle = this.backlightOn ? '#ffffff' : '#9aa594';
    ctx.fillRect(0, 0, w, headerH);

    // Thin separator line below header (exact match to screenshot)
    ctx.fillStyle = this.backlightOn ? '#c8c8c8' : '#737f6d';
    ctx.fillRect(0, headerH - 1, w, 1);

    // Play/Pause icon (top left)
    ctx.fillStyle = this.backlightOn ? '#333333' : '#1c221a';
    if (this.isPlaying) {
      ctx.beginPath();
      ctx.moveTo(16, 14);
      ctx.lineTo(28, 23);
      ctx.lineTo(16, 32);
      ctx.closePath();
      ctx.fill();
    }

    // Title in center ('iPod' matching user's reference image!)
    let title = 'iPod';
    const view = this.getCurrentView();
    if (view === 'music') title = 'Music';
    else if (view === 'songs') title = 'Songs';
    else if (view === 'nowPlaying') title = 'Now Playing';
    else if (view === 'extras') title = 'Extras';
    else if (view === 'settings') title = 'Settings';

    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.backlightOn ? '#222222' : '#111111';
    ctx.fillText(title, w / 2, 31);

    // Battery Icon on right (Matching reference image)
    const bx = w - 64;
    const by = 14;
    ctx.strokeStyle = this.backlightOn ? '#444444' : '#222222';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 36, 18);
    // Battery tip nub
    ctx.fillRect(bx + 36, by + 4, 3, 10);
    // Battery charge fill
    ctx.fillStyle = '#34C759';
    ctx.fillRect(bx + 2, by + 2, 32 * this.batteryLevel, 14);
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
        // Classic muted slate/indigo-blue selection bar matching user screenshot
        ctx.fillStyle = this.backlightOn ? '#6f82a5' : '#45503f';
        ctx.fillRect(0, y, w, itemHeight);
      }

      // Label text
      ctx.textAlign = 'left';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = isSelected ? '#ffffff' : (this.backlightOn ? '#000000' : '#111111');
      ctx.fillText(item.label, 20, y + 33);

      // Chevron arrow (>) on right
      if (item.hasSub) {
        ctx.textAlign = 'right';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = isSelected ? '#ffffff' : (this.backlightOn ? '#555555' : '#2b3325');
        ctx.fillText('›', w - 20, y + 33);
      }
    });
  }

  drawNowPlaying(ctx, w, h) {
    const artSize = 140;
    const artX = 28;
    const artY = 68;

    // Album Art Box with vinyl groove
    const artGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
    artGrad.addColorStop(0, '#536976');
    artGrad.addColorStop(1, '#292E49');
    ctx.fillStyle = artGrad;
    ctx.fillRect(artX, artY, artSize, artSize);

    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 16, 0, Math.PI * 2);
    ctx.stroke();

    // Track metadata
    const textX = artX + artSize + 22;
    ctx.textAlign = 'left';

    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#000000' : '#111111';
    const title = this.currentTrack.title.length > 17 ? this.currentTrack.title.slice(0, 15) + '...' : this.currentTrack.title;
    ctx.fillText(title, textX, 104);

    ctx.font = '20px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#444444' : '#2b3327';
    const artist = this.currentTrack.artist.length > 20 ? this.currentTrack.artist.slice(0, 18) + '...' : this.currentTrack.artist;
    ctx.fillText(artist, textX, 136);

    ctx.font = '17px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#666666' : '#3d4737';
    ctx.fillText(this.currentTrack.album || "Classic Album", textX, 166);

    // Progress bar
    const barX = 28;
    const barY = 246;
    const barW = w - 56;
    const barH = 12;

    ctx.fillStyle = this.backlightOn ? '#d8d8d8' : '#737f6d';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    const progressW = barW * Math.max(0, Math.min(1.0, this.currentTrack.progress || 0));
    ctx.fillStyle = this.backlightOn ? '#6f82a5' : '#333b2a';
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

    // Elapsed / Remaining Time
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = this.backlightOn ? '#666666' : '#222222';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentTrack.currentTimeStr || "0:00", barX, barY + 34);

    ctx.textAlign = 'right';
    ctx.fillText('-' + this.currentTrack.duration, barX + barW, barY + 34);

    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.backlightOn ? '#888888' : '#333b2e';
    ctx.fillText('Press MENU to return', w / 2, h - 16);
  }
}
