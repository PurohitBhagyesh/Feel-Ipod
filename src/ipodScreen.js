// Realistic Apple iPod Classic LCD Screen Renderer via HTML5 Canvas

export class iPodScreenRenderer {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 384;
    this.ctx = this.canvas.getContext('2d');
    this.needsUpdate = true;

    this.currentView = 'menu'; // 'menu' or 'nowPlaying'
    this.selectedIndex = 0;
    this.menuTitle = 'iPod';
    this.menuItems = [
      { id: 'music', label: 'Music', hasSub: true },
      { id: 'nowPlaying', label: 'Now Playing', hasSub: true },
      { id: 'color', label: 'Color Studio', hasSub: true },
      { id: 'shuffle', label: 'Shuffle Songs', hasSub: false },
      { id: 'backlight', label: 'Backlight', hasSub: false },
      { id: 'settings', label: 'Settings', hasSub: true }
    ];

    this.batteryLevel = 0.85;
    this.isPlaying = false;
    this.currentTrack = {
      title: "Feel Good Inc.",
      artist: "Gorillaz",
      album: "Demon Days (2005)",
      duration: "3:42",
      progress: 0.35
    };
  }

  scroll(delta) {
    if (this.currentView === 'menu') {
      const prev = this.selectedIndex;
      this.selectedIndex = Math.max(0, Math.min(this.menuItems.length - 1, this.selectedIndex + delta));
      if (prev !== this.selectedIndex) {
        this.needsUpdate = true;
      }
    } else if (this.currentView === 'nowPlaying') {
      // Adjust progress scrubber
      this.currentTrack.progress = Math.max(0, Math.min(1.0, this.currentTrack.progress + delta * 0.05));
      this.needsUpdate = true;
    }
  }

  selectCurrent() {
    if (this.currentView === 'menu') {
      const item = this.menuItems[this.selectedIndex];
      if (item.id === 'nowPlaying' || item.id === 'music') {
        this.currentView = 'nowPlaying';
        this.needsUpdate = true;
      }
    } else {
      this.currentView = 'menu';
      this.needsUpdate = true;
    }
  }

  goBack() {
    if (this.currentView !== 'menu') {
      this.currentView = 'menu';
      this.needsUpdate = true;
    }
  }

  setTrack(track, isPlaying) {
    this.currentTrack = { ...this.currentTrack, ...track };
    this.isPlaying = isPlaying;
    this.needsUpdate = true;
  }

  render() {
    if (!this.needsUpdate) return false;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 1. Classic Light Gray LCD background with subtle scanline texture
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#f9f9fa');
    bgGrad.addColorStop(1, '#e8e8ed');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Status Bar (Top Header)
    this.drawStatusBar(ctx, w);

    // 3. Content Area
    if (this.currentView === 'menu') {
      this.drawMenu(ctx, w, h);
    } else {
      this.drawNowPlaying(ctx, w, h);
    }

    this.needsUpdate = false;
    return true;
  }

  drawStatusBar(ctx, w) {
    const headerHeight = 44;
    const grad = ctx.createLinearGradient(0, 0, 0, headerHeight);
    grad.addColorStop(0, '#e2e2e7');
    grad.addColorStop(0.5, '#cbcbd0');
    grad.addColorStop(1, '#a6a6af');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, headerHeight);

    // Bottom border line of status bar
    ctx.fillStyle = '#6b6b72';
    ctx.fillRect(0, headerHeight - 1, w, 1);

    // Play / Pause Indicator
    ctx.fillStyle = '#1c1c1e';
    if (this.isPlaying) {
      // Triangle Play icon
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(30, 22);
      ctx.lineTo(18, 30);
      ctx.closePath();
      ctx.fill();
    } else {
      // Pause 2 bars
      ctx.fillRect(18, 14, 4, 16);
      ctx.fillRect(26, 14, 4, 16);
    }

    // Title in center
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111111';
    ctx.fillText(this.currentView === 'menu' ? this.menuTitle : 'Now Playing', w / 2, 29);

    // Battery Indicator on right
    const bx = w - 60;
    const by = 14;
    ctx.strokeStyle = '#2c2c2e';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, 34, 16);
    // Battery tip
    ctx.fillRect(bx + 34, by + 4, 3, 8);
    // Battery fill (green)
    ctx.fillStyle = '#34C759';
    ctx.fillRect(bx + 2, by + 2, 30 * this.batteryLevel, 12);
  }

  drawMenu(ctx, w, h) {
    const itemHeight = 48;
    const startY = 46;

    this.menuItems.forEach((item, index) => {
      const y = startY + index * itemHeight;
      const isSelected = index === this.selectedIndex;

      if (isSelected) {
        // Iconic Apple Blue selection highlight gradient
        const hl = ctx.createLinearGradient(0, y, 0, y + itemHeight);
        hl.addColorStop(0, '#5390fc');
        hl.addColorStop(0.5, '#2e6be6');
        hl.addColorStop(1, '#1851c7');
        ctx.fillStyle = hl;
        ctx.fillRect(0, y, w, itemHeight);

        // Top/bottom crisp outline
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(0, y, w, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, y + itemHeight - 1, w, 1);
      }

      // Label text
      ctx.font = isSelected ? 'bold 22px -apple-system, sans-serif' : '22px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = isSelected ? '#ffffff' : '#000000';
      ctx.fillText(item.label, 24, y + 31);

      // Chevron arrow for submenus (>)
      if (item.hasSub) {
        ctx.font = 'bold 22px -apple-system, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = isSelected ? '#ffffff' : '#8e8e93';
        ctx.fillText('›', w - 24, y + 31);
      }
    });

    // Subdued iPod trademark footer
    ctx.font = 'italic 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('Scroll wheel to navigate • Center to select', w / 2, h - 16);
  }

  drawNowPlaying(ctx, w, h) {
    // Album Art Box (Left)
    const artSize = 150;
    const artX = 36;
    const artY = 70;

    // Album art gradient mock
    const artGrad = ctx.createLinearGradient(artX, artY, artX + artSize, artY + artSize);
    artGrad.addColorStop(0, '#4facfe');
    artGrad.addColorStop(1, '#00f2fe');
    ctx.fillStyle = artGrad;
    ctx.fillRect(artX, artY, artSize, artSize);

    // Subtle vinyl record icon on art
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(artX + artSize/2, artY + artSize/2, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Track Metadata (Right)
    const textX = artX + artSize + 28;
    ctx.textAlign = 'left';
    
    // Title
    ctx.font = 'bold 24px -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(this.currentTrack.title, textX, 105);

    // Artist
    ctx.font = '20px -apple-system, sans-serif';
    ctx.fillStyle = '#444444';
    ctx.fillText(this.currentTrack.artist, textX, 140);

    // Album
    ctx.font = '17px -apple-system, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(this.currentTrack.album, textX, 172);

    // Scrubber / Progress Bar
    const barX = 36;
    const barY = 250;
    const barW = w - 72;
    const barH = 12;

    // Bar background
    ctx.fillStyle = '#d1d1d6';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 6);
    ctx.fill();

    // Bar progress fill
    const progressW = barW * (this.currentTrack.progress || 0.35);
    const fillGrad = ctx.createLinearGradient(barX, barY, barX + progressW, barY);
    fillGrad.addColorStop(0, '#3478F6');
    fillGrad.addColorStop(1, '#5390fc');
    ctx.fillStyle = fillGrad;
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
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Elapsed / Remaining Time
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = '#666666';
    ctx.textAlign = 'left';
    ctx.fillText('1:18', barX, barY + 34);
    ctx.textAlign = 'right';
    ctx.fillText('-' + this.currentTrack.duration, barX + barW, barY + 34);

    // Hint
    ctx.font = 'italic 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8e8e93';
    ctx.fillText('Press MENU to return to Menu', w / 2, h - 22);
  }
}
