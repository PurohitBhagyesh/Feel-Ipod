import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup, earphonesGroup;
let screenTexture, screenRenderer;
let bodyMaterial, wheelMaterial, backMaterial, earphoneMaterial;

let currentTarget = 'body'; // 'body', 'wheel', 'earphones', 'all'
let currentColorHex = '#f5f5f7';
let currentHue = 0;
let currentSat = 0;
let currentLight = 0.90;

// Settings State
let settings = {
  soundEnabled: true,
  hapticsEnabled: true,
  autoRotate: false,
  showEarphones: true,
  theme: 'dark'
};

const cameraTargets = {
  cinematic: { pos: new THREE.Vector3(0, 0.4, 4.2), target: new THREE.Vector3(0, 0, 0) },
  studio: { pos: new THREE.Vector3(1.8, 1.4, 2.8), target: new THREE.Vector3(0, 0, 0) },
  front: { pos: new THREE.Vector3(0, 0.1, 3.0), target: new THREE.Vector3(0, 0, 0) },
  back: { pos: new THREE.Vector3(0, 0.1, -3.0), target: new THREE.Vector3(0, 0, 0) },
  earphones: { pos: new THREE.Vector3(-1.8, 0.8, 1.2), target: new THREE.Vector3(-1.0, -0.2, 0.2) }
};

let activeCamTarget = cameraTargets.cinematic;
let currentViewIndex = 0;
const viewKeys = ['studio', 'front', 'back', 'earphones'];

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0c);
  scene.fog = new THREE.FogExp2(0x0a0a0c, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.copy(cameraTargets.cinematic.pos);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Orbit Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 1.2;
  controls.maxDistance = 6.0;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;
  controls.target.copy(cameraTargets.cinematic.target);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 1.2;

  // Setup Lighting & Stage
  setupLighting();
  createFloor();

  // Screen Engine
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.render();
  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  // Load 3D Models
  loadModels();

  // Color Wheel & Navigation
  setupColorWheel();
  setupUI();
  setupSettings();
  setupWelcomeScreen();

  // Responsive Resizing
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// --- Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const keyLight = new THREE.SpotLight(0xffffff, 4.5);
  keyLight.position.set(3, 5, 4);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.8;
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.bias = -0.0001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xddeeff, 1.8);
  fillLight.position.set(-4, 3, 2);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 2.5);
  rimLight.position.set(0, 4, -4);
  scene.add(rimLight);

  const bounceLight = new THREE.DirectionalLight(0x223344, 0.8);
  bounceLight.position.set(0, -2, 0);
  scene.add(bounceLight);
}

// --- Stage Floor ---
function createFloor() {
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0c0c10,
    roughness: 0.75,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.02;
  floor.receiveShadow = true;
  scene.add(floor);

  // Contact shadow
  const shadowGeo = new THREE.PlaneGeometry(2.4, 3.6);
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.7)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const shadowTex = new THREE.CanvasTexture(canvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.8,
    depthWrite: false
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.set(0, -1.01, 0);
  scene.add(contactShadow);
}

// --- Load GLTF/GLB Models ---
function loadModels() {
  const loader = new GLTFLoader();
  const statusEl = document.getElementById('loader-status');
  const overlay = document.getElementById('loader-overlay');

  statusEl.textContent = 'Loading iPod Classic 3D Model...';

  // 1. Load iPod
  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, 0, 0);

    bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(currentColorHex),
      metalness: 0.05,
      roughness: 0.15,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1,
      reflectivity: 0.9
    });

    wheelMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf0f0f2),
      metalness: 0.02,
      roughness: 0.45
    });

    backMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xffffff),
      metalness: 0.98,
      roughness: 0.12,
      envMapIntensity: 1.5
    });

    const screenMaterial = new THREE.MeshBasicMaterial({
      map: screenTexture
    });

    ipodGroup.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const parentName = child.parent ? child.parent.name : '';
        const name = child.name || '';

        if (parentName.includes('Screen') || name.includes('Screen')) {
          child.material = screenMaterial;
        } else if (parentName.includes('body')) {
          child.material = bodyMaterial;
        } else if (parentName.includes('Switch') || parentName.includes('Port') || parentName.includes('jack')) {
          child.material = backMaterial;
        } else {
          child.material = bodyMaterial;
        }
      }
    });

    scene.add(ipodGroup);

    // 2. Load Earphones
    statusEl.textContent = 'Loading Wired Earphones...';
    loader.load('/models/wired_earphones.glb', (earphonesGltf) => {
      earphonesGroup = earphonesGltf.scene;

      earphoneMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xffffff),
        roughness: 0.35,
        metalness: 0.05
      });

      earphonesGroup.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material = earphoneMaterial;
        }
      });

      earphonesGroup.scale.set(6.5, 6.5, 6.5);
      earphonesGroup.position.set(-1.0, -1.0, 0.4);
      earphonesGroup.rotation.set(-Math.PI / 2, 0, Math.PI / 5);

      scene.add(earphonesGroup);

      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 500);
    }, undefined, (err) => {
      console.warn('Earphones load error:', err);
      overlay.style.opacity = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 500);
    });

  }, (xhr) => {
    if (xhr.lengthComputable) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      statusEl.textContent = `Loading iPod Classic (${pct}%)...`;
    }
  }, (error) => {
    statusEl.textContent = 'Failed to load model. Check console.';
    console.error(error);
  });
}

// --- Welcome Screen Logic ---
function setupWelcomeScreen() {
  const welcomeOverlay = document.getElementById('welcome-screen');
  const feelItBtn = document.getElementById('btn-feel-it');
  const welcomeSettingsBtn = document.getElementById('btn-welcome-settings');
  const homeBtn = document.getElementById('btn-home');

  feelItBtn.addEventListener('click', () => {
    audioEngine.init();
    if (settings.soundEnabled) {
      audioEngine.playDriveSpinUp();
      audioEngine.playClick();
    }

    // Hide welcome overlay
    welcomeOverlay.classList.add('hidden');

    // Smooth transition camera to studio view
    activeCamTarget = cameraTargets.studio;
  });

  welcomeSettingsBtn.addEventListener('click', () => {
    openSettingsModal();
  });

  homeBtn.addEventListener('click', () => {
    welcomeOverlay.classList.remove('hidden');
    activeCamTarget = cameraTargets.cinematic;
    audioEngine.playButtonPress();
  });
}

// --- Settings Dialog Logic ---
function setupSettings() {
  const modal = document.getElementById('settings-modal');
  const openBtn = document.getElementById('btn-open-settings');
  const closeBtn = document.getElementById('btn-close-settings');
  const saveBtn = document.getElementById('btn-save-settings');

  const clickerToggle = document.getElementById('setting-clicker');
  const hapticsToggle = document.getElementById('setting-haptics');
  const autorotateToggle = document.getElementById('setting-autorotate');
  const earphonesToggle = document.getElementById('setting-earphones');
  const themeSelect = document.getElementById('setting-theme');

  openBtn.addEventListener('click', openSettingsModal);
  closeBtn.addEventListener('click', closeSettingsModal);
  saveBtn.addEventListener('click', closeSettingsModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSettingsModal();
  });

  clickerToggle.addEventListener('change', (e) => {
    settings.soundEnabled = e.target.checked;
    updateSoundBtnState();
  });

  hapticsToggle.addEventListener('change', (e) => {
    settings.hapticsEnabled = e.target.checked;
  });

  autorotateToggle.addEventListener('change', (e) => {
    settings.autoRotate = e.target.checked;
    controls.autoRotate = settings.autoRotate;
  });

  earphonesToggle.addEventListener('change', (e) => {
    settings.showEarphones = e.target.checked;
    if (earphonesGroup) {
      earphonesGroup.visible = settings.showEarphones;
    }
  });

  themeSelect.addEventListener('change', (e) => {
    settings.theme = e.target.value;
    if (settings.theme === 'keynote') {
      scene.background.set(0x1a1a24);
      scene.fog.color.set(0x1a1a24);
    } else {
      scene.background.set(0x0a0a0c);
      scene.fog.color.set(0x0a0a0c);
    }
  });
}

function openSettingsModal() {
  audioEngine.playButtonPress();
  document.getElementById('settings-modal').classList.add('active');
}

function closeSettingsModal() {
  audioEngine.playButtonPress();
  document.getElementById('settings-modal').classList.remove('active');
}

function updateSoundBtnState() {
  const soundIcon = document.getElementById('sound-icon');
  soundIcon.textContent = settings.soundEnabled ? '🔊' : '🔇';
}

// --- Interactive Circular Color Wheel ---
function setupColorWheel() {
  const canvas = document.getElementById('color-wheel-canvas');
  const ctx = canvas.getContext('2d');
  const handle = document.getElementById('wheel-handle');
  const container = document.getElementById('wheel-container');
  const lightnessSlider = document.getElementById('lightness-slider');
  const lightnessLabel = document.getElementById('lightness-val');
  const nativeColorInput = document.getElementById('native-color');

  const width = canvas.width;
  const height = canvas.height;
  const radius = width / 2;

  function drawWheel() {
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * width + x) * 4;

        if (dist <= radius) {
          let angle = Math.atan2(dy, dx) * (180 / Math.PI);
          if (angle < 0) angle += 360;

          const sat = dist / radius;
          const rgb = hslToRgb(angle / 360, sat, currentLight);

          data[idx] = rgb[0];
          data[idx + 1] = rgb[1];
          data[idx + 2] = rgb[2];
          data[idx + 3] = 255;
        } else {
          data[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  drawWheel();

  function handlePick(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - (rect.width / 2);
    const dy = y - (rect.height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxR = rect.width / 2;

    const clampedDist = Math.min(dist, maxR);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    currentHue = angle / 360;
    currentSat = clampedDist / maxR;

    const handleX = (rect.width / 2) + Math.cos(angle * Math.PI / 180) * clampedDist;
    const handleY = (rect.height / 2) + Math.sin(angle * Math.PI / 180) * clampedDist;
    handle.style.left = `${handleX}px`;
    handle.style.top = `${handleY}px`;

    const rgb = hslToRgb(currentHue, currentSat, currentLight);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    applyColor(hex);
  }

  let isDragging = false;
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    handlePick(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (isDragging) handlePick(e);
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    handlePick(e);
    e.preventDefault();
  }, { passive: false });
  window.addEventListener('touchmove', (e) => {
    if (isDragging) {
      handlePick(e);
      e.preventDefault();
    }
  }, { passive: false });
  window.addEventListener('touchend', () => { isDragging = false; });

  lightnessSlider.addEventListener('input', (e) => {
    currentLight = parseInt(e.target.value) / 100;
    lightnessLabel.textContent = `${e.target.value}%`;
    drawWheel();
    const rgb = hslToRgb(currentHue, currentSat, currentLight);
    const hex = rgbToHex(rgb[0], rgb[1], rgb[2]);
    applyColor(hex);
  });

  nativeColorInput.addEventListener('input', (e) => {
    applyColor(e.target.value);
  });
}

// --- Apply Color to Models ---
function applyColor(hex) {
  currentColorHex = hex;

  document.getElementById('color-preview').style.backgroundColor = hex;
  document.getElementById('hex-label').textContent = hex.toUpperCase();
  document.getElementById('wheel-handle').style.backgroundColor = hex;

  const threeColor = new THREE.Color(hex);

  if (currentTarget === 'body') {
    if (bodyMaterial) bodyMaterial.color.copy(threeColor);
  } else if (currentTarget === 'wheel') {
    if (wheelMaterial) wheelMaterial.color.copy(threeColor);
  } else if (currentTarget === 'earphones') {
    if (earphoneMaterial) earphoneMaterial.color.copy(threeColor);
  } else if (currentTarget === 'all') {
    if (bodyMaterial) bodyMaterial.color.copy(threeColor);
    if (wheelMaterial) wheelMaterial.color.copy(threeColor);
    if (earphoneMaterial) earphoneMaterial.color.copy(threeColor);
  }
}

// --- UI Controls & Mobile Navigation ---
function setupUI() {
  // Target segment buttons
  const segmentBtns = document.querySelectorAll('.segment-btn');
  segmentBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      segmentBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTarget = btn.dataset.target;
      if (settings.soundEnabled) audioEngine.playButtonPress();
    });
  });

  // Presets
  const presetChips = document.querySelectorAll('.preset-chip');
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const col = chip.dataset.color;
      if (settings.soundEnabled) audioEngine.playClick();

      if (col === '#111111') {
        // U2 Edition: Black body + Red wheel
        if (bodyMaterial) bodyMaterial.color.set('#111111');
        if (wheelMaterial) wheelMaterial.color.set('#cc0000');
        if (earphoneMaterial) earphoneMaterial.color.set('#1a1a1a');
        applyColor('#111111');
      } else {
        applyColor(col);
      }
    });
  });

  // Camera views (Desktop dock)
  const dockBtns = document.querySelectorAll('.dock-btn');
  dockBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      dockBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const viewKey = btn.dataset.view;
      if (cameraTargets[viewKey]) {
        activeCamTarget = cameraTargets[viewKey];
        if (settings.soundEnabled) audioEngine.playButtonPress();
      }
    });
  });

  // Reset View button
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    activeCamTarget = cameraTargets.studio;
    document.querySelectorAll('.dock-btn').forEach((b) => b.classList.remove('active'));
    const studioBtn = document.querySelector('.dock-btn[data-view="studio"]');
    if (studioBtn) studioBtn.classList.add('active');
    if (settings.soundEnabled) audioEngine.playButtonPress();
  });

  // Sound Toggle on Navbar
  const soundBtn = document.getElementById('btn-toggle-sound');
  soundBtn.addEventListener('click', () => {
    settings.soundEnabled = !settings.soundEnabled;
    updateSoundBtnState();
    document.getElementById('setting-clicker').checked = settings.soundEnabled;
  });

  // Mobile Action Bar buttons
  const customizerPanel = document.getElementById('customizer-panel');
  const clickwheelController = document.getElementById('clickwheel-controller');
  const btnMobileColors = document.getElementById('btn-mobile-colors');
  const btnMobileWheel = document.getElementById('btn-mobile-wheel');
  const btnMobileViews = document.getElementById('btn-mobile-views');
  const btnMobilePlay = document.getElementById('btn-mobile-play');
  const btnCloseCustomizer = document.getElementById('btn-close-customizer');

  if (btnMobileColors) {
    btnMobileColors.addEventListener('click', () => {
      const isActive = customizerPanel.classList.toggle('mobile-active');
      btnMobileColors.classList.toggle('active', isActive);
      if (isActive) {
        clickwheelController.classList.remove('mobile-active');
        btnMobileWheel.classList.remove('active');
      }
      if (settings.soundEnabled) audioEngine.playButtonPress();
    });
  }

  if (btnCloseCustomizer) {
    btnCloseCustomizer.addEventListener('click', () => {
      customizerPanel.classList.remove('mobile-active');
      btnMobileColors.classList.remove('active');
    });
  }

  if (btnMobileWheel) {
    btnMobileWheel.addEventListener('click', () => {
      const isActive = clickwheelController.classList.toggle('mobile-active');
      btnMobileWheel.classList.toggle('active', isActive);
      if (isActive) {
        customizerPanel.classList.remove('mobile-active');
        btnMobileColors.classList.remove('active');
      }
      if (settings.soundEnabled) audioEngine.playButtonPress();
    });
  }

  if (btnMobileViews) {
    btnMobileViews.addEventListener('click', () => {
      currentViewIndex = (currentViewIndex + 1) % viewKeys.length;
      const key = viewKeys[currentViewIndex];
      activeCamTarget = cameraTargets[key];
      if (settings.soundEnabled) audioEngine.playButtonPress();
    });
  }

  if (btnMobilePlay) {
    btnMobilePlay.addEventListener('click', () => {
      const isPlaying = audioEngine.toggleMusic();
      screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
      screenTexture.needsUpdate = true;
      document.getElementById('mobile-play-icon').textContent = isPlaying ? '⏸️' : '▶️';
    });
  }

  // Virtual Click Wheel Logic
  setupClickWheelInteraction();
}

// --- Virtual Click Wheel Interaction ---
function setupClickWheelInteraction() {
  const wheel = document.getElementById('virtual-wheel');
  let isWheelDragging = false;
  let lastAngle = 0;
  let accumulatedAngle = 0;

  function getWheelAngle(e) {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  function onWheelMove(currentAngle) {
    let delta = currentAngle - lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulatedAngle += delta;
    lastAngle = currentAngle;

    const notch = Math.PI / 12;
    if (Math.abs(accumulatedAngle) >= notch) {
      const step = Math.sign(accumulatedAngle);
      accumulatedAngle = 0;
      if (settings.soundEnabled) audioEngine.playClick();
      screenRenderer.scroll(step);
      screenTexture.needsUpdate = true;
    }
  }

  wheel.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('wheel-btn') || e.target.classList.contains('wheel-center-btn')) return;
    isWheelDragging = true;
    lastAngle = getWheelAngle(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (!isWheelDragging) return;
    onWheelMove(getWheelAngle(e));
  });

  window.addEventListener('mouseup', () => { isWheelDragging = false; });

  wheel.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('wheel-btn') || e.target.classList.contains('wheel-center-btn')) return;
    isWheelDragging = true;
    lastAngle = getWheelAngle(e);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isWheelDragging) return;
    onWheelMove(getWheelAngle(e));
  }, { passive: true });

  window.addEventListener('touchend', () => { isWheelDragging = false; });

  // Buttons: MENU, Center Select, Play/Pause, Next, Prev
  document.getElementById('ctrl-menu').addEventListener('click', () => {
    if (settings.soundEnabled) audioEngine.playButtonPress();
    screenRenderer.goBack();
    screenTexture.needsUpdate = true;
  });

  document.getElementById('ctrl-center').addEventListener('click', () => {
    if (settings.soundEnabled) audioEngine.playButtonPress();
    screenRenderer.selectCurrent();
    screenTexture.needsUpdate = true;
  });

  document.getElementById('ctrl-play').addEventListener('click', () => {
    const isPlaying = audioEngine.toggleMusic();
    screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
    screenTexture.needsUpdate = true;
    const mobileIcon = document.getElementById('mobile-play-icon');
    if (mobileIcon) mobileIcon.textContent = isPlaying ? '⏸️' : '▶️';
  });

  document.getElementById('ctrl-next').addEventListener('click', () => {
    const track = audioEngine.nextTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    screenTexture.needsUpdate = true;
  });

  document.getElementById('ctrl-prev').addEventListener('click', () => {
    const track = audioEngine.prevTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    screenTexture.needsUpdate = true;
  });
}

// --- Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  // Smooth Camera Lerp
  if (activeCamTarget) {
    camera.position.lerp(activeCamTarget.pos, 0.05);
    controls.target.lerp(activeCamTarget.target, 0.05);
  }

  // Update Controls
  controls.update();

  // Subtle floating motion
  if (ipodGroup) {
    const t = Date.now() * 0.001;
    ipodGroup.position.y = Math.sin(t * 1.2) * 0.02;
  }

  // Screen update
  if (screenRenderer.render()) {
    screenTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// --- Window Resize ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Helpers: HSL / RGB / Hex ---
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  const toHex = (c) => ('0' + Math.max(0, Math.min(255, c)).toString(16)).slice(-2);
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

// Launch
init();
