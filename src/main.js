import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { iPodScreenRenderer } from './ipodScreen.js';
import { audioEngine } from './audioEffects.js';

// --- State & Variables ---
let scene, camera, renderer, controls;
let ipodGroup, ipodBodyMesh;
let headphoneJackPlug, earphoneCableLine, gripMesh;
let screenTexture, screenRenderer, screenMesh, screenBezelMesh;

// World Coordinates for the Top Headphone Hole & Plug
const IPOD_OFFSET_Y = -0.15;
const WHEEL_CENTER_Y = -0.538; // Exact concentric geometric center of click wheel on 3D casing
const SCREEN_CENTER_Y = 0.395; // Center Y of LCD screen window
const FRONT_FACE_Z = 0.1404;   // Front face depth for screen & click wheel
const PLUG_HOLE_X = 0;
const PLUG_HOLE_Z = 0;
const PLUG_INSERTED_Y = 0.845; // Sits flush on top surface
const PLUG_HOVER_Y = 1.25;     // Clean hover height with visible headspace

let isPluggedIn = false;
let isPlugAnimating = false;

// Procedural Pixel-Perfect Click Wheel
let clickWheelMesh, clickWheelCanvas, clickWheelCtx, clickWheelTexture;
let activeWheelButtonTimeout = null;

// Simulator Settings State
const simulatorSettings = {
  reduceMotion: false,
  sensitivity: 1.0,
  virtualWheel: false,
  autoPlug: true,
  customBg: null
};

// Theme Presets & Current Theme State
const THEME_PRESETS = {
  white: {
    casing: '#ffffff',
    wheel: '#e4e6ea',
    wheelCenter: '#f4f5f8',
    wheelText: '#1e293b',
    jack: '#ffffff'
  },
  stealth: {
    casing: '#141518',
    wheel: '#26282e',
    wheelCenter: '#1b1c20',
    wheelText: '#f1f5f9',
    jack: '#141518'
  },
  u2: {
    casing: '#101114',
    wheel: '#dc2626',
    wheelCenter: '#101114',
    wheelText: '#ffffff',
    jack: '#101114'
  },
  silver: {
    casing: '#d1d5db',
    wheel: '#f1f3f6',
    wheelCenter: '#ffffff',
    wheelText: '#1e293b',
    jack: '#ffffff'
  },
  spacegray: {
    casing: '#4b5563',
    wheel: '#374151',
    wheelCenter: '#4b5563',
    wheelText: '#ffffff',
    jack: '#4b5563'
  },
  blue: {
    casing: '#2563eb',
    wheel: '#dbeafe',
    wheelCenter: '#eff6ff',
    wheelText: '#1e3a8a',
    jack: '#2563eb'
  },
  pink: {
    casing: '#ec4899',
    wheel: '#fce7f3',
    wheelCenter: '#fff1f2',
    wheelText: '#831843',
    jack: '#ec4899'
  },
  mint: {
    casing: '#10b981',
    wheel: '#d1fae5',
    wheelCenter: '#ecfdf5',
    wheelText: '#064e3b',
    jack: '#10b981'
  },
  gold: {
    casing: '#f59e0b',
    wheel: '#fef3c7',
    wheelCenter: '#fffbeb',
    wheelText: '#78350f',
    jack: '#f59e0b'
  },
  purple: {
    casing: '#8b5cf6',
    wheel: '#ede9fe',
    wheelCenter: '#f5f3ff',
    wheelText: '#4c1d95',
    jack: '#8b5cf6'
  }
};

let currentTheme = { ...THEME_PRESETS.white };

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('active');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2600);
}

// YouTube-Style "Wear Headphones" Immersive Audio Modal
function showImmersiveModal() {
  const modal = document.getElementById('immersive-modal');
  if (!modal) return;
  modal.classList.add('active');

  clearTimeout(modal._timeout);
  modal._timeout = setTimeout(() => {
    modal.classList.remove('active');
  }, 4500);
}

function setupImmersiveModal() {
  const modal = document.getElementById('immersive-modal');
  const btn = document.getElementById('immersive-btn');
  if (btn && modal) {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  }
}

// --- Initialize Scene ---
function init() {
  const container = document.getElementById('canvas-container');

  // Load saved settings & theme from localStorage
  loadSavedSettings();

  // Scene without hardcoded background so CSS studio gradient shows through
  scene = new THREE.Scene();

  // Camera setup
  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
  updateCameraFraming();

  // WebGL Renderer with Alpha enabled for the studio backdrop
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 0); // transparent canvas
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Controls: ROTATION DISABLED (Stuck in one place like in reference image)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableRotate = false; // LOCKED: No 360 tumbling
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.set(0, 0.15, 0);

  // Studio Lighting & Contact Floor Shadow
  setupLighting();
  createStudioContactShadow();

  // 1. Dynamic LCD Screen Engine & Dedicated Screen Plane
  createDedicatedScreen();

  // 2. Pristine Polished 3.5mm Headphone Jack Assembly (Genuine Apple White Insulators)
  createHeadphoneJackAssembly();

  // 3. Procedural Razor-Sharp Vector Click Wheel (100% Concentric & Highlighted)
  createProceduralClickWheel();

  // 4. Load MP3 Player Model Body
  loadIpodModel();

  // Setup Controls, Interactions, Modals & Settings
  setupDirectClickWheel();
  setupPlugInteraction();
  setupMP3DropImporter();
  setupImmersiveModal();
  setupTopNav();
  setupThemeCustomizer();
  setupSettingsModal();
  setupVirtualWheelHUD();
  setupPhysicalHeadphoneDetection();

  // Audio Sync
  window.addEventListener('ipod-timeupdate', (e) => {
    screenRenderer.setTimeUpdate(e.detail.currentTime, e.detail.duration, e.detail.progress);
    if (screenTexture) screenTexture.needsUpdate = true;
  });

  window.addEventListener('ipod-state-change', () => {
    const track = audioEngine.getCurrentTrack();
    const isPlaying = audioEngine.isPlaying;
    screenRenderer.setTrack(track, isPlaying);
    if (screenTexture) screenTexture.needsUpdate = true;
    updateTopNavTrackBadge(track, isPlaying);
  });

  // Responsive Resizing
  window.addEventListener('resize', onWindowResize);

  // Animation Loop
  animate();
}

// --- Dedicated Guaranteed-Visible LCD Screen Mesh ---
function createDedicatedScreen() {
  screenRenderer = new iPodScreenRenderer();
  screenRenderer.setTracks(audioEngine.tracks);
  screenRenderer.render();

  screenTexture = new THREE.CanvasTexture(screenRenderer.canvas);
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  screenTexture.needsUpdate = true;

  // Thin recessed dark bezel frame behind LCD
  const bezelGeo = new THREE.PlaneGeometry(0.816, 0.616);
  const bezelMat = new THREE.MeshBasicMaterial({ color: 0x14161c });
  screenBezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  screenBezelMesh.position.set(0, SCREEN_CENTER_Y, FRONT_FACE_Z - 0.0006);
  screenBezelMesh.renderOrder = 4;
  scene.add(screenBezelMesh);

  // Active LCD screen plane (width 0.80, height 0.60 matching 4:3 512x384 canvas)
  const screenGeo = new THREE.PlaneGeometry(0.80, 0.60);
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: screenTexture,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });

  screenMesh = new THREE.Mesh(screenGeo, screenMaterial);
  screenMesh.position.set(0, SCREEN_CENTER_Y, FRONT_FACE_Z);
  screenMesh.renderOrder = 5;
  scene.add(screenMesh);
}

// --- Dynamic Camera Framing ---
function updateCameraFraming() {
  const aspect = window.innerWidth / window.innerHeight;
  if (aspect < 1) {
    const z = Math.max(4.5, 2.6 / aspect);
    camera.position.set(0, 0.15, z);
  } else {
    camera.position.set(0, 0.15, 4.35);
  }
  if (controls) {
    controls.target.set(0, 0.15, 0);
    controls.update();
  }
}

// --- Studio Lighting ---
function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambientLight);

  // Warm studio key spotlight casting specular sheen on front bevels
  const keyLight = new THREE.SpotLight(0xfffaee, 4.0);
  keyLight.position.set(2.5, 4.0, 3.5);
  keyLight.angle = Math.PI / 4;
  keyLight.penumbra = 0.7;
  scene.add(keyLight);

  // Soft cool studio fill from left
  const fillLight = new THREE.DirectionalLight(0xdbe6f5, 1.2);
  fillLight.position.set(-3.2, 2.0, 2.2);
  scene.add(fillLight);

  // Top light illuminating the headphone jack opening and plug
  const topLight = new THREE.DirectionalLight(0xffffff, 2.0);
  topLight.position.set(0, 4.5, 1.2);
  scene.add(topLight);

  // Subtle crisp rim light for chrome contour edges
  const rimLight = new THREE.DirectionalLight(0x7595b8, 1.4);
  rimLight.position.set(0, 2.0, -3.0);
  scene.add(rimLight);
}

// --- Studio Contact Floor Shadow ---
function createStudioContactShadow() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Smooth radial gradient shadow oval
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.60)');
  grad.addColorStop(0.4, 'rgba(0, 0, 0, 0.30)');
  grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.08)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  const shadowTexture = new THREE.CanvasTexture(canvas);
  const shadowGeo = new THREE.PlaneGeometry(1.5, 0.55);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });

  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(0, -1.16, 0);
  scene.add(shadowMesh);
}

// --- Authentic Apple Wired Earphone 3.5mm Plug (Precision White & Grey Finish) ---
function createHeadphoneJackAssembly() {
  headphoneJackPlug = new THREE.Group();

  // Authentic precision-machined neutral silver/grey chrome metal
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd6d9e2,
    metalness: 0.96,
    roughness: 0.08
  });

  // Authentic Apple Wired EarPods White Polymer Insulator Rings
  const whiteInsulatorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.18,
    metalness: 0.02
  });

  // Recessed darker steel grey detent latching groove
  const waistMat = new THREE.MeshStandardMaterial({
    color: 0xb4b8c2,
    metalness: 0.90,
    roughness: 0.18
  });

  // 1. Tapered Bullet Tip
  const tipDomeGeo = new THREE.SphereGeometry(0.024, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const tipDome = new THREE.Mesh(tipDomeGeo, chromeMat);
  tipDome.position.y = -0.165;
  headphoneJackPlug.add(tipDome);

  const tipConeGeo = new THREE.CylinderGeometry(0.029, 0.024, 0.030, 32);
  const tipCone = new THREE.Mesh(tipConeGeo, chromeMat);
  tipCone.position.y = -0.150;
  headphoneJackPlug.add(tipCone);

  // Detent Waist Groove (latching groove)
  const waistGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.014, 32);
  const waist = new THREE.Mesh(waistGeo, waistMat);
  waist.position.y = -0.128;
  headphoneJackPlug.add(waist);

  // Insulator Ring 1 (Pure White)
  const ring1Geo = new THREE.CylinderGeometry(0.0305, 0.0305, 0.007, 32);
  const ring1 = new THREE.Mesh(ring1Geo, whiteInsulatorMat);
  ring1.position.y = -0.117;
  headphoneJackPlug.add(ring1);

  // Ring Conductor 1 (Right Audio - Neutral Silver/Grey)
  const ringConductorGeo = new THREE.CylinderGeometry(0.030, 0.030, 0.032, 32);
  const ringConductor = new THREE.Mesh(ringConductorGeo, chromeMat);
  ringConductor.position.y = -0.096;
  headphoneJackPlug.add(ringConductor);

  // Insulator Ring 2 (Pure White)
  const ring2Geo = new THREE.CylinderGeometry(0.0305, 0.0305, 0.007, 32);
  const ring2 = new THREE.Mesh(ring2Geo, whiteInsulatorMat);
  ring2.position.y = -0.076;
  headphoneJackPlug.add(ring2);

  // Ring Conductor 2 (Ground - Neutral Silver/Grey)
  const ring2ConductorGeo = new THREE.CylinderGeometry(0.030, 0.030, 0.025, 32);
  const ring2Conductor = new THREE.Mesh(ring2ConductorGeo, chromeMat);
  ring2Conductor.position.y = -0.058;
  headphoneJackPlug.add(ring2Conductor);

  // Insulator Ring 3 (Pure White)
  const ring3Geo = new THREE.CylinderGeometry(0.0305, 0.0305, 0.007, 32);
  const ring3 = new THREE.Mesh(ring3Geo, whiteInsulatorMat);
  ring3.position.y = -0.041;
  headphoneJackPlug.add(ring3);

  // Sleeve Conductor (Mic / Control - Neutral Silver/Grey)
  const sleeveGeo = new THREE.CylinderGeometry(0.030, 0.030, 0.030, 32);
  const sleeve = new THREE.Mesh(sleeveGeo, chromeMat);
  sleeve.position.y = -0.022;
  headphoneJackPlug.add(sleeve);

  // Polished chrome collar transition
  const collarBevelGeo = new THREE.CylinderGeometry(0.035, 0.030, 0.008, 32);
  const collarBevel = new THREE.Mesh(collarBevelGeo, chromeMat);
  collarBevel.position.y = -0.004;
  headphoneJackPlug.add(collarBevel);

  // 2. White Polycarbonate Grip Barrel
  const gripMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(currentTheme.jack),
    roughness: 0.18,
    metalness: 0.02
  });
  const gripGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.22, 32);
  gripMesh = new THREE.Mesh(gripGeo, gripMat);
  gripMesh.position.y = 0.11;
  headphoneJackPlug.add(gripMesh);

  // 3. Strain Relief Collar
  const reliefGeo = new THREE.CylinderGeometry(0.038, 0.056, 0.10, 24);
  const reliefMesh = new THREE.Mesh(reliefGeo, gripMat);
  reliefMesh.position.y = 0.26;
  headphoneJackPlug.add(reliefMesh);

  // 4. Smooth Earphone Cable extending upward into studio space
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.31, 0),
    new THREE.Vector3(0.02, 0.55, -0.05),
    new THREE.Vector3(-0.06, 0.85, -0.15),
    new THREE.Vector3(-0.18, 1.35, -0.3)
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 24, 0.022, 8, false);
  const cableMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(currentTheme.jack),
    roughness: 0.35
  });
  earphoneCableLine = new THREE.Mesh(cableGeo, cableMat);
  headphoneJackPlug.add(earphoneCableLine);

  // Position hovering directly above top opening
  headphoneJackPlug.position.set(PLUG_HOLE_X, PLUG_HOVER_Y, PLUG_HOLE_Z);
  scene.add(headphoneJackPlug);
}

// --- Procedural Razor-Sharp Vector Click Wheel (100% Concentric & Highlighted) ---
function createProceduralClickWheel() {
  clickWheelCanvas = document.createElement('canvas');
  clickWheelCanvas.width = 1024;
  clickWheelCanvas.height = 1024;
  clickWheelCtx = clickWheelCanvas.getContext('2d');

  renderClickWheelTexture();

  clickWheelTexture = new THREE.CanvasTexture(clickWheelCanvas);
  clickWheelTexture.colorSpace = THREE.SRGBColorSpace;
  clickWheelTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  clickWheelTexture.needsUpdate = true;

  // Circular Click Wheel overlay mesh covering the entire molded wheel area (R = 0.402)
  const geo = new THREE.CircleGeometry(0.402, 64);
  const mat = new THREE.MeshBasicMaterial({
    map: clickWheelTexture,
    transparent: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4
  });

  clickWheelMesh = new THREE.Mesh(geo, mat);
  clickWheelMesh.position.set(0, WHEEL_CENTER_Y, FRONT_FACE_Z);
  clickWheelMesh.renderOrder = 5;
  scene.add(clickWheelMesh);
}

function renderClickWheelTexture(pressedButton = null) {
  const ctx = clickWheelCtx;
  const w = clickWheelCanvas.width;
  const h = clickWheelCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const outerR = 506;
  const innerR = 176;

  ctx.clearRect(0, 0, w, h);

  // 1. Outer Ring Base
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fillStyle = currentTheme.wheel;
  ctx.fill();

  // Subtle tactile outer edge seam
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.10)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Subtle inner seam
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 2. High-Contrast, Highlighted Button Typography & Icons
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const defaultTextColor = currentTheme.wheelText;
  const activeColor = '#2563eb'; // Vibrant electric blue press flash

  // TOP: MENU
  const menuY = cy - 346;
  ctx.font = 'bold 54px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = pressedButton === 'menu' ? activeColor : defaultTextColor;
  ctx.fillText('MENU', cx, menuY);

  // BOTTOM: PLAY/PAUSE
  const playY = cy + 346;
  ctx.fillStyle = pressedButton === 'play' ? activeColor : defaultTextColor;
  drawPlayPauseIcon(ctx, cx, playY, 34);

  // LEFT: PREV |<<
  const prevX = cx - 346;
  ctx.fillStyle = pressedButton === 'prev' ? activeColor : defaultTextColor;
  drawPrevIcon(ctx, prevX, cy, 34);

  // RIGHT: NEXT >>|
  const nextX = cx + 346;
  ctx.fillStyle = pressedButton === 'next' ? activeColor : defaultTextColor;
  drawNextIcon(ctx, nextX, cy, 34);

  ctx.restore();

  // 3. Concentric Center Button (SELECT)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 2, 0, Math.PI * 2);
  ctx.fillStyle = pressedButton === 'select' ? '#dbeafe' : currentTheme.wheelCenter;
  ctx.fill();

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();
}

function flashWheelButton(btn) {
  renderClickWheelTexture(btn);
  if (clickWheelTexture) clickWheelTexture.needsUpdate = true;
  clearTimeout(activeWheelButtonTimeout);
  activeWheelButtonTimeout = setTimeout(() => {
    renderClickWheelTexture(null);
    if (clickWheelTexture) clickWheelTexture.needsUpdate = true;
  }, 130);
}

function drawPlayPauseIcon(ctx, x, y, size) {
  // Play triangle ▶
  ctx.beginPath();
  ctx.moveTo(x - size + 4, y - size / 2);
  ctx.lineTo(x - size / 4, y);
  ctx.lineTo(x - size + 4, y + size / 2);
  ctx.closePath();
  ctx.fill();

  // Pause bars ❚❚
  const barW = size * 0.18;
  const barH = size;
  ctx.fillRect(x + 4, y - barH / 2, barW, barH);
  ctx.fillRect(x + 4 + barW + 5, y - barH / 2, barW, barH);
}

function drawPrevIcon(ctx, x, y, size) {
  // Vertical bar |
  const barW = size * 0.18;
  const barH = size;
  ctx.fillRect(x - size / 2 - 2, y - barH / 2, barW, barH);

  // Double triangle <<
  ctx.beginPath();
  ctx.moveTo(x + 4, y - size / 2);
  ctx.lineTo(x - size / 3 + 2, y);
  ctx.lineTo(x + 4, y + size / 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x + size * 0.55, y - size / 2);
  ctx.lineTo(x + size * 0.15, y);
  ctx.lineTo(x + size * 0.55, y + size / 2);
  ctx.closePath();
  ctx.fill();
}

function drawNextIcon(ctx, x, y, size) {
  // Double triangle >>
  ctx.beginPath();
  ctx.moveTo(x - size * 0.55, y - size / 2);
  ctx.lineTo(x - size * 0.15, y);
  ctx.lineTo(x - size * 0.55, y + size / 2);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - 4, y - size / 2);
  ctx.lineTo(x + size / 3 - 2, y);
  ctx.lineTo(x - 4, y + size / 2);
  ctx.closePath();
  ctx.fill();

  // Vertical bar |
  const barW = size * 0.18;
  const barH = size;
  ctx.fillRect(x + size / 2 - barW + 2, y - barH / 2, barW, barH);
}

// --- Load Model Body with 10x Scale Fix, Opaque Casing, & Ports Hidden ---
function loadIpodModel() {
  const loader = new GLTFLoader();
  const overlay = document.getElementById('loader-overlay');

  loader.load('/models/ipod_classic.glb', (gltf) => {
    ipodGroup = gltf.scene;

    // Scale up 10x so height is 2.0 world units
    ipodGroup.scale.set(10, 10, 10);
    ipodGroup.rotation.y = -Math.PI / 2;
    ipodGroup.position.set(0, IPOD_OFFSET_Y, 0);

    ipodGroup.traverse((child) => {
      if (child.isMesh) {
        const parentName = child.parent ? child.parent.name : '';
        const name = child.name || '';

        // Hide internal GLB Screen and internal Ports so dedicated crisp meshes shine
        if (
          parentName.includes('Screen') || name.includes('Screen') ||
          parentName.includes('Port') || name.includes('Port') ||
          parentName.includes('Charging') || name.includes('Charging')
        ) {
          child.visible = false;
        }
        // Pristine, Opaque Casing & Switches (Zero Logos / Brand Markings)
        else {
          if (name.includes('Switch') || parentName.includes('Switch')) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xe0e3e8,
              metalness: 0.65,
              roughness: 0.28
            });
          } else if (name.includes('Headphone') || parentName.includes('Headphone')) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0x111317,
              metalness: 0.90,
              roughness: 0.15
            });
          } else {
            // Main body casing: pure solid glossy color without any brand logos or old textures
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(currentTheme.casing),
              roughness: 0.18,
              metalness: 0.05
            });
            ipodBodyMesh = child;
          }
          child.material.transparent = false;
          child.material.opacity = 1.0;
          child.material.depthWrite = true;
          child.material.depthTest = true;
          child.material.needsUpdate = true;
        }
      }
    });

    scene.add(ipodGroup);

    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 200);

  }, undefined, (error) => {
    console.error('Failed to load MP3 player model:', error);
  });
}

// --- Headphone Jack Insertion Animation ---
function toggleHeadphonePlug(forceState = null) {
  if (isPlugAnimating) return;

  const nextState = forceState !== null ? forceState : !isPluggedIn;
  if (nextState === isPluggedIn) return;

  isPlugAnimating = true;
  isPluggedIn = nextState;

  const targetY = isPluggedIn ? PLUG_INSERTED_Y : PLUG_HOVER_Y;
  const startY = headphoneJackPlug.position.y;
  const duration = simulatorSettings.reduceMotion ? 80 : 380;
  const startTime = Date.now();

  function animatePlugStep() {
    const elapsed = Date.now() - startTime;
    const t = Math.min(1.0, elapsed / duration);
    // Smooth cubic bezier easing
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    headphoneJackPlug.position.y = THREE.MathUtils.lerp(startY, targetY, ease);

    if (t < 1.0) {
      requestAnimationFrame(animatePlugStep);
    } else {
      isPlugAnimating = false;
      audioEngine.setHeadphonesPlugged(isPluggedIn);
      screenRenderer.isHeadphonesPlugged = isPluggedIn;
      if (screenTexture) screenTexture.needsUpdate = true;

      // Update top nav button status
      const plugLabel = document.getElementById('plug-status-label');
      const plugBtn = document.getElementById('btn-plug-toggle');
      if (plugLabel) plugLabel.textContent = isPluggedIn ? 'Unplug' : 'Plug In';
      if (plugBtn) plugBtn.classList.toggle('active', isPluggedIn);

      if (isPluggedIn) {
        showToast("Earphones connected");
        showImmersiveModal();
        if (!audioEngine.isPlaying) {
          audioEngine.toggleMusic(true);
          screenRenderer.setTrack(audioEngine.getCurrentTrack(), true);
          if (screenTexture) screenTexture.needsUpdate = true;
        }
      } else {
        showToast("Earphones disconnected — playback paused");
        screenRenderer.setTrack(audioEngine.getCurrentTrack(), false);
        if (screenTexture) screenTexture.needsUpdate = true;
      }
    }
  }

  animatePlugStep();
}

// Setup Plug Interaction
function setupPlugInteraction() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  window.addEventListener('click', (e) => {
    // Ignore clicks on HTML navigation / dock / modals
    if (e.target.closest('#bottom-dock') || e.target.closest('.bottom-dock') || e.target.closest('.top-nav') || e.target.closest('.theme-tray') || e.target.closest('.modal-overlay') || e.target.closest('.virtual-wheel-hud')) {
      return;
    }

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    // Hit against the plug
    const plugHits = raycaster.intersectObjects(headphoneJackPlug.children, true);
    if (plugHits.length > 0) {
      audioEngine.init();
      toggleHeadphonePlug();
      return;
    }

    // Hit against the top opening of the MP3 player (y > 0.65 in world coordinates)
    if (ipodGroup) {
      const ipodHits = raycaster.intersectObjects(ipodGroup.children, true);
      if (ipodHits.length > 0) {
        const hit = ipodHits[0];
        if (hit.point.y > 0.65 && Math.abs(hit.point.x) < 0.25) {
          audioEngine.init();
          toggleHeadphonePlug();
        }
      }
    }
  });
}

// --- Authentic Direct Click Wheel & Song Scrubber Interaction ---
function setupDirectClickWheel() {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  let isWheelDragging = false;
  let isSongScrubbing = false;
  let lastWheelAngle = 0;
  let accumulatedAngle = 0;
  let dragStartPoint = new THREE.Vector2();
  let hasDragged = false;

  function getRaycastHit(e) {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const targets = [];
    if (clickWheelMesh) targets.push(clickWheelMesh);
    if (screenMesh) targets.push(screenMesh);
    if (ipodGroup) targets.push(...ipodGroup.children);

    const intersects = raycaster.intersectObjects(targets, true);
    return intersects.length ? intersects[0] : null;
  }

  function getAngleOnWheel(p) {
    return Math.atan2(p.y - WHEEL_CENTER_Y, p.x);
  }

  function tryScrubSong(hit) {
    if (!hit || hit.object !== screenMesh || !hit.uv) return false;
    if (screenRenderer.getCurrentView() !== 'nowPlaying') return false;

    // In nowPlaying, progress bar is at UV Y: 0.14..0.42
    if (hit.uv.y >= 0.14 && hit.uv.y <= 0.42) {
      const fraction = THREE.MathUtils.clamp((hit.uv.x - 0.0468) / (0.9531 - 0.0468), 0, 1);
      audioEngine.seekToProgress(fraction);
      screenRenderer.setTimeUpdate(audioEngine.currentTime, audioEngine.duration, fraction);
      if (screenTexture) screenTexture.needsUpdate = true;
      return true;
    }
    return false;
  }

  // Pointer Down
  window.addEventListener('pointerdown', (e) => {
    if (e.target.closest('#bottom-dock') || e.target.closest('.theme-tray') || e.target.closest('.modal-overlay') || e.target.closest('.virtual-wheel-hud')) {
      return;
    }

    audioEngine.init();

    const hit = getRaycastHit(e);
    if (!hit) return;

    // 1. Direct interactive song slider touch
    if (tryScrubSong(hit)) {
      isSongScrubbing = true;
      return;
    }

    const p = hit.point;
    const dx = p.x;
    const dy = p.y - WHEEL_CENTER_Y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 2. Front face Click Wheel zone: R <= 0.42, Z > 0.05
    if (dist <= 0.42 && p.z > 0.05) {
      isWheelDragging = true;
      hasDragged = false;
      dragStartPoint.set(e.clientX, e.clientY);
      lastWheelAngle = getAngleOnWheel(p);
      accumulatedAngle = 0;
    }
  });

  // Pointer Move (Scrubbing / Rotary Dragging)
  window.addEventListener('pointermove', (e) => {
    // Song scrubber drag
    if (isSongScrubbing) {
      const hit = getRaycastHit(e);
      if (hit && hit.uv) {
        const fraction = THREE.MathUtils.clamp((hit.uv.x - 0.0468) / (0.9531 - 0.0468), 0, 1);
        audioEngine.seekToProgress(fraction);
        screenRenderer.setTimeUpdate(audioEngine.currentTime, audioEngine.duration, fraction);
        if (screenTexture) screenTexture.needsUpdate = true;
      }
      return;
    }

    if (!isWheelDragging) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const movedDist = Math.hypot(clientX - dragStartPoint.x, clientY - dragStartPoint.y);
    if (movedDist > 6) {
      hasDragged = true;
    }

    const hit = getRaycastHit(e);
    if (!hit) return;

    const currentAngle = getAngleOnWheel(hit.point);
    let delta = currentAngle - lastWheelAngle;

    // Handle wrapping around [-PI, PI]
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;

    accumulatedAngle += delta;
    lastWheelAngle = currentAngle;

    // Sensitivity adjusted notch threshold
    const notch = (Math.PI / 13) / (simulatorSettings.sensitivity || 1.0);
    if (Math.abs(accumulatedAngle) >= notch) {
      const step = delta < 0 ? 1 : -1;
      accumulatedAngle = 0;

      audioEngine.playWheelClick();

      // In Now Playing view: wheel controls volume
      if (screenRenderer.getCurrentView() === 'nowPlaying') {
        const newVol = audioEngine.setVolume(audioEngine.volume + (step > 0 ? -0.05 : 0.05));
        screenRenderer.showVolumeHUD(newVol);
      } else {
        screenRenderer.scroll(step);
      }
      if (screenTexture) screenTexture.needsUpdate = true;
    }
  });

  // Pointer Up
  window.addEventListener('pointerup', (e) => {
    if (isSongScrubbing) {
      isSongScrubbing = false;
      return;
    }

    if (!isWheelDragging) return;
    isWheelDragging = false;

    if (!hasDragged) {
      const hit = getRaycastHit(e);
      if (!hit) return;

      const p = hit.point;
      const dx = p.x;
      const dy = p.y - WHEEL_CENTER_Y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 1. Center Button (SELECT)
      if (dist < 0.14) {
        flashWheelButton('select');
        audioEngine.playButtonPress();
        const res = screenRenderer.selectCurrent();
        if (res) {
          if (res.action === 'importMp3') {
            const fileInput = document.getElementById('mp3-file-input');
            if (fileInput) fileInput.click();
          } else if (res.action === 'openSettings') {
            document.getElementById('settings-modal').classList.remove('hidden');
          } else if (res.action === 'playTrack') {
            const track = audioEngine.selectTrackById(res.trackId);
            screenRenderer.setTrack(track, true);
          } else if (res.action === 'togglePlay') {
            if (!isPluggedIn) {
              toggleHeadphonePlug();
            } else {
              const isPlaying = audioEngine.toggleMusic();
              screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
            }
          } else if (res.action === 'shuffle') {
            audioEngine.playDriveSpinUp();
            if (!isPluggedIn) {
              toggleHeadphonePlug();
            } else {
              const isPlaying = audioEngine.toggleMusic(true);
              screenRenderer.viewStack.push('nowPlaying');
              screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
            }
          }
        }
        if (screenTexture) screenTexture.needsUpdate = true;
        return;
      }

      // 2. Outer Ring Buttons: MENU, PLAY/PAUSE, PREV, NEXT
      if (dist >= 0.14 && dist <= 0.42) {
        const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

        if (angleDeg >= 45 && angleDeg <= 135) {
          // TOP: MENU
          flashWheelButton('menu');
          audioEngine.playButtonPress();
          screenRenderer.goBack();
          if (screenTexture) screenTexture.needsUpdate = true;
        } else if (angleDeg <= -45 && angleDeg >= -135) {
          // BOTTOM: PLAY / PAUSE
          flashWheelButton('play');
          if (!isPluggedIn) {
            toggleHeadphonePlug();
          } else {
            const isPlaying = audioEngine.toggleMusic();
            screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
            if (screenTexture) screenTexture.needsUpdate = true;
          }
        } else if (Math.abs(angleDeg) > 135) {
          // LEFT: PREV TRACK
          flashWheelButton('prev');
          const track = audioEngine.prevTrack();
          screenRenderer.setTrack(track, audioEngine.isPlaying);
          if (screenTexture) screenTexture.needsUpdate = true;
        } else if (Math.abs(angleDeg) < 45) {
          // RIGHT: NEXT TRACK
          flashWheelButton('next');
          const track = audioEngine.nextTrack();
          screenRenderer.setTrack(track, audioEngine.isPlaying);
          if (screenTexture) screenTexture.needsUpdate = true;
        }
      }
    }
  });

  // Direct Mouse Wheel Scroll over the player
  window.addEventListener('wheel', (e) => {
    const hit = getRaycastHit(e);
    if (hit) {
      audioEngine.init();
      audioEngine.playWheelClick();
      const step = e.deltaY > 0 ? 1 : -1;
      if (screenRenderer.getCurrentView() === 'nowPlaying') {
        const newVol = audioEngine.setVolume(audioEngine.volume + (step > 0 ? -0.05 : 0.05));
        screenRenderer.showVolumeHUD(newVol);
      } else {
        screenRenderer.scroll(step);
      }
      if (screenTexture) screenTexture.needsUpdate = true;
    }
  }, { passive: true });
}

// --- Bottom Dock Navigation & Live Track Badge ---
function setupTopNav() {
  const btnTheme = document.getElementById('btn-theme');
  const btnSettings = document.getElementById('btn-settings');
  const btnImport = document.getElementById('btn-import-dock') || document.getElementById('btn-import-top');
  const btnPlugToggle = document.getElementById('btn-plug-toggle');
  const themeTray = document.getElementById('theme-tray');
  const settingsModal = document.getElementById('settings-modal');

  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      themeTray.classList.toggle('hidden');
      if (!themeTray.classList.contains('hidden')) {
        settingsModal.classList.add('hidden');
      }
    });
  }

  const btnCloseTheme = document.getElementById('btn-close-theme');
  if (btnCloseTheme) {
    btnCloseTheme.addEventListener('click', () => {
      themeTray.classList.add('hidden');
    });
  }

  if (btnSettings) {
    btnSettings.addEventListener('click', () => {
      settingsModal.classList.remove('hidden');
      themeTray.classList.add('hidden');
    });
  }

  if (btnImport) {
    btnImport.addEventListener('click', () => {
      const fileInput = document.getElementById('mp3-file-input');
      if (fileInput) fileInput.click();
    });
  }

  if (btnPlugToggle) {
    btnPlugToggle.addEventListener('click', () => {
      audioEngine.init();
      toggleHeadphonePlug();
    });
  }
}

function updateTopNavTrackBadge(track, isPlaying) {
  const badge = document.getElementById('dock-track-badge') || document.getElementById('nav-track-badge');
  const title = document.getElementById('dock-track-title') || document.getElementById('nav-track-title');
  if (!badge || !title) return;

  if (track && isPlaying) {
    badge.classList.remove('hidden');
    title.textContent = `${track.title} - ${track.artist}`;
  } else if (!isPlaying) {
    badge.classList.add('hidden');
  }
}

// --- Color Customizer & Theme Presets ---
function setupThemeCustomizer() {
  const swatches = document.querySelectorAll('.color-swatch');
  const casingPicker = document.getElementById('casing-color-picker');
  const wheelPicker = document.getElementById('wheel-color-picker');
  const jackPicker = document.getElementById('jack-color-picker');

  swatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      const themeKey = swatch.dataset.theme;
      if (THEME_PRESETS[themeKey]) {
        applyTheme(THEME_PRESETS[themeKey]);
        swatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
      }
    });
  });

  casingPicker.addEventListener('input', (e) => {
    currentTheme.casing = e.target.value;
    document.getElementById('casing-color-hex').textContent = e.target.value.toUpperCase();
    applyCustomTheme();
  });

  wheelPicker.addEventListener('input', (e) => {
    currentTheme.wheel = e.target.value;
    document.getElementById('wheel-color-hex').textContent = e.target.value.toUpperCase();
    applyCustomTheme();
  });

  jackPicker.addEventListener('input', (e) => {
    currentTheme.jack = e.target.value;
    document.getElementById('jack-color-hex').textContent = e.target.value.toUpperCase();
    applyCustomTheme();
  });
}

function applyTheme(theme) {
  currentTheme = { ...theme };

  // Update pickers
  const casingPicker = document.getElementById('casing-color-picker');
  const wheelPicker = document.getElementById('wheel-color-picker');
  const jackPicker = document.getElementById('jack-color-picker');
  if (casingPicker) casingPicker.value = currentTheme.casing;
  if (wheelPicker) wheelPicker.value = currentTheme.wheel;
  if (jackPicker) jackPicker.value = currentTheme.jack;
  document.getElementById('casing-color-hex').textContent = currentTheme.casing.toUpperCase();
  document.getElementById('wheel-color-hex').textContent = currentTheme.wheel.toUpperCase();
  document.getElementById('jack-color-hex').textContent = currentTheme.jack.toUpperCase();

  applyCustomTheme();
}

function applyCustomTheme() {
  // 1. Update iPod Casing 3D Mesh Material
  if (ipodBodyMesh && ipodBodyMesh.material) {
    ipodBodyMesh.material.color.set(currentTheme.casing);
    ipodBodyMesh.material.needsUpdate = true;
  }

  // 2. Update Click Wheel Procedural Texture
  renderClickWheelTexture();
  if (clickWheelTexture) clickWheelTexture.needsUpdate = true;

  // 3. Update Headphone Jack Grip & Cable Material
  if (gripMesh && gripMesh.material) {
    gripMesh.material.color.set(currentTheme.jack);
    gripMesh.material.needsUpdate = true;
  }
  if (earphoneCableLine && earphoneCableLine.material) {
    earphoneCableLine.material.color.set(currentTheme.jack);
    earphoneCableLine.material.needsUpdate = true;
  }

  // Save to localStorage
  localStorage.setItem('mp3_theme', JSON.stringify(currentTheme));
}

// --- Settings Modal & Tabs ---
function setupSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const btnClose = document.getElementById('btn-close-settings');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  btnClose.addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = document.getElementById(`tab-${btn.dataset.tab}`);
      if (targetTab) targetTab.classList.add('active');
    });
  });

  // Reduce Motion
  const chkReduceMotion = document.getElementById('setting-reduce-motion');
  chkReduceMotion.checked = simulatorSettings.reduceMotion;
  chkReduceMotion.addEventListener('change', (e) => {
    simulatorSettings.reduceMotion = e.target.checked;
    localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
  });

  // Sensitivity
  const rngSensitivity = document.getElementById('setting-sensitivity');
  const valSensitivity = document.getElementById('val-sensitivity');
  rngSensitivity.value = simulatorSettings.sensitivity;
  valSensitivity.textContent = `${simulatorSettings.sensitivity}x`;
  rngSensitivity.addEventListener('input', (e) => {
    simulatorSettings.sensitivity = parseFloat(e.target.value);
    valSensitivity.textContent = `${simulatorSettings.sensitivity.toFixed(1)}x`;
    localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
  });

  // Virtual Click Wheel
  const chkVirtualWheel = document.getElementById('setting-virtual-wheel');
  chkVirtualWheel.checked = simulatorSettings.virtualWheel;
  chkVirtualWheel.addEventListener('change', (e) => {
    simulatorSettings.virtualWheel = e.target.checked;
    document.getElementById('virtual-wheel-container').classList.toggle('hidden', !e.target.checked);
    localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
  });

  // Auto-Plug
  const chkAutoPlug = document.getElementById('setting-auto-plug');
  chkAutoPlug.checked = simulatorSettings.autoPlug;
  chkAutoPlug.addEventListener('change', (e) => {
    simulatorSettings.autoPlug = e.target.checked;
    localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
  });

  // Custom Background Wallpaper from file
  const bgInput = document.getElementById('bg-file-input');
  bgInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target.result;
        document.body.style.backgroundImage = `url("${url}")`;
        simulatorSettings.customBg = url;
        localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
        showToast("Background wallpaper updated");
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('btn-reset-bg').addEventListener('click', () => {
    document.body.style.backgroundImage = '';
    simulatorSettings.customBg = null;
    localStorage.setItem('mp3_settings', JSON.stringify(simulatorSettings));
    showToast("Background reset to Studio gradient");
  });
}

// --- On-Screen Virtual Click Wheel HUD ---
function setupVirtualWheelHUD() {
  const vWheelOuter = document.getElementById('vwheel-outer');
  const vBtnMenu = document.getElementById('vbtn-menu');
  const vBtnPlay = document.getElementById('vbtn-play');
  const vBtnPrev = document.getElementById('vbtn-prev');
  const vBtnNext = document.getElementById('vbtn-next');
  const vBtnCenter = document.getElementById('vbtn-center');

  vBtnMenu.addEventListener('click', () => {
    audioEngine.playButtonPress();
    flashWheelButton('menu');
    screenRenderer.goBack();
    if (screenTexture) screenTexture.needsUpdate = true;
  });

  vBtnCenter.addEventListener('click', () => {
    audioEngine.playButtonPress();
    flashWheelButton('select');
    const res = screenRenderer.selectCurrent();
    if (res) {
      if (res.action === 'importMp3') {
        document.getElementById('mp3-file-input').click();
      } else if (res.action === 'openSettings') {
        document.getElementById('settings-modal').classList.remove('hidden');
      } else if (res.action === 'playTrack') {
        const track = audioEngine.selectTrackById(res.trackId);
        screenRenderer.setTrack(track, true);
      } else if (res.action === 'togglePlay') {
        if (!isPluggedIn) {
          toggleHeadphonePlug();
        } else {
          const isPlaying = audioEngine.toggleMusic();
          screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
        }
      }
    }
    if (screenTexture) screenTexture.needsUpdate = true;
  });

  vBtnPlay.addEventListener('click', () => {
    flashWheelButton('play');
    if (!isPluggedIn) {
      toggleHeadphonePlug();
    } else {
      const isPlaying = audioEngine.toggleMusic();
      screenRenderer.setTrack(audioEngine.getCurrentTrack(), isPlaying);
      if (screenTexture) screenTexture.needsUpdate = true;
    }
  });

  vBtnPrev.addEventListener('click', () => {
    flashWheelButton('prev');
    const track = audioEngine.prevTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    if (screenTexture) screenTexture.needsUpdate = true;
  });

  vBtnNext.addEventListener('click', () => {
    flashWheelButton('next');
    const track = audioEngine.nextTrack();
    screenRenderer.setTrack(track, audioEngine.isPlaying);
    if (screenTexture) screenTexture.needsUpdate = true;
  });

  // Touch rotary scrubbing on Virtual Wheel
  let isVDragging = false;
  let lastVAngle = 0;
  let accumulatedVAngle = 0;

  function getVAngle(clientX, clientY) {
    const rect = vWheelOuter.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return Math.atan2(clientY - cy, clientX - cx);
  }

  vWheelOuter.addEventListener('pointerdown', (e) => {
    if (e.target !== vWheelOuter) return;
    isVDragging = true;
    lastVAngle = getVAngle(e.clientX, e.clientY);
    accumulatedVAngle = 0;
  });

  window.addEventListener('pointermove', (e) => {
    if (!isVDragging) return;
    const currentAngle = getVAngle(e.clientX, e.clientY);
    let delta = currentAngle - lastVAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    accumulatedVAngle += delta;
    lastVAngle = currentAngle;

    const notch = (Math.PI / 13) / (simulatorSettings.sensitivity || 1.0);
    if (Math.abs(accumulatedVAngle) >= notch) {
      const step = delta < 0 ? 1 : -1;
      accumulatedVAngle = 0;
      audioEngine.playWheelClick();

      if (screenRenderer.getCurrentView() === 'nowPlaying') {
        const newVol = audioEngine.setVolume(audioEngine.volume + (step > 0 ? -0.05 : 0.05));
        screenRenderer.showVolumeHUD(newVol);
      } else {
        screenRenderer.scroll(step);
      }
      if (screenTexture) screenTexture.needsUpdate = true;
    }
  });

  window.addEventListener('pointerup', () => {
    isVDragging = false;
  });
}

// --- Auto-Connect Real Physical Headphones ---
function setupPhysicalHeadphoneDetection() {
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', async () => {
      if (!simulatorSettings.autoPlug) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
        const hasHeadphones = audioOutputs.some(d =>
          /headphone|headset|earbud|airpod|earphone|audio/i.test(d.label)
        );

        if (hasHeadphones && !isPluggedIn) {
          toggleHeadphonePlug(true);
          showToast("Real headphones detected: auto-connected");
        }
      } catch (err) {
        console.warn('Physical device detection check:', err);
      }
    });
  }
}

// --- Load Saved Settings & Custom Background ---
function loadSavedSettings() {
  try {
    const saved = localStorage.getItem('mp3_settings');
    if (saved) {
      Object.assign(simulatorSettings, JSON.parse(saved));
    }
    const savedTheme = localStorage.getItem('mp3_theme');
    if (savedTheme) {
      Object.assign(currentTheme, JSON.parse(savedTheme));
    }
  } catch (e) {
    console.warn(e);
  }

  // Apply custom background if saved
  if (simulatorSettings.customBg) {
    document.body.style.backgroundImage = `url("${simulatorSettings.customBg}")`;
  }
}

// --- Local MP3 File Import via Menu, Button, File Input, or Drag & Drop ---
function setupMP3DropImporter() {
  const fileInput = document.getElementById('mp3-file-input');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleAudioFilesImport(files);
    }
  });

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleAudioFilesImport(e.target.files);
      }
    });
  }
}

function handleAudioFilesImport(files) {
  if (!files || files.length === 0) return;
  audioEngine.init();

  const validFiles = Array.from(files).filter(f =>
    f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)
  );

  if (validFiles.length === 0) {
    showToast("Please select audio files (.mp3, .wav, .m4a)");
    return;
  }

  showToast(`Importing ${validFiles.length} song${validFiles.length > 1 ? 's' : ''}...`);

  audioEngine.importAudioFiles(validFiles).then((importedTracks) => {
    screenRenderer.setTracks(audioEngine.tracks);
    const firstTrack = importedTracks[0];

    // Connect earphones if disconnected so sound starts
    if (!isPluggedIn) {
      toggleHeadphonePlug();
    }

    // Play immediately
    audioEngine.selectTrackById(firstTrack.id);
    const isPlaying = audioEngine.toggleMusic(true);

    screenRenderer.viewStack = ['root', 'music', 'songs', 'nowPlaying'];
    screenRenderer.setTrack(firstTrack, isPlaying);
    if (screenTexture) screenTexture.needsUpdate = true;

    showToast(`Playing: ${firstTrack.title}`);
  }).catch((err) => {
    console.error(err);
    showToast("Could not import audio files");
  });
}

// --- Main Render & Animation Loop ---
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  // Subtle breathing float (disabled if reduceMotion is on)
  if (!simulatorSettings.reduceMotion) {
    if (ipodGroup) {
      const t = Date.now() * 0.0012;
      ipodGroup.position.y = IPOD_OFFSET_Y + Math.sin(t) * 0.012;
      if (screenMesh) screenMesh.position.y = SCREEN_CENTER_Y + Math.sin(t) * 0.012;
      if (screenBezelMesh) screenBezelMesh.position.y = SCREEN_CENTER_Y + Math.sin(t) * 0.012;
      if (clickWheelMesh) clickWheelMesh.position.y = WHEEL_CENTER_Y + Math.sin(t) * 0.012;
    }

    // Gentle float on unplugged hovering plug
    if (!isPluggedIn && !isPlugAnimating && headphoneJackPlug) {
      const t = Date.now() * 0.002;
      headphoneJackPlug.position.y = PLUG_HOVER_Y + Math.sin(t) * 0.014;
    }
  }

  // Update dynamic LCD screen canvas with live frequency data for equalizer
  if (screenRenderer.render(audioEngine.getFrequencyData())) {
    if (screenTexture) screenTexture.needsUpdate = true;
  }

  renderer.render(scene, camera);
}

// --- Window Resize Handler ---
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraFraming();
}

// Launch
init();
